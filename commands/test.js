const RankedMaps = require("../functions/RankedMaps")
const { createClient } = require("redis")
const { redisuri } = require("../config.json")
const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const { top1feedChannel } = require("../info.json")

module.exports = {
	name: "test",
	description: "",
	admin: false,
	dm: true,
	dev: true,
	cooldown: -1,
	async execute(message, DiscordClient, args) {
		const Code = "1c8c0"
		const topchannel = DiscordClient.channels.cache.get(top1feedChannel)
		const map = await LevelSchema.findOne({Code: Code})
		const newLeaderboard = [{
			Mods: [""],
			PlayerID: "76561198355347380",
			PlayerName: "Jesus H fuckign Crhist",
			Score: 24512585,
			Country: "US",
			Date: new Date(),
			PP: 0
		} ,...map.Leaderboard]
		console.log(newLeaderboard)
		LevelSchema.updateOne({Code: Code}, {
			TopPlayer: "76561198355347380",
			TopPlayerName: "Jesus H fuckign Crhist",
			TopScore: 24512585,
			PlayerCount: map.PlayerCount + 1,
			Leaderboard: newLeaderboard
		})
		const percent = "2153"
		topchannel.send({ content: `Jesus H fuckign Crhist ha conseguido top 1 en https://scoresaber.com/leaderboard/${map.LevelID}?countries=MX snipeando a **YEP | pssssssss** por **${percent}**%\nhttps://scoresaber.com/u/${newLeaderboard[0].PlayerID}`})
	}
}