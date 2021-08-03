const errorhandle = require("../functions/error");
const Top = require("../functions/Top")

module.exports = {
	name: "forcetop",
	description: "pepega",
	api: true,
	admin: true,
	dm: false,
	async execute(message, DiscordClient) {
		message.channel.startTyping();
		const time = new Date()
		try {
			await Top(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		}
		message.channel.stopTyping();
		message.channel.send(`Executed successfully, ${new Date() - time}`)
	}
}