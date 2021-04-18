const Discord = require("discord.js")
module.exports = (Client, error) => {
	const embed = new Discord.MessageEmbed()
	.setColor("#F31919")
	.setTitle(error.name)
	.setDescription(`${error.stack}

>:(`)
	Client.channels.cache.get("833067043351167046").send(embed);
}