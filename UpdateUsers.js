const mongo = require("./mongo")
const UserSchema = require("./models/UserSchema")
const fetch = require("node-fetch")
const puppeteer = require("puppeteer")
const errorhandle = require("./error")
const infohandle = require("./info")

module.exports = async (Client) => {
	
	//Gets puppeteer to get all top 50 players
	await mongo()
	const users = await UserSchema.find({ active: true, lastrank: {$ne: null}, lastrank: { $lte: 50 } })
	const browser = await puppeteer.launch({args: ['--no-sandbox']})
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
	users.forEach((user) => {
		const ifis = info[user.lastrank - 1][1] == user.realname ? true : false //For some weird reason i cant put this directly in the if statement, weird
		if(!ifis) searchusers.push(user)
		return		
	})
	console.log(searchusers)
	const server = await Client.guilds.fetch("822514160154706010")
	const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
	
	
	function CheckRoles(number, discorduser) {
		if(number <= 10) {//Top 10?
			if(!discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.add(ranks[0])//Checkar si tiene role y si no dar role
			if(number <= 3) {//Es top 3?
				if(!discorduser.roles.cache.find(r => r.id === ranks[number].id)) {//Tiene el role?
					discorduser.roles.add(ranks[number])
					for (let index = 1; index <= 3; index++) {
						if(index == number) continue
						if(discorduser.roles.cache.find(r => r.id === ranks[index].id)) discorduser.roles.remove(ranks[index])
					}
				}
			} else if(discorduser.roles.cache.find(r => r.id === ranks[1].id) || discorduser.roles.cache.find(r => r.id === ranks[2].id) || discorduser.roles.cache.find(r => r.id === ranks[3].id)) { //Quitar roles y return
				for (let index = 1; index <= 3; index++) {
					discorduser.roles.remove(ranks[index])
				}
			}
		} else if(discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.remove(ranks[0]) //Quitar role y return
	}
	if(searchusers.length) {
		searchusers.forEach((user) => {
			info.forEach(async (row) => {
				if(row[1] == user.realname) {
					const discorduser = await server.members.fetch(user.discord)
					CheckRoles(row[0], discorduser)
					discorduser.setNickname(`#${row[0]} | ${user.name}`)
					usersupdated.push(user.realname)
					await UserSchema.findOneAndUpdate({
						discord: user.discord
					}, {
						lastrank: row[0]
					})
				}
			})
		})
	}
	const otherusers = await UserSchema.find({ active: true, lastrank: {$ne: null}, lastrank: { $gte: 51 }  })
	otherusers.forEach(async (user) => {
		await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
			if(body.error) return errorhandle(client, new Error("Couldnt get user " + user.name))
			if(user.lastrank == body.playerInfo.countryRank) return
			const discorduser = await server.members.fetch(user.discord)
			CheckRoles(body.playerInfo.countryRank, discorduser)
			usersupdated.push(user.realname)
			discorduser.setNickname(`#${body.playerInfo.countryRank} | ${user.name}`)
			await UserSchema.findOneAndUpdate({
				discord: user.discord
			}, {
				lastrank: body.playerInfo.countryRank
			})
		})
	})
	if(usersupdated.length) infohandle(Client, "Updated Users", `Updated users ${usersupdated.join(", ")}`)
}