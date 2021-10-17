const fetch = require("node-fetch")
const LevelSchema = require("../models/LevelSchema")
const UserSchema = require("../models/UserSchema")
const ms = require("ms")
const errorhandle = require("./error")
const infohandle = require("./info")

module.exports = async (DiscordClient) => {
		let players = await UserSchema.find({ realname: {$ne: null}, lastrank: {$ne: 0} })

		const topchannel = DiscordClient.channels.cache.get("846148391365115964")
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
				function GetMap(Page) {
					fetch(`https://new.scoresaber.com/api/player/${userid.beatsaber}/scores/recent/${Page.toString()}`)
					.then(async (res) => {
						if(res.status == 429) return Timeout(Page)
						if(res.status == 404) {
							StoreMaps(newscores, userid, firstmap)
							resolve()
							return
						}
						if(res.status == 520) return GetMap(Page)
						const body = await res.json()
						if(Page == 1) firstmap = body.scores[0].scoreId
						body.scores.forEach(score => {
							if(passed) return
							if(score.scoreId == userid.lastmap) {
								passed = true
								return
							}
							newscores.push({
								"map": score.leaderboardId,
								"score": score.score
							})
						})
						if(!passed) return GetMap(Page + 1)
						await StoreMaps(newscores, userid, firstmap)
						resolve()
						return
					})
				}
				GetMap(1)			
			})
		}
		async function StoreMaps(newscores, user, firstmap) {
			if(!newscores || !user || !firstmap) return errorhandle(DiscordClient, new Error("Variable was not provided"))
			return new Promise(async (resolve, reject) => {
				//console.log(`New from ${user.realname}`)
				for await(const score of newscores) {
					const map = await LevelSchema.findOne({ "LevelID": score.map })
					if(map) {
						if(score.score <= map.TopScore) continue
						if(user.beatsaber == map.TopPlayer) {
							await LevelSchema.updateOne({
								"LevelID": score.map
							}, {
								"TopScore": score.score
							})
							continue
						}
						//console.log(`Better score ${score.score} better than ${map.TopScore}`)
						await LevelSchema.updateOne({
							"LevelID": score.map
						}, {
							"TopScore": score.score,
							"TopPlayer": user.beatsaber,
							"TopPlayerName": user.realname
						})
						if(!user.lastmap) continue
						let previousname = map.TopPlayerName
						const previoususer = await UserSchema.findOne({ beatsaber: map.TopPlayer})
						if(previoususer.snipe) previousname = `<@${previoususer.discord}>`
						topchannel.send({ content: `${user.realname} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map} snipeando a **${previousname}** | https://scoresaber.com/u/${user.beatsaber}`})
						continue
					}
					const newmap = {
						"LevelID": score.map,
						"TopPlayer": user.beatsaber,
						"TopScore": score.score,
						"TopPlayerName": user.realname
					}
					await new LevelSchema(newmap).save()
					//console.log(`New map ${score.map}`)
					continue
				}
				await UserSchema.updateOne({
					"beatsaber": user.beatsaber
				}, {
					"lastmap": firstmap
				})
				newscores = null
				resolve()
			})
		}
		function GetFirstMap(beatsaber) {
			return fetch(`https://new.scoresaber.com/api/player/${beatsaber}/scores/recent/1`)
			.then((res) => {
				return res
			})
		}
		function UpdatePlayers() {
			return new Promise(async (resolve, reject) => {
				let promises = []
				players.forEach(user => {
					promises.push(GetFirstMap(user.beatsaber));
				})
				const full = await Promise.all(promises)
				let playerCounter = 0
				let checkAgain = []
				for await (const data of full) {
					const user = players[playerCounter]
					playerCounter++
					if(data.status != 200) {
						checkAgain.push(user)
						continue
					}
					const body = await data.json()
					if(body.scores[0].scoreId == user.lastmap) continue
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
							"score": score.score
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
		return
};
