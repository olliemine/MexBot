const fetch = require("node-fetch")
const UserSchema = require("../models/UserSchema")
const CheckRoles = require("./CheckRoles")

module.exports = async (Client) => {
	async function GetPage(beatsaber) {
		return fetch(`https://scoresaber.com/api/player/${beatsaber}/full`)
			.then((res) => {
				return res
			})
	}
	const users = await UserSchema.find({ bsactive: false })
	let promises = []
	users.forEach((user) => {
		promises.push(GetPage(user.beatsaber))
	})
	const full = await Promise.all(promises)
	let counter = 0
	for await(const data of full) {
		const user = users[counter]
		counter++
		if(data.status != 200) continue
		const body = await data.json()
		if(body.inactive == 1) continue
		await UserSchema.findOneAndUpdate({ user: user.beatsaber }, { bsactive: true })
		if(!user.dsactive) continue
		const server = await Client.guilds.fetch("905874757331857448")
		const discorduser = await server.members.fetch(user.discord)
		CheckRoles(user.lastrank, discorduser, Client)
		await discorduser.setNickname(`#${user.lastrank} | ${user.name}`)//Probably change later?
	}
}