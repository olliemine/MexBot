const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const errorhandle = require("../functions/error")

module.exports = {
	name : "desync",
	description: "pong",
	api: false,
	admin: true,
	dm: false,
	cooldown: 1,
	async execute(message, DiscordClient, args) {
		if(args.length != 1) return message.channel.send("Tienes que mencionar a un usuario")
		let user = await message.guild.member(message.mentions.users.first() || DiscordClient.users.cache.get(args[0]))
		if(!user) return message.channel.send("Ese usuario es invalido")
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
		const ranks = ["822553633098170449", "822582078784012298" ,"823061333020246037", "823061825154580491", "824786196077084693", "824786280616689715"]
		ranks.forEach((rank) => {
			if(user.roles.cache.find(r => r.id === rank)) user.roles.remove(message.guild.roles.cache.get(rank))
		})
	},
};