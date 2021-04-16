const Discord = require("discord.js")
//const { token } = require("./config.json")
const { version, prefix } = require("./info.json")
const client = new Discord.Client
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
const fs = require("fs");
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
const mongo = require("./mongo")
const fetch = require("node-fetch")
const UserSchema = require("./models/UserSchema");
const ms = require("ms")
client.login(process.env.TOKEN)

client.once("ready", async() => {
	await mongo().then(() => {
		console.log("Connected to mongo")
	}).catch(() => {
		console.log("No funciona oh no")
	})
	console.log(`Prefix ${prefix}
Running version: ${version}
Ready POG`)
	client.user.setPresence({
		status: "online",
		activity: {
			name: "Beat Saber",
			type: "PLAYING"
		}
	})
})

client.on("message", message => {
	if(message.author.bot) return
	if(message.channel.id === "822554316728303686") return Verificacion(message.member, message)
	if(!message.content.startsWith(prefix) || message.guild === null) return
	const args = message.content.slice(prefix.length).trim().split(/ +/)
	const commandName = args.shift().toLowerCase();
	const DiscordClient = client;
	if(!client.commands.has(commandName) && !client.aliases.has(commandName)) return;
	const command = client.commands.get(commandName) || client.aliases.get(commandName);		
	try{
		command.execute(message, DiscordClient, args);
	}catch(error) {
		console.error(error);
		message.reply("There was a unexpected error.");
	}
})
client.on("guildMemberRemove", async (member) => {
	await mongo()
	exists = await UserSchema.countDocuments({ discord: member.id })
	if(exists != 0) {
		await UserSchema.findOneAndUpdate({
			discord: member.id
		}, {
			active: false
		})
	}
})
client.on("guildMemberAdd", async (member) => {
	await mongo()
	exists = await UserSchema.countDocuments({ discord: member.id })
	if(exists != 0) {
		const user = await UserSchema.findOne({ discord: member.id })
		await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
			if(body.playerInfo.country == "MX") {
				member.setNickname(`#${body.playerInfo.countryRank} | ${user.name}`)
				member.roles.add("822553633098170449")
			} else {
				member.setNickname(`${body.playerInfo.country} | ${user.name}`)
				member.roles.add("822582078784012298")
			}
			await UserSchema.findOneAndUpdate({
				discord: member.id
			}, {
				active: true
			})
			
		})
	}
})

for(const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
	if (command.aliases) {
		command.aliases.forEach(alias => {
			client.aliases.set(alias, command);
		});
	}
}

async function UpdateUsers() {
	await mongo().then(async () => {
		const UserList = await UserSchema.find({ active: true, lastrank: {$ne: null} })
		const server = await client.guilds.fetch("822514160154706010")
		const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
		UserList.forEach(async (user) => {
			await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
				if(body.error) return console.log("Coudnt fetch user " + user.discord)
				if(user.lastrank == body.playerInfo.countryRank) return
				const discorduser = await server.members.fetch(user.discord)
				
				if(body.playerInfo.countryRank <= 10) {//Top 10?
					if(!discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.add(ranks[0])//Checkar si tiene role y si no dar role
					if(body.playerInfo.countryRank <= 3) {//Es top 3?
						if(!discorduser.roles.cache.find(r => r.id === ranks[body.playerInfo.countryRank].id)) {//Tiene el role?
							discorduser.roles.add(ranks[body.playerInfo.countryRank])
							for (let index = 1; index <= 3; index++) {
								if(index == body.playerInfo.countryRank) continue
								if(discorduser.roles.cache.find(r => r.id === ranks[index].id)) discorduser.roles.remove(ranks[index])
							}
						}
					} else if(discorduser.roles.cache.find(r => r.id === ranks[1].id) || discorduser.roles.cache.find(r => r.id === ranks[2].id) || discorduser.roles.cache.find(r => r.id === ranks[3].id)) { //Quitar roles y return
						for (let index = 1; index <= 3; index++) {
							discorduser.roles.remove(ranks[index])
						}
					}
				} else if(discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.remove(ranks[0]) //Quitar role y return
				
				discorduser.setNickname(`#${body.playerInfo.countryRank} | ${user.name}`)
				await UserSchema.findOneAndUpdate({
					discord: user.discord
				}, {
					lastrank: body.playerInfo.countryRank
				})
			})
		})
	})
}
setInterval(() => {
	UpdateUsers()
}, (1000*60)*30)//30m

function SendAndDelete(content, msg) {
	msg.delete()
	msg.reply(content).then(mesagege => {
		setTimeout(() => {
			mesagege.delete()
		}, ms("5s"))
	})
}
function Refresh(uuid, pfp) {
	if(pfp == "/images/steam.png") {
		fetch(`https://new.scoresaber.com/api/user/${uuid}/refresh`)
	}
}

