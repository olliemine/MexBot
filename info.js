const Discord = require("discord.js")
module.exports = (Client, title, description) => {
	const embed = new Discord.MessageEmbed()
	.setColor("#95CAFF")
	.setTitle(title)
	.setDescription(description)
	Client.channels.cache.get("833210096376741888").send(embed);
}