const errorhandle = require("../error");
const Top = require("../Top")

module.exports = {
	name: "forcetop",
	description: "pepega",
	api: true,
	admin: true,
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