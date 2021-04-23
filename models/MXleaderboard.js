const mongoose = require("mongoose")

const MXleaderboard = new mongoose.Schema({
	"date": Date,
	"leaderboard": [{
		"playername": String,
		"pp": String,
	}]
})

module.exports = mongoose.model("MXleaderboard", MXleaderboard)