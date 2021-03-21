const fetch = require('node-fetch');
const Discord = require("discord.js");
const UserSchema = require("../models/UserSchema")
const mongo = require("../mongo")

module.exports = {
	name: "getplayer",
	description: "Te da la informacion de un jugador",
	aliases: ["get"],
	execute(message, DiscordClient, args) {
	let extra_playerinfo;
	if (!Array.isArray(args) || !args.length) {
		mongo().then(async () => {
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
		})
	} else {
		GetPlayerDataName(args.join("%20"))
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
			await fetch(`https://new.scoresaber.com/api/players/by-name/${body.playerInfo.playerName}`).then(res => res.json()).then(body => extra_playerinfo = body)
			const embed = new Discord.MessageEmbed()
			.setColor("#4C9CF6")
			.setTitle(body.playerInfo.playerName + ` :flag_${body.playerInfo.country.toLowerCase()}:`)
			.setThumbnail(`https://new.scoresaber.com${body.playerInfo.avatar}`)
			.setFooter(lateFooter())
			.addField("PP", `${body.playerInfo.pp}pp
Week diference: ${Addplus(extra_playerinfo.players[0].difference)}${extra_playerinfo.players[0].difference}`)
			.addField("RAKN", `Rank: #${body.playerInfo.rank}
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
		.setThumbnail(`https://new.scoresaber.com${player.avatar}`)
		.setFooter(lateFooter())
		.addField("PP", `${player.pp}pp
Week difference: ${Addplus(player.difference)}${player.difference}`, false)
		.addField("RANK", `Rank: #${player.rank}
Country rank: #${extra_playerinfo.playerInfo.countryRank}`, false)
		.addField("RANKED", `Average Accuracy: ${extra_playerinfo.scoreStats.averageRankedAccuracy.toFixed(2)}%
Ranked playcount: ${extra_playerinfo.scoreStats.rankedPlayCount}`)
		message.channel.send(embed)
	})
	}
	}
}