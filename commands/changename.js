const UserSchema = require("../models/UserSchema")
const { Util } = require("discord.js")

module.exports = {
	name : "changename",
	description: "Te cambia el nombre",
	aliases: ["ch"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		const user = await UserSchema.findOne({ discord: message.author.id })
		const server = await DiscordClient.guilds.fetch("905874757331857448")
		const member = await server.members.fetch(message.author.id)
		if(member.roles.highest.position > server.members.resolve(DiscordClient.user).roles.highest.position) return message.channel.send({content: "No se puede cambiar el nombre porque tiene role mayor."})
		function NoMentionText(text) {
			return Util.removeMentions(text)
		}
		function GetBacktext() {
			if(user.lastrank === null) return `${user.country} | `
			if(user.bsactive == false) return `IA | ` 
			return `#${user.lastrank} | `
		}
		function NonUser() {
			if(!Array.isArray(args) || !args.length) return message.channel.send({content: "Necesitas poner un nombre"})
			const new_name = args.join(" ")
			if(new_name.length > 32) return message.channel.send({content: "El nombre es muy largo, porfavor elige un nombre mas pequeño"})			
			member.setNickname(new_name)
			return message.channel.send({content: NoMentionText(`Succesfully changed name to ${new_name}`)})
		}
		async function User() {
			const backtext = GetBacktext(body)
			const fronttext = args.length ? args.join(" ") : user.realname
			const fullname = `${backtext}${fronttext}`
			if(fullname.length > 32) return message.channel.send({content: "El nombre es muy largo, porfavor elige un nombre mas pequeño"})
			await UserSchema.findOneAndUpdate({
				discord: message.author.id
			}, {
				name: fronttext
			})
			member.setNickname(fullname)
			return message.channel.send({content: NoMentionText(`Succesfully changed name to ${fullname}`)})
		}
		if(!user) return NonUser()
		return User()	
	},
};