async function Verificacion(member, msg) {
	if(+msg.content) {
		await fetch(`https://new.scoresaber.com/api/player/${msg.content}/full`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return SendAndDelete("Invalid ID", msg)
			await mongo()
			try {
				exists = await UserSchema.countDocuments({ beatsaber: body.playerInfo.playerId })
				if(exists != 0) {
					return SendAndDelete("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```", msg)
				}
			} catch(err) {
				console.log(err)
				return SendAndDelete("Unexpected error", msg)
			}
			Refresh(body.playerInfo.playerId, body.playerInfo.avatar)
			if(body.playerInfo.country != "MX") {
				const fullnonname = `${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`
				let usernonname
				if(fullnonname.length > 32) {
					member.send("Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
					usernonname = "changename"
				} else {
					usernonname = body.playerInfo.playerName
				}
				member.setNickname(`${body.playerInfo.country} | ${usernonname}`)
				const nonuser = {
					"discord": member.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": null,
					"name": usernonname
				}
				try {
					await new UserSchema(nonuser).save()
					SendAndDelete("Ahora estas verificado!", msg)
				} catch(err) {
					console.log(err)
					return SendAndDelete("Unexpected Error", msg)
				}
				return member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
			}
			const fullname = `#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`
			let user_name
			if(fullname.length > 32) {
				member.send("Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
				user_name = "changename"
			} else {
				user_name = body.playerInfo.playerName
			}
			member.setNickname(`#${body.playerInfo.countryRank} | ${user_name}`)
			const user = {
				"discord": member.id,
				"beatsaber": body.playerInfo.playerId,
				"active": true,
				"lastrank": body.playerInfo.countryRank,
				"name": user_name
			}
			try {
				await new UserSchema(user).save()
				SendAndDelete("Ahora estas verificado!", msg)
			} catch(err) {
				console.log(err)
				return SendAndDelete("Unexpected Error", msg)
			}
			member.roles.add(msg.guild.roles.cache.get("822553633098170449"))
		})
	} else { //MonkaS
		if(msg.content.length <= 3 || msg.content.length >= 32) return SendAndDelete("Invalid Name", msg)
		if(msg.content.toLowerCase() === "visitante") {
			member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
			return SendAndDelete("Gracias por visitar!", msg)
		}
		const NAMEURL = new URL(`https://new.scoresaber.com/api/players/by-name/${msg.content}`)
		await fetch(NAMEURL)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return SendAndDelete("Invalid Name", msg)
			if(body.players[1]) return SendAndDelete("Hay varios usuarios con este nombre, porfavor utiliza el Id", msg)
			await mongo()
			try {
				exists = await UserSchema.countDocuments({ beatsaber: body.players[0].playerId })
				if(exists != 0) {
					return SendAndDelete("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```", msg)
				}
			} catch(err) {
				console.log(err)
				return SendAndDelete("Unexpected error", msg)
			}
			Refresh(body.players[0].playerId, body.players[0].avatar)
			if(body.players[0].country != "MX") {
				const fullnonname = `${body.players[0].country} | ${body.players[0].playerName}`
				let usernonname
				if(fullnonname.length > 32) {
					member.send("Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
					usernonname = "changename"
				} else {
					usernonname = body.players[0].playerName
				}
				member.setNickname(`${body.players[0].country} | ${usernonname}`)
				const nonuser = {
					"discord": member.id,
					"beatsaber": body.players[0].playerId,
					"active": true,
					"lastrank": null,
					"name": usernonname
				}
				try {
					await new UserSchema(nonuser).save()
					SendAndDelete("Ahora estas verificado!", msg)
				} catch(err) {
					console.log(err)
					return SendAndDelete("Unexpected Error", msg)
				}
				return member.roles.add(msg.guild.roles.cache.get("822582078784012298"))				
			}
			let playerinfo
			await fetch(`https://new.scoresaber.com/api/player/${body.players[0].playerId}/full`).then(res => res.json()).then(body => playerinfo = body)
			const fullname = `#${playerinfo.playerInfo.countryRank} | ${body.players[0].playerName}`
			let user_name
			if(fullname.length > 32) {
				member.send("Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
				user_name = "changename"
			} else {
				user_name = body.players[0].playerName
			}
			member.setNickname(`#${playerinfo.playerInfo.countryRank} | ${user_name}`)
			const user = {
				"discord": member.id,
				"beatsaber": body.players[0].playerId,
				"active": true,
				"lastrank": playerinfo.playerInfo.countryRank,
				"name": user_name
			}
			try {
				await new UserSchema(user).save()
				SendAndDelete("Ahora estas verificado!", msg)
			} catch(err) {
				console.log(err)
				return SendAndDelete("Unexpected Error", msg)
			}
			member.roles.add(msg.guild.roles.cache.get("822553633098170449"))
		})
	}
}