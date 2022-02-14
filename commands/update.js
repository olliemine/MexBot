const UserSchema = require("../models/UserSchema")
const Top = require("../functions/TopFeed/Top")
const { basicSearch } = require("../functions/GetUser")
const UpdateUsers = require("../functions/UpdateUsers")

module.exports = {
	name : "update",
	aliases: [],
	admin: false,
	dm: true,
	dev: false,
	cooldown: 10,
	async execute(message, args) {
		const user = await UserSchema.findOne({ discord: message.author.id, country: "MX" })
		if(!user) return message.channel.send({content: "You need to have a valid account to update."})
		const msg = await message.channel.send({content: "Updating... <a:paroxysm_car_crash:938980793932460053>"})
		await Top([user])
		await msg.edit({content: "Updated top 1 feed... <a:paroxysm_car_crash:938980793932460053>"})
		const res = await basicSearch(user.beatsaber)
		if(!res.status) return msg.edit({content: `Error updating rank :( ${res.body}`})
		if(res.body.countryRank != user.lastrank) await UpdateUsers()
		msg.edit({content: "Completed Update!"})
	},
}