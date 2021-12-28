const fetch = require('node-fetch');
const { MessageEmbed, MessageAttachment } = require("discord.js");
const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const { ChartJSNodeCanvas  } = require('chartjs-node-canvas');
let users = []

module.exports = {
	name: "getplayer",
	description: "Te da la informacion de un jugador",
	aliases: ["get"],
	admin: false,
	dm: true,
	cooldown: 4,
	async start() {
		usersraw = await UserSchema.find()
		usersraw.forEach(u => {
			users.push({
				realname: u.realname,
				beatsaber: u.beatsaber,
				discord: u.discord
			})
		})
		usersraw = null
		return
	},
	async execute(message, DiscordClient, args) {
		function escapeRegExp(text) {
			return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
		}
		if (!Array.isArray(args) || !args.length) {
			cacheduser = users.find(r => r.discord == message.author.id)
			if(cacheduser) return GetPlayerDataID(cacheduser.beatsaber)
			var user = await UserSchema.findOne({ discord: message.author.id })
			if(user) return GetPlayerDataID(user.beatsaber)
			return message.channel.send({ content: "Tienes que mencionar a un usuario."})
		} else {
			var user = message.mentions.users.first() || DiscordClient.users.cache.get(args[0])
			let userschema
			if(user) userschema = await UserSchema.findOne({ discord: user.id })
			if(userschema) return GetPlayerDataID(userschema.beatsaber)
			const regex = new RegExp(["^", escapeRegExp(args.join(" ")), "$"].join(""), "i")
			cacheduser = users.find(r => regex.test(r.realname))
			if(cacheduser) return GetPlayerDataID(cacheduser.beatsaber)
			GetPlayerDataName(args.join("%20"))
		}
		async function GetGraph(user) {
			function findMissingNumbers(arr) {
				var sparse = arr.reduce((sparse, i) => (sparse[i]=1,sparse), []);
				return [...sparse.keys()].filter(i => i && !sparse[i]);
			}
			let history = user.playHistory
			const currentDate = new Date()
			const week = Math.floor((currentDate.getTime() + 345_600_000) / 604_800_000)
			if(history[history.length - 1].week != week) history.push({ plays: 0, week: week })
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
			const userinfo = await UserSchema.findOne({ beatsaber: data.id })
			const top1ScoreCount = async () => {
				LevelCount = await LevelSchema.countDocuments({ TopPlayer: data.id, PlayerCount: { $gte: 2 }})
				if(LevelCount == 0 && userinfo?.country != "MX") return ""
				return `\nTop 1 Count: ${LevelCount} 🇲🇽`
			}
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
			.setFooter("Made by olliemine")
			if(userinfo?.playHistory.length) {
				const png = await GetGraph(userinfo)
				const buffer = new MessageAttachment(png, `${data.id}-graph.png`)
				embed.setImage(`attachment://${data.id}-graph.png`)
				message.channel.send({ embeds: [embed], files: [buffer] })
				return
			}
			message.channel.send({ embeds: [embed]})
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
			if(name.length < 3 || name.length > 32) return message.channel.send({content: "Invalid Name length"})
			const NAMEURL = new URL(`https://scoresaber.com/api/players?search=${name}`)
			fetch(NAMEURL)
			.then(async res => {
				if(res.status == 429) return ErrorEmbed("Api Overloaded! Please try again in some seconds")
				if(res.status == 404 && +name) return GetPlayerDataID(name)
				if(res.status != 200) return ErrorEmbed(`Unknown Error ${res.status} ${res.statusText}`)
				const body = await res.json()
				BuildEmbed(body.players[0])
			})
		}
	}
}