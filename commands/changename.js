const UserSchema = require("../models/UserSchema")
const { serverId } = require("../info.json")
const { client } = require("../index")
const MainChangename = require("./functions/MainChangename")

module.exports = {
	name : "changename",
	description: "Te cambia el nombre",
	aliases: ["ch"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, args) {
		const user = await UserSchema.findOne({ discord: message.author.id }, { realname: 1, bsactive: 1, country: 1, lastrank: 1 })
		const member = message.member?.guild?.id == serverId ? message.member : client.guilds.cache.get(serverId).members.cache.get(message.author.id)
		MainChangename(user, member, message, args)
	},
};