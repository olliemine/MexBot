const mongo = require("../mongo")
const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const puppeteer = require("puppeteer")
const errorhandle = require("./error")
const infohandle = require("./info")
const CheckRoles = require("./CheckRoles")
//const MXleaderboard = require("./models/MXleaderboard")

module.exports = async (Client) => {
	
	//Gets puppeteer to get all top 50 players
	await mongo()
	const users = await UserSchema.find({ active: true, lastrank: {$ne: null}, lastrank: { $lte: 50 } })
	const browser = await puppeteer.launch({
		args: ['--no-sandbox']
	})
	const page = await browser.newPage()
	await page.goto("https://scoresaber.com/global?country=mx", { waitUntil: "networkidle0" })
	let info
	try {  //https://stackoverflow.com/a/60733311/14550193
		info = await page.evaluate(() => {
			const rows = document.querySelectorAll('table tr');
			return Array.from(rows, row => {
				const columns = row.querySelectorAll('td');
				return Array.from(columns, column => column.innerText);
			});
		})
		info.shift()
		info.forEach((row) => {
			row[1] = row[1].substring(1)
			row.shift()
			row[1] = row[1].substring(1)
		})
	} catch(err) {
		errorhandle(Client, err)
	} finally {
		browser.close()
	}
	let searchusers = []
	let usersupdated = []
	const server = await Client.guilds.fetch("822514160154706010")
	const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
	async function InactiveAccount(user) {
		const discorduser = await server.members.fetch(user.discord)
		discorduser.send("Hey! tu cuenta ahora esta inactiva, porfavor has `!active` cuando este reactivada!")
		discorduser.setNickname(`IA | ${user.name}`)
		await UserSchema.findOneAndUpdate({
			discord: user.discord
		}, {
			active: false
		})
		ranks.forEach((rank) => {
			discorduser.roles.remove(rank)
		})
		usersupdated.push(`${user.name} is now inactive`)
	}
	users.forEach(async (user) => {
		if(user.lastrank == 0) return InactiveAccount(user)
		const ifis = info[user.lastrank - 1][1] == user.realname ? true : false //For some weird reason i cant put this directly in the if statement, weird	
		if(!ifis) searchusers.push(user)
		return
	})
	
	function EmojiArrow(unumber, dnumber) {
		if(unumber < dnumber) return "⬆️"
		return "⬇️"
	}
	let otherusers = await UserSchema.find({ active: true, lastrank: {$ne: null}, lastrank: { $gte: 51 }  })
	function UpdateTop50Users() {
		return new Promise((resolve, reject) => {
			if(searchusers.length) {
				searchusers.forEach((user) => {
					let ifLooped = false	
					info.forEach(async (row) => {
						if(row[1] == user.realname) {
							ifLooped = true
							const discorduser = await server.members.fetch(user.discord)
							CheckRoles(row[0], discorduser, ranks)
							try {
								await discorduser.setNickname(`#${row[0]} | ${user.name}`)
								infohandle(Client, "Temp", `Set ${discorduser.user.username} to "#${row[0]} | ${user.name}"`)
							} catch(err) {
								errorhandle(Client, err)
							}
							usersupdated.push(`${user.realname} to ${row[0]} from ${user.lastrank} ${EmojiArrow(row[0], user.lastrank)}`)
							await UserSchema.findOneAndUpdate({
								discord: user.discord
							}, {
								lastrank: row[0]
							})
						}
					})
					if(!ifLooped) otherusers.push(user)
				})
			}
			resolve()
		})
	}
	async function UpdateName(id, newname) {
		return await UserSchema.findOneAndUpdate({
			discord: id
		}, {
			realname: newname
		})
	}
	function UpdateOtherUsers() {
		return new Promise((resolve, reject) => {
			let counter = 0 //Fucking javascript goddamit
			otherusers.forEach(async (user) => {
				counter++
				await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
					if(body.error) return errorhandle(client, new Error("Couldnt get user " + user.name))
					if(body.playerInfo.inactive == 1) return InactiveAccount(user)
					if(user.realname != body.playerInfo.playerName) await UpdateName(user.discord, body.playerInfo.playerName)
					if(user.lastrank == body.playerInfo.countryRank) return
					const discorduser = await server.members.fetch(user.discord)
					CheckRoles(body.playerInfo.countryRank, discorduser, ranks)
					discorduser.setNickname(`#${body.playerInfo.countryRank} | ${user.name}`)
					await UserSchema.findOneAndUpdate({
						discord: user.discord
					}, {
						lastrank: body.playerInfo.countryRank
					})
				}).catch((err) => {
					reject(err)
				})
				if(counter == otherusers.length) resolve()
			})
			
		})
	}
	await UpdateTop50Users()
	await UpdateOtherUsers().then().catch((err) => {
		errorhandle(Client, err, "Couldnt fetch Others, API probably down")
	})
	if(usersupdated.length) infohandle(Client, "Updated Users", `Updated users ${usersupdated.join(", ")}`)
	//let leaderboardobject = []
	//info.forEach((row) => {
	//	leaderboardobject.push({
	//		"playername": row[1],
	//		"pp": row[2]
	//	})
	//})
	//const leaderboard = {
	//	"date": Date.now(),
	//	"leaderboard": leaderboardobject
	//}
	//function Compare(leaderboard1, leaderboard2) {
	//	let comparison = true
	//	let count = 0
	//	leaderboard1.forEach((user) => {
	//		count++
	//		if(user.playername != leaderboard2[count - 1].playername) comparison = false
	//	})
	//	return comparison
	//}
	//const anotherleaderboard = await MXleaderboard.find().sort({ date: -1 }).limit(1)
	//try {
	//	if(!Compare(leaderboard.leaderboard, anotherleaderboard[0].leaderboard)) {
	//		await new MXleaderboard(leaderboard).save()
	//		infohandle(Client, "Saved", "Saved mx leaderboard, this is a temporary info handler.")
	//	}
	//} catch(err) {
	//	errorhandle(Client, err)
	//}
}