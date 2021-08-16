const { MessageEmbed } = require("discord.js")

module.exports = {
	name : "addserver",
	description: "yes",
	api: false,
	admin: true,
	dm: true,
	cooldown: -1,
	async execute(message, DiscordClient, args) {
        const discordlink = args.shift()
        const color = args.shift()
        const name = args.join(" ")
        const channel = DiscordClient.channels.cache.get("857803227201929226")
        const inviteinf = await DiscordClient.fetchInvite(discordlink)
        const embed = new MessageEmbed()
        .setTitle(name)
        .setThumbnail(inviteinf.guild.iconURL())
        .setColor(color)
        .setDescription(`LINK: ${discordlink}`)
        channel.send(embed)
	},
}