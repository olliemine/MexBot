const fetch = require("node-fetch")
const { rankedmapsChannel, rankedNotiRole } = require("../info.json")
//const { redisuri } = require("../config.json")
const infohandle = require("./info")
const { createClient } = require("redis")
const { MessageEmbed } = require("discord.js")
const LevelSchema = require("../models/LevelSchema")
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
	let page = 1
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
		if(!found) page++
	}
	if(!NewRankedMaps.length) return
	console.log(NewRankedMaps)
	const channel = await DiscordClient.channels.cache.get(rankedmapsChannel)
	let firsttime = true
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
		.setColor(palette.Vibrant.getHex())
		let text = firsttime ? `<@&${rankedNotiRole}>` : " "
		channel.send({ embeds: [embed], content: text })
		await LevelSchema.updateMany({ Hash: body.hash }, { Ranked: true })
		firsttime = false
	}
	await redisClient.set("LastRankedMap", NewLastRankedMap)
	redisClient.quit()
}