const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
	"discord": String,
	"beatsaber": String,
	"active": Boolean,
	"lastrank": Number,
	"name": String,
	"realname": String
})

module.exports = mongoose.model("users", UserSchema)