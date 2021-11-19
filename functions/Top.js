const fetch = require("node-fetch")
const LevelSchema = require("../models/LevelSchema")
const UserSchema = require("../models/UserSchema")
const ms = require("ms")
const errorhandle = require("./error")
const infohandle = require("./info")

module.exports = async (DiscordClient) => { 
		let players = await UserSchema.find({ country: "MX", bsactive: true, lastrank: { $lte: 50 }})
		const topchannel = DiscordClient.channels.cache.get("905874757583503379")
		let debug = ""
		function UpdateUser(userid) {
			return new Promise((resolve, reject) => {
				let newscores = []
				let passed = false
				let firstmap
				function Timeout(Page) {
					console.log("waiting 25 sec")
					setTimeout(() => {
						GetMap(Page)
					}, ms("25s"))
				}
				//debug +=  "advanced_look "
				function GetMap(Page) {
					fetch(`https://new.scoresaber.com/api/player/${userid.beatsaber}/scores/recent/${Page.toString()}`)
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
						//debug += Page + " "
						if(Page == 1) firstmap = body.scores[0].scoreId
						body.scores.forEach(score => {
							if(passed) return
							if(score.scoreId == userid.lastmap) {
								passed = true
								return
							}
							newscores.push({
								"map": score.leaderboardId,
								"score": score.score,
								"hash": score.songHash,
								"diff": score.difficultyRaw,
								"date": score.timeSet
							})
						})
						if(!passed) return GetMap(Page + 1)
						debug += "finished_maps "
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
				"Date": score.date
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
			return [temparray[1], temparray[0]]
		}
		async function StoreMaps(newscores, user, firstmap) {
			if(!newscores || !user || !firstmap) return errorhandle(DiscordClient, new Error("Variable was not provided"))
			return new Promise(async (resolve, reject) => {
				console.log(`New from ${user.realname}`)
				for await(const score of newscores) {
					const map = await LevelSchema.findOne({ "LevelID": score.map })
					if(map) {
						const Leaderboard = GetLeaderboard(score, user, map)
						const PlayerCount = GetPlayerCount(user, map)
						console.log(PlayerCount)
						if(score.score <= map.TopScore) {
							await LevelSchema.updateOne({
								"LevelID": score.map
							}, {
								"PlayerCount": PlayerCount,
								"Leaderboard": Leaderboard
							})
							//debug += `${score.score} worse than ${map.TopScore} ${score.map} ${map.LevelID} `
							console.log(`Score ${score.score} not better than ${map.TopScore}`)
							continue
						}
						if(user.beatsaber == map.TopPlayer) {
							await LevelSchema.updateOne({
								"LevelID": score.map
							}, {
								"TopScore": score.score,
								"Leaderboard": Leaderboard
							})
							//debug += `upgraded ${score.map} `
							continue
						}
						console.log(`Better score ${score.score} better than ${map.TopScore}`)
						await LevelSchema.updateOne({
							"LevelID": score.map
						}, {
							"TopScore": score.score,
							"TopPlayer": user.beatsaber,
							"TopPlayerName": user.realname,
							"PlayerCount": PlayerCount,
							"Leaderboard": Leaderboard
						})
						debug += `${score.score} better than ${map.TopScore} ${map.LevelID} `
						if(!user.lastmap) continue
						let previousname = map.TopPlayerName
						const previoususer = await UserSchema.findOne({ beatsaber: map.TopPlayer})
						if(previoususer) if(previoususer.snipe) previousname = `<@${previoususer.discord}>`
						topchannel.send({ content: `${user.realname} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map} snipeando a **${previousname}** | https://scoresaber.com/u/${user.beatsaber}`})
						continue
					}
					const Diff = TransformDiff(score.diff)
					const newmap = {
						"LevelID": score.map,
						"TopPlayer": user.beatsaber,
						"TopScore": score.score,
						"TopPlayerName": user.realname,
						"Hash": score.hash,
						"Diff": Diff,
						"PlayerCount": 1,
						"Leaderboard": [{
							"PlayerID": user.beatsaber,
							"PlayerName": user.realname,
							"Score": score.score,
							"Country": user.country,
							"Date": score.date
						}]
					}
					//debug += `new_map ${score.map}`
					await new LevelSchema(newmap).save()
					console.log(`New map ${score.map}`)
					continue
				}
				console.log("finished")
				await UserSchema.updateOne({
					"beatsaber": user.beatsaber
				}, {
					"lastmap": firstmap
				})
				debug += `${firstmap} end\n`
				newscores = null
				resolve()
			})
		}
		async function GetFirstMap(beatsaber) {
			return fetch(`https://new.scoresaber.com/api/player/${beatsaber}/scores/recent/1`)
			.then((res) => {
				return res
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
				let playerCounter = 0
				let checkAgain = []
				for await (const data of full) {
					const user = players[playerCounter]
					playerCounter++
					const body = await data.json()
					if(!user.lastrank) {
						checkAgain.push(user) 
						debug += user.realname + " "
						debug += "new_user end\n"
						continue
					}
					if(body.scores[0].scoreId == user.lastmap) 	continue
					debug += user.realname + " "
					const firstmap = body.scores[0].scoreId
					let newscores = []
					let passed = false
					for(const score of body.scores) {
						if(score.scoreId == user.lastmap) {
							passed = true
							break
						}
						newscores.push({
							"map": score.leaderboardId,
							"score": score.score,
							"hash": score.songHash,
							"diff": score.difficultyRaw,
							"date": score.timeSet
						})
					}
					debug += "new_scores "
					if(!passed) {
						checkAgain.push(user)
						debug += "no_pass end\n" 
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
		if(debug.length) infohandle(DiscordClient, "debug", debug)
		return
};
