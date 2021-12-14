const VerificationID = require("../functions/Verification")
const { serverId } = require("../info.json")

module.exports = {
	name : "sync",
	description: "Sincroniza a alguien con una cuenta de beatsaber, no funciona si no eres admin",
	admin: true,
	dm: true,
	cooldown: 1,
	async execute(message, DiscordClient, args) {
		if(args.length != 2) return message.channel.send({content: "Necesitas 2 argumentos."})
		const user = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
		if(!user) return message.channel.send({content: "Necesitas ingresar un usuario."})
		const server = await DiscordClient.guilds.fetch(serverId)
		const member = await server.members.fetch(user.id)
		console.log(member)
		VerificationID(DiscordClient, member, args[1])
		.then(data => {
			message.channel.send({content: "Succesfull sync"})
		}).catch(err => {
			message.channel.send({content: `Error ${err[1]}`})
		})
	
	},
};