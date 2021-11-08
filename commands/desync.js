const UserSchema = require("../models/UserSchema")
const errorhandle = require("../functions/error")

module.exports = {
	name : "desync",
	description: "pong",
	admin: true,
	dm: false,
	cooldown: 1,
	async execute(message, DiscordClient, args) {
		if(args.length != 1) return message.channel.send({content: "Tienes que mencionar a un usuario"})
		let user = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
		if(user) user = await message.guild.members.fetch(user.id)
		if(!user) return message.channel.send({content: "Ese usuario es invalido"})
		function RemoveRoles() {
			const ranks = ["905874757331857453", "905874757331857452" ,"823061333020246037", "823061825154580491", "824786196077084693", "824786280616689715"]
			ranks.forEach((rank) => {
				if(user.roles.cache.find(r => r.id === rank)) user.roles.remove(message.guild.roles.cache.get(rank))
			})
		}
		try {
			exists = await UserSchema.findOne({ discord: user.id })
			if(!exists) return message.channel.send({content: "El men no tiene una cuenta (`!sync` para añadir una)"})
			if(exists.lastrank <= 50) {
				RemoveRoles()
				await UserSchema.findOneAndUpdate({
					discord: user.id
				}, {
					discord: null,
					active: false,
					name: null
				})
				return message.channel.send({content: "Ahora " + user.user.username + " no tiene cuenta"})
			}
		} catch(err) {
			errorhandle(DiscordClient, err)
			return message.channel.send({content: "Unexpected error"})
		}
		user.setNickname("")
		try {
			await UserSchema.findOneAndDelete({ discord: user.id })
			message.channel.send({content: "Ahora " + user.user.username + " no tiene cuenta"})
		} catch(err) {
			errorhandle(DiscordClient, err)
			return message.channel.send({content: "Unexpected error"})
		}
		RemoveRoles()
	},
};