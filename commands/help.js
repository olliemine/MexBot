const { MessageEmbed } = require("discord.js")

module.exports = {
	name : "help",
	description: "help",
	api: false,
	admin: false,
	execute(message) {
		const embed = new MessageEmbed()
		.setColor("#4C9CF6")
		.setTitle("Commands")
		.setDescription("() = optional\n[] = required\n\n`!getplayer (Player Name)`\nConsigue informacion de el jugador\n*Aliases*: [!get]\n\n`!ping`\nGets Response time\n*Aliases*: none\n\n`!changename [Nuevo nombre]`\nTe cambia el nombre\n*Aliases*: [!ch]")
		message.channel.send(embed)
	},
}