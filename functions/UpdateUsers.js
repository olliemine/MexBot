const UserSchema = require("../models/UserSchema")
const fetch = require("node-fetch")
const errorhandle = require("./error")
const infohandle = require("./info")
const CheckRoles = require("./CheckRoles")
const InfoChannelMessage = require("./InfoChannelMessage")
const LevelSchema = require("../models/LevelSchema")
const { serverId, topRoles } = require("../info.json")
const { client } = require("../index")
const { checkNicknameChangePermission, GetPromises } = require("../Util")

/**
 *  @typedef {import("./GetUser").ScoresaberUserBody} ScoresaberUserBody
 * 	@typedef {import("../Util").UserObject} UserObject
 */

module.exports = async () => {
	/** 
	 * @returns {Array<User>} 
	 */
	function ConvertToClasses(arr) {
		let temp = []
		arr.forEach(a => {
			temp.push(new User(a))
		})
		return temp
	}
	class User {
		constructor(row) {
			/**
			 * @type {ScoresaberUserBody}
			 */
			this.row = row
			/**
			 * @type {UserObject}
			 */
			this.user = users.find(element => element.beatsaber == row.id)
			this.member = this.user ? server.members.cache.get(this.user.discord) : null
		}
		async UpdateIA(inactiveUser) {
			this.user = inactiveUser
			this.member = server.members.cache.get(this.user.discord)
			await UserSchema.findOneAndUpdate({ beatsaber: this.user.beatsaber }, { bsactive: true })
			if(!this.member) return	
			CheckRoles(this.user.lastrank, this.member)
			await this.setNickname(`#${this.user.lastrank} | ${this.user.name}`)
			infohandle("UpdateUsers", `${this.user.realname} has been activated activated`)
		}
		async Add() {
			const user = {
				"discord": null,
				"beatsaber": this.row.id,
				"realname": this.row.name,
				"country": "MX",
				"bsactive": true,
				"dsactive": false,
				"dsusername": null,
				"name": null,
				"lastrank": 50,
				"lastmap": null,
				"lastmapdate": null,
				"snipe": null,
				"playHistory": [],
				"plays": []
			}
			console.log(`user ${this.row.name} was saved`)
			await new UserSchema(user).save()
		}
		async UpdateName() {
			await LevelSchema.updateMany({ 
				TopPlayer: this.user.beatsaber
			}, {
				TopPlayerName: this.row.name
			})
			await LevelSchema.updateMany(
				{"Leaderboard.PlayerID": this.user.beatsaber},
				{ $set: { "Leaderboard.$.PlayerName": this.row.name }}
			)
			return await UserSchema.findOneAndUpdate({
				beatsaber: this.user.beatsaber
			}, {
				realname: this.row.name
			})
		}
		async Update() {
			await UserSchema.findOneAndUpdate({
				beatsaber: this.user.beatsaber
			}, {
				lastrank: this.row.countryRank
			})
			if(!this.user.dsactive) return
			CheckRoles(this.row.countryRank, this.member)
			await this.setNickname(`#${this.row.countryRank} | ${this.user.name}`)
		}
		async InactiveAccount() {
			await UserSchema.findOneAndUpdate({
				beatsaber: this.user.beatsaber
			}, {
				bsactive: false
			})
			if(!this.user.dsactive) return
			ranks.forEach((rank) => {
				this.member.roles.remove(rank).catch((error) => errorhandle(error))
			})
			await this.setNickname(`IA | ${this.user.name}`)
		}
		async setNickname(nickname) {
			if(checkNicknameChangePermission(this.member)) return await this.member.setNickname(nickname).catch(err => errorhandle(err))
		} 
	}
	
	const server = client.guilds.cache.get(serverId)
	let usersInfoLog = []
	let users = await UserSchema.find({country: "MX", bsactive: true}, {playHistory: 0, plays: 0})
	const ranks = [server.roles.cache.get(topRoles[0]), server.roles.cache.get(topRoles[1]), server.roles.cache.get(topRoles[2]), server.roles.cache.get(topRoles[3])]
	
	//Top 50
	const resInfo = await fetch(`https://scoresaber.com/api/players?page=1&countries=mx`)
	if(resInfo.status !== 200) return
	const bodyInfo = await resInfo.json()
	if(!bodyInfo.players) return
	let info = ConvertToClasses(bodyInfo.players)
	await SaveUsers(info)

	//Non Top 50 players
	const GetPage = async (beatsaber) => fetch(`https://scoresaber.com/api/player/${beatsaber}/full`)
	users = users.filter(element => element.dsactive || (!element.dsactive && element.lastrank <= 50))
	if(!users) return
	let userIds = []
	users.forEach((user) => userIds.push(user.beatsaber))
	try{
		var resIndividualInfo = await GetPromises(GetPage, userIds)
	} catch(e) {
		return console.log(e)
	}
	info = ConvertToClasses(resIndividualInfo)
	await SaveUsers(info)

	if(usersInfoLog.length) InfoChannelMessage(usersInfoLog)

	async function SaveUsers(userClasses) {
		for await(const user of userClasses) {
			if(!user.user) {
				const inactiveUser = await UserSchema.findOne({ beatsaber: user.row.id }, {playHistory: 0, plays: 0})
				if(inactiveUser) {
					await user.UpdateIA(inactiveUser)
					continue
				}
				await user.Add()
				continue
			}
			if(user.row.inactive) {
				await user.InactiveAccount()
				continue
			}
			users = users.filter(element => element.beatsaber != user.row.id)
			if(user.row.name != user.user.realname) await user.UpdateName()
			if(user.user.lastrank == user.row.countryRank) continue
			if(user.user.lastrank > 50) return
			usersInfoLog.push({
				"user": user.user.realname,
				"update":  user.user.lastrank - user.row.countryRank, 
				"lastrank": user.user.lastrank,
				"newrank": user.row.countryRank
			})
			await user.Update()
		}
	}
}