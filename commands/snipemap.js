const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const fetch = require("node-fetch")
const infohandle = require("../functions/info")
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js")

module.exports = {
	name : "snipemap",
	aliases : ["smap"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		function GetMaxScore(diffs, map) {
			let diff
			for(const diffinfo of diffs) {
				if(diffinfo.characteristic == map.DiffInfo.Mode && diffinfo.difficulty == map.DiffInfo.Diff) {
					diff = diffinfo
					break
				} 
			}
			if(diff.notes == 1) return 115;
			if(diff.notes <= 4) return 115 + (diff.notes - 1) * 115 * 2;
			if(diff.notes <= 13) return 115 + 4 * 115 * 2 + (diff.notes - 5) * 115 * 4
			return 115 + 4 * 115 * 2 + 8 * 115 * 4 + (diff.notes - 13) * 115 * 8
		}
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
		function escapeRegExp(text) {
			return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
		}
		async function GetMap(filter) {
			let map = await LevelSchema.aggregate([ { $match:  filter  }, { $sample: { size: 1 } }]).limit(1)
			map = map[0]
			if(!map) return message.channel.send({ content: "No maps found."})
			const res = await fetch(`https://beatsaver.com/api/maps/hash/${map.Hash}`)
			if(res.status == 404) {
				await LevelSchema.deleteMany({ Hash: map.Hash })
				infohandle(DiscordClient, "Snipemap", `Deleted ${map.Hash}`)
				return GetMap(filter)
			}
			if(res.status != 200) return GetMap(filter)
			const body = await res.json()
			const maxscore = GetMaxScore(body.versions[0].diffs, map)
			const timesince = timeSince(map.Leaderboard[0].Date)
			const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setLabel("Scoresaber")
					.setStyle("LINK")
					.setURL(`https://scoresaber.com/leaderboard/${map.LevelID}`)
			)	
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
			let fil = {$and: [{ PlayerCount: {$gte: 2}}, { bsactive: true} ]}
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
			async function AddFilterUser(search, negative, argument) {
				const user = await UserSchema.findOne(search)
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
				if(member) {
					await AddFilterUser({ discord: member.id }, negative, unchanged)
					continue
				}
				if(+argument) {
					await AddFilterUser({ beatsaber: argument }, negative, unchanged)
					continue
				}
				const regex = new RegExp(["^", escapeRegExp(argument), "$"].join(""), "i")
				await AddFilterUser({realname: regex}, negative, unchanged)
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