const maps = [
	[
		{
			name: "Roku Chounen to Ichiya Monogatari",
			type: "Acc",
			diff: "Expert"
		},
		{
			name: "Pastel Rain",
			type: "Normal",
			diff: "Expert+"
		},
		{
			name: "ワールドイズマイン",
			type: "Acc",
			diff: "Expert+"
		},
		{
			name: "Count Down 321",
			type: "Speed",
			diff: "Expert"
		},
		{
			name: "Falling",
			type: "Tec",
			diff: "Expert+"
		},
		{
			name: "Superstar",
			type: "Acc",
			diff: "Expert"
		},
	], [
		{
			name: "Rasen Hikou",
			type: "Normal",
			diff: "Expert+"
		},
		{
			name: "Reanimate",
			type: "Tec",
			diff: "Expert+"
		},
		{
			name: "Weeble Wobble",
			type: "Speed",
			diff: "Expert+"
		},
		{
			name: "Jellyfish",
			type: "Normal",
			diff: "Expert+"
		},
		{
			name: "Digital Girl",
			type: "Tec",
			diff: "Expert+"
		},
		{
			name: "Collapse Of Ego",
			type: "Speed",
			diff: "Expert"
		},
	], [
		{
			name: "Avalanche",
			type: "Speed",
			diff: "Expert+"
		},
		{
			name: "Big Daddy",
			type: "Normal",
			diff: "Expert+"
		},
		{
			name: "La Lune",
			type: "Tec",
			diff: "Expert+"
		},
		{
			name: "being low as dirt, taking what's important from me",
			type: "Tec",
			diff: "Expert+"
		},
		{
			name: "Der Herrgott hot glocht",
			type: "Tec",
			diff: "Expert+"
		},
		{
			name: `Little "Sister" Bitch`,
			type: "Speed",
			diff: "Expert+"
		},
	], [
		{
			name: "Big Head Banging",
			type: "Speed",
			diff: "Expert+"
		},
		{
			name: "Just the way you are",
			type: "Tec",
			diff: "Expert+"
		},
		{
			name: "Goodbye",
			type: "Speed",
			diff: "Expert"
		},
		{
			name: "Tempestissimo",
			type: "Speed",
			diff: "Expert+"
		},
		{
			name: "Compute It With Some Devilish Alcoholic Steampunk Engines",
			type: "Normal",
			diff: "Expert+"
		},
		{
			name: "Final Boss",
			type: "Speed",
			diff: "Expert+"
		},
	]
]
const { MessageAttachment } = require("discord.js");
const ms = require("ms")
const fs = require("fs")
const path = require("path")
module.exports = {
	name : "rollmaps",
	description: "yes",
	api: false,
	admin: true,
	dm: false,
	cooldown: -1,
	async execute(message, DiscordClient, args) {
		if(!args[0]) return message.channel.send("You need to include the number of round this is")
		if(args[0] != "1" && args[0] != "2" && args[0] != "3" && args[0] != "4") return message.channel.send("Invalid round")
		message.delete()
		const selectedmaps = maps[args[0] - 1]
		const image = fs.readFileSync(path.join(__dirname, `aea${args[0]}.jpg`))
		const attachment = new MessageAttachment(image)
		await message.channel.send(`@everyone Pon en chat (una por una) cual mapa te gustaria tener, elije al maximo 3`, attachment)
		const delay = ms => new Promise(res => setTimeout(res, ms))//https://stackoverflow.com/a/47480429
		const reactions = ["✅", "❎"]
		let user1
		let user2
		function shuffle(array) {//Good for short arrays
			return array.sort((a, b) => 0.5 - Math.random())
		}
		function getDistinctNumbers(arr1, arr2) {
			let arr = []
			let uarr = []
			arr.push(...arr1)
			arr.push(...arr2)
			var res = arr.filter(function(v) {//https://stackoverflow.com/a/39223967/14550193
				// get the count of the current element in array
				// and filter based on the count
				return arr.filter(function(v1) {
				  // compare with current element
				return v1 == v;
				  // check length
				}).length == 1;
			});
			res.forEach((num) => {
				uarr.push(selectedmaps[num - 1])
			})
			if(uarr) return shuffle(uarr)
			return uarr
		}
		function findRepeatingNumber(arr1, arr2) {//Ineficient but works
			var arr = []
			arr1.forEach((i) => {
				arr2.forEach((j) => {
					if(i == j) arr.push(selectedmaps[i - 1])
				})
			})
			if(arr) return shuffle(arr)
			return arr
		}
		function MergeWithoutDuplicates(arr1, arr2) {//https://codeburst.io/how-to-merge-arrays-without-duplicates-in-javascript-91c66e7b74cf
			let arr3 = arr1.concat(arr2)
			arr3 = [...new Set([...arr1,...arr2])]
			return arr3
		}
		function findMissing(arr1, arr2) {
			var result = [];
			const arr = MergeWithoutDuplicates(arr1, arr2)
			const numbers = [1, 2, 3, 4, 5, 6]
			numbers.forEach((i) => {
				let g = false
				arr.forEach((numb) => {
					if(i == numb) g = true
				})
				if(!g) result.push(selectedmaps[i - 1])
			})
			if(result) return shuffle(result)
			return result
		}
		async function DoAnotherThing() {
			const confirmedmaps = findRepeatingNumber(user1.wantedmaps, user2.wantedmaps)
			const halfmaps = getDistinctNumbers(user1.wantedmaps, user2.wantedmaps)
			const nullmaps = findMissing(user1.wantedmaps, user2.wantedmaps)
			const playmaps = [...confirmedmaps, ...halfmaps, ...nullmaps]
			let editmsg
			await message.channel.send("aea").then((m) => editmsg = m)
			editmsg.pin()
			await delay(ms("1s"))
			return PlayTheMaps(playmaps, editmsg)
		}
		function PlayTheMaps(playmaps, editmsg) {
			let msg = "Queue ```xl"
			let count = 0
			msg += `\n1. ${playmaps[0].name} | ${playmaps[0].diff} | ${playmaps[0].type}\n╰──── Current\n`
			playmaps.forEach((map) => {
				count++
				if(count == 1) return
				msg += `\n${count}. ${map.name} | ${map.diff} | ${map.type}`
			})
			msg += "```"
			editmsg.edit(msg)
			message.channel.send(`@everyone Next Map: **${playmaps[0].name} | ${playmaps[0].diff} | ${playmaps[0].type}**   2 min Remaining`)
			const filter = response => !response.author.bot && response.member.roles.cache.find(r => r.id === "822553320551874650") && (response.content == "end" || response.content == "next" || response.content == "repeat")
			setTimeout(() => {
				message.channel.send(`Playing map **${playmaps[0].name} | ${playmaps[0].diff} | ${playmaps[0].type}**`)
			}, ms("2m"))
			message.channel.awaitMessages(filter, { max: 1 })
			.then(collected => {
				const mesg = collected.first()
				mesg.delete()
				switch(mesg.content) {
					case "end":
						editmsg.delete()
						return message.channel.send("@everyone GG!")
					break
					case "next":
						playmaps.shift()
						if(!playmaps) return message.channel.send("Ended because there are no more maps to play")
						return PlayTheMaps(playmaps, editmsg)
					break
					case "repeat":
						return PlayTheMaps(playmaps, editmsg)
				}
			})
		}
		function AwaitMessages() {
			const filter = response => !response.author.bot && !response.member.roles.cache.find(r => r.id === "822553320551874650") && (response.content == "1" || response.content == "2" || response.content == "3" || response.content == "4" || response.content == "5" || response.content == "6" )
			// !response.member.roles.cache.find(r => r.id === "822553320551874650") &&

			message.channel.awaitMessages(filter, { max: 1 })
			.then(collected => {
				const msg = collected.first()
				let test = true
				if(!user1) {
					user1 = {
						"id": collected.first().author.id,
						"wantedmaps": [
							msg.content
						]
					}
					msg.react(reactions[0])
					return AwaitMessages()
				} else if(user1.id == collected.first().author.id) {
					user1.wantedmaps.forEach((mapnum) => {
						if(mapnum == msg.content) test = false
					})
					if(!test || user1.wantedmaps.length == 3) {
						msg.react(reactions[1])
						return AwaitMessages()
					}
					msg.react(reactions[0])
					user1.wantedmaps.push(msg.content)
					if(user1.wantedmaps.length == 3 && user2) if(user2.wantedmaps.length == 3) return DoAnotherThing()
					return AwaitMessages()
				} else if(!user2) {
					user2 = {
						"id": collected.first().author.id,
						"wantedmaps": [
							msg.content
						]
					}
					msg.react(reactions[0])
					return AwaitMessages()
				} else if(user2.id == collected.first().author.id) {
					user2.wantedmaps.forEach((mapnum) => {
						if(mapnum == msg.content) test = false
					})
					if(!test || user2.wantedmaps.length == 3) {
						msg.react(reactions[1])
						return AwaitMessages()
					}
					msg.react(reactions[0])
					user2.wantedmaps.push(msg.content)
					if(user1.wantedmaps.length == 3 && user2.wantedmaps.length == 3) return DoAnotherThing()
					return AwaitMessages()
				}
				return AwaitMessages()
			}) 
		}
		AwaitMessages()
	},
};