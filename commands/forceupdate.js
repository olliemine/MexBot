const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	async execute(message, DiscordClient) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
		await mongo().then(async () => {
			UserList = await UserSchema.find({ active: true })
			const server = await DiscordClient.guilds.fetch("822514160154706010")
			UserList.forEach(async (user) => {
				await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
					if(body.error) return console.log("Coudnt fetch user " + user.discord)
					if(user.lastrank == body.playerInfo.countryRank) return
					const discorduser = await server.members.fetch(user.discord)
					discorduser.setNickname(`#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`)
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