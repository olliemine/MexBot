const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const errorhandle = require("./error")
const infohandle = require("./info")
const CheckRoles = require("./CheckRoles")
const InfoChannelMessage = require("./InfoChannelMessage")
const LevelSchema = require("../models/LevelSchema")
const { serverId, topRoles } = require("../info.json")
const { client } = require("../index")
//const MXleaderboard = require("./models/MXleaderboard")

module.exports = async () => {
	let usersupdatedraw = []
	let users = await UserSchema.find({country: "MX", bsactive: true}, {playHistory: 0, plays: 0})
	const server = await client.guilds.fetch(serverId)
	const ranks = [server.roles.cache.get(topRoles[0]), server.roles.cache.get(topRoles[1]), server.roles.cache.get(topRoles[2]), server.roles.cache.get(topRoles[3])]
	async function GetInfo() {
		const res = await fetch(`https://scoresaber.com/api/players?page=1&countries=mx`)
		if(res.status !== 200) return null
		const body = await res.json()
		return body.players
	}
	const info = await GetInfo()
	if(!info) return
	async function UpdateName(beatsaber, newname) {
		await LevelSchema.updateMany({ 
			TopPlayer: beatsaber
		}, {
			TopPlayerName: newname
		})
		await LevelSchema.updateMany(
			{"Leaderboard.PlayerID": beatsaber},
			{ $set: { "Leaderboard.$.PlayerName": newname }}
		)
		return await UserSchema.findOneAndUpdate({
			beatsaber: beatsaber
		}, {
			realname: newname
		})
	}
	async function NewUser(row, country) {
		const user = {
			"discord": null,
			"beatsaber": row.id,
			"realname": row.name,
			"country": country,
			"bsactive": true,
			"dsactive": false,
			"name": null,
			"lastrank": 50,
			"lastmap": null,
			"lastmapdate": null,
			"snipe": null,
			"playHistory": [],
			"plays": []
		}
		console.log(row.name)
		await new UserSchema(user).save()
	}
	async function UpdateIA(user) {
		infohandle("UpdateUsers", user.realname)
		await UserSchema.findOneAndUpdate({ beatsaber: user.beatsaber }, { bsactive: true })
		if(!user.dsactive) return
		const discorduser = await server.members.fetch(user.discord)
		CheckRoles(user.lastrank, discorduser)
		await discorduser.setNickname(`#${user.lastrank} | ${user.name}`)
	}
	for await(const user of info) {
		const userinfo = users.find(element => element.beatsaber == user.id)
		if(!userinfo) {
			const exists = await UserSchema.findOne({ beatsaber: user.id }, {playHistory: 0, plays: 0})
			if(exists) {
				await UpdateIA(exists)
				continue
			}
			await NewUser(user, "MX")
			continue
		}
		users = users.filter(element => element.beatsaber != user.id)
		if(user.name != userinfo.realname) await UpdateName(userinfo.beatsaber, user.name)
		if(userinfo.lastrank == user.countryRank) continue
		usersupdatedraw.push({
			"user": userinfo.realname,
			"update":  userinfo.lastrank - user.countryRank, 
			"lastrank": userinfo.lastrank,
			"newrank": user.countryRank
		})
		await UserSchema.findOneAndUpdate({
			beatsaber: userinfo.beatsaber
		}, {
			lastrank: user.countryRank
		})
		if(!userinfo.dsactive) continue
		const discorduser = await server.members.fetch(userinfo.discord).catch((error) => errorhandle(error))
		CheckRoles(user.countryRank, discorduser)
		if(discorduser.roles.highest.position > server.members.resolve(client.user).roles.highest.position) { 
			infohandle("asd", `${discorduser.displayName} needs to change to ${user.countryRank} manually`)
			continue
		}
		try {
			await discorduser.setNickname(`#${user.countryRank} | ${userinfo.name}`)
		} catch(err) {
			errorhandle(err)
		}
	}
		

	async function GetPage(beatsaber) {
		return fetch(`https://scoresaber.com/api/player/${beatsaber}/full`)
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
			discorduser.roles.remove(rank).catch((error) => errorhandle(error))
		})
		await discorduser.setNickname(`IA | ${user.name}`).catch((error) => errorhandle(error))
	}
	let PlayerCounter = 0
	for await(const data of full) {
		player = users[PlayerCounter]
		PlayerCounter++
		const body = await data.json()
		if(body.name != player.realname) await UpdateName(player.beatsaber, body.name)
		if(body.inactive == true) { 
			InactiveAccount(player)
			continue
		}
		if(player.lastrank == body.countryRank) continue
		await UserSchema.findOneAndUpdate({
			beatsaber: player.beatsaber
		}, {
			lastrank: body.countryRank
		})
		if(!player.dsactive) continue
		const discorduser = await server.members.fetch(player.discord)
		CheckRoles(body.countryRank, discorduser)
		if(discorduser.roles.highest.position > server.members.resolve(client.user).roles.highest.position) { 
			infohandle("asd", `${discorduser.displayName} needs to change to ${body.countryRank} manually`)
			continue
		}
		try {
			await discorduser.setNickname(`#${body.countryRank} | ${player.name}`)
		} catch(err) {
			errorhandle(err)
		}
	}

	if(usersupdatedraw.length) {
		InfoChannelMessage(usersupdatedraw)
	}
}