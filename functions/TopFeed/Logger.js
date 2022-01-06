const { infoChannel } = require("../../info.json")

module.exports = class Logger {
	constructor(Client) {
		this.logs = {}
		this.channel = Client.channels.cache.get(infoChannel)
	}
	addLog(id, log) {
		if(!this.logs[id]) this.logs[id] = ""
		this.logs[id] += log + "\n"
	}
	sendLog(id) {
		if(!this.logs[id]) return
		this.logs[id] = this.logs[id].slice(0, -1)
		this.channel.send({content: this.logs[id]})
		this.logs[id] = ""
	}
	sendSingle(log) {
		this.channel.send({content: log})
	}
}