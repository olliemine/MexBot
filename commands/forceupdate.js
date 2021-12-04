const UpdateUsers = require("../functions/UpdateUsers")
const errorhandle = require("../functions/error")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const infohandle = require("../functions/info")
const CheckRoles = require("../functions/CheckRoles")
const InfoChannelMessage = require("../functions/InfoChannelMessage")
const { serverId } = require("../info.json")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	admin: true,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		message.channel.sendTyping()
		let user = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
		const server = await DiscordClient.guilds.fetch(serverId)
		//const ranks = [server.roles.cache.get("905874757331857454"), server.roles.cache.get("905874757331857457"), server.roles.cache.get("905874757331857456"), server.roles.cache.get("905874757331857455")]
		
		if(user) return UpdateUser(user.id)
		try {
			await UpdateUsers(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		}
		message.channel.send({content: `Succesfully updated users! took ${Date.now() - message.createdTimestamp}ms to execute!`})
	}
}