const errorhandle = require("../functions/error");
const Top = require("../functions/Top")

module.exports = {
	name: "forcetop",
	description: "pepega",
	admin: true,
	dm: false,
	cooldown: 15,
	async execute(message, DiscordClient) {
		message.channel.sendTyping()
		const time = new Date()
		try {
			await Top(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		} 
		message.channel.send({content: `Executed successfully, ${new Date() - time}`})
	}
}