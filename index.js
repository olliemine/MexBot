const Discord = require("discord.js")
//const { token, redisuri } = require("./config.json")
const redisuri = process.env.REDISURL
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
const errorhandle = require("./error")
const infohandle = require("./info");
client.login(process.env.TOKEN)
const UpdateUsers = require("./UpdateUsers");
const Top = require("./Top")
const redis = require("redis")
let Mode;
let lastchecked = new Date()
let SSAPISTATUS = true
module.exports = maintenance

async function CheckSSAPIStatus() {
	lastchecked = new Date()
	SSAPISTATUS = await fetch("https://new.scoresaber.com/api").then((response) => {
		if(response.status != 200) return false
		return true
	})
	return SSAPISTATUS
}

function validURL(str) {//https://stackoverflow.com/a/5717133/14550193
	var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
	  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
	  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
	  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
	  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
	  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
	return !!pattern.test(str);
}
function Refresh(id, pfp) {
	if(pfp == "/images/steam.png") {
		fetch(`https://new.scoresaber.com/api/user/${id}/refresh`)
	}
}


client.once("ready", async() => {
	const redisclient = await redis.createClient(redisuri, {
		tls: {
			rejectUnauthorized: false
		}
	})	
	redisclient.once("ready", () => {
		console.log("Connected to Redis")
		redisclient.get("mode", (err, reply) => {
			if(err) return errorhandle(client, err)
			if(reply == "true") return Mode = true
			Mode = false
		})
		redisclient.quit()
	})
	await mongo().then(() => {
		console.log("Connected to mongo")
	}).catch((err) => {
		errorhandle(client, err)
	})
	await fetch("https://new.scoresaber.com/api").then(response => {
		if(response.status != 200) infohandle(client, "API Status", "API is offline")
		else console.log("Connected to Scoresaber API")
	})
	console.log(`Prefix ${prefix}
Running version: ${version}
Ready POG`)
	if(Mode) {
		return client.user.setPresence({
			status: "online",
			activity: {
				name: "Beat Saber",
				type: "PLAYING"
			}
		})
	}
	client.user.setPresence({
		status: "idle",
		activity: {
			name: "Maintenance",
			type: "PLAYING"
		}
	})
	
	//const guld = client.guilds.cache.get("822514160154706010");
	//const membre = guld.members.cache.get("138842995029049344");
	//
	//console.log(membre.user.presence.activities[1].state);
})
	

