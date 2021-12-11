const fetch = require("node-fetch")
const LevelSchema = require("../models/LevelSchema")
const UserSchema = require("../models/UserSchema")
const errorhandle = require("./error")
const { top1feedChannel } = require("../info.json")
const { MessageActionRow, MessageButton } = require("discord.js")

module.exports = async (DiscordClient) => { //country: "MX", bsactive: true, lastrank: { $lte: 50 }
		let players = await UserSchema.find({ country: "MX", bsactive: true, lastrank: { $lte: 50 }})
		const topchannel = DiscordClient.channels.cache.get(top1feedChannel)
		let NewPlay = false
		async function GetFirstMap(beatsaber) {
			return fetch(`https://scoresaber.com/api/player/${beatsaber}/scores?sort=recent&page=1&withMetadata=false`)
			.then((res) => {
				return res
			})
		}
		function UpdateUser(userid) {
			return new Promise((resolve, reject) => {
				let newscores = []
				let passed = false
				let firstmap
				function Timeout(Page) {
					console.log("waiting 25 sec")
					setTimeout(() => {
						GetMap(Page)
					}, (1000*60)*25)
				}
				function GetMap(Page) {
					fetch(`https://scoresaber.com/api/player/${userid.beatsaber}/scores?limit=100&sort=recent&withMetadata=false&page=${Page.toString()}`)
					.then(async (res) => {
						console.log(Page)
						if(res.status == 429) return Timeout(Page)
						if(res.status == 404) {
							await StoreMaps(newscores, userid, firstmap).then(() => {})
							resolve()
							return
						}
						if(res.status == 520) return GetMap(Page)
						const body = await res.json()
						if(Page == 1) firstmap = body.playerScores[0].score.id
						body.playerScores.forEach(score => {
							if(passed) return
							if(score.score.id == userid.lastmap) {
								passed = true
								return
							}
							newscores.push({
								"map": score.leaderboard.id,
								"score": score.score.baseScore,
								"hash": score.leaderboard.songHash,
								"diff": score.leaderboard.difficulty.difficultyRaw,
								"date": score.score.timeSet,
								"mods": GetMods(score.score.modifiers),
								"pp": score.score.pp.toFixed(1)
							})
						})
						if(!passed) return GetMap(Page + 1)
						await StoreMaps(newscores, userid, firstmap).then(() =>{
							resolve()
							return
						})
					})
				}
				GetMap(1)			
			})
		}
		function GetLeaderboard(score, user, map) {
			let Leaderboard = map.Leaderboard.filter(value => value.PlayerID != user.beatsaber)
			Leaderboard.push({
				"PlayerID": user.beatsaber,
				"PlayerName": user.realname,
				"Score": score.score,
				"Country": user.country,
				"Date": score.date,
				"Mods": score.mods,
				"PP": score.pp
			})
			Leaderboard = Leaderboard.sort((a, b) => {
				return b.Score - a.Score
			})
			return Leaderboard
		}
		function GetPlayerCount(user, map) {
			const userscore = map.Leaderboard.find(value => value.PlayerID == user.beatsaber)
			if(!userscore) return map.PlayerCount += 1
			return map.PlayerCount
		}
		function TransformDiff(diff) {
			let temparray = diff.split("_")
			temparray.shift()
			temparray[1] = temparray[1].substring(4)
			return temparray
		}
		function GetMods(Mods) {
			if(!Mods) return []
			return Mods.split(",")
		}
		function getCode(hash) {
			return fetch(`https://beatsaver.com/api/maps/hash/${hash}`)
			.then(async (res) => {
				if(res.status != 200) return null
				const body = await res.json()
				return body.id
			})
		}
		function pushPlayHistory(playHistory, date) {
			const formatedDate = new Date(date)
			const week = Math.floor((formatedDate.getTime() + 345_600_000) / 604_800_000)
			const index = playHistory.findIndex(obj => obj.week == week)
			if(index != -1) {
				playHistory[index].plays++
				return playHistory
			}
			playHistory.push({
				plays: 1,
				week: week
			})
			playHistory.sort((a, b) => {
				return a.week - b.week
			})
			return playHistory
		}
		async function StoreMaps(newscores, user, firstmap) {
			if(!newscores || !user || !firstmap) return errorhandle(DiscordClient, new Error("Variable was not provided"))
			return new Promise(async (resolve, reject) => {
				console.log(`New from ${user.realname}`)
				let newmaps = []
				let updateBulkWrite = []
				let playHistory = user.playHistory
				let mapMode = newscores.length >= 25 ? true : false
				let maps
				if(mapMode) maps = await LevelSchema.find({})
				for await(const score of newscores) {
					playHistory = pushPlayHistory(playHistory, score.date)
					let map
					if(mapMode) map = maps.find(obj => obj.LevelID == score.map)
					else map = await LevelSchema.findOne({ "LevelID": score.map })
					if(map) {
						const Leaderboard = GetLeaderboard(score, user, map)
						const PlayerCount = GetPlayerCount(user, map)
						if(score.score <= map.TopScore) {
							updateBulkWrite.push({ updateOne: {
								"filter": { "LevelID": score.map },
								"update": { $set: { "PlayerCount": PlayerCount, "Leaderboard": Leaderboard }}
							}})
							console.log(`Score ${score.score} not better than ${map.TopScore}`)
							continue
						}
						if(user.beatsaber == map.TopPlayer) {
							updateBulkWrite.push({ updateOne: {
								"filter": { "LevelID": score.map },
								"update": { $set: { "TopScore": score.score, "Leaderboard": Leaderboard }}
							}})
							continue
						}
						console.log(`Better score ${score.score} better than ${map.TopScore}`)
						updateBulkWrite.push({ updateOne: {
							"filter": { "LevelID": score.map },
							"update": { $set: { 
								"TopScore": score.score,
								"TopPlayer": user.beatsaber,
								"TopPlayerName": user.realname,
								"PlayerCount": PlayerCount,
								"Leaderboard": Leaderboard
							}}
						}})
						if(!user.lastmap) continue
						let previousname = map.TopPlayerName
						const previoususer = await UserSchema.findOne({ beatsaber: map.TopPlayer})
						if(previoususer) if(previoususer.snipe) previousname = `<@${previoususer.discord}>`
						const code = await getCode(score.hash)
						if(code) { 
							const row = new MessageActionRow()
							.addComponents(
								new MessageButton()
									.setLabel("Beatsaver")
									.setStyle("LINK")
									.setURL(`https://beatsaver.com/maps/${code}`)
							)

							topchannel.send({ content: `${user.realname} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map}?countries=MX snipeando a **${previousname}** | https://scoresaber.com/u/${user.beatsaber}`, components: [row]})
							continue
						}
						topchannel.send({ content: `${user.realname} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map}?countries=MX snipeando a **${previousname}** | https://scoresaber.com/u/${user.beatsaber}`})
						continue
					}
					const Diff = TransformDiff(score.diff)
					const newmap = {
						"LevelID": score.map,
						"TopPlayer": user.beatsaber,
						"TopScore": score.score,
						"TopPlayerName": user.realname,
						"Hash": score.hash,
						"Code": null,
						"DiffInfo": {
							"Diff": Diff[0],
							"Mode": Diff[1]
						},
						"PlayerCount": 1,
						"Leaderboard": [{
							"PlayerID": user.beatsaber,
							"PlayerName": user.realname,
							"Score": score.score,
							"Country": user.country,
							"Date": score.date,
							"Mods": score.mods,
							"PP": score.pp
						}]
					}
					newmaps.push(newmap)
					//console.log(`New map ${score.map}`)
					continue
				}
				await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false })
				await LevelSchema.insertMany(newmaps, { ordered: false })
				await UserSchema.updateOne({
					"beatsaber": user.beatsaber
				}, {
					"lastmap": firstmap,
					"playHistory": playHistory
				})
				console.log("finished")
				newscores = null
				maps = null
				updateBulkWrite = null
				newmaps = null
				resolve()
			})
		}

		async function GetPromises() {
			return new Promise((resolve, reject) => {
				let full = []
				firstpromises = []
				players.forEach((player) => {
					firstpromises.push(player.beatsaber);
				})
				async function GetPromise(ids) {
					promises = []
					ids.forEach(id => {
						promises.push(GetFirstMap(id));
					})
					const unfulldata = await Promise.all(promises)
					let checkagain = []
					let counter = 0
					for(const data of unfulldata) {
						id = ids[counter]
						counter++
						if(data.status == 200) {
							data.bs = id
							full.push(data)
							continue
						}
						checkagain.push(id)
					}
					if(checkagain.length) return setTimeout(() => { GetPromise(checkagain) }, 1000*20)
					resolve(full)
				}
				GetPromise(firstpromises)
			})
		}
		function UpdatePlayers() {
			return new Promise(async (resolve, reject) => {
				let full = []
				await GetPromises().then((data) => {
					full = data
				})
				let checkAgain = []
				for await (const data of full) {
					const user = players.find(user => user.beatsaber == data.bs)
					const body = await data.json()
					if(!user.lastmap) {
						checkAgain.push(user)
						NewPlay = true
						continue
					}
					if(body.playerScores[0].score.id == user.lastmap) continue
					NewPlay = true
					const firstmap = body.playerScores[0].score.id
					let newscores = []
					let passed = false
					for(const score of body.playerScores) {
						if(score.score.id == user.lastmap) {
							passed = true
							break
						}
						newscores.push({
							"map": score.leaderboard.id,
							"score": score.score.baseScore,
							"hash": score.leaderboard.songHash,
							"diff": score.leaderboard.difficulty.difficultyRaw,
							"date": score.score.timeSet,
							"mods": GetMods(score.score.modifiers),
							"pp": score.score.pp.toFixed(1)
						})
					}
					if(!passed) {
						checkAgain.push(user)
						continue
					}
					await StoreMaps(newscores, user, firstmap)
					continue
				}
				for await (const user of checkAgain) {
					await UpdateUser(user).then(() => {
					})
				}
				resolve()
			})
		}
		await UpdatePlayers()
		function GetCodes() {
			return new Promise(async (resolve, reject) => {
				console.log("execution")
				let updateBulkWrite = []
				async function GetCode(maps) {
					let hashes = ""
					maps.forEach((map) => {
						hashes += `${map.Hash},`
					})
					hashes = hashes.slice(0, -1)
					await fetch(`https://beatsaver.com/api/maps/hash/${hashes}`)
					.then(async (res) => {
						if(res.status != 200) {
							errorhandle(DiscordClient, new Error(`${res.status} ${res.statusText}`))
							return GetCode()
						}
						const body = await res.json()
						for (const map of maps) {
							let info = body[map.Hash.toLowerCase()]
							if(!info) {
								info = { id: "0" }
							}
							updateBulkWrite.push({ updateMany: {
								"filter": { "Hash": map.Hash },
								"update": { $set: { "Code": info.id }}
							}})
						}
						return
					})
				}
				const allMaps = await LevelSchema.find({ Code: null })
				let mapChunks = []
				for (let i = 0; i < allMaps.length; i += 50) {
					mapChunks.push(allMaps.slice(i, i + 50))
				}
				console.log(mapChunks.length)
				for await(const mapChunk of mapChunks) {
					await GetCode(mapChunk)
					console.log(updateBulkWrite.length)
				}
				console.log("finished")
				await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false })
				resolve()
			})
		}
		if(NewPlay) await GetCodes()
		return
};
