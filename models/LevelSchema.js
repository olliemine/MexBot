const mongoose = require("mongoose")

const Level = new mongoose.Schema({
	"LevelID": Number,
	"TopPlayer": String,
	"TopScore": Number
})

module.exports = mongoose.model("Level", Level)