const UserSchema = require("../models/UserSchema")

module.exports = {
	name : "snipe",
	admin: false,
	dm: true,
	cooldown: 1,
	async execute(message) {
		const user = await UserSchema.findOne({ discord: message.author.id, country: "MX"}, {snipe: 1})
        if(!user) return message.channel.send({content: "You dont have a valid account."})
		if(user.snipe === null) await UserSchema.findOneAndUpdate({ discord: message.author.id }, { snipe: false }) 
        else await UserSchema.findOneAndUpdate({ discord: message.author.id }, { snipe: !user.snipe })
        if(!user.snipe) return message.channel.send({content: "Ahora recibiras pings cuando te snipeen."})
        message.channel.send({content: "Ahora dejaras de recibir pings."})  
	},
}