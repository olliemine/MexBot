const {GetUserInfo} = require("../Util")
const UserSchema = require("../models/UserSchema")
const showsongs = require("./functions/showsongs")
const ErrorHandler = require("../functions/error")

module.exports = {
	name : "topsongs",
	aliases: ["top", "ts"],
	admin: false,
	dm: true,
	dev: false,
	cooldown: -1,
	async execute(message, args) {
		const user = args.length ? await GetUserInfo(args, message, { plays: 1, beatsaber: 1  }) : await UserSchema.findOne({ discord: message.author.id}, { plays: 1, beatsaber: 1  })
		if(!user?.plays?.length) return message.channel.send({content: "User has no account or has invalid account."})
		const songs = user.plays.filter(a => a.PP).sort((a, b) => b.PP - a.PP)
		await showsongs(songs, message, "player", user).catch(err => ErrorHandler(err, "Unexpected Error", message))
	},
}