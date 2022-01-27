const UserSchema = require("../models/UserSchema")
const CheckRoles = require("../functions/CheckRoles")
const { serverId } = require("../info.json")
const GetUser = require("../functions/GetUser")
const {GetBacktext, GetUserInfo} = require("../Util")

module.exports = {
	name : "active",
	admin: true,
	dm: true,
	cooldown: -1,
	async execute(message, DiscordClient, args) {
		if(!args.length) return message.channel.send({content: "Please enter a user"})
		const user = await GetUserInfo(args, message)
		if(!user) return message.channel.send({content: "No user found"})
		const res = await GetUser.basicSearch(user.beatsaber)
		if(!res.status) return message.channel.send({content: `Error ${res.body}`})
		const body = res.body
		if(body.inactive == true) return message.channel.send({content: "User still inactive"})
		await UserSchema.findOneAndUpdate({ beatsaber: user.beatsaber }, { bsactive: true })
		if(!user.dsactive) return message.channel.send({content: "User has been activated"})
		const server = await DiscordClient.guilds.fetch(serverId)
		const discorduser = await server.members.fetch(user.discord)
		CheckRoles(user.lastrank, discorduser, DiscordClient)
		const backtext = GetBacktext(body, "body")
		await discorduser.setNickname(`${backtext} | ${user.name}`)//Probably change later?
		message.channel.send({content: "User has been activated"})
	},
}
