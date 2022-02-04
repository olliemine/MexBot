const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const BaseLevelSchema = require("../models/BaseLevelSchema")

module.exports = {
	name : "delallscores",
	admin: true,
	dm: true,
	dev: true,
	cooldown: -1,
	async execute(message, args) {
		message.channel.send({content: "I hope you know what you are doing, deleting all scores"})
		await UserSchema.updateMany({country: "MX"}, {
			lastmap: null, lastmapdate: null, playHistory: [], plays: []
		})
		await LevelSchema.deleteMany()
		await BaseLevelSchema.deleteMany()
		return message.channel.send({content: "Finished"})
	},
}
