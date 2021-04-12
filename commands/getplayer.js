const fetch = require('node-fetch');
const Discord = require("discord.js");
const UserSchema = require("../models/UserSchema")
const mongo = require("../mongo")
const UserCacheSchema = require("../models/UserCacheSchema")

module.exports = {
	name: "getplayer",
	description: "Te da la informacion de un jugador",
	aliases: ["get"],
	async execute(message, DiscordClient, args) {
	let extra_playerinfo;
	await mongo()
	if (!Array.isArray(args) || !args.length) {
		try {
			user = await UserSchema.findOne({ discord: message.author.id })
			if(user) {
				GetPlayerDataID(user.beatsaber)
			} else {
				message.channel.send("Tienes que mencionar a un usuario!")
			}
		} catch(error) {
			console.log(error)
			message.channel.send("Unexpected Error")
		}
	} else {
		cacheduser = await UserCacheSchema.findOne({ name: args.join(" ").toLowerCase() })
		if(cacheduser) {
			GetPlayerDataID(cacheduser.id)
		} else {
			GetPlayerDataName(args.join("%20"))
		}
	}
	function Addplus(number) {
		if(number > 0) return "+"
		return ""
	}
	function lateFooter() {
		if(Date.now() - message.createdTimestamp >= 1000*5) return "El lag fue un problema de scoresaber, no de el bot"
		return ""
	}
	function GetPlayerDataID(Id) {
		fetch(`https://new.scoresaber.com/api/player/${Id}/full`)
		.then(res => res.json())
		.then(async body => {
			if(body.error) { //Error handler
				const embed = new Discord.MessageEmbed()
				.setTitle("Error!")
				.setDescription(info.error.message)
				.setColor("#F83939")
				.setFooter(lateFooter())
				return message.channel.send(embed)
			}
			const history = body.playerInfo.history.split(",")
			const embed = new Discord.MessageEmbed()
			.setColor("#4C9CF6")
			.setTitle(body.playerInfo.playerName + ` :flag_${body.playerInfo.country.toLowerCase()}:`)
			.setURL(`https://scoresaber.com/u/${body.playerInfo.playerId}`)
			.setThumbnail(`https://new.scoresaber.com${body.playerInfo.avatar}`)
			.setFooter(lateFooter())
			.addField("PP", `${body.playerInfo.pp}pp
Week difference: ${Addplus(history[history.length - 7] - body.playerInfo.rank)}${history[history.length - 7] - body.playerInfo.rank}`)
			.addField("RANK", `Rank: #${body.playerInfo.rank}
Country rank: #${body.playerInfo.countryRank}`)
			.addField("RANKED", `Average Accuracy: ${body.scoreStats.averageRankedAccuracy.toFixed(2)}%
Ranked playcount: ${body.scoreStats.rankedPlayCount}`)
			message.channel.send(embed)
		})
	}
	function GetPlayerDataName(name) {
		fetch(`https://new.scoresaber.com/api/players/by-name/${name}`)
		.then(res => res.json())
		.then(async info => {
		if(info.error) { //Error handler
			const embed = new Discord.MessageEmbed()
			.setTitle("Error!")
			.setDescription(info.error.message)
			.setColor("#F83939")
			.setFooter(lateFooter())
			return message.channel.send(embed)
		}
		const player = info.players[0]
		await fetch(`https://new.scoresaber.com/api/player/${player.playerId}/full`).then(res => res.json()).then(body => extra_playerinfo = body)
		const embed = new Discord.MessageEmbed()
		.setColor("#4C9CF6")
		.setTitle(player.playerName + ` :flag_${player.country.toLowerCase()}:`)
		.setURL(`https://scoresaber.com/u/${player.playerId}`)
		.setThumbnail(`https://new.scoresaber.com${player.avatar}`)
		.setFooter(lateFooter())
		.addField("PP", `${player.pp}pp
Week difference: ${Addplus(player.difference)}${player.difference}`, false)
		.addField("RANK", `Rank: #${player.rank}
Country rank: #${extra_playerinfo.playerInfo.countryRank}`, false)
		.addField("RANKED", `Average Accuracy: ${extra_playerinfo.scoreStats.averageRankedAccuracy.toFixed(2)}%
Ranked playcount: ${extra_playerinfo.scoreStats.rankedPlayCount}`)
		if(Date.now() - message.createdTimestamp >= 1000*5) {
			const user = {
				name: args.join(" ").toLowerCase(),
				id: player.playerId
			}
			try {
				await new UserCacheSchema(user).save()
			} catch(err) {
				console.log(err)
			}
		}
		message.channel.send(embed)
	})
	}
	}
}