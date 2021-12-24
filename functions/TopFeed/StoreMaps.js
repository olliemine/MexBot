const LevelSchema = require("../../models/LevelSchema")
const UserSchema = require("../../models/UserSchema")
const { MessageActionRow, MessageButton } = require("discord.js")
const { top1feedChannel } = require("../../info.json")
const fetch = require("node-fetch")

module.exports = (newscores, user, firstmap, DiscordClient) => {
	if(!newscores || !user || !firstmap) return errorhandle(DiscordClient, new Error("Variable was not provided"))
	const topchannel = DiscordClient.channels.cache.get(top1feedChannel)
	function FormatDiff(diff) {
		if(diff != "ExpertPlus") return diff
		return "Expert+"
	}
	function GetDiff(diff) {
		temparray = diff.split("_")
		temparray.shift()
		temparray[1] = temparray[1].substring(4)
		temparray[2] = FormatDiff(temparray[0])
		return temparray
	}
	function pushPlayHistory(playHistory, date) {
		const formatedDate = new Date(date)
		const week = Math.floor((formatedDate.getTime() + 345_600_000) / 604_800_000)
		const index = playHistory.findIndex(obj => obj.week == week)
		if(index != -1) {
			playHistory[index].plays++
			return playHistory
		}
		playHistory.push({
			plays: 1,
			week: week
		})
		playHistory.sort((a, b) => {
			return a.week - b.week
		})
		return playHistory
	}
	function GetLeaderboard(score, user, map) {
		let Leaderboard = map.Leaderboard.filter(value => value.PlayerID != user.beatsaber)
		Leaderboard.push({
			"PlayerID": user.beatsaber,
			"PlayerName": user.realname,
			"Score": score.score,
			"Country": user.country,
			"Date": score.date,
			"Mods": score.mods,
			"PP": score.pp
		})
		Leaderboard = Leaderboard.sort((a, b) => {
			return b.Score - a.Score
		})
		return Leaderboard
	}
	function GetPlayerCount(user, map) {
		const userscore = map.Leaderboard.find(value => value.PlayerID == user.beatsaber)
		if(!userscore) return map.PlayerCount += 1
		return map.PlayerCount
	}
	return new Promise(async (resolve, reject) => {
		console.log(`New from ${user.realname}`)
		let newmaps = []
		let updateBulkWrite = []
		let playHistory = user.playHistory
		let mapMode = newscores.length >= 25 ? true : false
		let maps
		if(mapMode) maps = await LevelSchema.find({})
		for await(const score of newscores) {
			playHistory = pushPlayHistory(playHistory, score.date)
			let map
			if(mapMode) map = maps.find(obj => obj.LevelID == score.map)
			else map = await LevelSchema.findOne({ "LevelID": score.map })
			if(map) {
				const Leaderboard = GetLeaderboard(score, user, map)
				const PlayerCount = GetPlayerCount(user, map)
				if(score.score <= map.TopScore) {
					updateBulkWrite.push({ updateOne: {
						"filter": { "LevelID": score.map },
						"update": { $set: { "PlayerCount": PlayerCount, "Leaderboard": Leaderboard }}
					}})
					console.log(`Score ${score.score} not better than ${map.TopScore}`)
					continue
				}
				if(user.beatsaber == map.TopPlayer) {
					updateBulkWrite.push({ updateOne: {
						"filter": { "LevelID": score.map },
						"update": { $set: { "TopScore": score.score, "Leaderboard": Leaderboard }}
					}})
					continue
				}
				console.log(`Better score ${score.score} better than ${map.TopScore}`)
				updateBulkWrite.push({ updateOne: {
					"filter": { "LevelID": score.map },
					"update": { $set: { 
						"TopScore": score.score,
						"TopPlayer": user.beatsaber,
						"TopPlayerName": user.realname,
						"PlayerCount": PlayerCount,
						"Leaderboard": Leaderboard
					}}
				}})
				if(!user.lastmap) continue
				let previousname = map.TopPlayerName
				const previoususer = await UserSchema.findOne({ beatsaber: map.TopPlayer})
				if(previoususer?.dsactive && previoususer?.snipe) previousname = `<@${previoususer.discord}>`
				const row = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setLabel("Beatsaver")
						.setStyle("LINK")
						.setURL(`https://beatsaver.com/maps/${map.Code}`)
				)
				const maxscore = map.MaxScore
				if(!maxscore) return topchannel.send({ content: `${user.realname} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map}?countries=MX snipeando a **${previousname}**\nhttps://scoresaber.com/u/${user.beatsaber}`, components: [row]})
				const percent = (((score.score / maxscore)*100) - ((map.TopScore / maxscore)*100)).toFixed(2)//newpercent - oldpercent
				topchannel.send({ content: `${user.realname} ha conseguido top 1 en https://scoresaber.com/leaderboard/${score.map}?countries=MX snipeando a **${previousname}** por **${percent}**%\nhttps://scoresaber.com/u/${user.beatsaber}`, components: [row]})
				continue												
			}
			const Diff = GetDiff(score.diff)
			const newmap = {
				"LevelID": score.map,
				"SongName": score.songName,
				"SongAuthorName": score.songAuthorName,
				"MapAuthor": score.mapAuthor,
				"TopPlayer": user.beatsaber,
				"TopScore": score.score,
				"TopPlayerName": user.realname,
				"Hash": score.hash,
				"Code": null,
				"Ranked": score.ranked,
				"Stars": score.stars,
				"MaxScore": score.maxscore,
				"DiffInfo": {
					"Diff": Diff[0],
					"Mode": Diff[1],
					"FormatDiff": Diff[2],
					"DiffSort": score.diffSort
				},
				"PlayerCount": 1,
				"Leaderboard": [{
					"PlayerID": user.beatsaber,
					"PlayerName": user.realname,
					"Score": score.score,
					"Country": user.country,
					"Date": score.date,
					"Mods": score.mods,
					"PP": score.pp
				}]
			}
			newmaps.push(newmap)
			//console.log(`New map ${score.map}`)
			continue
		}
		await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false })
		await LevelSchema.insertMany(newmaps, { ordered: false })
		await UserSchema.updateOne({
			"beatsaber": user.beatsaber
		}, {
			"lastmap": firstmap.id,
			"lastmapdate": firstmap.date,
			"playHistory": playHistory
		})
		console.log("finished")
		newscores = null
		maps = null
		updateBulkWrite = null
		newmaps = null
		resolve()
	})
}