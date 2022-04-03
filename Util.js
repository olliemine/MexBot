const UserSchema = require("./models/UserSchema")
const { client } = require("./index")
const { serverId } = require("./info.json")

/**
 * @typedef {import("discord.js").GuildMember} GuildMember
 * 
 * @typedef {Object} UserObject
 * @prop {string} discord The discord id from the user
 * @prop {string} beatsaber The scoresaber (steam) id from the user
 * @prop {string} realname The official name of the user
 * @prop {string} country The country of the user
 * @prop {boolean} bsactive The users activeness in scoresaber
 * @prop {boolean} dsactive Whether the user is active in discord
 * @prop {string} dsusername The username of the user in discord
 * @prop {string} name The users name in discord
 * @prop {number} lastrank The last updated rank of the user
 * @prop {string} lastmap The last updated map of the user
 * @prop {string} lastmapdate The last map updated date of the user
 * @prop {boolean} snipe Option to enable pinging in top 1 feed
 * @prop {[{plays: Number, week: Number}]} playHistory The users play history in scoresaber
 * @prop {[{LevelID: Number, Hash: String, PP: Number}]} plays The total users plays - DEPRACATED
 */

/**
 * Returns the User Object from diferent arguments
 * 
 * @param {Array<String>} args 
 * @param {import("discord.js").Message} message
 * @param {Object} projection
 * @returns {Promise<UserObject>}
 */
module.exports.GetUserInfo = async (args, message, projection = { playHistory: 0, plays: 0 }) => {
	if(message) {
		const member = message.mentions.users.first()
		if(member) return await UserSchema.findOne({ discord: member.id }, projection)
	}
	if(+args[0]) return await UserSchema.findOne({ $or: [{beatsaber: args[0]}, {discord: args[0]}] }, projection)
	return await UserSchema.findOne({ $text: { $search: args.join(" ") }}, projection)
}

/**
 * Returns the backtext the nickname of a user
 * 
 * @param {Object} info
 * @param {("user"|"body")} type
 * @returns {String} Backtext
 */
module.exports.GetBacktext = (info, type) => {
	switch(type) {
		case "user":
			if(info.bsactive == null || info.country == null || info.lastrank == null) throw "Missing Arguments"
			return !info.bsactive ? "IA" : info.country != "MX" ? info.country : `#${info.lastrank}`
		case "body":
			if(info.inactive == null || info.country == null || info.countryRank == null) throw "Missing Arguments"
			return info.inactive ? "IA" : info.country != "MX" ? info.country : `#${info.countryRank}`
		default:
			throw "Invalid Type"
	}
}

/**
 * Returns the text of how old a play is
 * 
 * @param {Date} date
 * @return {String}
 */
module.exports.timeSince = (date) => { //https://stackoverflow.com/a/3177838
	var seconds = Math.floor((new Date() - date) / 1000)
	var interval = seconds / 31536000
	var multiple = () => Math.floor(interval) == 1 ? "" : "s"
	if (interval > 1) return Math.floor(interval) + " year" + multiple()
	interval = seconds / 2592000
	if (interval > 1) return Math.floor(interval) + " month" + multiple()
	interval = seconds / 86400
	if (interval > 1) 	return Math.floor(interval) + " day" + multiple()
	interval = seconds / 3600
	if (interval > 1) return Math.floor(interval) + " hour" + multiple()
	interval = seconds / 60
	if (interval > 1) return Math.floor(interval) + " minute" + multiple()
	return Math.floor(seconds) + " second" + multiple()
}

/**
 * Returns a boolean indicating whether the member is able to be changed name
 * 
 * @param {GuildMember} member
 * @return {boolean} Whether a member is able to have his nickname changed
 */
module.exports.checkNicknameChangePermission = (member) => {
	if(member.guild.id !== serverId) return false
	const server = client.guilds.cache.get(serverId)
	if(member.roles.highest.position >= server.members.resolve(client.user).roles.highest.position || server.ownerId === member.id) return false
	return true
}


/**
 * A function that returns the status of various fetch requests
 * 
 * @param {function} func Function that will be executed with the provided arguments
 * @param {Array} init_args Arguments to pass to the func
 * @param {number} [maxRetries=5] Max retries till the function is rejected
 * @returns {Promise<Array<import("node-fetch").Response>>}
 */
module.exports.GetPromises = async (func, init_args, maxRetries = 5) => {
	return new Promise((resolve, reject) => {
		let full = []
		let timesExecuted = 0
		async function promise(args) {
			timesExecuted++
			if(timesExecuted > maxRetries) return reject("Max retries exceeded")
			let promises = []
			args.forEach(d => promises.push(func(d)))
			try {
				var unfulldata = await Promise.all(promises)
			} catch(e) {
				return reject("Unexpected error in undefined promise")
			}
			let checkagain = []
			let fullCounter = -1
			let argCounter = -1
			for await(const res of unfulldata) {
				argCounter++
				do {
					fullCounter++
				} while(full[fullCounter])

				if(res.status === 200) {
					full[fullCounter] = await res.json()
					continue
				}
				checkagain.push(args[argCounter])
			}
			if(checkagain.length) return setTimeout(() => { promise(checkagain) }, 1000*10)
			resolve(full)
		}
		promise(init_args)
	})
}