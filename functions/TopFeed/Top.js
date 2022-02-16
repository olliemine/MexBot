const fetch = require("node-fetch")
const UserSchema = require("../../models/UserSchema")
const StoreMaps = require("./StoreMaps")
const Score = require("./Score")
const StoreUserFull = require("./StoreUserFull")
const GetAll = require("./GetAll")
const {UserObject, GetPromises} = require("../../Util")
const ErrorHandler = require("../error")

/**
 * @typedef {import(UserObject} UserObject
 * @param {[UserObject]=} customPlayers 
 */
module.exports = async (customPlayers = null) => { //country: "MX", bsactive: true, lastrank: { $lte: 50 }
		const players = customPlayers || await UserSchema.find({ country: "MX", bsactive: true, lastrank: { $lte: 50 }})
		let playersId = []
		players.forEach(player => playersId.push(player.beatsaber))
		let NewPlay = false
		const GetFirstMap = async (beatsaber) => fetch(`https://scoresaber.com/api/player/${beatsaber}/scores?sort=recent&page=1&withMetadata=false`)
		
		full = await GetPromises(GetFirstMap, playersId)
		if(!full) return

		let checkAgain = []
		let counter = 0
		for await (const data of full) {
			const user = players[counter]
			counter++
			if(!user.lastmap) {
				checkAgain.push(user)
				NewPlay = true
				continue
			}
			const firstscore = data.playerScores[0]
			const firstmap = {
				id: firstscore.score.id,
				date: firstscore.score.timeSet
			}
			if(firstscore.score.id == user.lastmap) {
				if(firstscore.score.timeSet != user.lastmapdate) {
					await StoreMaps([Score(firstscore)], user, firstmap)
				}
				continue
			}
			NewPlay = true
			let newscores = []
			let passed = false
			for(const score of data.playerScores) {
				if(score.score.id == user.lastmap) {
					passed = true
					break
				}
				newscores.push(Score(score))
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
			}).catch((e) => {
				ErrorHandler(e)
			})
		}

		if(!NewPlay) return
		await GetAll()
		return
};