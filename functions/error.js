const { MessageEmbed } = require("discord.js")
const { errorChannel } = require("../info.json")
const { client } = require("../index")

module.exports = (error, description = "", message = null) => {
	const embed = new MessageEmbed()
	.setColor("#F31919")
	.setTitle(`${error.name}`)
	.setDescription(`${error.stack}\n\n${description}`)
	client.channels.cache.get(errorChannel).send({embeds: [embed]})
	if(!message) return
	const userembed = new MessageEmbed()
	.setTitle("Error!")
	.setDescription(description)
	.setColor("#F83939")
	message.channel.send({ embeds: [userembed]})
}