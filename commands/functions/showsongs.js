const LevelSchema = require("../../models/LevelSchema")
const BaseLevelSchema = require("../../models/BaseLevelSchema")
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js")
const table = require("text-table")
const Vibrant = require("node-vibrant")
const fetch = require("node-fetch")
const { serverId } = require("../../info.json")
const { timeSince } = require("../../Util")
const ErrorEmbed = require("../../functions/error")

/**
 * @typedef {import("discord.js").Message} Message
 */
/**
 * @param {Array<Object>} datamaps 
 * @param {Message} message 
 * @param {("player"|"search")} mode
 * @param {Object=} player  
 */
module.exports = async (datamaps, message, mode, sPlayer = null) => {
	let closed = false
	
	function GetMode(m) {
		if(m === "player") return true
		if(m === "search") return false
		throw new Error("InvalidInput")
	}
	function ErrorHandler(err, description) {
		ErrorEmbed(err, description, message)
		msg.delete()
		buttoncollector.stop()
		messagecollector.stop()
		closed = true
	}

	class Cache {
		constructor(msg, row, playermode) {
			this.maps = []
			this.page = 0
			this.diff = 0
			this.msg = msg
			this.row = row
			this.playermode = playermode
		}
		DifficultySelector(){
			const maps = this.maps[this.page].Difficulties
			const selectedDiff = this.maps[this.page].Difficulties[this.diff].DiffInfo.FormatDiff
			let diffs = []
			maps.forEach(m => {
				diffs.push(m.DiffInfo.FormatDiff)
			})
			diffs.reverse()
			let text = ""
			diffs.forEach(diff => {
				if(diff == selectedDiff) return text += `**${diff}** - `
				text += `${diff} - `
			})
			return text.slice(0, -3)
		}
		getPlayerLeaderboard() {
			return this.maps[this.page].Difficulties[this.diff].Leaderboard.find(p => p.PlayerID == sPlayer.beatsaber) 
		}
		DeletedEmbed() {
			return new MessageEmbed()
			.setColor("GREY")
			.setThumbnail("https://cdn.scoresaber.com/avatars/steam.png")
			.setTitle(`Deleted - Deleted `)
			.setURL("https://beatsaver.com/maps/25f")
			.setDescription(`Mapped by Deleted\n\nThis map has been deleted and can't be showed.\nResult ${this.page + 1} of ${datamaps.length}\n`)
			.setFooter("Made by olliemine")
		}
		NormalEmbed() {
			const map = this.maps[this.page]
			const info = map.Info
			const diff = map.Difficulties[this.diff]
			const DiffSelector = this.DifficultySelector(map.Difficulties, diff.DiffInfo.FormatDiff)
			const timePlaySet = mode ? `${timeSince(this.getPlayerLeaderboard().Date)} ago\n` : ""
			return new MessageEmbed()
			.setColor(map.Color)
			.setThumbnail(`https://na.cdn.beatsaver.com/${info.Hash.toLowerCase()}.jpg`)
			.setTitle(`${info.SongAuthorName} - ${info.SongName} `)
			.setURL(`https://scoresaber.com/leaderboard/${diff.LevelID}`)
			.setDescription(`Mapped by ${info.MapAuthor}\n${timePlaySet}\n${DiffSelector}\n${this.Options(diff.Leaderboard, diff.MaxScore, diff.Ranked)}Result ${this.page + 1} of ${datamaps.length}\n`)
			.setFooter("Made by olliemine")
		}
		Options() {
			const diff = this.maps[this.page].Difficulties[this.diff]
			const leaderboard = diff.Leaderboard
			const maxscore = diff.MaxScore
			const ranked = diff.Ranked
			let options = []
			let i = 0
			leaderboard.forEach(player => {
				const optionsPush = () => {
					if(mode && player.PlayerID == sPlayer.beatsaber) row.push("<")
					options.push(row)
				}
				i++
				let row = [`${i}#`, player.PlayerName, `${((player.Score / maxscore)*100).toFixed(2)}%`]
				if(ranked) row.push(`${player.PP.toFixed(1)} PP`)
				if(!player.Mods[0]) return optionsPush()
				let mods = ""
				player.Mods.forEach(Mod => {
					mods += `${Mod}`
				})
				row.push(mods)
				optionsPush()
			})
			let t = table(options)
			t = "```js\n" + t + "\n```"
			return t
		}
		async AddMap() {
			if(this.maps[this.page]) return
			const Hash = datamaps[this.page].Hash
			this.maps[this.page] = {}
			if(this.playermode) {
				this.maps[this.page].Info = await BaseLevelSchema.findOne({ "Hash": Hash })
				if(!this.maps[this.page].Info) return
				const LevelObject = await LevelSchema.findOne({ "LevelID": datamaps[this.page].LevelID })
				this.maps[this.page].Difficulties = [LevelObject]
			} else {
				this.maps[this.page].Info = datamaps[this.page]
				this.maps[this.page].Difficulties = await LevelSchema.find({ "Hash": Hash, "DiffInfo.Mode": "Standard" }).sort({"DiffInfo.DiffSort": -1})
			}
			this.maps[this.page].LastDiff = 0
			const response = await fetch(`https://na.cdn.beatsaver.com/${Hash.toLowerCase()}.jpg`)
			const buffer = await response.buffer()
			const palette = await Vibrant.from(buffer).getPalette()
			this.maps[this.page].Color = palette.Vibrant.hex
		}
		PostEmbed() {
			if(closed) return
			const info = this.maps[this.page].Info
			if(!this.maps[this.page].Info) {
				this.msg.edit({content: null, components: [this.row], embeds: [this.DeletedEmbed()]}).catch(() => {
					buttoncollector.stop("MSG_EDIT_ERR")
					return messagecollector.stop()
				})
				return
			}
			this.msg.edit({content: `<https://beatsaver.com/maps/${info.Code}>`, components: [this.row], embeds: [this.NormalEmbed()]}).catch(() => {
				buttoncollector.stop("MSG_EDIT_ERR")
				return messagecollector.stop()
			})
		}
		async AddPage() {
			try {
				if(!this.maps[this.page]) await this.AddMap()
				this.diff = this.maps[this.page].LastDiff
			} catch(err) {
				ErrorHandler(err, "Couldnt get song")
				return
			}
		}
		async NextPage() {
			this.page++
			await this.AddPage()
		}
		async BackPage() {
			this.page--
			await this.AddPage()
		}
		async GotoPage(page) {
			this.page = page
			await this.AddPage()
		}
		NextDiff() {
			this.diff--
			this.maps[this.page].LastDiff = this.diff
		}
		BackDiff() {
			this.diff++
			this.maps[this.page].LastDiff = this.diff
		}
		GotoDiff(diff) {
			this.diff = diff
			this.maps[this.page].LastDiff = this.diff
		}
		Stop() {
			if(closed) return
			if(!this.maps[this.page].Info) {
				const embed = this.DeletedEmbed()
				.setDescription(`Mapped by Deleted\n\nThis map has been deleted and can't be showed.\n`)
				.setFooter("")
				this.msg.edit({content: null, components: [], embeds: [embed]})
				return
			}
			const DiffSelector = this.DifficultySelector()
			const embed = this.NormalEmbed()
			.setDescription(`Mapped by ${this.maps[this.page].Info.MapAuthor}\n\n${DiffSelector}\n${this.Options()}`)
			.setFooter("")
			this.msg.edit({content: `<https://beatsaver.com/maps/${this.maps[this.page].Info.Code}>`, components: [], embeds: [embed]})
			this.maps = []
		}
		GetNumberOfDiffs() {
			return this.maps[this.page].Difficulties.length - 1
		}
	}
	let row = new MessageActionRow()
	.addComponents(
		new MessageButton()
			.setCustomId("backsong")
			.setLabel("«")
			.setStyle("PRIMARY"),
		new MessageButton()
			.setCustomId("backdiff")
			.setLabel("←")
			.setStyle("PRIMARY"),
		new MessageButton()
			.setCustomId("nextdiff")
			.setLabel("→")
			.setStyle("PRIMARY"),
		new MessageButton()
			.setCustomId("nextsong")
			.setLabel("»")
			.setStyle("PRIMARY"),
		new MessageButton()
			.setCustomId("exit")
			.setLabel("Exit")
			.setStyle("DANGER")
	)
	const msg = await message.channel.send({content: "Loading <a:paroxysm_car_crash:938980793932460053>"}) //NOTE: This is hilarious
	const CacheControl = new Cache(msg, row, GetMode(mode))
	try{
		await CacheControl.AddMap()
		CacheControl.PostEmbed()
	}catch(e){
		ErrorHandler(e, "Couldnt post embed")
	}
	const buttoncollector = msg.createMessageComponentCollector({ componentType: "BUTTON", time: (1000*60)*5})
	buttoncollector.on("collect", async i => {
		if(i.user.id !== message.author.id) return
		start = new Date()
		i.deferUpdate()
		switch (i.customId) {
			case "backsong":
				if(CacheControl.page == 0) {
					await CacheControl.GotoPage(datamaps.length - 1)
					break
				}
				await CacheControl.BackPage()
				break
			case "backdiff":
				if(CacheControl.diff == CacheControl.GetNumberOfDiffs()) {
					CacheControl.GotoDiff(0)
					break
				}
				CacheControl.BackDiff()
				break
			case "nextdiff":
				if(CacheControl.diff == 0) {
					CacheControl.GotoDiff(CacheControl.GetNumberOfDiffs())
					break
				}
				CacheControl.NextDiff()
				break
			case "nextsong":
				if(CacheControl.page == datamaps.length - 1) {
					await CacheControl.GotoPage(0)
					break
				}
				await CacheControl.NextPage()
				break
			case "exit":
				return buttoncollector.stop()
		}
		if(closed) return
		try {
			CacheControl.PostEmbed()
		} catch(e) {
			ErrorHandler(e, "Couldnt post embed")
		}
	})
	buttoncollector.on("end", (r) => {
		if(r === "MSG_EDIT_ERR") return
		return CacheControl.Stop()
	})
	const filter = m => m.author.id == message.author.id && +m.content
	const messagecollector = message.channel.createMessageCollector({ filter, time: (1000*60)*5 });
	messagecollector.on('collect', async m => {
		const number = parseInt(m.content) - 1
		if(number <= 0 || number >= datamaps.length) return
		await CacheControl.GotoPage(number)
		CacheControl.PostEmbed()
		if(closed) return
		if(m.guildId === serverId) {
			m.delete()
		}
	});
}