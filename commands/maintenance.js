const maintenance = require("../index");

module.exports = {
	name : "maintenance",
	description: "dfshgfdghfjn",
	api: false,
	execute(message) {
		if(message.author.id !== "645068064144097347") return message.channel.send("sotp")
		maintenance()
		message.channel.send("Yes")
	},
}