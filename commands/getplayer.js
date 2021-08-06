const fetch = require('node-fetch');
const { MessageEmbed } = require("discord.js");
const UserSchema = require("../models/UserSchema")
const mongo = require("../mongo")
const UserCacheSchema = require("../models/UserCacheSchema")
const errorhandle = require("../functions/error")
const ms = require("ms")

module.exports = {
	name: "getplayer",
	description: "Te da la informacion de un jugador",
	aliases: ["get"],
	api: true,
	admin: false,
	dm: true,
	cooldown: 5,
	async execute(message, DiscordClient, args) {
		let extra_playerinfo
		await mongo()
		if (!Array.isArray(args) || !args.length) {
			try {
				user = await UserSchema.findOne({ discord: message.author.id })
				if(user) return GetPlayerDataID(user.beatsaber)
				message.channel.send("Tienes que mencionar a un usuario!")

			} catch(error) {
				errorhandle(DiscordClient, error)
				message.channel.send("Unexpected Error")
			}
		} else {
			cacheduser = await UserCacheSchema.findOne({ name: args.join(" ").toLowerCase() })
			if(cacheduser) return GetPlayerDataID(cacheduser.id)
			GetPlayerDataName(args.join("%20"))
		}
		function getOneConvertedPP(id, embed, msg) {
			let specific = false
			function ChangeEmbed(text) {
				let newembed = embed
				newembed.fields[3].value = text
				msg.edit(newembed)
			}
			function GetPP(pp, weight) {
				return Number((pp*weight).toFixed(2))
			}
			function Wait(Page) {
				console.log("waiting 25s")
				setTimeout(() => {
					return CheckPages(Page)
				}, ms("25s"))
			}
			function CheckPage(Page, list) {
				if(GetPP(list[0].pp, list[0].weight) < 1) return CheckPages(Page - 1)
				let placement = 0
				let Pinlist = 0
				for(let entry of list) {
					Pinlist++
					if(GetPP(entry.pp, entry.weight) > 1) continue
					placement = ((Page - 1)*8) + Pinlist
					break
				}
				if(placement == 0) placement = Page*8
				placement--
				let rawpp = 1 / (0.965**placement)
				return ChangeEmbed(`1pp = ${rawpp.toFixed(2)} Raw pp~`)
			}
			function CheckPages(Page) {
				fetch(`https://new.scoresaber.com/api/player/${id}/scores/top/${Page.toString()}`)
				.then(async (res) => {
					if(res.status == 404) return CheckPages(Page - 1)
					if(res.status == 429) return Wait(Page)
					if(res.status != 200 && res.status != 404 && res.status != 429) return ChangeEmbed("UnexpectedResponseFromServer " + res.status)
					const body = await res.json()
					if(specific) return CheckPage(Page, body.scores)
					if(GetPP(body.scores[body.scores.length - 1].pp, body.scores[body.scores.length - 1].weight) > 1) return CheckPages(Page + 3)
					specific = true
					return CheckPage(Page, body.scores)
				})

			}
			CheckPages(1)
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
			const IDURL = new URL(`https://new.scoresaber.com/api/player/${Id}/full`)
			fetch(IDURL)
			.then(res => res.json())
			.then(async body => {
				if(body.error) { //Error handler
					const embed = new MessageEmbed()
					.setTitle("Error!")
					.setDescription(body.error.message)
					.setColor("#F83939")
					.setFooter(lateFooter())
					return message.channel.send(embed)
				}
				const history = body.playerInfo.history.split(",")
				const embed = new MessageEmbed()
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
				.addField("PP Calculation", "Loading...")
				.setFooter("Disclamer: El PP Calculation puede ser que este incorecto")
				message.channel.send(embed).then(msg => {
					return getOneConvertedPP(Id, embed, msg)
				})
			}).catch((err) => {
				message.channel.send("Parece que hay un error con scoresaber, porfavor intenta despues")
				errorhandle(DiscordClient, err)
			})
		}
		function GetPlayerDataName(name) {
			if(name.length <= 3 || name.length > 32) return message.channel.send("Invalid Name length")
			const NAMEURL = new URL(`https://new.scoresaber.com/api/players/by-name/${name}`)
			fetch(NAMEURL)
			.then(res => res.json())
			.then(async info => {
			if(info.error) { //Error handler
				if(+name) return GetPlayerDataID(name)
				const embed = new MessageEmbed()
				.setTitle("Error!")
				.setDescription(info.error.message)
				.setColor("#F83939")
				.setFooter(lateFooter())
				return message.channel.send(embed)
			}
			const player = info.players[0]
			await fetch(`https://new.scoresaber.com/api/player/${player.playerId}/full`).then(res => res.json()).then(body => extra_playerinfo = body)
			const embed = new MessageEmbed()
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
			.addField("PP Calculation", "Loading...")
			.setFooter("Disclamer: El PP Calculation puede ser que este incorecto")
			if(Date.now() - message.createdTimestamp >= 1000*5) {
				const user = {
					name: args.join(" ").toLowerCase(),
					id: player.playerId
				}
				try {
					await new UserCacheSchema(user).save()
				} catch(err) {
					errorhandle(DiscordClient, err)
				}
			}
			message.channel.send(embed).then(msg => {
				return getOneConvertedPP(player.playerId, embed, msg)
			})
		}).catch((err) => {
			message.channel.send("Parece que hay un error con scoresaber, porfavor intenta despues")
			errorhandle(DiscordClient, err)
		})
		}
	}
}