const { MessageEmbed } = require("discord.js")
const { OSChannel } = require("../info.json")
const { client } = require("../index")

module.exports = {
	name : "addserver",
	description: "yes",
	admin: true,
	dm: true,
	cooldown: -1,
	async execute(message, args) {
        const discordlink = args.shift()
        const color = args.shift()
        const name = args.join(" ")
        const channel = client.channels.cache.get(OSChannel)
        const inviteinf = await client.fetchInvite(discordlink)
		const embed = new MessageEmbed()
        .setTitle(name)
        .setThumbnail(inviteinf.guild.iconURL())
        .setColor(color)
        .setDescription(`LINK: ${discordlink}`)
        channel.send({embeds: [embed]})
	},
}