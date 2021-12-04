const Discord = require("discord.js")
//const { token } = require("./config.json")
const info = require("./info.json")
const mongo = require("./mongo")
const fetch = require("node-fetch")
const UserSchema = require("./models/UserSchema");
const errorhandle = require("./functions/error")
const infohandle = require("./functions/info");
const UpdateUsers = require("./functions/UpdateUsers");
const UpdateIA = require("./functions/UpdateIA")
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
	if(pfp == "https://cdn.scoresaber.com/avatars/steam.png") {
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
	console.log(`Prefix ${info.prefix}
Running version: ${info.version}
Ready POG`)
	client.user.setPresence({
			status: "online",
			activities: [{
			name: "Beat Saber",
			type: "PLAYING"
		}]
	})
	

	
	//const guld = client.guilds.cache.get("905874757331857448");
	//const membre = guld.members.cache.get("138842995029049344");
	//
	//console.log(membre.user.presence.activities[1].state);
})
	

client.on("messageCreate", async (message) => {
	if(message.author.bot) return
	if(message.channel.id === info.verificationChannel) return Verificacion(message.member, message)
	if(!message.content.startsWith(info.prefix)) return
	const args = message.content.slice(info.prefix.length).trim().split(/ +/)
	const commandName = args.shift().toLowerCase();
	if(!client.commands.has(commandName) && !client.aliases.has(commandName)) return;
	const command = client.commands.get(commandName) || client.aliases.get(commandName) 
	const CooldownString = `${message.author.id}-${commandName}`
	if(command.cooldown > 0 && RecentlyExecuted.includes(CooldownString)) {
		return message.channel.send({ content: "Porfavor espera un poco para usar el bot otra vez."})
	}
	if(command.admin) {
		const server = await client.guilds.fetch(info.serverId)
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
			dsactive: false
		})
	}
})
function GetBacktext(user) {
	if(!user.bsactive) return "IA"
	if(user.country != "MX") return user.country
	return `#${user.lastrank}`
}
client.on("guildMemberAdd", async (member) => {
	exists = await UserSchema.countDocuments({ discord: member.id })
	if(exists != 0) {
		const user = await UserSchema.findOne({ discord: member.id })
		const backtext = GetBacktext(user)
		member.setNickname(`${backtext} | ${user.name}`)
		if(country == "MX") {
			member.roles.add(info.verificadoRole)
			CheckRoles(body.playerInfo.countryRank, member, client)
		}
		else member.roles.add(info.visitanteRole)
		await UserSchema.findOneAndUpdate({
			discord: member.id
		}, {
			dsactive: true
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
setInterval(async () => {
	try {
		UpdateIA(client)
	} catch(err) {
		errorhandle(client, err)
	}
	
}, (1000*60)*60)//1h

function SendAndDelete(msgcontent, msg) {
	msg.delete()
	msg.channel.send({ content: msgcontent }).then(message => {
		setTimeout(() => {
			message.delete()
		}, ms("4s"))
	})
}
function VerifictionviaID(ID, msg, member, link = true) {
	fetch(`https://scoresaber.com/api/player/${ID}/full`)
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
			if(body.errorMessage) {
				if(link == false) return VerifictionviaID(ID.slice(0, -14), msg, member)
				infohandle(client, "Verification", `User ${member.user.username} failed verification with ${msg.content}`)
				return SendAndDelete("Invalid ID ", msg)
			}
			try {
				exists = await UserSchema.findOne({ beatsaber: body.id })
				if(exists) {
					if(!exists.discord) {
						Refresh(body.id, body.profilePicture)
						const backtext = GetBacktext(exists)
						const username = getName(body.name, backtext)
						await UserSchema.findOneAndUpdate({
							beatsaber: body.id
						}, {
							discord: member.id,
							dsactive: true,
							name: username
						})
						member.setNickname(`${backtext} | ${username}`)
						if(exists.country == "MX") {
							member.roles.add(info.verificadoRole)
							CheckRoles(body.countryRank, member, client)
						}
						else member.roles.add(info.visitanteRole)
						CheckRoles(body.countryRank, member, client)
						SendAndDelete("Ahora estas verificado!", msg)
						return infohandle(client, "Verification", `User ${member.user.username} verified with account ${body.name} successfully (the account had already existed)`)
					}
					infohandle(client, "Verification", `User ${member.user.username} tried to login to ${body.name} which has already been taken`)
					return SendAndDelete("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```", msg)
				}
			} catch(err) {
				errorhandle(client, err)
				return SendAndDelete("Unexpected error", msg)
			}
			Refresh(body.id, body.profilePicture)
			const backtext = body.inactive == true ? "IA" : body.country != "MX" ? body.country : `#${body.countryRank}`
			const username = getName(body.name, backtext)
			member.setNickname(`${backtext} | ${username}`)
			let user = {
				"discord": member.id,
				"beatsaber": body.id,
				"realname": body.name,
				"country": body.country,
				"bsactive": body.inactive == true ? false : true,
				"dsactive": true,
				"name": username,
				"lastrank": body.country == "MX" ? body.countryRank : null,
				"lastmap": null,
				"snipe": false,
				"playHistory": []
			}
			if(body.country == "MX") {
				member.roles.add(info.verificadoRole)
				CheckRoles(body.countryRank, member, client)
			}
			else member.roles.add(info.visitanteRole)
			try {
				await new UserSchema(user).save()
				SendAndDelete("Ahora estas verificado!", msg)
			} catch(err) {
				errorhandle(client, err)
				return SendAndDelete("Unexpected Error", msg)
			}
			infohandle(client, "Verification", `User ${member.user.username} verified with account ${body.name} successfully`)
		}).catch((err) => {
			SendAndDelete("Unexpected Error", msg)
			errorhandle(client, err)
		})
}

async function Verificacion(member, msg) {
	if(msg.content.toLowerCase() === "visitante") {
		member.roles.add(msg.guild.roles.cache.get(info.visitanteRole))
		infohandle(client, "Verification", `User ${member.user.username} verified as a visitor`)
		return SendAndDelete("Gracias por visitar!", msg)
	}
	const ohno = await fetch("https://new.scoresaber.com/api").then(response => {
		if(response.status == 404) return false
		return true
	})
	if(!ohno) {
		member.roles.add(msg.guild.roles.cache.get(info.visitanteRole))
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
		if(msg.content.length <= 3 || msg.content.length > 32) return SendAndDelete("Nombre Invalido", msg)
		const NAMEURL = new URL(`https://scoresaber.com/api/players?search=${msg.content}`)
		await fetch(NAMEURL)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return SendAndDelete("Nombre Invalido", msg)
			if(body.players[1]) return SendAndDelete("Hay varios usuarios con este nombre, porfavor utiliza el Id", msg)
			return VerifictionviaID(body.players[0].playerId, msg, member)
		}).catch((err) => {
			SendAndDelete("Unexpected Error", msg)
			errorhandle(client, err)
		})
	}
}