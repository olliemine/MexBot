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
			return null
	}
}