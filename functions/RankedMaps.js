const fetch = require("node-fetch")
const { rankedmapsChannel, rankedNotiRole } = require("../info.json")
const infohandle = require("./info")
const { createClient } = require("redis")
const { MessageEmbed } = require("discord.js")
const LevelSchema = require("../models/LevelSchema")
const BaseLevelSchema = require("../models/BaseLevelSchema")
const Vibrant = require('node-vibrant')
const { client } = require("../index")
const table = require("text-table")

module.exports = async () => {
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
	while(!found) {
		const res = await fetch(`https://scoresaber.com/api/leaderboards?ranked=true&page=${page}`)
		if(res.status != 200) {
			infohandle("RankedMaps", `${res.status} ${res.statusText} on s`)
			break
		}
		const body = await res.json()
		if(!NewLastRankedMap) NewLastRankedMap = body.leaderboards[0].id
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
	}
	if(!NewRankedMaps.length) return redisClient.quit()
	const channel = await client.channels.cache.get(rankedmapsChannel)
	let updateBulkWrite = []
	let embeds = [[]]
	let embedsPointer = 0
	let NewRankedMapsStarRatings = [0, 0, 0, 0, 0, 0, 0, 0, 0] //0-3 3-6 6-9 9-10 10-11 11-12 12-13 13-14 14+
	function addToStarRatings(leaderboards) {
		leaderboards.forEach(leaderboard => {
			const stars = leaderboard.stars
			if(stars < 3) return NewRankedMapsStarRatings[0]++
			if(stars < 6) return NewRankedMapsStarRatings[1]++
			if(stars < 9) return NewRankedMapsStarRatings[2]++
			if(stars < 10) return NewRankedMapsStarRatings[3]++
			if(stars < 11) return NewRankedMapsStarRatings[4]++
			if(stars < 12) return NewRankedMapsStarRatings[5]++
			if(stars < 13) return NewRankedMapsStarRatings[6]++
			if(stars < 14) return NewRankedMapsStarRatings[7]++
			NewRankedMapsStarRatings[8]++
		});
	}
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
		addToStarRatings(leaderboards)
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
		channel.send({ embeds: e })
	})
	function GetStarRatingsfromIndex(index) {
		switch(index) {
			case 0:
				return "0-3"
			case 1:
				return "3-6"
			case 2:
				return "6-9"
			case 3:
				return "9-10"
			case 4:
				return "10-11"
			case 5:
				return "11-12"
			case 6:
				return "12-13"
			case 7:
				return "13-14"
			case 8:
				return "14+"
		}
	}
	let NewRankedMapsStarRatingsText = ""
	let Options = []
	NewRankedMapsStarRatings.forEach((num, index) => {
		if(num === 0) return
		Options.push([`**${num}**`, `${GetStarRatingsfromIndex(index)} ★`])
	})
	NewRankedMapsStarRatingsText = table(Options)
	channel.send({ content: `<@&${rankedNotiRole}> New ranked maps! ${NewRankedMaps.length} total maps\n\n${NewRankedMapsStarRatingsText}`})
	await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false })
	await redisClient.set("LastRankedMap", NewLastRankedMap)
	redisClient.quit()
}