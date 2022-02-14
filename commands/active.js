const UserSchema = require("../models/UserSchema")
const CheckRoles = require("../functions/CheckRoles")
const { serverId } = require("../info.json")
const GetUser = require("../functions/GetUser")
const {GetBacktext, GetUserInfo, checkNicknameChangePermission} = require("../Util")
const { client } = require("../index")
const ErrorHandler = require("../functions/error")

module.exports = {
	name : "active",
	admin: true,
	dm: true,
	cooldown: -1,
	async execute(message, args) {
		if(!args.length) return message.channel.send({content: "Please enter a user"})
		const user = await GetUserInfo(args, message)
		if(!user) return message.channel.send({content: "No user found"})
		const res = await GetUser.basicSearch(user.beatsaber)
		if(!res.status) return message.channel.send({content: `Error ${res.body}`})
		const body = res.body
		if(body.inactive == true) return message.channel.send({content: "User still inactive"})
		await UserSchema.findOneAndUpdate({ beatsaber: user.beatsaber }, { bsactive: true })
		if(!user.dsactive) return message.channel.send({content: "User has been activated"})
		const server = await client.guilds.fetch(serverId)
		const member = await server.members.fetch(user.discord)
		CheckRoles(user.lastrank, member)
		const backtext = GetBacktext(body, "body")
		const permission = checkNicknameChangePermission(member).catch(err => ErrorHandler(err, "Invalid Member", message))
		if(!permission) return message.channel.send({content: "Could'nt change nickname, otherwise ran succesfully"})
		await member.setNickname(`${backtext} | ${user.name}`).catch(err => ErrorHandler(err, "Unknown Error", message))//Probably change later?
		message.channel.send({content: "User has been sucessfully activated"})
	},
}
