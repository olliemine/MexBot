const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	async execute(message, DiscordClient) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
		await mongo().then(async () => {
			const UserList = await UserSchema.find({ active: true })
			const server = await DiscordClient.guilds.fetch("822514160154706010")
			const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
			UserList.forEach(async (user) => {
				await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
					if(body.error) return console.log("Coudnt fetch user " + user.discord)
					if(user.lastrank == body.playerInfo.countryRank) return
					const discorduser = await server.members.fetch(user.discord)

					/*
					Spaghetti code awaits!
					I don't really see the point on making this super efficient
					I mean this already has the piramide build on it so yeah
					There is probably a better way to do this
					*/
					if(body.playerInfo.countryRank <= 10) {//Top 10?
						if(!discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.add(ranks[0])//Checkar si tiene role y si no dar role
						if(body.playerInfo.countryRank <= 3) {//Es top 3?
							if(!discorduser.roles.cache.find(r => r.id === ranks[body.playerInfo.countryRank].id)) {//Tiene el role?
								discorduser.roles.add(ranks[body.playerInfo.countryRank])
								for (let index = 1; index <= 3; index++) {
									if(index == body.playerInfo.countryRank) continue
									if(discorduser.roles.cache.find(r => r.id === ranks[index].id)) discorduser.roles.remove(ranks[index])
								}
							}
						} else if(discorduser.roles.cache.find(r => r.id === ranks[1].id) || discorduser.roles.cache.find(r => r.id === ranks[2].id) || discorduser.roles.cache.find(r => r.id === ranks[3].id)) { //Quitar roles y return
							for (let index = 1; index <= 3; index++) {
								discorduser.roles.remove(ranks[index])
							}
						}
					} else if(discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.remove(ranks[0]) //Quitar role y return

					discorduser.setNickname(`#${body.playerInfo.countryRank} | ${user.name}`)
					await UserSchema.findOneAndUpdate({
						discord: user.discord
					}, {
						lastrank: body.playerInfo.countryRank
					})
				})
			})
		})
		message.channel.send("Succesfully updated users!")
	}
}