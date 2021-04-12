const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")

module.exports = {
	name : "changename",
	description: "Te cambia el nombre",
	async execute(message, DiscordClient, args) {
		if (!Array.isArray(args) || !args.length) {
			await mongo()
			const user = await UserSchema.findOne({ discord: message.author.id })
				await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`)
				.then(res => res.json())
				.then(async (body) => {
					if(body.error) {
						return message.channel.send("Unexpected error")
					}
					await UserSchema.findOneAndUpdate({
						discord: message.author.id
					}, {
						name: body.playerInfo.playerName
					})
					message.member.setNickname(`#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`)
					return message.channel.send(`Succesfully changed name to ${body.playerInfo.playerName}`)
				})
		} else {
			const new_name = args.join(" ")
			await mongo()
			const user = await UserSchema.findOne({ discord: message.author.id })
			await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`)
			.then(res => res.json())
			.then(async (body) => {
				if(body.error) {
					return message.channel.send("Unexpected error")
				}
				const full_new_name = `#${body.playerInfo.countryRank} | ${new_name}`
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