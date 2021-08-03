const fetch = require("node-fetch")
const mongo = require("../mongo")
const puppeteer = require("puppeteer")
const errorhandle = require("./error")
const UsersLevelCacheSchema = require("../models/UsersLevelCacheSchema")
const LevelSchema = require("../models/LevelSchema")
const UserSchema = require("../models/UserSchema")
const ms = require("ms")

module.exports = async (DiscordClient) => {
		const Totaltime = new Date()
		await mongo()
		const browser = await puppeteer.launch({
			args: ['--no-sandbox']
		})
		const page = await browser.newPage()
		await page.goto("https://scoresaber.com/global?country=mx", { waitUntil: "networkidle0" })
		let info
		try {  //https://stackoverflow.com/a/60733311/14550193
			info = await page.evaluate(() => {
				const rows = document.querySelectorAll('table tr');
				return Array.from(rows, row => {
					const columns = row.querySelectorAll('td');
					return Array.from(columns, column => column.innerText);
				});
			})
			info.shift()
			info.forEach((row) => {
				row[1] = row[1].substring(1)
				row.shift()
				row[1] = row[1].substring(1)
			})
		} catch(err) {
			errorhandle(DiscordClient, err)
		} finally {
			browser.close()
		}
		const otherplayers = await UserSchema.find({ active: true, lastrank: {$ne: null}, lastrank: { $gte: 51 }  })
		const usersid = await UsersLevelCacheSchema.find()
		const topchannel = DiscordClient.channels.cache.get("846148391365115964")
		async function GetUserID(name) {
			let userid = null
			let no = false
			usersid.forEach(entity => {
				if(entity.name != name) return
				userid = entity
			})
			if(userid) return userid	
			const URLN = new URL(`https://new.scoresaber.com/api/players/by-name/${name}`)
			await fetch(URLN)
			.then(res => res.json())
			.then(async (body) => {
				if(body.error) {
					no = true
					return errorhandle(DiscordClient, new Error(body.error.message), "The name is too short, probably, fill name manually " + name)
				}
				let checked = false
				for await(const entity of usersid) {//Dumbass javascript stuff
					if(entity.id != body.players[0].playerId) continue;
					userid = {
						"name": name,
						"id": body.players[0].playerId,
						"lastmap": entity.lastmap,
						"discord": entity.discord
					}
					await UsersLevelCacheSchema.updateOne({
						"id": body.players[0].playerId
					}, {
						"name": name
					})
					checked = true
				}
				if(!checked) return NewAccount()
				
				async function NewAccount() {
					const user = await UserSchema.findOne({ beatsaber: body.players[0].playerId })
					let discord = null
					if(user) discord = user.discord
					await new UsersLevelCacheSchema({
						"name": name,
						"id": body.players[0].playerId,
						"lastmap": "0",
						"discord": discord		
					}).save()
					userid = {
						"name": name,
						"id": body.players[0].playerId,
						"lastmap": "0",
						"discord": discord, 
						"new": true	
					}
				}
				
			})
			if(!no)	return userid
		}
		async function GetUserIDviaID(id, discordid, name) {
			let userid = null
			usersid.forEach(entity => {
				if(entity.id != id) return
				userid = entity
			})
			if(userid) return userid
			
			await new UsersLevelCacheSchema({
				"name": name,
				"id": id,
				"lastmap": "0",
				"discord": discordid
			}).save()
			userid = {
				"name": name,
				"id": id,
				"lastmap": "0",
				"discord": discordid,
				"new": true
			}
			return userid
		}
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
							if(userid.id == map.TopPlayer) {
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
								"TopPlayer": userid.id,
								"TopPlayerName": userid.name
							})
							if(userid.new) continue
							const previousname = map.TopPlayerName
							topchannel.send(`${userid.name} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map} snipeando a **${previousname}** | https://scoresaber.com/u/${userid.id}`)
							continue
						}
						const newmap = {
							"LevelID": score.map,
							"TopPlayer": userid.id,
							"TopScore": score.score,
							"TopPlayerName": userid.name
						}
						await new LevelSchema(newmap).save()
						//console.log(`New map ${score.map}`)
						continue
					}
					await UsersLevelCacheSchema.updateOne({
						"id": userid.id
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
					fetch(`https://new.scoresaber.com/api/player/${userid.id}/scores/recent/${Page.toString()}`)
					.then(async (res) => {
						//console.log(Page)
						if(res.status == 429) return Timeout(Page)
						if(res.status == 404) return StoreMaps()
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
				for await(const row of info) {
					//console.log(`Checking ${row[1]}`)
					const userid = await GetUserID(row[1])
					await UpdateUser(userid).then((response) => {
						//console.log(`Updated user ${userid.name} in ${response/1000}s`)

					}, () => {
						//console.log(`${userid.name} had no new plays`)
					})
				}
				for await (const user of otherplayers) {
					//console.log(`Checking ${user.realname}`)
					const userid = await GetUserIDviaID(user.beatsaber, user.discord, user.realname)
					await UpdateUser(userid).then((response) => {
						//console.log(`Updated user ${userid.name} in ${response/1000}s`)
					}, () => {
						//console.log(`${userid.name} had no new plays`)
					})
				}
				resolve()
			})
		}
		await UpdatePlayers()
		return
};