const errorhandle = require("../error");
const Top = require("../Top")

module.exports = {
	name: "forcetop",
	description: "pepega",
	api: true, 
	async execute(message, DiscordClient) {
		if(!message.member.roles.cache.find(r => r.id === "822553320551874650")) return
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