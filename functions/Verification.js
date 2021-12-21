const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const CheckRoles = require("./CheckRoles")
const { visitanteRole, verificadoRole } = require("../info.json")

module.exports = async (DiscordClient, user, ID, link = true) => {
	async function getRes() {
		const res = await fetch(`https://scoresaber.com/api/player/${ID}/full`)	
		if(res.status != 404 && link) return res
		const res2 = await fetch(`https://scoresaber.com/api/player/${ID.slice(0, -16)}/full`)
		return res2
	}
	function getName(name, prefix) {
		fullname = `${prefix} | ${name}`
		if(fullname.length > 32) return "!changename"
		return name
	}
	function Refresh(id, pfp) {
		if(pfp == "https://cdn.scoresaber.com/avatars/steam.png") fetch(`https://scoresaber.com/api/user/${id}/refresh`)
	}
	const res = await getRes()
	if(res.status != 200) throw [`${res.status} ${res.statusText}`, `User ${user.user.username} recieved error ${res.status} ${res.statusText} on ${ID}`]
	const body = await res.json()
	const exists = await UserSchema.findOne({ beatsaber: body.id })
	if(exists && exists.discord && exists.dsactive) throw ["Ya hay una usuario con esta cuenta, Si deverdad es tu cuenta porfavor contacta a un Admin", `Account ${body.name} has already been taken ${user.user.username}`]
	Refresh(body.id, body.profilePicture)
	const backtext = body.inactive == true ? "IA" : body.country != "MX" ? body.country : `#${body.countryRank}`
	const username = getName(body.name, backtext)
	user.setNickname(`${backtext} | ${username}`)
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
		"playHistory": []
	}
	await new UserSchema(userinfo).save()
	return [user.user.username, body.name]
}