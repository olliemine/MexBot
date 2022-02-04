module.exports = {
	name : "desync",
	description: "pong",
	admin: true,
	dm: false,
	cooldown: 1,
	async execute(message, args) {
		return message.channel.send({ content: "Nonfunctional" })
	},
};