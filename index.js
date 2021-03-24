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
		member.roles.add("822553633098170449")
		const user = await UserSchema.findOne({ discord: member.id })
		await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
			member.setNickname(`#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`)
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
		UserList = await UserSchema.find({ active: true })
		const server = await client.guilds.fetch("822514160154706010")
		UserList.forEach(async (user) => {
			await fetch(`https://new.scoresaber.com/api/player/${user.beatsaber}/full`).then(res => res.json()).then(async (body) => {
				if(body.error) return console.log("Coudnt fetch user " + user.discord)
				if(user.lastrank == body.playerInfo.countryRank) return
				const discorduser = await server.members.fetch(user.discord)
				discorduser.setNickname(`#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`)
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
}, (1000*60)*60)//1h

async function Verificacion(member, msg) {
	if(+msg.content) {
		await fetch(`https://new.scoresaber.com/api/player/${msg.content}/full`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return msg.channel.send("Invalid ID")
			await mongo()
			try {
				exists = await UserSchema.countDocuments({ beatsaber: body.playerInfo.playerId })
				if(exists != 0) {
					return msg.channel.send("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```")
				}
			} catch(err) {
				console.log(err)
				return msg.channel.send("Unexpected error")
			}
			if(body.playerInfo.country != "MX") {
				member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
				return msg.channel.send("Gracias por visitar!")
			}
			member.setNickname(`#${body.playerInfo.countryRank} | ${body.playerInfo.playerName}`)
			const user = {
				"discord": member.id,
				"beatsaber": body.playerInfo.playerId,
				"active": true,
				"lastrank": body.playerInfo.countryRank
			}
			try {
				await new UserSchema(user).save()
				msg.channel.send("Ahora estas verificado!")
			} catch(err) {
				console.log(err)
				return msg.channel.send("Unexpected Error")
			}
			member.roles.add(msg.guild.roles.cache.get("822553633098170449"))
		})
	} else { //MonkaS
		if(msg.content.length <= 3 || msg.content.length >= 32) return msg.channel.send("Invalid Name")
		if(msg.content.toLowerCase() === "visitante") {
			member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
			return msg.channel.send("Gracias por visitar!")
		}
		await fetch(`https://new.scoresaber.com/api/players/by-name/${msg.content}`)
		.then(res => res.json())
		.then(async (body) => {
			if(body.error) return msg.channel.send("Invalid Name")
			if(body.players[1]) return msg.channel.send("Hay varios usuarios con este nombre, porfavor utiliza el Id")
			await mongo()
			try {
				exists = await UserSchema.countDocuments({ beatsaber: body.players[0].playerId })
				if(exists != 0) {
					return msg.channel.send("Ya hay una usuario con esta cuenta. ```Si deverdad es tu cuenta porfavor contacta a un Admin```")
				}
			} catch(err) {
				console.log(err)
				return msg.channel.send("Unexpected error")
			}

			if(body.players[0].country != "MX") {
				member.roles.add(msg.guild.roles.cache.get("822582078784012298"))
				return msg.channel.send("Gracias por visitar!")
			}
			let playerinfo
			await fetch(`https://new.scoresaber.com/api/player/${body.players[0].playerId}/full`).then(res => res.json()).then(body => playerinfo = body)
			member.setNickname(`#${playerinfo.playerInfo.countryRank} | ${body.players[0].playerName}`)
			const user = {
				"discord": member.id,
				"beatsaber": body.players[0].playerId,
				"active": true,
				"lastrank": playerinfo.playerInfo.countryRank
			}
			try {
				await new UserSchema(user).save()
				msg.channel.send("Ahora estas verificado!")
			} catch(err) {
				console.log(err)
				return msg.channel.send("Unexpected Error")
			}
			member.roles.add(msg.guild.roles.cache.get("822553633098170449"))
		})
	}
}