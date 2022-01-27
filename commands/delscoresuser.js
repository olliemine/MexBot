const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const BaseLevelSchema = require("../models/BaseLevelSchema")
const {GetUserInfo} = require("../Util")

module.exports = {
	name : "delscoresuser",
	admin: true,
	dm: true,
	dev: true,
	cooldown: -1,
	async execute(message, DiscordClient, args) {
		const user = await GetUserInfo(args, message)
		if(!user) {
			return message.channel.send({content: "No user found."})
		}
		await UserSchema.findOneAndUpdate({ beatsaber: user.beatsaber }, { lastmap: null, lastmapdate: null, playHistory: [], plays: []})
		let levels = await LevelSchema.find({
			Leaderboard: {$elemMatch: {PlayerID: user.beatsaber}}
		})
		let updateBulkWrite = []
		levels.forEach(level => {
			if(level.PlayerCount == 1) return updateBulkWrite.push({deleteOne: {
				"filter": {"LevelID": level.LevelID}
			}})
			let newLeaderboard = level.Leaderboard.filter(l => l.PlayerID != user.beatsaber)
			updateBulkWrite.push({ updateOne: {
				"filter": { "LevelID": level.LevelID},
				"update": { $set: { "TopPlayer": newLeaderboard[0].PlayerID, "TopScore": newLeaderboard[0].Score,"TopPlayerName": newLeaderboard[0].PlayerName, "PlayerCount": level.PlayerCount - 1, "Leaderboard": newLeaderboard  }}
			}})
		})
		await LevelSchema.bulkWrite(updateBulkWrite)
		const baselevels = await BaseLevelSchema.find()
		let baseUpdateBulkWrite = []
		levels = await LevelSchema.find()
		baselevels.forEach(level => {
			const map = levels.find(l => l.Hash === level.Hash)
			if(map) return
			baseUpdateBulkWrite.push({deleteOne: {
				"filter": { "Hash": level.Hash }
			}})
		})
		await BaseLevelSchema.bulkWrite(baseUpdateBulkWrite)
		message.channel.send({content: "User scores have been deleted"})
	},
}