const mongoose = require("mongoose")

const BaseLevel = new mongoose.Schema({
	"SongName": String,
	"SongAuthorName": String,
	"MapAuthor": String,
	"Hash": String,
	"Code": String,
	"Ranked": Boolean
})

module.exports = mongoose.model("BaseLevel", BaseLevel)