client.on("message", async (message) => {
	if(message.author.bot || message.guild === null || !message.content.startsWith(prefix)) return
	if(message.channel.id === "822554316728303686") return Verificacion(message.member, message)
	if(!Mode && message.author.id !== "645068064144097347") return message.channel.send("Bot esta siendo reparado y no puede executar el comando")
	const args = message.content.slice(prefix.length).trim().split(/ +/)
	const commandName = args.shift().toLowerCase();
	const DiscordClient = client;
	if(!client.commands.has(commandName) && !client.aliases.has(commandName)) return;
	const command = client.commands.get(commandName) || client.aliases.get(commandName)
	if(command.api) {
		if(lastchecked < new Date() - ms("3h")) await CheckSSAPIStatus()
		if(!SSAPISTATUS) return message.channel.send("Cant execute command (API_OFFLINE)")
	}
	try{
		command.execute(message, DiscordClient, args);
	}catch(error) {
		errorhandle(client, error)
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
		if(LastCheckedSSStatus < new Date() - ms("1h")) await CheckSSAPIStatus()
		if(!SSAPISTATUS) {
			member.roles.add("822582078784012298")
			return infohandle(client, "API DOWN", "User " + member.user.username + " Couldnt verified because of API errors, " + user.beatsaber)
		}
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
setInterval(() => {
	if(!SSAPISTATUS || !Mode) return
	try {
		Top(client)
	} catch(err) {
		errorhandle(client, err)
	}
}, (1000*60)*5)//5m

setInterval(async () => {
	if(lastchecked < new Date() - ms("1h")) await CheckSSAPIStatus()
	if(!SSAPISTATUS || !Mode) return
	try {
		UpdateUsers(client)
	} catch(err) {
		errorhandle(client, err)
	}
	
}, (1000*60)*30)//30m

function SendAndDelete(content, msg) {
	msg.delete()
	msg.reply(content).then(mesagege => {
		setTimeout(() => {
			mesagege.delete()
		}, ms("5s"))
	})
}
function VerifictionviaID(ID, msg, member, link = true) {
	fetch(`https://new.scoresaber.com/api/player/${ID}/full`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) {
				if(link == false) return VerifictionviaID(ID.slice(0, -14), msg, member)
				infohandle(client, "Verification", `User ${member.user.username} failed verification with ${msg.content}`)
				return SendAndDelete("Invalid ID", msg)
			}
			await mongo()
			try {
				exists = await UserSchema.countDocuments({ beatsaber: body.playerInfo.playerId })
				if(exists != 0) {
					infohandle(client, "Verification", `User ${member.user.username} tried to login to ${body.playerInfo.playerName} which has already been taken`)
					return SendAndDelete("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```", msg)
				}
			} catch(err) {
				errorhandle(client, err)
				return SendAndDelete("Unexpected error", msg)
			}
			Refresh(body.playerInfo.playerId, body.playerInfo.avatar)
			let fullname
			let username
			let user
			//Easier to read, i think
			if(body.playerInfo.country != "MX") {//non mex
				fullname = `${body.playerInfo.country} | ${body.playerInfo.playerName}`
				if(fullname.length > 32) {
					member.send("Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
					username = "changename"
				} else {
					username = body.playerInfo.playerName
				}
				member.setNickname(`${body.playerInfo.country} | ${username}`)
				user = {
					"discord": member.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": null,
					"name": username,
					"realname": null
				}
				member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
			} else { //mex
				fullname = `#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`
				if(fullname.length > 32) {
					member.send("Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`")
					username = "changename"
				} else {
					username = body.playerInfo.playerName
				}
				member.setNickname(`#${body.playerInfo.countryRank} | ${username}`)
				user = {
					"discord": member.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": body.playerInfo.countryRank,
					"name": username,
					"realname": body.playerInfo.playerName
				}
				member.roles.add(msg.guild.roles.cache.get("822553633098170449"))


			}
			try {
				await new UserSchema(user).save()
				SendAndDelete("Ahora estas verificado!", msg)
			} catch(err) {
				errorhandle(client, err)
				return SendAndDelete("Unexpected Error", msg)
			}
			infohandle(client, "Verification", `User ${member.user.username} verified with account ${body.playerInfo.playerName} successfully`)
		}).catch((err) => {
			SendAndDelete("Unexpected Error", msg)
			errorhandle(client, err)
		})
}

async function Verificacion(member, msg) {
	if(msg.content.toLowerCase() === "visitante") {
		member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
		infohandle(client, "Verification", `User ${member.user.username} verified as a visitor`)
		return SendAndDelete("Gracias por visitar!", msg)
	}
	const ohno = await fetch("https://new.scoresaber.com/api").then(response => {
		if(response.status != 200) return false
		return true
	})
	if(!ohno) {
		member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
		infohandle(client, "Verification", `User ${member.user.username} verified as a visitor, API is offline, later use ${msg.content}`)
		member.send("Hay unos problemas con los servidores de scoresaber, seras verificado cuando los problemas se resuelvan")
		return SendAndDelete("Gracias por visitar!", msg)
	}
	if(+msg.content) {//ID?
		VerifictionviaID(msg.content, msg, member)
	} else if(validURL(msg.content)) { //LINK?
		let URLseparated = []
		URLseparated = msg.content.split("/")
		VerifictionviaID(URLseparated[URLseparated.length - 1], msg, member, false)
	} else {//NAME?
		if(msg.content.length <= 3 || msg.content.length > 32) return SendAndDelete("Invalid Name", msg)
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
					infohandle(client, "Verification", `User ${member.user.username} tried to login to ${body.playerInfo.playerName} which has already been taken`)
					return SendAndDelete("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```", msg)
				}
			} catch(err) {
				errorhandle(client, err)
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
					"name": usernonname,
					"realname": null
				}
				try {
					await new UserSchema(nonuser).save()
					SendAndDelete("Ahora estas verificado!", msg)
				} catch(err) {
					errorhandle(client, err)
					return SendAndDelete("Unexpected Error", msg)
				}
				infohandle(client, "Verification", `User ${member.user.username} verified with account ${body.players[0].playerName} successfully`)
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
				"name": user_name,
				"realname": body.players[0].playerName
			}
			try {
				await new UserSchema(user).save()
				SendAndDelete("Ahora estas verificado!", msg)
			} catch(err) {
				errorhandle(client, err)
				return SendAndDelete("Unexpected Error", msg)
			}
			infohandle(client, "Verification", `User ${member.user.username} verified with account ${playerinfo.playerInfo.playerName} successfully`)
			member.roles.add(msg.guild.roles.cache.get("822553633098170449"))
		}).catch((err) => {
			SendAndDelete("Unexpected Error", msg)
			errorhandle(client, err)
		})
	}
}
function  maintenance() {
	const redisclient = redis.createClient(redisuri, {
		tls: {
			rejectUnauthorized: false
		}
	})
	redisclient.get("mode", (err, reply) => {
		if(err) return errorhandle(client, err)
		if(reply == "true") {
			Mode = false 
			client.user.setPresence({
				status: "idle",
				activity: {
					name: "Maintenance",
					type: "PLAYING"
				}
			})
			redisclient.set("mode", "false")
			return redisclient.quit()
		}
		Mode = true 
		client.user.setPresence({
			status: "online",
			activity: {
				name: "Beat Saber",
				type: "PLAYING"
			}
		})
		redisclient.set("mode", "true")
		return redisclient.quit()
	})
}

