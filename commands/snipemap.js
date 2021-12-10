const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const fetch = require("node-fetch")

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
			if(diff.notes < 11) return null
			return (920*(diff.notes - 11)) + 2875
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
		async function GetMap(id) {
			let map
			if(id) map = await LevelSchema.aggregate([ { $match: { TopPlayer: id, PlayerCount: { $gte: 2 }} }, { $sample: { size: 1 } }]).limit(1)
			else map = await LevelSchema.aggregate([ { $match: { PlayerCount: { $gte: 2 }} }, { $sample: { size: 1 } }]).limit(1)
			map = map[0]
			if(!map) return message.channel.send({ content: "Usuario no tiene mapas snipeables"})
			const res = await fetch(`https://beatsaver.com/api/maps/hash/${map.Hash}`)
			if(res.status != 200) return GetMap(id)
			const body = await res.json()
			const maxscore = GetMaxScore(body.versions[0].diffs, map)
			const timesince = timeSince(map.Leaderboard[0].Date)
			if(!maxscore) return message.channel.send({ content: `${map.TopPlayerName} **${timesince} ago** https://beatsaver.com/maps/${map.Code} | ${FormatDiff(map.DiffInfo.Diff)}` })
			const percent = ((map.TopScore / maxscore)*100).toFixed(2)
			return message.channel.send({ content: `${map.TopPlayerName} got **${percent}%** on https://beatsaver.com/maps/${map.Code} **${timesince} ago** | ${FormatDiff(map.DiffInfo.Diff)}`})
		}
		async function GetUserInfo() {
			if(member) return await UserSchema.findOne({ discord: member.id })
			if(+args[0]) return await UserSchema.findOne({ beatsaber: args[0] })
			const regex = new RegExp(["^", escapeRegExp(name), "$"].join(""), "i")
			return await UserSchema.findOne({realname: regex})
		}
		if(!args[0]) return GetMap(null)
		const member = message.mentions.users.first()
		const name = args.join(" ")
		const userinfo = await GetUserInfo()
		if(!userinfo || !userinfo.lastmap) return message.channel.send({ content: "Usuario no tiene cuenta"})
		GetMap(userinfo.beatsaber)
	},
};