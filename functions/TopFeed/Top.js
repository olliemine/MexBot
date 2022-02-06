const fetch = require("node-fetch")
const UserSchema = require("../../models/UserSchema")
const StoreMaps = require("./StoreMaps")
const Score = require("./Score")
const StoreUserFull = require("./StoreUserFull")
const GetAll = require("./GetAll")
const Util = require("../../Util")

/**
 * @typedef {import(Util.UserObject} UserObject
 * @param {[Util.UserObject]=} customPlayers 
 */
module.exports = async (customPlayers = null) => { //country: "MX", bsactive: true, lastrank: { $lte: 50 }
		const players = customPlayers || await UserSchema.find({ country: "MX", bsactive: true, lastrank: { $lte: 50 }})
		let NewPlay = false
		async function GetFirstMap(beatsaber) {
			return fetch(`https://scoresaber.com/api/player/${beatsaber}/scores?sort=recent&page=1&withMetadata=false`)
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
					const firstscore = body.playerScores[0]
					const firstmap = {
						id: firstscore.score.id,
						date: firstscore.score.timeSet
					}
					if(firstscore.score.id == user.lastmap) {
						if(firstscore.score.timeSet != user.lastmapdate) {
							await StoreMaps([new Score(firstscore)], user, firstmap)
						}
						continue
					}
					NewPlay = true
					let newscores = []
					let passed = false
					for(const score of body.playerScores) {
						if(score.score.id == user.lastmap) {
							passed = true
							break
						}
						newscores.push(new Score(score))
					}
					if(!passed) {
						checkAgain.push(user)
						continue
					}
					await StoreMaps(newscores, user, firstmap)
					continue
				}
				for await (const user of checkAgain) {
					await StoreUserFull(user).then(() => {
					}).catch(() => {
						console.log(`User ${user.realname} couldnt be checked`)
					})
				}
				resolve()
			})
		}
		await UpdatePlayers()
		if(!NewPlay) return
		await GetAll()
		return
};