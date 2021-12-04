const { MessageEmbed } = require("discord.js")
const { errorChannel } = require("../info.json")

module.exports = (Client, error, description = "") => {
	const embed = new MessageEmbed()
	.setColor("#F31919")
	.setTitle(error.name)
	.setDescription(`${error.stack}

${description}
>:(`)
	Client.channels.cache.get(errorChannel).send({embeds: [embed]});
}