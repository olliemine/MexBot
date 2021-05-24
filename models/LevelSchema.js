const mongoose = require("mongoose")

const Level = new mongoose.Schema({
	"LevelID": Number,
	"TopPlayer": String,
	"TopScore": Number,
	"TopPlayerName": String
})

module.exports = mongoose.model("Level", Level)