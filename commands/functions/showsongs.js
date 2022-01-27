const LevelSchema = require("../../models/LevelSchema")
const BaseLevelSchema = require("../../models/BaseLevelSchema")
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js")
const table = require("text-table")
const Vibrant = require("node-vibrant")
const fetch = require("node-fetch")

/**
 * @typedef {import("discord.js").Message} Message
 */
/**
 * @param {Array<Object>} datamaps 
 * @param {Message} message 
 * @param {("player"|"search")} mode 
 */
module.exports = async (datamaps, message, mode) => {
	let start = new Date()
	function Options(leaderboard, maxscore, ranked) {
		let options = []
		let i = 0
		leaderboard.forEach(player => {
			i++
			let row = [`${i}#`, player.PlayerName, `${((player.Score / maxscore)*100).toFixed(2)}%`]
			if(ranked) row.push(`${player.PP.toFixed(1)} PP`)
			if(!player.Mods[0]) return options.push(row)
			let mods = ""
			player.Mods.forEach(Mod => {
				mods += `${Mod}`
			})
			row.push(mods)
			options.push(row)
		})
		let t = table(options, {
		})
		t = "```js\n" + t + "\n```"
		return t
	}
	function DifficultySelector(maps, selectedDiff){
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
	function GetMode(m) {
		if(m === "player") return true
		if(m === "search") return false
		throw new Error("InvalidInput")
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
		async AddMap() {
			if(this.maps[this.page]) return
			const Hash = datamaps[this.page].Hash
			this.maps[this.page] = {}
			if(this.playermode) {
				this.maps[this.page].Info = await BaseLevelSchema.findOne({ "Hash": Hash })
				const LevelObject = await LevelSchema.findOne({ "LevelID": datamaps[this.page].LevelID }).sort({"DiffInfo.DiffSort": -1})
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
		PostEmbed(err = "") {
			if(err) err = "\n\n" + err + "\n"
			const diff = this.maps[this.page].Difficulties[this.diff]
			const info = this.maps[this.page].Info
			const DiffSelector = DifficultySelector(this.maps[this.page].Difficulties, this.maps[this.page].Difficulties[this.diff].DiffInfo.FormatDiff)
			const embed = new MessageEmbed()
			.setColor(this.maps[this.page].Color)
			.setThumbnail(`https://na.cdn.beatsaver.com/${info.Hash.toLowerCase()}.jpg`)
			.setTitle(`${info.SongAuthorName} - ${info.SongName} `)
			.setURL(`https://scoresaber.com/leaderboard/${diff.LevelID}`)
			.setDescription(`Mapped by ${info.MapAuthor}\n\n${DiffSelector}\n${Options(diff.Leaderboard, diff.MaxScore, diff.Ranked)}${err}Result ${this.page + 1} of ${datamaps.length}\n`)
			.setFooter("Made by olliemine")
			this.msg.edit({content: `<https://beatsaver.com/maps/${info.Code}>`, components: [this.row], embeds: [embed]})
		}
		async NextPage() {
			this.page++
			if(!this.maps[this.page]) await this.AddMap()
			this.diff = this.maps[this.page].LastDiff
		}
		async BackPage() {
			this.page--
			if(!this.maps[this.page]) await this.AddMap()
			this.diff = this.maps[this.page].LastDiff
		}
		async GotoPage(page) {
			this.page = page
			if(!this.maps[this.page]) await this.AddMap()
			this.diff = this.maps[this.page].LastDiff
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
			const diff = this.maps[this.page].Difficulties[this.diff]
			const info = this.maps[this.page].Info
			const DiffSelector = DifficultySelector(this.maps[this.page].Difficulties, this.maps[this.page].Difficulties[this.diff].DiffInfo.FormatDiff)
			const embed = new MessageEmbed()
			.setColor(this.maps[this.page].Color)
			.setThumbnail(`https://na.cdn.beatsaver.com/${info.Hash.toLowerCase()}.jpg`)
			.setTitle(`${info.SongAuthorName} - ${info.SongName} `)
			.setURL(`https://scoresaber.com/leaderboard/${diff.LevelID}`)
			.setDescription(`Mapped by ${info.MapAuthor}\n\n${DiffSelector}\n${Options(diff.Leaderboard, diff.MaxScore, diff.Ranked)}`)
			.setFooter("Made by olliemine")
			this.msg.edit({content: `<https://beatsaver.com/maps/${info.Code}>`, components: [], embeds: [embed]})
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
		const msg = await message.channel.send({content: "Loading..."})
		const CacheControl = new Cache(msg, row, GetMode(mode))
		await CacheControl.AddMap()
		CacheControl.PostEmbed()
		const collector = msg.createMessageComponentCollector({ componentType: "BUTTON", time: (1000*60)*5})
		collector.on("collect", async i => {
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
					return collector.stop()
			}
			CacheControl.PostEmbed()
		})
		collector.on("end", () => {
			return CacheControl.Stop()
		})
}