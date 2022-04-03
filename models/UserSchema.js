const mongoose = require("mongoose")

const RequiredString = {
	type: String,
	required: true
}
const RequiredBoolean = {
	type: Boolean,
	required: true
}

const UserSchema = new mongoose.Schema({
	"discord": String, //discord id can change
	"beatsaber": RequiredString, //beatsaber id cant change
	"realname": RequiredString, //beatsaber name can change
	"country": RequiredString, // country of user cant change
	"bsactive": RequiredBoolean, // whether user is active in beatsaber can change
	"dsactive": RequiredBoolean, // whether user is in the discord can change
	"dsusername": String, // username of user in discord can change
	"name": String, // name of the user in the discord can change
	"lastrank": Number, // the last recorded rank of user in scoresaber can change
	"lastmap": String, // the id of the last recorded map of user in scoresaber can change
	"lastmapdate": String, // the date of the last recorded map of user in scoresaber can change
	"snipe": Boolean, // whether user wants to be pinged in top 1 feed can change
	"playHistory": [{ //the playHistory of the user 
		"plays": Number,
		"week": Number
	}],
	"plays": [{ //The plays of the user !DEPRICATED
		"LevelID": Number,
		"Hash": String,
		"PP": Number
	}]
})

module.exports = mongoose.model("users", UserSchema)