const Discord = require("discord.js")

module.exports = {
	name : "help",
	description: "help",
	execute(message) {
		const embed = new Discord.MessageEmbed()
		.setColor("#4C9CF6")
		.setTitle("Commands")
		.setDescription("() = optional\n[] = required\n\n`!getplayer (Player Name)`\nConsigue informacion de el jugador\n*Aliases*: [!get]\n\n`!ping`\nGets Response time\n*Aliases*: none")
		message.channel.send(embed)
	},
}