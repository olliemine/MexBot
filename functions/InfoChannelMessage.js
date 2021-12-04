const { MessageEmbed } = require("discord.js")
const UserSchema = require("../models/UserSchema")
const infohandle = require("./info")
const { inforankingChannel } = require("../info.json")

module.exports = async (Client, usersupdatedraw) => {
    if(!usersupdatedraw.length) return
    //Check if its important
	let important = false
	for await(let user of usersupdatedraw) {
		const userinfo = await UserSchema.findOne({ realname: user.user })
		if(!userinfo.discord && !((user.lastrank > 20 && user.newrank <= 20)
		|| (user.lastrank > 10 && user.newrank <= 10)
		|| (user.lastrank > 5 && user.newrank <= 5)
		|| (user.lastrank > 1 && user.newrank == 1)
		|| (user.lastrank <= 20 && user.newrank > 20)
		|| (user.lastrank <= 10 && user.newrank > 10)
		|| (user.lastrank <= 5 && user.newrank > 5)
		|| (user.lastrank == 1 && user.newrank > 1))) continue
		important = true
		break
	}
	if(!important) return
	let finalmessage = "```diff\n"
	const positiveusers = usersupdatedraw.filter((user) => {
		return user.update > 0
	})
	const negativeusers = usersupdatedraw.filter((user) => {
		return user.update < 0
	})
	if(!positiveusers.length || !negativeusers.length) return infohandle(CLient, "the", "stoped thingy")
	if(positiveusers) positiveusers.forEach((user) => {
		finalmessage = finalmessage + `+ ${user.user} ${user.update}\n`
		if(user.lastrank > 20 && user.newrank <= 20) finalmessage = finalmessage + `* ${user.user} is now top 20\n`
		if(user.lastrank > 10 && user.newrank <= 10) finalmessage = finalmessage + `* ${user.user} is now top 10!\n`
		if(user.lastrank > 5 && user.newrank <= 5) finalmessage = finalmessage + `* ${user.user} is now top 5!!!\n`
		if(user.lastrank > 1 && user.newrank == 1) finalmessage = finalmessage + `* ${user.user} is now top 1!!!!!!! holysht ggs\n`
	})
	if(positiveusers || negativeusers) finalmessage = finalmessage + "\n\n"
	if(negativeusers) negativeusers.forEach((user) => {
		finalmessage = finalmessage + `- ${user.user} ${user.update}\n`
	})
	if(!positiveusers || !negativeusers) finalmessage = finalmessage + "\n* oop"
	finalmessage = finalmessage + "```"
	const embed = new MessageEmbed()
	.setColor("#412FF4")
	.setDescription(finalmessage)
	const channel = await Client.channels.cache.get(inforankingChannel)
	channel.send({embeds: [embed]})
}