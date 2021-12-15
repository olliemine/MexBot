const { MessageEmbed } = require("discord.js")

module.exports = {
	name : "snipemaphelp",
	aliases: ["smaphelp"],
	admin: false,
	dm: true,
	cooldown: -1,
	execute(message) {
		const embed = new MessageEmbed()
		.setColor("#4C9CF6")
		.setTitle("Snipemap Filters")
		.setDescription("Ejemplo: !snipemap `olliemine`, `ranked`, `played`")
		.addField("User", "`username`, `discord mention or id` o el `beatsaber id` se pueden utilizar para filtrar mapas snipeables entre usuarios. Si pones una `\"!\"` antes del usuario sera lo opuesto y se va a evitar los mapas de ese usuario ")
		.addField("Rank", "`ranked` o `unranked` se usa para filtrar mapas que estan rankeados o no")
		.addField("Played", "`played` o `unplayed` se usa para filtrar mapas que hayas jugado o no")
		.addField("Comas", "Todos los filtros tienen que ser divididos por una coma")
		message.channel.send({embeds: [embed]})
	},
}