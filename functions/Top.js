const fetch = require("node-fetch")
const LevelSchema = require("../models/LevelSchema")
const UserSchema = require("../models/UserSchema")
const ms = require("ms")
const errorhandle = require("./error")

module.exports = async (DiscordClient) => {
		const players = await UserSchema.find({ realname: {$ne: null} })
		const topchannel = DiscordClient.channels.cache.get("846148391365115964")
		function UpdateUser(userid) {
			return new Promise((resolve, reject) => {
				let newscores = []
				let passed = true
				const Time = new Date()
				let firstmap
				async function StoreMaps() {
					//console.log(`New from ${userid.name}`)
					for await(const score of newscores) {
						const map = await LevelSchema.findOne({ "LevelID": score.map })
						if(map) {
							if(score.score <= map.TopScore) continue
							if(userid.beatsaber == map.TopPlayer) {
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
								"TopPlayer": userid.beatsaber,
								"TopPlayerName": userid.realname
							})
							if(!userid.lastmap) continue
							const previousname = map.TopPlayerName
							topchannel.send({ content: `${userid.realname} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map} snipeando a **${previousname}** | https://scoresaber.com/u/${userid.beatsaber}`})
							continue
						}
						const newmap = {
							"LevelID": score.map,
							"TopPlayer": userid.beatsaber,
							"TopScore": score.score,
							"TopPlayerName": userid.realname
						}
						await new LevelSchema(newmap).save()
						//console.log(`New map ${score.map}`)
						continue
					}
					await UserSchema.updateOne({
						"beatsaber": userid.beatsaber
					}, {
						"lastmap": firstmap
					})
					newscores = null
					resolve(new Date() - Time)
				}
				function Timeout(Page) {
					console.log("waiting 25 sec")
					setTimeout(() => {
						GetMap(Page)
					}, ms("25s"))
				}
				function GetMap(Page) {
					fetch(`https://new.scoresaber.com/api/player/${userid.beatsaber}/scores/recent/${Page.toString()}`)
					.then(async (res) => {
						//console.log(Page)
						if(res.status == 429) return Timeout(Page)
						if(res.status == 404) return StoreMaps()
						if(res.status == 520) return GetMap(Page)
						const body = await res.json()
						if(Page == 1 && body.scores[0].scoreId == userid.lastmap) return reject()
						if(Page == 1) firstmap = body.scores[0].scoreId
						body.scores.forEach(score => {
							if(score.scoreId == userid.lastmap || !passed) {
								passed = false
							}
							newscores.push({
								"map": score.leaderboardId,
								"score": score.score
							})
						})
						if(passed) return GetMap(Page + 1)
						return StoreMaps()
					})
				}
				GetMap(1)			
			})
		}
		function UpdatePlayers() {
			return new Promise(async (resolve, reject) => {
				for await (const user of players) {
					// compareconsole.log(`Checking ${user.realname}`)
					await UpdateUser(user).then((response) => {
						//console.log(`Updated user ${user.realname} in ${response/1000}s`)
					}, () => {
						//console.log(`${user.realname} had no new plays`)
					})
				}
				resolve()
			})
		}
		await UpdatePlayers()
		return
};