const UserSchema = require("../models/UserSchema")
const errorhandle = require("../functions/error")

module.exports = {
	name : "desync",
	description: "pong",
	admin: true,
	dm: false,
	cooldown: 1,
	async execute(message, DiscordClient, args) {
		return message.channel.send({ content: "Nonfunctional" })
	},
};