const errorhandle = require("../functions/error");
const RankedMaps = require("../functions/RankedMaps")

module.exports = {
	name: "forceranked",
	description: "pepega",
	admin: true,
	dm: true,
	cooldown: 15,
	async execute(message) {
		message.channel.sendTyping()
		const time = new Date()
		try {
			await RankedMaps()
		} catch(err) {
			errorhandle(err)
		} 
		message.channel.send({content: `Executed successfully, ${new Date() - time}`})
	}
}