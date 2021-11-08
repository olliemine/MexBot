const { MessageEmbed } = require("discord.js")
module.exports = (Client, title, description) => {
	const embed = new MessageEmbed()
	.setColor("#95CAFF")
	.setTitle(title)
	.setDescription(description)
	Client.channels.cache.get("905874757583503371").send({ embeds: [embed]});
}