const UserSchema = require("../models/UserSchema")

module.exports = {
	name : "snipe",
	admin: false,
	dm: true,
	cooldown: 1,
	async execute(message) {
        const user = await UserSchema.findOne({ discord: message.author.id, realname: {$ne: null}})
        if(!user) return message.channel.send({content: "Error, You dont have a valid account"})
        await UserSchema.findOneAndUpdate({ discord: message.author.id }, { snipe: !user.snipe })
        if(!user.snipe == true) return message.channel.send({content: "Ahora recibiras pings cuando te snipeen."})
        message.channel.send({content: "Ahora dejaras de recibir pings."})  
	},
}