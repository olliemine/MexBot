const { MessageEmbed } = require("discord.js")
module.exports = (Client, error, description = "") => {
	const embed = new MessageEmbed()
	.setColor("#F31919")
	.setTitle(error.name)
	.setDescription(`${error.stack}

${description}
>:(`)
	Client.channels.cache.get("833067043351167046").send(embed);
}