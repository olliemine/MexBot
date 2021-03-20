module.exports = {
	name: "test",
	description: "a",
	execute(message, DiscordClient) {
		message.channel.send("a")
	}
}