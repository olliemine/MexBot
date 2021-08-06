const fetch = require("node-fetch")

module.exports = {
	name: "test",
	description: "a",
	cooldown: -1,
	execute(message, DiscordClient) {
		message = message.channel.send("aea")
	}
}