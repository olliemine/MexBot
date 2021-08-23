const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const { Util } = require("discord.js")

module.exports = {
	name : "changename",
	description: "Te cambia el nombre",
	aliases: ["ch"],
	api: true,
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		const user = await UserSchema.findOne({ discord: message.author.id })
		const server = await DiscordClient.guilds.fetch("822514160154706010")
		const member = await server.members.fetch(message.author.id)
		function NoMentionText(text) {
			return Util.removeMentions(text)
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
				let backtext
				if(!Array.isArray(args) || !args.length) {
					if(user.lastrank === null) {
						backtext = `${body.playerInfo.country} | `
					} else if(user.active == false) backtext = `IA | `
					else backtext = `#${body.playerInfo.countryRank} | `
					
					const fullname = `${backtext}${body.playerInfo.playerName}`
					if(fullname.length > 32) return message.channel.send({content: "Could not change name because default name is too big."})
					await UserSchema.findOneAndUpdate({
						discord: message.author.id
					}, {
						name: body.playerInfo.playerName
					})
	
					member.setNickname(`${backtext}${body.playerInfo.playerName}`)
					return message.channel.send({ content: NoMentionText(`Succesfully changed name to ${body.playerInfo.playerName}`)})
				} else {
					const new_name = args.join(" ")
					if(user.lastrank === null) {
						backtext = `${body.playerInfo.country} | `
					} else if(user.active == false) backtext = `IA | ` 
					else backtext = `#${body.playerInfo.countryRank} | `
					
					const full_new_name = `${backtext}${new_name}`
					if(full_new_name.length > 32) return message.channel.send({content: "El nombre es muy largo, porfavor elige un nombre mas pequeño"})
					await UserSchema.findOneAndUpdate({
						discord: message.author.id
					}, {
						name: new_name
					})
					
					member.setNickname(full_new_name)
					return message.channel.send({content: NoMentionText(`Succesfully changed name to ${new_name}`)})
				}
			}).catch(() => {
				message.channel.send({content: "Parece que hay un error con scoresaber, porfavor intenta despues"})
			})
		}
		
		
		

	},
};