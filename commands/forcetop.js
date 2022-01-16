const errorhandle = require("../functions/error");
const Top = require("../functions/TopFeed/Top")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const StoreUserFull = require("../functions/TopFeed/StoreUserFull")
const GetCodes = require("../functions/TopFeed/GetCodes")
const GetMaxScores = require("../functions/TopFeed/GetMaxScores")
const GetUser = require("../functions/GetUser")

module.exports = {
	name: "forcetop",
	description: "pepega",
	admin: true,
	dm: true,
	cooldown: 15,
	async execute(message, DiscordClient, args) {
		message.channel.sendTyping()
		const time = new Date()
		if(+args[0]) {
			const res = await GetUser.fullSearch(args.join(" "))
			if(!res.status) return message.channel.send({content: `Error ${res.info}`})
			const body = res.info
			if(body.country != "MX") return message.channel.send({content: "User is not from MX"})
			let userinfo = await UserSchema.findOne({beatsaber: body.id})
			if(body.inactive && userinfo?.lastmap) return message.channel.send({content: "No updates are needed"})
			if(!userinfo) {
				userinfo = {
					"discord": null,
					"beatsaber": body.id,
					"realname": body.name,
					"country": body.country,
					"bsactive": !body.inactive,
					"dsactive": false,
					"name": null,
					"lastrank": body.countryRank,
					"lastmap": null,
					"lastmapdate": null,
					"snipe": null,
					"playHistory": []
				}
				await UserSchema(userinfo).save()
			}
			console.log(userinfo.realname)
			await StoreUserFull(userinfo, DiscordClient)
			await GetCodes()
			await GetMaxScores()
			return message.channel.send({content: `Succesfully saved player ${userinfo.realname}, ${new Date() - time}`})
		}
		try {
			await Top(DiscordClient)
		} catch(err) {
			errorhandle(DiscordClient, err)
		} 
		message.channel.send({content: `Executed successfully, ${new Date() - time}`})
	}
}