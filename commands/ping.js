const fetch = require("node-fetch")
const { MessageEmbed } = require("discord.js")
const { version } = require("../info.json")

module.exports = {
	name : "ping",
	description: "pong",
	admin: false,
	dm: true,
	cooldown: 1,
	async execute(message, DiscordClient) {
		const botms = Date.now() - message.createdTimestamp
		const discordms = DiscordClient.ws.ping
		const scoresaberms = () => {
			const timer = new Date()
			return fetch("https://scoresaber.com").then((json) => {
				if(json.status != 200) return "Offline"
				return new Date() - timer + "ms"
			})
		}
		const scoresaberapims = () => {
			const timer = new Date()
			return fetch("https://new.scoresaber.com/api").then((json) => {
				if(json.status != 200 && json.status != 429) return "Offline"
				return new Date() - timer + "ms"
			})
		}
		const embed = new MessageEmbed()
		.setColor("#8DC2F7")
		.setDescription(`
Bot Latency: ${botms}ms
Discord API Latency: ${discordms}ms
Scoresaber Latency: ${await scoresaberms()}
Scoresaber API Latency: ${await scoresaberapims()}`)
		.setFooter(version)
		message.channel.send({ content: "🏓Pong!", embeds: [embed]});
	},
};