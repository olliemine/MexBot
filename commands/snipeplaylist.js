const UserSchema = require("../models/UserSchema")
const LevelSchema = require("../models/LevelSchema")
const fetch = require("node-fetch")
const { MessageEmbed, MessageAttachment } = require("discord.js")

module.exports = {
	name : "snipeplaylist",
	aliases : ["slist"],
	admin: false,
	dm: true,
	cooldown: 2,
	async execute(message, DiscordClient, args) {
		function ErrorEmbed(description) {
			const embed = new MessageEmbed()
			.setTitle("Error!")
			.setDescription(description)
			.setColor("#F83939")
			return message.channel.send({ embeds: [embed]})
		}
		function escapeRegExp(text) {
			return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
		}
		async function GetUserInfo() {
			if(member) return await UserSchema.findOne({ discord: member.id })
			if(+args[0]) return await UserSchema.findOne({ beatsaber: args[0] })
			const regex = new RegExp(["^", escapeRegExp(name), "$"].join(""), "i")
			return await UserSchema.findOne({realname: regex})
		}
		if(!args[0]) return message.channel.send({ content: "Please enter a user."})
		const member = message.mentions.users.first()
		const name = args.join(" ")
		const userinfo = await GetUserInfo()
		if(!userinfo?.lastmap) return message.channel.send({ content: "Usuario no tiene cuenta"})
		const levels = await LevelSchema.find({ TopPlayer: userinfo.beatsaber, PlayerCount: { $gte: 2 }, Code: { $ne: "0" } })
		console.log(levels.length)
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
		const res = await fetch(`https://scoresaber.com/api/player/${userinfo.beatsaber}/basic`)
		if(res.status != 200) return ErrorEmbed(`Unknown Error ${res.status} ${res.statusText}`)
		const body = await res.json()
		var response = await fetch(body.profilePicture)
		var buffer = await response.buffer()
		var base64data = buffer.toString('base64')
		data.image = `base64,${base64data}`
		var databuf = Buffer.from(JSON.stringify(data, null, 4))
		const attachment = new MessageAttachment(databuf, `${userinfo.realname}snipes.json`)
		message.channel.send({content: `Playlist de ${userinfo.realname} para snipear, **${levels.length}** mapas`, files: [attachment]})
	},
};