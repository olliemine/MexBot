const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const { Util } = require("discord.js")

module.exports = {
	name : "changename",
	description: "Te cambia el nombre",
	aliases: ["ch"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		const user = await UserSchema.findOne({ discord: message.author.id })
		const server = await DiscordClient.guilds.fetch("905874757331857448")
		const member = await server.members.fetch(message.author.id)
		if(member.roles.highest.position > server.members.resolve(DiscordClient.user).roles.highest.position) return message.channel.send({content: "No se puede cambiar el nombre porque tiene role mayor."})
		function NoMentionText(text) {
			return Util.removeMentions(text)
		}
		function GetBacktext(body) {
			if(user.lastrank === null) return `${body.playerInfo.country} | `
			if(user.active == false) return `IA | ` 
			return `#${body.playerInfo.countryRank} | `
		}
		if(!user) {
			if(!Array.isArray(args) || !args.length) return message.channel.send({content: "Necesitas poner un nombre"})
			const new_name = args.join(" ")
			if(new_name.length > 32) return message.channel.send({content: "El nombre es muy largo, porfavor elige un nombre mas pequeño"})			
			member.setNickname(new_name)
			return message.channel.send({content: NoMentionText(`Succesfully changed name to ${new_name}`)})
		} else {
			fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`)
			.then(res => res.json())
			.then(async (body) => {
				if(body.error) return message.channel.send({content: "Unexpected error " + body.error.message})
				const backtext = GetBacktext(body)
				const fronttext = args.length ? args.join(" ") : body.playerInfo.playerName
				const fullname = `${backtext}${fronttext}`
				if(fullname.length > 32) return message.channel.send({content: "El nombre es muy largo, porfavor elige un nombre mas pequeño"})
				await UserSchema.findOneAndUpdate({
					discord: message.author.id
				}, {
					name: fronttext
				})
				member.setNickname(fullname)
				return message.channel.send({content: NoMentionText(`Succesfully changed name to ${fullname}`)})
			}).catch(() => {
				message.channel.send({content: "Parece que hay un error con scoresaber, porfavor intenta despues"})
			})
		}

	},
};