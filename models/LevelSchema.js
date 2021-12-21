const mongoose = require("mongoose")

const Level = new mongoose.Schema({
	"LevelID": Number,
	"SongName": String,
	"SongAuthorName": String,
	"MapAuthor": String,
	"TopPlayer": String,
	"TopScore": Number,
	"TopPlayerName": String,
	"Hash": String,
	"Code": String,
	"Ranked": Boolean,
	"Stars": Number,
	"DiffInfo": {
		"Diff": String,
		"Mode": String,
		"FormatDiff": String,
		"DiffSort": Number,
	},
	"PlayerCount": Number,
	"Leaderboard": [{
		"PlayerID": String,
		"PlayerName": String,
		"Score": Number,
		"Country": String,
		"Date": Date,
		"Mods": Array,
		"PP": Number
	}]
})

module.exports = mongoose.model("Level", Level)