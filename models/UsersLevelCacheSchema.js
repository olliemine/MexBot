const mongoose = require("mongoose")

const UserCacheSchema = new mongoose.Schema({
	"name": String,
	"id": String,
	"lastmap": String,
	"discord": String
})

module.exports = mongoose.model("UsersLevelCache", UserCacheSchema)