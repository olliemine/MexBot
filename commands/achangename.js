const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const { Util } = require("discord.js")

module.exports = {
	name : "achangename",
	description: "Te cambia el nombre",
	admin: true,
	dm: false,
	cooldown: 1,
	async execute(message, DiscordClient, args) {
		let user = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
		if(user) user = await message.guild.members.fetch(user.id)
		if(!user) return message.channel.send({content: "Tienes que mencionar a un usuario smh"})
		const UserInfo = await UserSchema.findOne({
			discord: user.id
		})
		function NoMentionText(text) {
			return Util.removeMentions(text)
		}
		function GetBacktext(body) {
			if(UserInfo.lastrank === null) return `${body.playerInfo.country} | `
			if(UserInfo.active == false) return `IA | ` 
			return `#${body.playerInfo.countryRank} | `
		}
		args.shift()
		if(!UserInfo) {
			const new_name = args.join(" ")
			if(new_name.length > 32) return message.channel.send({content: "El nombre ta muy grande smh"})
			user.setNickname(new_name)
			return message.channel.send({content: NoMentionText(`Nombre cambiado a ${new_name}`)})
		} 
		await fetch(`https://new.scoresaber.com/api/player/${UserInfo.beatsaber}/full`)
		.then(res => res.json())
		.then(async (body) => {
			const backtext = GetBacktext(body)
			const fronttext = args.length ? args.join(" ") : body.playerInfo.playerName
			const fullname = `${backtext}${fronttext}`
			if(fullname.length > 32) return message.channel.send({content: "El nombre ta muy grande smh"})
			await UserSchema.findOneAndUpdate({
				discord: user.id
			}, {
				name: fronttext
			})
			user.setNickname(fullname)
			message.channel.send({content: NoMentionText(`Nombre cambiado a ${fronttext}`)})
		}).catch(() => {
			message.channel.send({content: "Parece que hay un error con scoresaber, porfavor intenta despues"})
		})
	},
};