const UpdateUsers = require("../UpdateUsers")
const errorhandle = require("../error")
const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const infohandle = require("../info")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	api: true,
	admin: true,
	dm: false,
	async execute(message, DiscordClient, args) {
		message.channel.startTyping();
		const user = message.guild.member(message.mentions.users.first() || DiscordClient.users.cache.get(args[0]))
		const server = await DiscordClient.guilds.fetch("822514160154706010")
		const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
		async function InactiveAccount(user1) {
			const discorduser = await server.members.fetch(user1.discord)
			discorduser.send("Hey! tu cuenta ahora esta inactiva, porfavor has `!active` cuando este reactivada!")
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
		async function UpdateUser(id) {
			await mongo()
			const userinfo = await UserSchema.findOne({ discord: id, active: true, lastrank: {$ne: null} })
			if(!userinfo) return message.channel.send("El men no tiene cuenta Pepengagn")
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
							CheckRoles(body.playerInfo.countryRank, discorduser)
							usersupdated.push(`${user1.realname} to ${body.playerInfo.countryRank}`)
							discorduser.setNickname(`#${body.playerInfo.countryRank} | ${user1.name}`)
							await UserSchema.findOneAndUpdate({
								discord: user1.discord
							}, {
								lastrank: body.playerInfo.countryRank
							})
							const member = await UserSchema.findOne({ active: true, lastrank: body.playerInfo.countryRank, discord: {$ne: user1.discord } })
							if(member) return FetchUsers(member)
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
			message.channel.send("Updated " + userinfo.name)
			return infohandle(DiscordClient, "Updated Users", `Updated Users ${usersupdated.join(", ")}`)
			
		}
		if(user) return UpdateUser(user.id)
		try {
			await UpdateUsers(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		}
		message.channel.send(`Succesfully updated users! took ${Date.now() - message.createdTimestamp}ms to execute!`)
		message.channel.stopTyping();
	}
}