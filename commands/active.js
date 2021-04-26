const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const mongo = require("../mongo")
const infohandle = require("../info")
const UpdateUsers = require("../UpdateUsers")

module.exports = {
	name : "active",
	description: "active",
	async execute(message, DiscordClient) {
		await mongo()
		const user = await UserSchema.findOne({ discord: message.author.id, active: false, lastrank: {$ne: null} })
		if(!user) return message.channel.send("")
		const server = await DiscordClient.guilds.fetch("822514160154706010")
		const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
		function CheckRoles(number, discorduser) {
			if(number <= 10) {//Top 10?
				if(!discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.add(ranks[0])//Checkar si tiene role y si no dar role
				if(number <= 3) {//Es top 3?
					if(!discorduser.roles.cache.find(r => r.id === ranks[number].id)) {//Tiene el role?
						discorduser.roles.add(ranks[number])
						for (let index = 1; index <= 3; index++) {
							if(index == number) continue
							if(discorduser.roles.cache.find(r => r.id === ranks[index].id)) discorduser.roles.remove(ranks[index])
						}
					}
				} else if(discorduser.roles.cache.find(r => r.id === ranks[1].id) || discorduser.roles.cache.find(r => r.id === ranks[2].id) || discorduser.roles.cache.find(r => r.id === ranks[3].id)) { //Quitar roles y return
					for (let index = 1; index <= 3; index++) {
						discorduser.roles.remove(ranks[index])
					}
				}
			} else if(discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.remove(ranks[0]) //Quitar role y return
		}

		await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
			if(body.error) return message.channel.send("Unexpected error")
			if(body.playerInfo.inactive == 1) return message.channel.send("Sigues inactivo en scoresaber, haz una nueva jugada y espera hasta 1 hora")
			message.channel.send("Ahora estas activo!")
			const discorduser = await server.members.fetch(user.discord)
			CheckRoles(body.playerInfo.countryRank, discorduser)
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