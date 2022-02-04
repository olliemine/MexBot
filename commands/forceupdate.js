const UpdateUsers = require("../functions/UpdateUsers")
const errorhandle = require("../functions/error")

module.exports = {
	name: "forceupdate",
	description: "Aea",
	admin: true,
	dm: true,
	cooldown: 2,
	async execute(message, args) {
		const time = new Date()
		message.channel.sendTyping()
		try {
			await UpdateUsers()
		} catch(err) {
			errorhandle(err)
		}
		message.channel.send({content: `Executed successfully, ${new Date() - time}`})
	}
}