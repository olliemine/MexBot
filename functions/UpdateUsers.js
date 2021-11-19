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
	let usersupdatedraw = []
	let users = await UserSchema.find({country: "MX", bsactive: true})
	const server = await Client.guilds.fetch("905874757331857448")
	const ranks = [server.roles.cache.get("905874757331857454"), server.roles.cache.get("905874757331857457"), server.roles.cache.get("905874757331857456"), server.roles.cache.get("905874757331857455")]

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
		//["rank", "realname", "id"]
	} catch(err) {
		errorhandle(Client, err)
	} finally {
		browser.close()
	}
	async function UpdateName(beatsaber, newname) {
		await LevelSchema.updateMany({ 
			TopPlayer: beatsaber
		}, {
			TopPlayerName: newname
		})
		return await UserSchema.findOneAndUpdate({
			beatsaber: beatsaber
		}, {
			realname: newname
		})
	}
	async function NewUser(row, country) {
		const user = {
			"discord": null,
			"beatsaber": row[2],
			"realname": row[1],
			"country": country,
			"bsactive": true,
			"dsactive": false,
			"name": null,
			"lastrank": 50,
			"lastmap": null,
			"snipe": null,
		}
		console.log(row[1])
		await new UserSchema(user).save()
	}

	for await(const user of info) {
		const userinfo = users.find(element => element.beatsaber == user[2])
		if(!userinfo) {
			await NewUser(user, "MX")
			continue
		}
		users = users.filter(element => element.beatsaber != user[2])
		if(user[1] != userinfo.realname) await UpdateName(userinfo.beatsaber, user[1])
		if(userinfo.lastrank == user[0]) continue
		usersupdatedraw.push({
			"user": userinfo.realname,
			"update":  userinfo.lastrank - user[0], 
			"lastrank": userinfo.lastrank,
			"newrank": user[0]
		})
		await UserSchema.findOneAndUpdate({
			beatsaber: userinfo.beatsaber
		}, {
			lastrank: user[0]
		})
		if(!userinfo.dsactive) continue
		const discorduser = await server.members.fetch(userinfo.discord)
		CheckRoles(user[0], discorduser, Client)
		if(discorduser.roles.highest.position > server.members.resolve(Client.user).roles.highest.position) { 
			infohandle(Client, "asd", `${discorduser.displayName} needs to change to ${body.playerInfo.countryRank} manually`)
			continue
		}
		try {
			await discorduser.setNickname(`#${body.playerInfo.countryRank} | ${player.name}`)
		} catch(err) {
			errorhandle(Client, err)
		}
	}
		

	async function GetPage(beatsaber) {
		return fetch(`https://new.scoresaber.com/api/player/${beatsaber}/full`)
			.then((res) => {
				return res
			})
	}
	let userslist = []
	users = users.filter(element => element.dsactive || (!element.dsactive && element.lastrank <= 50))
	users.forEach((user) => {
		userslist.push(user.beatsaber)
	})
	if(!userslist.length) return
	let full = []
	function GetPromises() {
		return new Promise((resolve, reject) => {
			async function promise(ids) {
				let promises = []
				ids.forEach(id => {
					promises.push(GetPage(id));
				})
				const unfulldata = await Promise.all(promises)
				let checkagain = []
				let counter = 0
				for(const data of unfulldata) {
					id = ids[counter]
					counter++
					if(data.status == 200) {
						full.push(data)
						continue
					}
					checkagain.push(id)
				}
				if(checkagain.length) return setTimeout(() => { promise(checkagain) }, 1000*20)
				resolve()
				return
			}
			promise(userslist)
		})
	}
	await GetPromises()
	async function InactiveAccount(user) {
		await UserSchema.findOneAndUpdate({
			beatsaber: user.beatsaber
		}, {
			bsactive: false
		})
		if(!user.dsactive) return
		const discorduser = await server.members.fetch(user.discord)
		ranks.forEach((rank) => {
			discorduser.roles.remove(rank)
		})
		await discorduser.setNickname(`IA | ${user.name}`)
	}
	let PlayerCounter = 0
	for await(const data of full) {
		player = users[PlayerCounter]
		PlayerCounter++
		const body = await data.json()
		if(body.playerInfo.playerName != player.realname) await UpdateName(player.beatsaber, body.playerInfo.playerName)
		if(body.playerInfo.inactive == 1) { 
			InactiveAccount(player)
			continue
		}
		if(player.lastrank == body.playerInfo.countryRank) continue
		await UserSchema.findOneAndUpdate({
			beatsaber: player.beatsaber
		}, {
			lastrank: body.playerInfo.countryRank
		})
		if(!player.dsactive) continue
		const discorduser = await server.members.fetch(player.discord)
		CheckRoles(body.playerInfo.countryRank, discorduser, Client)
		if(discorduser.roles.highest.position > server.members.resolve(Client.user).roles.highest.position) { 
			infohandle(Client, "asd", `${discorduser.displayName} needs to change to ${body.playerInfo.countryRank} manually`)
			continue
		}
		try {
			await discorduser.setNickname(`#${body.playerInfo.countryRank} | ${player.name}`)
		} catch(err) {
			errorhandle(Client, err)
		}
	}

	if(usersupdatedraw.length) {
		InfoChannelMessage(Client, usersupdatedraw)
	}
}