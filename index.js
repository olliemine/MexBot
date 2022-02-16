//require('dotenv').config()
const Discord = require("discord.js")
const client = new Discord.Client({ intents: ["GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_MEMBERS", "DIRECT_MESSAGES", "DIRECT_MESSAGE_REACTIONS", "GUILD_PRESENCES", "GUILDS", "GUILD_MESSAGE_TYPING", "DIRECT_MESSAGE_TYPING"], partials: ["CHANNEL"]})
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
client.login(process.env.TOKEN)
module.exports.client = client
const info = require("./info.json")
const mongo = require("./mongo")
const fetch = require("node-fetch")
const UserSchema = require("./models/UserSchema");
const LevelSchema = require("./models/LevelSchema")
const BaseLevelSchema = require("./models/BaseLevelSchema")
const errorhandle = require("./functions/error")
const infohandle = require("./functions/info");
const UpdateUsers = require("./functions/UpdateUsers")
const Top = require("./functions/TopFeed/Top")
const CheckRoles = require("./functions/CheckRoles")
const fs = require("fs")
const getplayer = require("./commands/getplayer")
const VerificacionID = require("./functions/Verification")
const RankedMaps = require("./functions/RankedMaps")
const { GetBacktext } = require("./Util")
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
const redis = require("redis");
const redisClient = redis.createClient({ url: process.env.REDIS_URL })
const WebSocket = require('ws');
redisClient.connect().catch(err => console.log(err)) 
let RecentlyExecuted = []
let BeatsaverWebSocketReconnectRetries = 0


function BeatsaverWebSocket() {
	if(BeatsaverWebSocketReconnectRetries > 3) return infohandle("Beatsaver socket", "Connection Closed, Retries exceded")
	const beatsaversocket = new WebSocket("wss://ws.beatsaver.com/maps")
	beatsaversocket.onopen = () => {
		console.log("Connected to Beatsaver socket")
	}
	beatsaversocket.onclose = () => {
		console.log("Connection closed, retrying in 5 seconds")
		setTimeout(() => {
			BeatsaverWebSocketReconnectRetries++
			BeatsaverWebSocket()
		}, 5000)
	}
	beatsaversocket.onerror = (err) => {
		errorhandle(err)
	}
	beatsaversocket.onmessage = async (msg) => {
		try{
			let data = JSON.parse(msg.data)
			data = data.msg
			if(!data.versions) return
			if(data.createdAt == data.versions[0].createdAt) return
			const level = await LevelSchema.findOne({Code: data.id })
			if(!level) return
			await LevelSchema.deleteMany({Code: data.id})
			await BaseLevelSchema.deleteOne({Code: data.id})
		} catch(err){
			errorhandle(err)
		}
	}
}

redisClient.once("ready", async () => {
	console.log("Connected to redis")
	redisClient.quit()
})
redisClient.on("error", (err) => {
	console.log(err)
})
client.once("ready", async() => {
	BeatsaverWebSocket()
	await mongo().then(() => {
		console.log("Connected to mongo")
	}).catch((err) => {
		errorhandle(err)
	})
	await getplayer.start()
	console.log("Loaded cache")
	await fetch("https://scoresaber.com/api").then(response => {
		if(response.status != 200) return infohandle("API Status", "API is offline")
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
	if(message.author.bot || (message.guildId ? message.guildId !== info.serverId : false)) return
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
		command.execute(message, args);
	}catch(error) {
		errorhandle(error, "Unexpected Error on Command Execution", message)
	}
})

client.on("guildMemberRemove", async (member) => {
	if(member.guild.id !== info.serverId || member.user.bot) return
	await UserSchema.findOneAndUpdate({
		discord: member.id
	}, {
		dsactive: false
	})
})

client.on("guildMemberAdd", async (member) => {
	if(member.guild.id !== info.serverId || member.user.bot) return
	const user = await UserSchema.findOne({ discord: member.id }, { name: 1, bsactive: 1, country: 1, lastrank: 1})
	if(!user) return
	const backtext = GetBacktext(user, "user")
	if(checkNicknameChangePermission(member)) member.setNickname(`${backtext} | ${user.name}`)
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
		Top()
	} catch(err) {
		errorhandle(err)
	}
}, (1000*60)*6)//6m

setInterval(async () => {
	try {
		UpdateUsers()
	} catch(err) {
		errorhandle(err)
	}
	
}, (1000*60)*15)//15m
setInterval(() => {
	try {
		RankedMaps()
	} catch(err) {
		errorhandle(err)
	}
}, (1000*60)*30)//30m

function SendAndDelete(msgcontent, msg) {
	msg.delete().catch((error) => errorhandle(error))
	msg.channel.send({ content: msgcontent }).then(message => {
		setTimeout(() => {
			message.delete()
		}, (1000*60)*4)
	}).catch((error) => errorhandle(error))
}

function VerificationHandler(msg, member, id) {
	VerificacionID(member, id)
	.then(data => {
		SendAndDelete("Ahora estas verificado!", msg)
		infohandle("Verification", `User ${data[0]} verified with account ${data[1]}`)
	}).catch(err => {
		SendAndDelete(`Error! ${err[0]}`, msg)
		infohandle("Verification", err[1])
	})
}

async function Verificacion(msg) {
	const member = msg.member
	if(msg.content.toLowerCase() === "visitante") {
		member.roles.add(msg.guild.roles.cache.get(info.visitanteRole))
		infohandle("Verification", `User ${member.user.username} verified as a visitor`)
		return SendAndDelete("Gracias por visitar!", msg)
	}
	const ohno = await fetch("https://scoresaber.com/api").then(response => {
		if(response.status == 404) return false
		return true
	})
	if(!ohno) {
		member.roles.add(msg.guild.roles.cache.get(info.visitanteRole))
		infohandle("Verification", `User ${member.user.username} verified as a visitor, API is offline, later use ${msg.content}`)
		member.send({ content: "Hay unos problemas con los servidores de scoresaber, seras verificado cuando los problemas se resuelvan"})
		return SendAndDelete("Gracias por visitar!", msg)
	}
	VerificationHandler(msg, member, msg.content)
}