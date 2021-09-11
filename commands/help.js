const { MessageEmbed } = require("discord.js")

module.exports = {
	name : "help",
	description: "help",
	admin: false,
	dm: true,
	cooldown: -1,
	execute(message) {
		const embed = new MessageEmbed()
		.setColor("#4C9CF6")
		.setTitle("Commands")
		.setDescription("() = optional\n[] = required\n\n`!getplayer (Player Name)`\nConsigue informacion de el jugador\n*Aliases*: [!get]\n\n`!ping`\nGets Response time\n\n`!changename [Nuevo nombre]`\nTe cambia el nombre\n*Aliases*: [!ch]\n\n`!snipe`\nHabilita o Desactiva que te pingeen cada vez que te snipean ")
		message.channel.send({embeds: [embed]})
	},
}