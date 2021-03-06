const LevelSchema = require("../models/LevelSchema")
const fetch = require("node-fetch")
const { MessageEmbed, MessageAttachment } = require("discord.js")
const GetUser = require("../functions/GetUser")
const {GetUserInfo} = require("../Util")

module.exports = {
	name : "snipeplaylist",
	aliases : ["slist", "splaylist"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, args) {
		function ErrorEmbed(description) {
			const embed = new MessageEmbed()
			.setTitle("Error!")
			.setDescription(description)
			.setColor("#F83939")
			return message.channel.send({ embeds: [embed]})
		}
		if(!args[0]) return message.channel.send({ content: "Please enter a user."})
		const userinfo = await GetUserInfo(args, message)
		if(!userinfo?.lastmap) return message.channel.send({ content: "Usuario no tiene cuenta o es una cuenta invalida"})
		const levels = await LevelSchema.find({ TopPlayer: userinfo.beatsaber, PlayerCount: { $gte: 2 }, Code: { $ne: "0" } })
		if(!levels.length) return message.channel.send({ content: "No snipeable maps found."})
		let data = {
			"playlistTitle": `${userinfo.realname} snipe playlist`,
			"playlistAuthor": "MexBot",
			"songs": [],
			"image": ""
		}
		levels.forEach(level => {
			const index = data.songs.findIndex(obj => obj.hash == level.Hash)
			if(index != -1) {
				return data.songs[index].difficulties.push({
					"characteristic": level.DiffInfo.Mode,
					"name": level.DiffInfo.Diff
				})
			}
			data.songs.push({
				"hash": level.Hash,
				"code": level.Code,
				"difficulties": [{
					"characteristic": level.DiffInfo.Mode,
					"name": level.DiffInfo.Diff
				}]
			})
		})
		const res = await GetUser.basicSearch(userinfo.beatsaber)
		if(!res.status) return ErrorEmbed(`Unknown Error ${res.body}`)
		const body = res.body
		var response = await fetch(body.profilePicture)
		var buffer = await response.buffer()
		var base64data = buffer.toString('base64')
		data.image = `base64,${base64data}`
		var databuf = Buffer.from(JSON.stringify(data, null, 4))
		const attachment = new MessageAttachment(databuf, `${userinfo.realname}snipes.json`)
		message.channel.send({content: `Playlist de ${userinfo.realname} para snipear, **${levels.length}** mapas`, files: [attachment]})
	},
};