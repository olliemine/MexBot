const { MessageEmbed } = require("discord.js")
const fetch = require("node-fetch")

module.exports = {
	name : "quote",
	admin: false,
	dm: true,
	cooldown: 1,
	async execute(message) {
		const res = await fetch("https://inspirobot.me/api?generate=true")
		if(res.status !== 200) return message.channel.send({content: `Error: ${res.status} ${res.statusText}`})
		const body = await res.text()
		const embed = new MessageEmbed()
		.setImage(body)
		message.channel.send({embeds: [embed]})
	},
}