const Discord = require("discord.js")
const { token, redisuri } = require("./config.json")
const info = require("./info.json")
const mongo = require("./mongo")
const fetch = require("node-fetch")
const UserSchema = require("./models/UserSchema");
const LevelSchema = require("./models/LevelSchema")
const BaseLevelSchema = require("./models/BaseLevelSchema")
const errorhandle = require("./functions/error")
const infohandle = require("./functions/info");
const UpdateUsers = require("./functions/UpdateUsers");
const Top = require("./functions/TopFeed/Top")
const CheckRoles = require("./functions/CheckRoles")
const fs = require("fs");
const getplayer = require("./commands/getplayer")
const VerificacionID = require("./functions/Verification")
const RankedMaps = require("./functions/RankedMaps")
const client = new Discord.Client({ intents: ["GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_MEMBERS", "DIRECT_MESSAGES", "DIRECT_MESSAGE_REACTIONS", "GUILD_PRESENCES", "GUILDS", "GUILD_MESSAGE_TYPING", "DIRECT_MESSAGE_TYPING"], partials: ["CHANNEL"]})
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
client.login(process.env.TOKEN)
const redis = require("redis");
const redisClient = redis.createClient({ url: process.env.REDIS_URL })
const WebSocket = require('ws');
const beatsaversocket = new WebSocket("wss://ws.beatsaver.com/maps")
redisClient.connect()
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
beatsaversocket.onopen = () => {
	console.log("Connected to Beatsaver socket")
}
beatsaversocket.onclose = (event) => {
	infohandle(client, "Beatsaver socket", `Closed ${event.code} ${event.reason}`)
}
beatsaversocket.onerror = (err) => {
	errorhandle(client, err)
}
beatsaversocket.onmessage = async (msg) => {
	try{
		let data = JSON.parse(msg.data)
		data = data.msg
		if(!data.versions) return
		if(data.createdAt == data.versions[0].createdAt) return
		console.log("Updated")
		const level = await LevelSchema.findOne({Code: data.id })
		if(!level) return
		await LevelSchema.deleteMany({Code: data.id})
		await BaseLevelSchema.deleteOne({Code: data.id})
	} catch(err){
		errorhandle(client, err)
	}
}

redisClient.once("ready", () => {
	console.log("Connected to redis")
	redisClient.quit()
})
redisClient.on("error", (err) => {
	errorhandle(client, err)
})
client.once("ready", async() => {
	await mongo().then(() => {
		console.log("Connected to mongo")
	}).catch((err) => {
		errorhandle(client, err)
	})
	await getplayer.start()
	console.log("Loaded cache")
	await fetch("https://scoresaber.com/api").then(response => {
		if(response.status != 200) return infohandle(client, "API Status", "API is offline")
		console.log("Connected to Scoresaber API")
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
})


client.on("messageCreate", async (message) => {
	if(message.author.bot) return
	if(message.channel.id === info.verificationChannel) return Verificacion(message)
	if(!message.content.startsWith(info.prefix)) return
	const args = message.content.slice(info.prefix.length).trim().split(/ +/)
	const commandName = args.shift().toLowerCase();
	if(!client.commands.has(commandName) && !client.aliases.has(commandName)) return;
	const command = client.commands.get(commandName) || client.aliases.get(commandName) 
	const CooldownString = `${message.author.id}-${commandName}`
	if(command.cooldown > 0 && RecentlyExecuted.includes(CooldownString)) {
		return message.channel.send({ content: "Porfavor espera un poco para usar el bot otra vez."})
	}
	if(command.dev && message.author.id != info.devId) return message.channel.send({ content: "Unable to execute, this is a dev command."})
	if(command.admin && message.author.id != info.devId) {
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
	await UserSchema.findOneAndUpdate({
		discord: member.id
	}, {
		dsactive: false
	})
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
setInterval(() => {
	try {
		RankedMaps(client)
	} catch(err) {
		errorhandle(client, err)
	}
}, (1000*60)*30)//30m

function SendAndDelete(msgcontent, msg) {
	msg.delete()
	msg.channel.send({ content: msgcontent }).then(message => {
		setTimeout(() => {
			message.delete()
		}, (1000*60)*4)
	})
}

function VerificationHandler(msg, member, id) {
	VerificacionID(client, member, id)
	.then(data => {
		SendAndDelete("Ahora estas verificado!", msg)
		infohandle(client, "Verification", `User ${data[0]} verified with account ${data[1]}`)
	}).catch(err => {
		SendAndDelete(`Error! ${err[0]}`, msg)
		infohandle(client, "Verification", err[1])
	})
}

async function Verificacion(msg) {
	const member = msg.member
	if(msg.content.toLowerCase() === "visitante") {
		member.roles.add(msg.guild.roles.cache.get(info.visitanteRole))
		infohandle(client, "Verification", `User ${member.user.username} verified as a visitor`)
		return SendAndDelete("Gracias por visitar!", msg)
	}
	const ohno = await fetch("https://scoresaber.com/api").then(response => {
		if(response.status == 404) return false
		return true
	})
	if(!ohno) {
		member.roles.add(msg.guild.roles.cache.get(info.visitanteRole))
		infohandle(client, "Verification", `User ${member.user.username} verified as a visitor, API is offline, later use ${msg.content}`)
		member.send({ content: "Hay unos problemas con los servidores de scoresaber, seras verificado cuando los problemas se resuelvan"})
		return SendAndDelete("Gracias por visitar!", msg)
	}
	VerificationHandler(msg, member, msg.content)
}