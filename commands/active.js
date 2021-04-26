const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const mongo = require("../mongo")
const infohandle = require("../info")
const UpdateUsers = require("../UpdateUsers")

module.exports = {
	name : "active",
	description: "active",
	async execute(message) {
		await mongo()
		const user = await UserSchema.findOne({ discord: message.author.id, active: false })
		if(!user) return message.channel.send("Ya esta activa tu cuenta o no tienes cuenta")
		await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
			if(body.error) return message.channel.send("Unexpected error")
			if(body.playerInfo.inactive == 1) return message.channel.send("Sigues inactivo en scoresaber, haz una nueva jugada y espera hasta 1 hora")
			message.channel.send("Ahora estas activo!")
			await UserSchema.findOneAndUpdate({
				discord: user.discord
			}, {
				active: true
			})
			await UpdateUsers(Client)
			infohandle(Client, "User updated", `User ${user.name} is now active`)
		})
	},
};