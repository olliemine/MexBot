const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")

module.exports = {
	name : "achangename",
	description: "Te cambia el nombre",
	async execute(message, DiscordClient, args) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
		const user = message.guild.member(message.mentions.users.first() || DiscordClient.users.cache.get(args[0]))
		if(!user) return message.channel.send("Tienes que mencionar a un usuario smh")
		await mongo()
		const UserInfo = await UserSchema.findOne({
			discord: user.id,
			active: true
		})
		if(!UserInfo) return message.channel.send("El men no tiene una entrada activa")
		args.shift()
		const newname = args.join(" ")
		await fetch(`https://new.scoresaber.com/api/player/${UserInfo.beatsaber}/full`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return message.channel.send("Unexpected error")
			let backtext
			if(UserInfo.lastrank === null) {
				backtext = `${body.playerInfo.country} | `
			} else backtext = `#${body.playerInfo.countryRank} | `

			const fullname = `${backtext}${newname}`
			if(fullname.length > 32) return message.channel.send("El nombre ta muy grande smh")
			await UserSchema.findOneAndUpdate({
				discord: user.id
			}, {
				name: newname
			})
			user.setNickname(fullname)
			message.channel.send(`Nombre cambiado a ${newname}`)
		})
	},
};