const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")

module.exports = {
	name : "achangename",
	description: "Te cambia el nombre",
	api: true,
	admin: true,
	dm: false,
	async execute(message, DiscordClient, args) {
		const user = message.guild.member(message.mentions.users.first() || DiscordClient.users.cache.get(args[0]))
		if(!user) return message.channel.send("Tienes que mencionar a un usuario smh")
		await mongo()
		const UserInfo = await UserSchema.findOne({
			discord: user.id
		})
		if(!UserInfo) {
			args.shift()
			const new_name = args.join(" ")
			if(new_name.length > 32) return message.channel.send("El nombre ta muy grande smh")
			user.setNickname(new_name)
			return message.channel.send(`Nombre cambiado a ${newname}`)
		} 
		args.shift()
		const newname = args.join(" ")
		await fetch(`https://new.scoresaber.com/api/player/${UserInfo.beatsaber}/full`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return message.channel.send("Unexpected error")
			let backtext
			if(UserInfo.lastrank === null) {
				backtext = `${body.playerInfo.country} | `
			} else if(UserInfo.active == false) backtext = `IA | `
			else backtext = `#${body.playerInfo.countryRank} | `

			const fullname = `${backtext}${newname}`
			if(fullname.length > 32) return message.channel.send("El nombre ta muy grande smh")
			await UserSchema.findOneAndUpdate({
				discord: user.id
			}, {
				name: newname
			})
			user.setNickname(fullname)
			message.channel.send(`Nombre cambiado a ${newname}`)
		}).catch(() => {
			message.channel.send("Parece que hay un error con scoresaber, porfavor intenta despues")
		})
	},
};