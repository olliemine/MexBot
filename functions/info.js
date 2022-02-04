const { MessageEmbed } = require("discord.js")
const { infoChannel } = require("../info.json")
const { client } = require("../index")

module.exports = (title, description) => {
	const embed = new MessageEmbed()
	.setColor("#95CAFF")
	.setTitle(title)
	.setDescription(description)
	client.channels.cache.get(infoChannel).send({ embeds: [embed]});
}