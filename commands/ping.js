const fetch = require("node-fetch")
const { MessageEmbed } = require("discord.js")
const { version } = require("../info.json")
const { client } = require("../index")

module.exports = {
	name : "ping",
	description: "pong",
	admin: false,
	dm: true,
	cooldown: 1,
	async execute(message) {
		const botms = Date.now() - message.createdTimestamp
		const discordms = client.ws.ping
		const scoresaberapims = () => {
			const timer = new Date()
			return fetch("https://scoresaber.com/api/player/76561199006338762/scores?sort=recent&page=1").then((json) => {
				if(json.status != 200 && json.status != 429) return `Offline | ${json.statusText}`
				return new Date() - timer + "ms"
			})
		}
		const embed = new MessageEmbed()
		.setColor("#8DC2F7")
		.setDescription(`
Bot Latency: ${botms}ms
Discord API Latency: ${discordms}ms
Scoresaber API Latency: ${await scoresaberapims()}`)
		.setFooter(version)
		message.channel.send({ content: "🏓Pong!", embeds: [embed]});
	},
};