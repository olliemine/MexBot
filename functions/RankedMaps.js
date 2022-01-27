const fetch = require("node-fetch")
const { rankedmapsChannel, rankedNotiRole } = require("../info.json")
const infohandle = require("./info")
const { createClient } = require("redis")
const { MessageEmbed } = require("discord.js")
const LevelSchema = require("../models/LevelSchema")
const BaseLevelSchema = require("../models/BaseLevelSchema")
const Vibrant = require('node-vibrant')

module.exports = async (DiscordClient) => {
	async function connect() {
		try {
			await redisClient.connect()
			return true
		} catch(err) {
			return false
		}
	}
	function TransformDiff(diff) {
		let temparray = diff.split("_")
		temparray.shift()
		return DiffName(temparray[0])
	}
	function DiffName(diff) {
		if(diff != "ExpertPlus") return diff
		return "Expert+"
	}
	function formatDiffs(diffs) {
		let text = ""
		diffs.forEach((d) => {
			text += `[${d.diff}](https://scoresaber.com/leaderboard/${d.id}) - ${d.stars} ★\n`
		})
		return text
	}
	function getCode(hash) {
		return fetch(`https://beatsaver.com/api/maps/hash/${hash}`)
		.then(async (res) => {
			if(res.status != 200) return null
			const body = await res.json()
			return body.id
		})
	}
	const timeout = (prom, time) => Promise.race([prom, new Promise((acc, rej) => setTimeout(() => acc(false), 5000))]);
	let NewLastRankedMap
	let found = false
	let page = 0
	let newestHash
	let arrayNum = -1
	let NewRankedMaps = []
	const redisClient = createClient({ url: process.env.REDIS_URL })
	const timeoutTest = await timeout(connect(), 5000)
	if(!timeoutTest) return
	const LastRankedMap = await redisClient.get("LastRankedMap")
	//const LastRankedMap = 398711
	while(!found) {
		const res = await fetch(`https://scoresaber.com/api/leaderboards?ranked=true&page=${page}`)
		if(res.status != 200) {
			infohandle(DiscordClient, "RankedMaps", `${res.status} ${res.statusText} on s`)
			break
		}
		const body = await res.json()
		if(!NewLastRankedMap) NewLastRankedMap = body.leaderboards[0].id
		console.log(NewLastRankedMap == LastRankedMap)
		if(NewLastRankedMap == LastRankedMap) break
		body.leaderboards.forEach(leaderboard => {
			if(found) return
			if(leaderboard.id == LastRankedMap) return found = true
			if(newestHash != leaderboard.songHash) {
				if(NewLastRankedMap[arrayNum]) NewLastRankedMap[arrayNum].sort((a, b) =>{
					return b.difficulty.difficulty - a.difficulty.difficulty
				})
				newestHash = leaderboard.songHash
				arrayNum++
				NewRankedMaps[arrayNum] = []
				NewRankedMaps[arrayNum].push({
					"coverImage": leaderboard.coverImage,
					"song": leaderboard.songName,
					"hash": leaderboard.songHash,
					"songauthor": leaderboard.songAuthorName,
					"mapper": leaderboard.levelAuthorName,
					"code": null
				})
			}
			NewRankedMaps[arrayNum].push({
				"id": leaderboard.id,
				"diff": TransformDiff(leaderboard.difficulty.difficultyRaw),
				"stars": leaderboard.stars
			})
		})
		if(!found && page == 0) {
			page = 2
			continue
		}
		if(!found) page++
		if(found) NewLastRankedMap[arrayNum].sort((a, b) =>{
			return b.difficulty.difficulty - a.difficulty.difficulty
		})
	}
	if(!NewRankedMaps.length) return redisClient.quit()
	const channel = await DiscordClient.channels.cache.get(rankedmapsChannel)
	let firsttime = true
	let updateBulkWrite = []
	let embeds = [[]]
	let embedsPointer = 0
	for await(const leaderboards of NewRankedMaps) {
		const body = leaderboards.shift()
		var response = await fetch(body.coverImage)
		var buffer = await response.buffer()
		var palette = await Vibrant.from(buffer).getPalette()
		const code = await getCode(body.hash)
		const embed = new MessageEmbed()
		.setTitle(`${body.song} - ${body.songauthor}`)
		.setThumbnail(body.coverImage)
		.setDescription(`Mapped by ${body.mapper}\n\n${formatDiffs(leaderboards)}\n[Download](https://beatsaver.com/maps/${code})`)
		.setColor(palette.Vibrant.hex)
		if(embeds[embedsPointer].length >= 5) {
			embedsPointer++
			embeds[embedsPointer] = []
		}
		embeds[embedsPointer].push(embed)
		await LevelSchema.updateMany({ Hash: body.hash }, { Ranked: true })
		await BaseLevelSchema.updateOne({ Hash: body.hash }, { Ranked: true })
		leaderboards.forEach(leaderboard => {
			updateBulkWrite.push({ updateOne: {
				"filter": { "LevelID": leaderboard.id },
				"update": { $set: {"Stars": leaderboard.stars  }}
			}})
		})
	}
	embeds.forEach(e => {
		let text = firsttime ? `<@&${rankedNotiRole}>` : " "
		channel.send({ embeds: e, content: text })
		firsttime = false
	})
	await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false })
	await redisClient.set("LastRankedMap", NewLastRankedMap)
	redisClient.quit()
}