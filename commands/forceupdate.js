const UpdateUsers = require("../functions/UpdateUsers")
const errorhandle = require("../functions/error")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	admin: true,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		const time = new Date()
		message.channel.sendTyping()
		try {
			await UpdateUsers(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		}
		message.channel.send({content: `Executed successfully, ${new Date() - time}`})
	}
}