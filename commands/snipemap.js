const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js")

module.exports = {
	name : "snipemap",
	aliases : ["smap"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		function timeSince(date) { //https://stackoverflow.com/a/3177838
			var seconds = Math.floor((new Date() - date) / 1000)
			var interval = seconds / 31536000
			if (interval > 1) return Math.floor(interval) + " years";
			interval = seconds / 2592000
			if (interval > 1) return Math.floor(interval) + " months";
			interval = seconds / 86400
			if (interval > 1) 	return Math.floor(interval) + " days";
			interval = seconds / 3600
			if (interval > 1) return Math.floor(interval) + " hours";
			interval = seconds / 60
			if (interval > 1) return Math.floor(interval) + " minutes";
			return Math.floor(seconds) + " seconds"
		}
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
		function AddWarning(text) {
			warnings += text + "\n"
		}
		async function GetFilter() {
			function IdfromMention(text) {
				text = text.substring(3)
				text = text.slice(0, -1)
				console.log(text)
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
				console.log(argument)
				if(rankcheck && playedcheck) return
				switch(argument.toLowerCase()) {
					case "ranked":
						if(rankcheck) return AddWarning(`A Ranked token is already in use, ignoring ${argument}`)
						fil.$and.push({ Ranked: true })
						rankcheck = true
						break
					case "unranked":
						if(rankcheck) return AddWarning(`A Ranked token is already in use, ignoring ${argument}`)
						fil.$and.push({ Ranked: false })
						rankcheck = true
						break
					case "played":
						if(!userMessageInfo) return AddWarning(`No account found, ignoring ${argument}`)
						if(playedcheck) return AddWarning(`A Played token is already in use, ignoring ${argument}`)
						fil.$and.push({Leaderboard: {$elemMatch: {PlayerID: userMessageInfo.beatsaber}}})
						playedcheck = true
						break
					case "unplayed":
						if(!userMessageInfo) return AddWarning(`No account found, ignoring ${argument}`)	
					if(playedcheck) return AddWarning(`A Played token is already in use, ignoring ${argument}`)
						fil.$and.push({Leaderboard: {$elemMatch: {PlayerID: {$ne: userMessageInfo.beatsaber}}}})
						playedcheck = true	
						return
				}
			})
			async function AddFilterUser(user, negative, argument) {
				if(!user) return AddWarning(`Invalid token: ${argument}, ignoring it`)
				if(used.includes(user.realname)) return AddWarning(`Token for ${user.realname} already in use, ignoring it`)
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
					AddWarning(`Convoluded operations, ignoring ${argument}`)
					continue
				}
				if(negative) argument = argument.substring(1)
				let id = argument
				if(mentionregex.test(argument)) id = IdfromMention(argument)
				const member = DiscordClient.users.cache.get(id)
				let user
				if(member) {
					user = await UserSchema.findOne({ discord: member.id })
					await AddFilterUser(user, negative, unchanged)
					continue
				}
				if(+argument) {
					user = await UserSchema.findOne({ beatsaber: argument })
					await AddFilterUser(user, negative, unchanged)
					continue
				}
				user = await UserSchema.findOne({ $text: { $search: argument }})
				await AddFilterUser(user, negative, unchanged)
				continue
			}
			return fil
		}
		let warnings = ""
		const userMessageInfo = await UserSchema.findOne({ discord: message.author.id, country: "MX" })
		const filter = await GetFilter()
		if(!filter) return message.channel.send({ content: "Unexpected Error"})
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