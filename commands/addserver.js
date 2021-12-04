const { MessageEmbed } = require("discord.js")
const { OSChannel } = require("../info.json")

module.exports = {
	name : "addserver",
	description: "yes",
	admin: true,
	dm: true,
	cooldown: -1,
	async execute(message, DiscordClient, args) {
        const discordlink = args.shift()
        const color = args.shift()
        const name = args.join(" ")
        const channel = DiscordClient.channels.cache.get(OSChannel)
        const inviteinf = await DiscordClient.fetchInvite(discordlink)
        const embed = new MessageEmbed()
        .setTitle(name)
        .setThumbnail(inviteinf.guild.iconURL())
        .setColor(color)
        .setDescription(`LINK: ${discordlink}`)
        channel.send({embeds: [embed]})
	},
}