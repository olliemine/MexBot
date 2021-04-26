const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")

module.exports = {
	name : "changename",
	description: "Te cambia el nombre",
	aliases: ["ch"],
	async execute(message, DiscordClient, args) {
		await mongo()
		if (!Array.isArray(args) || !args.length) {
			const user = await UserSchema.findOne({ discord: message.author.id })
			await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`)
				.then(res => res.json())
				.then(async (body) => {
					if(body.error) {
						return message.channel.send("Unexpected error")
					}
					let backtext
					if(user.lastrank === null) {
						backtext = `${body.playerInfo.country} | `
					} else if(user.active == false) backtext = `IA | `
					else backtext = `#${body.playerInfo.countryRank} | `
					
					const fullname = `${backtext}${body.playerInfo.playerName}`
					if(fullname.length > 32) return message.channel.send("Could'nt change name because default name is too big.")
					await UserSchema.findOneAndUpdate({
						discord: message.author.id
					}, {
						name: body.playerInfo.playerName
					})
					message.member.setNickname(`${backtext}${body.playerInfo.playerName}`)
					return message.channel.send(`Succesfully changed name to ${body.playerInfo.playerName}`)
				})
		} else {
			const new_name = args.join(" ")
			const user = await UserSchema.findOne({ discord: message.author.id })
			await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`)
			.then(res => res.json())
			.then(async (body) => {
				if(body.error) {
					return message.channel.send("Unexpected error")
				}
				let backtext
				if(user.lastrank === null) {
					backtext = `${body.playerInfo.country} | `
				} else if(user.active == false) backtext = `IA | ` 
				else backtext = `#${body.playerInfo.countryRank} | `
				
				const full_new_name = `${backtext}${new_name}`
				if(full_new_name.length > 32) return message.channel.send("El nombre es muy largo, porfavor elige un nombre mas pequeño")
				await UserSchema.findOneAndUpdate({
					discord: message.author.id
				}, {
					name: new_name
				})
				message.member.setNickname(full_new_name)
				return message.channel.send(`Succesfully changed name to ${new_name}`)
			})
		}

	},
};