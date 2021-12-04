const { MessageEmbed } = require("discord.js")
const { infoChannel } = require("../info.json")
module.exports = (Client, title, description) => {
	const embed = new MessageEmbed()
	.setColor("#95CAFF")
	.setTitle(title)
	.setDescription(description)
	Client.channels.cache.get(infoChannel).send({ embeds: [embed]});
}