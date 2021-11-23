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
	"discord": String,
	"beatsaber": RequiredString,
	"realname": RequiredString,
	"country": RequiredString,
	"bsactive": RequiredBoolean,
	"dsactive": RequiredBoolean,
	"name": String,
	"lastrank": Number,
	"lastmap": String,
	"snipe": Boolean,
	"playHistory": [{
		"plays": Number,
		"week": Number
	}],
})

module.exports = mongoose.model("users", UserSchema)