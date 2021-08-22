const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const infohandle = require("../functions/info")
const UpdateUsers = require("../functions/UpdateUsers")
const CheckRoles = require("../functions/CheckRoles")

module.exports = {
	name : "active",
	description: "active",
	api: true,
	admin: false,
	dm: true,
	cooldown: 5,
	async execute(message, DiscordClient) {
		const user = await UserSchema.findOne({ discord: message.author.id, active: false, lastrank: {$ne: null} })
		if(!user) return message.channel.send({content: "Tu cuenta ya esta activada, si crees que esto es un error contacta a olliemine"})
		const server = await DiscordClient.guilds.fetch("822514160154706010")
		const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
		fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
			if(body.error) return message.channel.send({content: "Unexpected error " + body.error})
			if(body.playerInfo.inactive == 1) return message.channel.send({content: "Sigues inactivo en scoresaber, haz una nueva jugada y espera hasta 1 hora"})
			message.channel.send({content: "Ahora estas activo!"})
			const discorduser = await server.members.fetch(user.discord)
			CheckRoles(body.playerInfo.countryRank, discorduser, ranks)
			await UserSchema.findOneAndUpdate({
				discord: user.discord
			}, {
				active: true
			})
			await UpdateUsers(Client)
			infohandle(Client, "User updated", `User ${user.name} is now active`)
		}).catch(() => {
			message.channel.send({content: "Parece que hay un error con scoresaber, porfavor intenta despues"})
		})
	},
};