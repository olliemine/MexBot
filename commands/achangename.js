const UserSchema = require("../models/UserSchema")
const { Util } = require("discord.js")
const {GetBacktext} = require("../Util")
const { client } = require("../index")
const ErrorHandler = require("../functions/error")

module.exports = {
	name : "achangename",
	aliases: ["ach"],
	description: "Te cambia el nombre",
	admin: true,
	dm: false,
	cooldown: 1,
	async execute(message, args) {
		function SetServerNickname(name) {
			try {
				member.setNickname(name)
			} catch (err) {
				return ErrorHandler(err, "Couldnt set a nickname, Otherwise ran succesfully", message)
			}
			message.channel.send({content: NoMentionText(`Changed name to ${name}`)})
		}
		let member = message.mentions.users.first() || client.users.cache.get(args[0])
		args.shift()
		if(member) member = await message.guild.members.fetch(member.id)
		if(!member) return message.channel.send({content: "Tienes que mencionar a un usuario"})
		const user = await UserSchema.findOne({ discord: member.id }, {playHistory: 0, plays: 0})
		if(member.roles.highest.position > message.guild.members.resolve(client.user).roles.highest.position) return message.channel.send({content: "Cant change name because role higher than bot."})
		function NoMentionText(text) {
			return Util.removeMentions(text)
		}
		function NonUser() {
			if(!Array.isArray(args) || !args.length) return message.channel.send({content: "Necesitas poner un nombre"})
			const new_name = args.join(" ")
			if(new_name.length > 32) return message.channel.send({content: "El nombre es muy largo"})			
			SetServerNickname(new_name)
		}
		async function User() {
			const backtext = GetBacktext(user, "user")
			const fronttext = args.length ? args.join(" ") : user.realname
			const fullname = `${backtext} | ${fronttext}`
			if(fullname.length > 32) return message.channel.send({content: "El nombre es muy largo"})
			await UserSchema.findOneAndUpdate({
				discord: member.id
			}, {
				name: fronttext
			})
			SetServerNickname(fullname)
		}
		if(!user) return NonUser()
		return User()	
	},
};