module.exports = {
	name : "ping",
	description: "pong",
	execute(message) {
		message.channel.send(`🏓Pong! ${Date.now() - message.createdTimestamp}ms`);
	},
};