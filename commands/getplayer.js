const fetch = require('node-fetch');
const { MessageEmbed, MessageAttachment } = require("discord.js");
const UserSchema = require("../models/UserSchema")
const UserCacheSchema = require("../models/UserCacheSchema")
const errorhandle = require("../functions/error")
const ms = require("ms")
const LevelSchema = require("../models/LevelSchema")
const { ChartJSNodeCanvas  } = require('chartjs-node-canvas');

module.exports = {
	name: "getplayer",
	description: "Te da la informacion de un jugador",
	aliases: ["get"],
	admin: false,
	dm: true,
	cooldown: 4,
	async execute(message, DiscordClient, args) {
		if (!Array.isArray(args) || !args.length) {
			user = await UserSchema.findOne({ discord: message.author.id })
			if(user) return GetPlayerDataID(user.beatsaber)
			message.channel.send({ content: "Tienes que mencionar a un usuario!"})
		} else {
			const user = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
			let userschema
			if(user) userschema = await UserSchema.findOne({ discord: user.id })
			if(userschema) return GetPlayerDataID(userschema.beatsaber)
			cacheduser = await UserCacheSchema.findOne({ name: args.join(" ").toLowerCase() })
			if(cacheduser) return GetPlayerDataID(cacheduser.id)
			GetPlayerDataName(args.join("%20"))
		}
		async function GetGraph(user) {
			function findMissingNumbers(arr) {
				var sparse = arr.reduce((sparse, i) => (sparse[i]=1,sparse), []);
				return [...sparse.keys()].filter(i => i && !sparse[i]);
			}
			let history = user.playHistory
			let weeks = []
			let plays = []
			user.playHistory.forEach(h => {
				weeks.push(h.week)
			})
			let missing = findMissingNumbers(weeks)
			missing.splice(0, weeks[0] - 1)
			missing.forEach(m => {
				history.push({
					plays: 0,
					week: m
				})
			})
			history.sort((a, b) => {
				return a.week - b.week
			})
			history.forEach(h => {
				plays.push(h.plays)
			})	
			const canvasRenderService = new ChartJSNodeCanvas({ width: 1000, height: 200 })
			let labels = []
			for(let i = 0; i < plays.length; i++) {
				const year = Math.floor((((history[i].week * 604_800_000) + 345_600_000) / 31536000730) + 1970) 
				labels.push(year.toString())
				continue
			}
			const data = {
				labels: labels,
				datasets: [{
					data: plays,
					fill: false,
					borderColor: 'rgb(75, 192, 192)',
					tension: 0.3,
					yAxisID: 'yAxis',
					pointRadius: 0,
					
				}]
			};
			const config = {
				type: 'line',
				data: data,
				options: {
					scales: {
					yAxis: {
						reverse: false,
						grid: {
							display: true
							},
						ticks: {
							display: true,
							color: 'white',
						}
						},
					x: {
						grid:{
						display:false
							},
						ticks: {
							color: 'white'
						}
						},
					},
					plugins: {
						legend: {
							display: false
						}
					}
				}
			};
			const imageBuffer = await canvasRenderService.renderToBuffer(config)
			return imageBuffer
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
		async function BuildEmbed(data) {
			const history = data.histories.split(",")
			const top1ScoreCount = async () => {
				a = await LevelSchema.countDocuments({ TopPlayer: data.id, PlayerCount: { $gte: 2 }})
				if(a == 0) return ""
				return `\nTop 1 Count: ${a} 🇲🇽`
			}
			const userinfo = await UserSchema.findOne({ beatsaber: data.id })
			let embed = new MessageEmbed()
			.setColor("#4C9CF6")
			.setTitle(data.name + ` :flag_${data.country.toLowerCase()}:`)
			.setURL(`https://scoresaber.com/u/${data.id}`)
			.setThumbnail(data.profilePicture)
			.addField("PP", `${numberWithCommas(data.pp.toFixed(1))}pp
Week difference: ${Addplus(history[history.length - 7] - data.rank)}${history[history.length - 7] - data.rank}`)
			.addField("RANK", `Rank: #${numberWithCommas(data.rank)}
Country rank: #${numberWithCommas(data.countryRank)}`)
			.addField("RANKED", `Average Accuracy: ${data.scoreStats.averageRankedAccuracy.toFixed(2)}%
Ranked playcount: ${data.scoreStats.rankedPlayCount}${await top1ScoreCount()}`)
			.addField("PP Calculation", "Loading...")
			if(userinfo.playHistory.length) {
				const png = await GetGraph(userinfo)
				const buffer = new MessageAttachment(png, "graph.png")
				embed.setImage("attachment://graph.png")
				message.channel.send({ embeds: [embed], files: [buffer]}).then(msg => {
					return getOneConvertedPP(data.id, embed, msg)
				})
				return
			}
			message.channel.send({ embeds: [embed]}).then(msg => {
				return getOneConvertedPP(data.id, embed, msg)
			})
		}
		function GetPlayerDataID(Id) {
			const IDURL = new URL(`https://scoresaber.com/api/player/${Id}/full`)
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
			const NAMEURL = new URL(`https://scoresaber.com/api/players?search=${name}`)
			fetch(NAMEURL)
			.then(async res => {
				if(res.status == 429) return ErrorEmbed("Api Overloaded! Please try again in some seconds")
				if(res.status == 404 && +name) return GetPlayerDataID(name)
				if(res.status != 200) return ErrorEmbed(`Unknown Error ${res.status} ${res.statusText}`)
				const body = await res.json()
				if(Date.now() - message.createdTimestamp >= 1000*5) {
					const user = {
						name: args.join(" ").toLowerCase(),
						id: body[0].id
					}
					try {
						await new UserCacheSchema(user).save()
					} catch(err) {
						errorhandle(DiscordClient, err)
					}
				}
				BuildEmbed(body[0])
			})
		}
	}
}