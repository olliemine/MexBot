const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const CheckRoles = require("./CheckRoles")
const { visitanteRole, verificadoRole } = require("../info.json")
const GetUser = require("./GetUser")
const {GetBacktext} = require("../Util")

module.exports = async (DiscordClient, user, scoresaber) => {
	function getName(name, prefix) {
		fullname = `${prefix} | ${name}`
		if(fullname.length > 32) return "!changename"
		return name
	}
	function Refresh(id, pfp) {
		if(pfp == "https://cdn.scoresaber.com/avatars/steam.png") fetch(`https://scoresaber.com/api/user/${id}/refresh`)
	}
	const res = await GetUser.fullSearch(scoresaber)
	if(!res.status) throw [res.body, `User ${user.user.username} recieved error ${res.body} on ${scoresaber}`]
	const body = res.body
	const exists = await UserSchema.findOne({ beatsaber: body.id }, {discord: 1, dsactive: 1})
	if(exists && exists.discord && exists.dsactive) throw ["Ya hay una usuario con esta cuenta, Si deverdad es tu cuenta porfavor contacta a un Admin", `Account ${body.name} has already been taken ${user.user.username}`]
	Refresh(body.id, body.profilePicture)
	const backtext = GetBacktext(body, "body")
	const username = getName(body.name, backtext)
	await user.setNickname(`${backtext} | ${username}`)
	if(body.country == "MX") {
		user.roles.add(verificadoRole)
		CheckRoles(body.countryRank, user, DiscordClient)
	}
	else user.roles.add(visitanteRole)
	if(exists) {
		await UserSchema.findOneAndUpdate({
			beatsaber: body.id
		}, {
			discord: user.id,
			dsactive: true,
			name: username
		})
		return [user.user.username, body.name]
	}
	const userinfo = {
		"discord": user.id,
		"beatsaber": body.id,
		"realname": body.name,
		"country": body.country,
		"bsactive": !body.inactive,
		"dsactive": true,
		"name": username,
		"lastrank": body.country == "MX" ? body.countryRank : null,
		"lastmap": null,
		"lastmapdate": null,
		"snipe": false,
		"playHistory": [],
		"plays": []
	}
	await new UserSchema(userinfo).save()
	return [user.user.username, body.name]
}