const UserSchema = require("../models/UserSchema")
const { Util } = require("discord.js")

module.exports = {
	name : "achangename",
	aliases: ["ach"],
	description: "Te cambia el nombre",
	admin: true,
	dm: false,
	cooldown: 1,
	async execute(message, DiscordClient, args) {
		let member = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
		args.shift()
		if(member) member = await message.guild.members.fetch(member.id)
		if(!member) return message.channel.send({content: "Tienes que mencionar a un usuario"})
		const user = await UserSchema.findOne({ discord: member.id })
		if(member.roles.highest.position > message.guild.members.resolve(DiscordClient.user).roles.highest.position) return message.channel.send({content: "Cant change name because role higher than bot."})
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
			if(new_name.length > 32) return message.channel.send({content: "El nombre es muy largo"})			
			member.setNickname(new_name)
			return message.channel.send({content: NoMentionText(`Changed name to ${new_name}`)})
		}
		async function User() {
			const backtext = GetBacktext(user)
			const fronttext = args.length ? args.join(" ") : user.realname
			const fullname = `${backtext}${fronttext}`
			if(fullname.length > 32) return message.channel.send({content: "El nombre es muy largo"})
			await UserSchema.findOneAndUpdate({
				discord: member.id
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