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
		.setDescription("() = optional\n[] = required")
		.addField("!getplayer (Usuario)", "Consigue informacion de el jugador\nAliases: [!get]", true)
		.addField("!changename (Nuevo nombre)", "Te cambia el nombre\nAliases: [!ch]", true)
		.addField("!snipe", "Habilita o Desactiva las notificaciones en top 1 feed", true)
		.addField("!snipemap (Filtros)", "Consigue un mapa snipeable dependiendo de filtros (!snipemaphelp)\nAliases: [!smap]", true)
		.addField("!snipeplaylist (Usuario)", "Consigue una lista de todos los mapas snipeables de un usuario\nAliases: [!slist, !splaylist]", true)
		.addField("!score (Search)", "Busca una cancion y te da informacion del leaderboard", true)
		.addField("!recentsongs (Usuario)", "Las canciones mas recientes de un jugador\nAliases: [!recent, !rs]", true)
		.addField("!topsongs (Usuario)", "Top pp plays de un jugador\nAliases: [!top, !ts]", true)
		message.channel.send({embeds: [embed]})
	},
}