const UpdateUsers = require("../UpdateUsers")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	async execute(message, DiscordClient) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
		await UpdateUsers(DiscordClient)
		message.channel.send("Succesfully updated users!")
	}
}