const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js")
const { timeSince } = require("../Util")
const { client } = require("../index")

module.exports = {
	name : "snipemap",
	aliases : ["smap"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, args) {
		function FormatDiff(diff) {
			if(diff != "ExpertPlus") return diff
			return "Expert+"
		}
		async function GetMap(filter) {
			let map = await LevelSchema.aggregate([ { $match:  filter  }, { $sample: { size: 1 } }]).limit(1)
			map = map[0]
			if(!map) return message.channel.send({ content: "No maps found."})
			const maxscore = map.MaxScore
			const timesince = timeSince(map.Leaderboard[0].Date)
			const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setLabel("Scoresaber")
					.setStyle("LINK")
					.setURL(`https://scoresaber.com/leaderboard/${map.LevelID}`)
			)
			if(!maxscore) return message.channel.send({ content: `${map.TopPlayerName} on https://beatsaver.com/maps/${map.Code} **${timesince} ago** | ${FormatDiff(map.DiffInfo.Diff)}`, components: [row]})
			const percent = ((map.TopScore / maxscore)*100).toFixed(2)
			return message.channel.send({ content: `${map.TopPlayerName} got **${percent}%** on https://beatsaver.com/maps/${map.Code} **${timesince} ago** | ${FormatDiff(map.DiffInfo.Diff)}`, components: [row]})
		}
		function AddErrors(text) {
			errors += text + "\n"
		}
		function AddWarnings(text) {
			warnings += text + "\n"
		}
		async function GetFilter() {
			function IdfromMention(text) {
				text = text.substring(3)
				text = text.slice(0, -1)
				return text
			}
			let fil = {$and: [{ PlayerCount: {$gte: 2}} ]}
			if(!args[0]) return fil
			let rankcheck = false
			let playedcheck = false
			let used = []
			let tokens = []
			let names = []
			var temp = args.join("")
			let gnegative = null
			temp = temp.split(",")
			temp.forEach(t => {
				if(!t) return
				if(t.toLowerCase() == "ranked" || t.toLowerCase() == "played" || t.toLowerCase() == "unranked" || t.toLowerCase() == "unplayed") return tokens.push(t)
				names.push(t)
			})
			const mentionregex = new RegExp("^<@![0-9]*>$", "g")
			tokens.forEach(argument => {
				if(rankcheck && playedcheck) return
				switch(argument.toLowerCase()) {
					case "ranked":
						if(rankcheck) return AddErrors(`A Ranked token is already in use (${argument})`)
						fil.$and.push({ Ranked: true })
						rankcheck = true
						break
					case "unranked":
						if(rankcheck) return AddErrors(`A Ranked token is already in use (${argument})`)
						fil.$and.push({ Ranked: false })
						rankcheck = true
						break
					case "played":
						if(!userMessageInfo) return AddErrors(`No account found (${argument})`)
						if(playedcheck) return AddWarnings(`Played token is already in use (${argument})`)
						fil.$and.push({Leaderboard: {$elemMatch: {PlayerID: userMessageInfo.beatsaber}}})
						playedcheck = true
						break
					case "unplayed":
						if(!userMessageInfo) return AddErrors(`No account found (${argument})`)	
						if(playedcheck) return AddWarnings(`Played token is already in use (${argument})`)
						fil.$and.push({Leaderboard: {$elemMatch: {PlayerID: {$ne: userMessageInfo.beatsaber}}}})
						playedcheck = true	
						return
				}
			})
			async function AddFilterUser(user, negative, argument) {
				if(!user) return AddErrors(`Invalid token (${argument})`)
				if(used.includes(user.realname)) return AddWarnings(`Token ${user.realname} already in use, ignoring it`)
				used.push(user.realname)
				if(negative) return fil.$and.push({TopPlayer: {$ne: user.beatsaber}})
				if(!fil.$or) fil.$or = []
				return fil.$or.push({TopPlayer: user.beatsaber})
			}
			for await(let argument of names) {
				const unchanged = argument
				let negative = argument.startsWith("!")
				if(gnegative == null) gnegative = negative
				if(gnegative != negative) {
					AddErrors(`Convoluded operations (${argument})`)
					continue
				}
				if(negative) argument = argument.substring(1)
				let id = argument
				if(mentionregex.test(argument)) id = IdfromMention(argument)
				const member = client.users.cache.get(id)
				let user
				if(member) {
					user = await UserSchema.findOne({ discord: member.id }, {realname: 1, beatsaber: 1})
				} else if(+argument) {
					user = await UserSchema.findOne({ beatsaber: argument }, {realname: 1, beatsaber: 1})
				} else {
					user = await UserSchema.findOne({ $text: { $search: argument }}, {realname: 1, beatsaber: 1})
				}
				await AddFilterUser(user, negative, unchanged)
				continue
			}
			return fil
		}
		let errors = ""
		let warnings = ""
		const userMessageInfo = await UserSchema.findOne({ discord: message.author.id, country: "MX" }, {playHistory: 0, plays: 0})
		const filter = await GetFilter()
		if(!filter) return message.channel.send({ content: "Unexpected Error"})
		if(errors) {
			const embed = new MessageEmbed()
			.setColor("RED")
			.setTitle(":warning: Errors")
			.setDescription(errors)
			.setFooter("!snipemaphelp for more information")
			message.channel.send({ embeds: [embed] })
			return
		}
		if(warnings) {
			const embed = new MessageEmbed()
			.setColor("YELLOW")
			.setTitle(":warning: Warnings")
			.setDescription(warnings)
			.setFooter("!snipemaphelp for more information")
			message.channel.send({ embeds: [embed] })
		}
		GetMap(filter)
	},
};