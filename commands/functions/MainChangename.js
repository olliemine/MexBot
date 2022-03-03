const UserSchema = require("../../models/UserSchema")
const { Util } = require("discord.js")
const {GetBacktext, checkNicknameChangePermission} = require("../../Util")
const ErrorHandler = require("../../functions/error")

/**
 * @typedef {import("discord.js").Message} Message
 * @typedef {import("discord.js").GuildMember} GuildMember
 */

/**
 * 
 * @param {Object} user 
 * @param {GuildMember} member 
 * @param {Message} message 
 * @param {Array} args 
 */
module.exports = (user, member, message, args) => {
	if(!checkNicknameChangePermission(member)) return message.channel.send({content: "Cant change nickname"})
	function SetServerNickname(name) {
		member.setNickname(name).catch(err => ErrorHandler(err, "Unknown Error", message))
		message.channel.send({content: NoMentionText(`Changed name to ${name}`)})
	}
	function NoMentionText(text) {
		return Util.removeMentions(text)
	}
	function NonUser() {
		if(!args.length) return message.channel.send({content: "Necesitas poner un nombre"})
		const name = args.join(" ")
		if(name.length > 32) return message.channel.send({content: "El nombre es muy largo, porfavor elige un nombre mas pequeño"})			
		SetServerNickname(name)
	}
	async function User() {
		const backtext = GetBacktext(user, "user")
		const fronttext = args.length ? args.join(" ") : user.realname
		const fullname = `${backtext} | ${fronttext}`
		if(fullname.length > 32) return message.channel.send({content: "El nombre es muy largo, porfavor elige un nombre mas pequeño"})
		await UserSchema.findOneAndUpdate({
			discord: message.author.id
		}, {
			name: fronttext
		})
		SetServerNickname(fullname)
	}
	if(!user) return NonUser()
	return User()	
}