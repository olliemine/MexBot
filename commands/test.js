module.exports = {
	name: "test",
	dev: true,
	cooldown: -1,
	execute(message) {
		message.channel.send({content: "aea"})
	}
}