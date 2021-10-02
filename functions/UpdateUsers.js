const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const puppeteer = require("puppeteer")
const errorhandle = require("./error")
const infohandle = require("./info")
const CheckRoles = require("./CheckRoles")
const InfoChannelMessage = require("./InfoChannelMessage")
const LevelSchema = require("../models/LevelSchema")
//const MXleaderboard = require("./models/MXleaderboard")

module.exports = async (Client) => {
	
	//Gets puppeteer to get all top 50 players
	let users = await UserSchema.find({lastrank: {$ne: null}, lastrank: { $lte: 50 } })
	const browser = await puppeteer.launch({
		args: ['--no-sandbox']
	})
	const page = await browser.newPage()
	await page.goto("https://scoresaber.com/global?country=mx", { waitUntil: "networkidle0" })
	let info
	try {  //https://stackoverflow.com/a/60733311/14550193
		rawlinks = await page.evaluate(() => {
			const rows = document.querySelectorAll('table tr');
			return Array.from(rows, row => {
				const columns = row.querySelectorAll('td a');
				return Array.from(columns, column => column.href);
			});
		})
		info = await page.evaluate(() => {
			const rows = document.querySelectorAll('table tr');
			return Array.from(rows, row => {
				const columns = row.querySelectorAll('td');
				return Array.from(columns, column => column.innerText);
			});
		})
		info.shift()
		rawlinks.shift()
		links = []
		rawlinks.forEach((row) => {
			links.push(row[0].substring(25))
		})
		counter = 0
		info.forEach((row) => {
			row[1] = row[1].substring(1)
			row.shift()
			row[1] = row[1].substring(1)
			row.splice(2, 2)
			row.push(links[counter])
			counter++
		})
	} catch(err) {
		errorhandle(Client, err)
	} finally {
		browser.close()
	}
	let searchusers = []
	let usersupdatedraw = []
	const server = await Client.guilds.fetch("822514160154706010")
	const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
	async function InactiveAccount(user) {
		if(usersupdatedraw.length) usersupdatedraw = []
		const discorduser = await server.members.fetch(user.discord)
		discorduser.send({content: "Hey! tu cuenta ahora esta inactiva, porfavor has `!active` cuando este reactivada!"})
		discorduser.setNickname(`IA | ${user.name}`)
		await UserSchema.findOneAndUpdate({
			discord: user.discord
		}, {
			active: false
		})
		ranks.forEach((rank) => {
			discorduser.roles.remove(rank)
		})
	}
	let ifnew = false
	info.forEach(async (row) => {
		let exists = users.some(user => row[1] === user.realname)
		if(exists) return
		exists = users.some(user => row[2] === user.beatsaber)//This if someone changed their name 
		if(exists) return
		ifnew = true
		const user = {
			"discord": null,
			"beatsaber": row[2],
			"active": false,
			"lastrank": 50,
			"name": null,
			"realname": row[1],
			"lastmap": null
		}
		await new UserSchema(user).save()
	})
	if(ifnew) users = await UserSchema.find({ lastrank: {$ne: null}, lastrank: { $lte: 50 }})
	users.forEach(async (user) => {
		if(user.lastrank == 0) return
		const ifis = info[user.lastrank - 1][1] == user.realname ? true : false //For some weird reason i cant put this directly in the if statement, weird	
		if(!ifis) searchusers.push(user)
		//console.log(`${user.realname} IS ${ifis} ${info[user.lastrank - 1][1]}`)
		return
	})
	
	let otherusers = await UserSchema.find({ lastrank: {$ne: null}, lastrank: { $gte: 51 }  })
	async function UpdateTop50Users() {
		return new Promise(async (resolve, reject) => {
			if(!searchusers.length) return resolve()
			for await(let user of searchusers) {
				let ifLooped = false	
				info.forEach(async (row) => {
					if(row[1] != user.realname) return
					ifLooped = true
					usersupdatedraw.push({
						"user": user.realname,
						"update":  user.lastrank - row[0], 
						"lastrank": user.lastrank,
						"newrank": row[0]
					})
					await UserSchema.findOneAndUpdate({
						beatsaber: user.beatsaber
					}, {
						lastrank: row[0]
					})
					if(!user.active) return
					const discorduser = await server.members.fetch(user.discord)
					CheckRoles(row[0], discorduser, ranks)
					try {
						await discorduser.setNickname(`#${row[0]} | ${user.name}`)
					} catch(err) {
						errorhandle(Client, err)
					}
				})
				if(!ifLooped) otherusers.push(user)
			}
			resolve()
		})
	}
	async function UpdateName(discord, beatsaber, newname) {
		await LevelSchema.updateMany({ 
			TopPlayer: beatsaber
		}, {
			TopPlayerName: newname
		})
		return await UserSchema.findOneAndUpdate({
			discord: discord
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
					if(body.playerInfo.inactive == 1 && user.active) return InactiveAccount(user)
					if(body.playerInfo.countryRank > 50 && !user.discord) return UserSchema.findOneAndDelete({ beatsaber: user.beatsaber })
					if(user.realname != body.playerInfo.playerName) await UpdateName(user.discord, body.playerInfo.playerId, body.playerInfo.playerName)
					if(user.lastrank == body.playerInfo.countryRank) return
					await UserSchema.findOneAndUpdate({
						beatsaber: user.beatsaber
					}, {
						lastrank: body.playerInfo.countryRank
					})
					if(!user.active) return 
					const discorduser = await server.members.fetch(user.discord)
					CheckRoles(body.playerInfo.countryRank, discorduser, ranks)
					discorduser.setNickname(`#${body.playerInfo.countryRank} | ${user.name}`)
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
	if(usersupdatedraw.length) {
		InfoChannelMessage(Client, usersupdatedraw)
	}
}