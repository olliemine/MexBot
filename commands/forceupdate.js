const UpdateUsers = require("../UpdateUsers")
const errorhandle = require("../error")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	async execute(message, DiscordClient) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
		message.channel.startTyping();
		try {
			await UpdateUsers(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		}
		message.channel.send(`Succesfully updated users! took ${Date.now() - message.createdTimestamp}ms to execute!`)
		message.channel.stopTyping();
	}
}