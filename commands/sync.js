const fetch = require("node-fetch")
const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const errorhandle = require("../functions/error")

module.exports = {
	name : "sync",
	description: "Sincroniza a alguien con una cuenta de beatsaber, no funciona si no eres admin",
	api: true,
	admin: true,
	dm: false,
	async execute(message, DiscordClient, args) {
		if(args.length != 2) return message.channel.send("Tienes que mencionar a un usuario y a un jugador de beatsaber")
		let user = message.guild.member(message.mentions.users.first() || DiscordClient.users.cache.get(args[0]))
		if(!user) return message.channel.send("Ese usuario es invalido")
		if(!+args[1]) return message.channel.send("Sorry me da flojera implementar un beatsaber name looker porfavor usa el id Pepega")
		fetch(`https://new.scoresaber.com/api/player/${args[1]}/full`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return message.channel.send("Invalid Id")
			if(body.playerInfo.inactive == 1) return message.channel.send("Account is inactive") 
			await mongo()
			try {
				exists = await UserSchema.countDocuments({ discord: user.id })
				if(exists != 0) {
					return message.channel.send("El men ya tiene una cuenta (`!desync` para borrarla)")
				}
			} catch(err) {
				errorhandle(DiscordClient, err)
				return message.channel.send("Unexpected error")
			}
			let fullname
			let username
			if(body.playerInfo.country != "MX") {
				fullname = `${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`
				if(fullname.length > 32) {
					user.send("Su nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
					username = "changename"
				} else {
					username = body.playerInfo.playerName
				}
				user.setNickname(`${body.playerInfo.country} | ${username}`)
				const nonuser = {
					"discord": user.user.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": null,
					"name": username,
					"realname": body.playerInfo.playerName
				}
				try {
					await new UserSchema(nonuser).save()
					message.channel.send("Ahora " + user.user.username + " es un visitante!")
				} catch(err) {
					errorhandle(DiscordClient, err)
					return message.channel.send("Unexpected Error")
				}
				return user.roles.add(message.guild.roles.cache.get("822582078784012298"))
			}

			fullname = `#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`
			if(fullname.length > 32) {
				user.send("Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
				username = "changename"
			} else {
				username = body.playerInfo.playerName
			}
			
			user.setNickname(`#${body.playerInfo.countryRank} | ${username}`)
			const obj = {
				"discord": user.user.id,
				"beatsaber": body.playerInfo.playerId,
				"active": true,
				"lastrank": body.playerInfo.countryRank,
				"name": username,
				"realname": body.playerInfo.playerName
			}

			try {
				await new UserSchema(obj).save()
				message.channel.send("Ahora " + user.user.username + " esta verificado!")
			} catch(err) {
				errorhandle(client, err)
				return message.channel.send("Unexpected Error")
			}
			user.roles.add(message.guild.roles.cache.get("822553633098170449"))
		}).catch(() => {
			message.channel.send("Parece que hay un error con scoresaber, porfavor intenta despues")
		})
	},
};