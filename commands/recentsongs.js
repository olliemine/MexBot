const {GetUserInfo} = require("../Util")
const UserSchema = require("../models/UserSchema")
const showsongs = require("./functions/showsongs")

module.exports = {
	name : "recentsongs",
	aliases: ["rsongs", "recent", "rs"],
	admin: false,
	dm: true,
	dev: false,
	cooldown: -1,
	async execute(message, DiscordClient, args) {
		let user
		if(args.length) user = await GetUserInfo(args, message, { plays: 1 }) 
		else user = await UserSchema.findOne({ discord: message.author.id}, { plays: 1 })
		if(!user || !user?.plays?.length) return message.channel.send({content: "User has no account or has invalid account."})
		await showsongs(user.plays, message, "player")
	},
}