const fetch = require("node-fetch")
const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const Discord = require("discord.js")

module.exports = {
	name : "sync",
	description: "Sincroniza a alguien con una cuenta de beatsaber, no funciona si no eres admin",
	async execute(message, DiscordClient, args) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
		if(args.length != 2) return message.channel.send("Tienes que mencionar a un usuario y a un jugador de beatsaber")
		let user = await message.guild.members.fetch(args[0])
		if(!user) return message.channel.send("Ese usuario es invalido, porfavor pon su id que me da weba programar")
		if(!+args[1]) return message.channel.send("Sorry me da flojera implementar un beatsaber name looker porfavor usa el id Pepega")
		fetch(`https://new.scoresaber.com/api/player/${args[1]}/full`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) message.channel.send("Invalid Id")
			await mongo()
			try {
				exists = await UserSchema.countDocuments({ discord: user.id })
				if(exists != 0) {
					return message.channel.send("El men ya tiene una cuenta (`!desync` para borrarla)")
				}
			} catch(err) {
				console.log(err)
				return message.channel.send("Unexpected error")
			}
			if(body.playerInfo.country != "MX") {
				return message.channel.send("men no es del mexico land Sadge")
			}
			user.setNickname(`#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`)
			const obj = {
				"discord": user.user.id,
				"beatsaber": body.playerInfo.playerId,
				"active": true,
				"lastrank": body.playerInfo.countryRank
			}

			try {
				await new UserSchema(obj).save()
				message.channel.send("Ahora " + user.user.username + " esta verificado!")
			} catch(err) {
				console.log(err)
				return message.channel.send("Unexpected Error")
			}
			user.roles.add(message.guild.roles.cache.get("822553633098170449"))
		})
	},
};