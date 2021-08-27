const Discord = require("discord.js")
//const { token } = require("./config.json")
const { version, prefix } = require("./info.json")
const mongo = require("./mongo")
const fetch = require("node-fetch")
const UserSchema = require("./models/UserSchema");
const errorhandle = require("./functions/error")
const infohandle = require("./functions/info");
const UpdateUsers = require("./functions/UpdateUsers");
const Top = require("./functions/Top")
const CheckRoles = require("./functions/CheckRoles")
const fs = require("fs");
const ms = require("ms")
const client = new Discord.Client({ intents: ["GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_MEMBERS", "DIRECT_MESSAGES", "DIRECT_MESSAGE_REACTIONS", "GUILD_PRESENCES", "GUILDS", "GUILD_MESSAGE_TYPING", "DIRECT_MESSAGE_TYPING"], partials: ["CHANNEL"]})
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
client.login(process.env.TOKEN)
let RecentlyExecuted = []


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
	client.user.setPresence({
			status: "online",
			activities: [{
			name: "Beat Saber",
			type: "PLAYING"
		}]
	})
	

	
	//const guld = client.guilds.cache.get("822514160154706010");
	//const membre = guld.members.cache.get("138842995029049344");
	//
	//console.log(membre.user.presence.activities[1].state);
})
	

client.on("messageCreate", async (message) => {
	if(message.author.bot) return
	if(message.channel.id === "822554316728303686") return Verificacion(message.member, message)
	if(!message.content.startsWith(prefix)) return
	const args = message.content.slice(prefix.length).trim().split(/ +/)
	const commandName = args.shift().toLowerCase();
	if(!client.commands.has(commandName) && !client.aliases.has(commandName)) return;
	const command = client.commands.get(commandName) || client.aliases.get(commandName) 
	const CooldownString = `${message.author.id}-${commandName}`
	if(command.cooldown > 0 && RecentlyExecuted.includes(CooldownString)) {
		 return message.channel.send({ content: "Porfavor espera un poco para usar el bot otra vez."})
	}
	if(command.admin) {
		const server = await client.guilds.fetch("822514160154706010")
		const member = await server.members.fetch(message.author.id)
		if(!member.permissions.has("ADMINISTRATOR")) return
	}
	if(message.guild === null && !command.dm) return message.channel.send({ content: "No se puede executar este comando en dm" })
	if(command.cooldown > 0) {
		RecentlyExecuted.push(CooldownString)
		
		setTimeout(() => {
			RecentlyExecuted = RecentlyExecuted.filter((text) => {
				return text != CooldownString
			})
		}, 1000 * command.cooldown)
	}
	try{
		command.execute(message, client, args);
	}catch(error) {
		errorhandle(client, error)
		message.channel.send({ content: "There was a unexpected error."});
	}
})
client.on("guildMemberRemove", async (member) => {
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
setInterval(() => {
	try {
		Top(client)
	} catch(err) {
		errorhandle(client, err)
	}
}, (1000*60)*6)//6m

setInterval(async () => {
	try {
		UpdateUsers(client)
	} catch(err) {
		errorhandle(client, err)
	}
	
}, (1000*60)*15)//15m

function SendAndDelete(msgcontent, msg) {
	msg.delete()
	msg.channel.send({ content: msgcontent }).then(message => {
		setTimeout(() => {
			message.delete()
		}, ms("4s"))
	})
}
function VerifictionviaID(ID, msg, member, link = true) {
	fetch(`https://new.scoresaber.com/api/player/${ID}/full`)
		.then(res => res.json())
		.then(async (body) => {
			function getName(name, prefix) {
				fullname = `${prefix} | ${name}`
				let username
				if(fullname.length > 32) {
					member.send({ content: "Tu nombre es muy largo! porfavor cambia tu nombre con `!changename [Nuevo nombre]`"})
					username = "!changename"
				} else {
					username = name
				}
				return username
			}
			if(body.error) {
				if(link == false) return VerifictionviaID(ID.slice(0, -14), msg, member)
				infohandle(client, "Verification", `User ${member.user.username} failed verification with ${msg.content}`)
				return SendAndDelete("Invalid ID ", msg)
			}
			try {
				exists = await UserSchema.findOne({ beatsaber: body.playerInfo.playerId })
				if(exists) {
					if(!exists.discord) {
						Refresh(body.playerInfo.playerId, body.playerInfo.avatar)
						const username = getName(body.playerInfo.playerName, `#${body.playerInfo.countryRank}`)
						await UserSchema.findOneAndUpdate({
							beatsaber: body.playerInfo.playerId
						}, {
							discord: member.id,
							active: true,
							name: username
						})
						member.setNickname(`#${body.playerInfo.countryRank} | ${username}`)
						member.roles.add(msg.guild.roles.cache.get("822553633098170449"))
						const server = await client.guilds.fetch("822514160154706010")
						const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
						CheckRoles(body.playerInfo.countryRank, member, ranks)
						SendAndDelete("Ahora estas verificado!", msg)
						return infohandle(client, "Verification", `User ${member.user.username} verified with account ${body.playerInfo.playerName} successfully (the account had already existed)`)
					}
					infohandle(client, "Verification", `User ${member.user.username} tried to login to ${body.playerInfo.playerName} which has already been taken`)
					return SendAndDelete("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```", msg)
				}
			} catch(err) {
				errorhandle(client, err)
				return SendAndDelete("Unexpected error", msg)
			}
			let user
			Refresh(body.playerInfo.playerId, body.playerInfo.avatar)
			if(body.playerInfo.country != "MX") {//non mex
				const username = getName(body.playerInfo.playerName, body.playerInfo.country)
				member.setNickname(`${body.playerInfo.country} | ${username}`)
				user = {
					"discord": member.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": null,
					"name": username,
					"realname": null,
					"lastmap": null
				}
				member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
			} else { //mex
				const username = getName(body.playerInfo.playerName, `#${body.playerInfo.countryRank}`)
				member.setNickname(`#${body.playerInfo.countryRank} | ${username}`)
				user = {
					"discord": member.id,
					"beatsaber": body.playerInfo.playerId,
					"active": true,
					"lastrank": body.playerInfo.countryRank,
					"name": username,
					"realname": body.playerInfo.playerName,
					"lastmap": null
				}
				member.roles.add(msg.guild.roles.cache.get("822553633098170449"))
				const server = await client.guilds.fetch("822514160154706010")
				const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]
				CheckRoles(body.playerInfo.countryRank, member, ranks)
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
		if(response.status == 404) return false
		return true
	})
	if(!ohno) {
		member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
		infohandle(client, "Verification", `User ${member.user.username} verified as a visitor, API is offline, later use ${msg.content}`)
		member.send({ content: "Hay unos problemas con los servidores de scoresaber, seras verificado cuando los problemas se resuelvan"})
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
			return VerifictionviaID(body.players[0].playerId, msg, member)
		}).catch((err) => {
			SendAndDelete("Unexpected Error", msg)
			errorhandle(client, err)
		})
	}
}