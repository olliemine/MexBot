const UserSchema = require("./models/UserSchema")

/**
 * @typedef {import("discord.js").Message} Message
 */

/**
 * Returns the User Object from diferent args
 * 
 * @param {Array<String>} args 
 * @param {Message} message
 * @param {Object} projection
 * @returns {Promise} UserSchema Object
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
 * Returns the backtext of a user
 * 
 * @param {Object} info
 * @param {("user"|"body")} type
 * @returns {String} Backtext
 */
module.exports.GetBacktext = (info, type) => {
	switch(type) {
		case "user":
			return !info.bsactive ? "IA" : info.country != "MX" ? info.country : `#${info.lastrank}`
			break
		case "body":
			return info.inactive ? "IA" : info.country != "MX" ? info.country : `#${info.countryRank}`
			break
		default:
			throw null
	}
}

/**
 * Returns the text of how old a play is
 * @param {Date} date
 * @return {String} text
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