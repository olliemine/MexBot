const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const errorhandle = require("../error")

module.exports = {
	name : "desync",
	description: "pong",
	api: false,
	async execute(message, DiscordClient, args) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
		if(args.length != 1) return message.channel.send("Tienes que mencionar a un usuario")
		let user = await message.guild.members.fetch(args[0])
		if(!user) return message.channel.send("Ese usuario es invalido, porfavor pon su id que me da weba programar")
		await mongo()
		try {
			exists = await UserSchema.countDocuments({ discord: user.id })
			if(exists != 1) {
				return message.channel.send("El men no tiene una cuenta (`!sync` para añadir una)")
			}
		} catch(err) {
			errorhandle(DiscordClient, err)
			return message.channel.send("Unexpected error")
		}
		user.setNickname("")
		try {
			await UserSchema.findOneAndDelete({ discord: user.id })
			message.channel.send("Ahora " + user.user.username + " no tiene cuenta")
		} catch(err) {
			errorhandle(DiscordClient, err)
			return message.channel.send("Unexpected Error")
		}
		user.roles.remove(message.guild.roles.cache.get("822582078784012298"))
		user.roles.remove(message.guild.roles.cache.get("822553633098170449"))
	},
};