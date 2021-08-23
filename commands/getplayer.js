const fetch = require('node-fetch');
const { MessageEmbed } = require("discord.js");
const UserSchema = require("../models/UserSchema")
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
	cooldown: 4,
	async execute(message, DiscordClient, args) {
		if (!Array.isArray(args) || !args.length) {
			try {
				user = await UserSchema.findOne({ discord: message.author.id })
				if(user) return GetPlayerDataID(user.beatsaber)
				message.channel.send({ content: "Tienes que mencionar a un usuario!"})

			} catch(error) {
				errorhandle(DiscordClient, error)
				message.channel.send({ content: "Unexpected Error"})
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
				msg.edit({ embeds: [newembed]})
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
		function numberWithCommas(x) {//https://stackoverflow.com/a/2901298
			var parts = x.toString().split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
		}
		function Addplus(number) {
			if(number > 0) return "+"
			return ""
		}
		function ErrorEmbed(description) {
			const embed = new MessageEmbed()
			.setTitle("Error!")
			.setDescription(description)
			.setColor("#F83939")
			return message.channel.send({ embeds: [embed]})
		}
		function BuildEmbed(data) {
			const history = data.playerInfo.history.split(",")
			const embed = new MessageEmbed()
			.setColor("#4C9CF6")
			.setTitle(data.playerInfo.playerName + ` :flag_${data.playerInfo.country.toLowerCase()}:`)
			.setURL(`https://scoresaber.com/u/${data.playerInfo.playerId}`)
			.setThumbnail(`https://new.scoresaber.com${data.playerInfo.avatar}`)
			.addField("PP", `${numberWithCommas(data.playerInfo.pp.toFixed(1))}pp
Week difference: ${Addplus(history[history.length - 7] - data.playerInfo.rank)}${history[history.length - 7] - data.playerInfo.rank}`)
			.addField("RANK", `Rank: #${data.playerInfo.rank}
Country rank: #${data.playerInfo.countryRank}`)
			.addField("RANKED", `Average Accuracy: ${data.scoreStats.averageRankedAccuracy.toFixed(2)}%
Ranked playcount: ${data.scoreStats.rankedPlayCount}`)
			.addField("PP Calculation", "Loading...")
			message.channel.send({ embeds: [embed]}).then(msg => {
				return getOneConvertedPP(data.playerInfo.playerId, embed, msg)
			})
		}
		function GetPlayerDataID(Id) {
			const IDURL = new URL(`https://new.scoresaber.com/api/player/${Id}/full`)
			fetch(IDURL)
			.then(async res => {
				if(res.status == 429) return ErrorEmbed("Api Overloaded! Please try again in some seconds")
				if(res.status != 200) return ErrorEmbed(`Unknown Error ${res.status} ${res.statusText}`)
				const body = await res.json()
				BuildEmbed(body)
			})
		}
		function GetPlayerDataName(name) {
			if(name.length <= 3 || name.length > 32) return message.channel.send({content: "Invalid Name length"})
			const NAMEURL = new URL(`https://new.scoresaber.com/api/players/by-name/${name}`)
			fetch(NAMEURL)
			.then(async res => {
				if(res.status == 429) return ErrorEmbed("Api Overloaded! Please try again in some seconds")
				if(res.status == 404 && +name) return GetPlayerDataID(name)
				if(res.status != 200) return ErrorEmbed(`Unknown Error ${res.status} ${res.statusText}`)
				const body = await res.json()
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
				GetPlayerDataID(body.players[0].playerId)
			})
		}
	}
}