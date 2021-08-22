const UpdateUsers = require("../functions/UpdateUsers")
const errorhandle = require("../functions/error")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const infohandle = require("../functions/info")
const CheckRoles = require("../functions/CheckRoles")
const InfoChannelMessage = require("../functions/InfoChannelMessage")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	api: true,
	admin: true,
	dm: false,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		message.channel.startTyping();
		const user = message.guild.member(message.mentions.users.first() || DiscordClient.users.cache.get(args[0]))
		const server = await DiscordClient.guilds.fetch("822514160154706010")
		const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
		async function InactiveAccount(user1) {
			const discorduser = await server.members.fetch(user1.discord)
			discorduser.send({content: "Hey! tu cuenta ahora esta inactiva, porfavor has `!active` cuando este reactivada!"})
			discorduser.setNickname(`IA | ${user1.name}`)
			await UserSchema.findOneAndUpdate({
				discord: user1.discord
			}, {
				active: false
			})
			ranks.forEach((rank) => {
				discorduser.roles.remove(rank)
			})
			infohandle(DiscordClient, "Update User", `${user1.name} is now inactive`)
		}
		async function UpdateUser(id) {
			const userinfo = await UserSchema.findOne({ discord: id, active: true, lastrank: {$ne: null} })
			if(!userinfo) return message.channel.send({content: "El men no tiene cuenta Pepengagn"})
			let usersupdated = []
			async function FetchUser(usr) {
				return new Promise((resolve, reject) => {
					async function FetchUsers(user1) {
						await fetch(`https://new.scoresaber.com/api/player/${user1.beatsaber}/full`)
						.then(res => res.json())
						.then(async (body) => {
							if(body.error) return errorhandle(DiscordClient, new Error("Couldnt get user " + user1.name))
							if(body.playerInfo.inactive == 1) return InactiveAccount(user1)
							const discorduser = await server.members.fetch(user1.discord)
							CheckRoles(body.playerInfo.countryRank, discorduser, ranks)
							discorduser.setNickname(`#${body.playerInfo.countryRank} | ${user1.name}`)						
							usersupdated.push({
								"user": user1.realname,
								"update":  user1.lastrank - body.playerInfo.countryRank, 
								"lastrank": user1.lastrank,
								"newrank": body.playerInfo.countryRank
							})
							await UserSchema.findOneAndUpdate({
								discord: user1.discord
							}, {
								lastrank: body.playerInfo.countryRank
							})
							const member = await UserSchema.findOne({ active: true, lastrank: body.playerInfo.countryRank, discord: {$ne: user1.discord } })
							if(member) return FetchUsers(member)
							InfoChannelMessage(DiscordClient, usersupdated)
							resolve()
						}).catch((err) => {
							return errorhandle(DiscordClient, err)
						})
					}
					FetchUsers(usr)
				})
			}
			await FetchUser(userinfo)
			message.channel.stopTyping();
			message.channel.send({content: "Updated " + userinfo.name})
			return infohandle(DiscordClient, "Updated Users", `Updated Users ${usersupdated.join(", ")}`)
			
		}
		if(user) return UpdateUser(user.id)
		try {
			await UpdateUsers(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		}
		message.channel.send({content: `Succesfully updated users! took ${Date.now() - message.createdTimestamp}ms to execute!`})
		message.channel.stopTyping();
	}
}