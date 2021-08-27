const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const errorhandle = require("../functions/error")
const CheckRoles = require("../functions/CheckRoles")

module.exports = {
	name : "sync",
	description: "Sincroniza a alguien con una cuenta de beatsaber, no funciona si no eres admin",
	admin: true,
	dm: true,
	cooldown: 1,
	async execute(message, DiscordClient, args) {
		if(args.length != 2) return message.channel.send({ content: "Tienes que mencionar a un usuario y a un jugador de beatsaber"})
		let user = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
		if(user) user = await message.guild.members.fetch(user.id)
		if(!user) return message.channel.send({ content: "Ese usuario es invalido"})
		if(!+args[1]) return message.channel.send({ content: "Sorry me da flojera implementar un beatsaber name looker porfavor usa el id Pepega"})
		fetch(`https://new.scoresaber.com/api/player/${args[1]}/full`)
		.then(res => res.json())
		.then(async (body) => {
			function getName(name, prefix) {
				fullname = `${prefix} | ${name}`
				let username
				if(fullname.length > 32) {
					message.channel.send({ content: "Name is too long"})
					username = "!changename"
				} else {
					username = name
				}
				return username
			}
			if(body.error) return message.channel.send({ content: `Error ${body.error.toString()}`})
			try {
				exists = await UserSchema.findOne({ beatsaber: body.playerInfo.playerId })
				if(exists) {
					if(!exists.discord) {
						const username = getName(body.playerInfo.playerName, `#${body.playerInfo.countryRank}`)
						await UserSchema.findOneAndUpdate({
							beatsaber: body.playerInfo.playerId
						}, {
							discord: user.id,
							active: true,
							name: username
						})
						user.setNickname(`#${body.playerInfo.countryRank} | ${username}`)
						user.roles.add(message.guild.roles.cache.get("822553633098170449"))
						const server = await DiscordClient.guilds.fetch("822514160154706010")
						const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
						CheckRoles(body.playerInfo.countryRank, user, ranks)
						return message.channel.send({ content: `Synced ${user.user.username} with ${body.playerInfo.playerName} successfully`})
					}
					return message.channel.send({ content: "Ya hay una usuario con esta cuenta."})
				}
			} catch(err) {
				errorhandle(DiscordClient, err)
				return message.channel.send({ content: "Unexpected error"})
			}
			let userinfo
			if(body.playerInfo.country != "MX") {//non mex
				const username = getName(body.playerInfo.playerName, body.playerInfo.country)
				user.setNickname(`${body.playerInfo.country} | ${username}`)
				userinfo = {
					"discord": user.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": null,
					"name": username,
					"realname": null,
					"lastmap": null
				}
				user.roles.add(message.guild.roles.cache.get("822582078784012298"))
			} else { //mex
				const username = getName(body.playerInfo.playerName, `#${body.playerInfo.countryRank}`)
				user.setNickname(`#${body.playerInfo.countryRank} | ${username}`)
				userinfo = {
					"discord": user.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": body.playerInfo.countryRank,
					"name": username,
					"realname": body.playerInfo.playerName,
					"lastmap": null
				}
				user.roles.add(message.guild.roles.cache.get("822553633098170449"))
				const server = await DiscordClient.guilds.fetch("822514160154706010")
				const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
				CheckRoles(body.playerInfo.countryRank, user, ranks)
			}
			try {
				await new UserSchema(userinfo).save()
				message.channel.send({ content: `Synced ${user.user.username} with ${body.playerInfo.playerName} successfully`})
			} catch(err) {
				errorhandle(DiscordClient, err)
				return message.channel.send({ content: "Unexpected Error"})
			}
		}).catch((err) => {
			errorhandle(DiscordClient, err, "either i am dumb or scoresaber is dumb")
		})
	},
};