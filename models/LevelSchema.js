const mongoose = require("mongoose")

const Level = new mongoose.Schema({
	"LevelID": Number,
	"TopPlayer": String,
	"TopScore": Number,
	"TopPlayerName": String,
	"Hash": String,
	"Diff": Array,
	"PlayerCount": Number,
	"Leaderboard": [{
		"PlayerID": String,
		"PlayerName": String,
		"Score": Number,
		"Country": String,
		"Date": Date
	}]
})

module.exports = mongoose.model("Level", Level)