const UserSchema = require("../models/UserSchema")
const { client } = require("../index")
const MainChangename = require("./functions/MainChangename")
const { serverId } = require("../info.json")

module.exports = {
	name : "achangename",
	aliases: ["ach"],
	description: "Te cambia el nombre",
	admin: true,
	dm: true,
	cooldown: 1,
	async execute(message, args) {
		let member = message.mentions.users.first() || client.users.cache.get(args[0])
		const server = client.guilds.cache.get(serverId)
		args.shift()
		if(!member) return message.channel.send({content: "Tienes que mencionar a un usuario"})
		member = await server.members.fetch(member.id)
		if(!member) return message.channel.send({content: "Tienes que mencionar a un usuario valido"})
		const user = await UserSchema.findOne({ discord: member.id }, {realname: 1, bsactive: 1, country: 1, lastrank: 1})
		MainChangename(user, member, message, args)
	},
};