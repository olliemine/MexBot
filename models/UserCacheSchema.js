const mongoose = require("mongoose")

const UserCacheSchema = new mongoose.Schema({
	"name": String,
	"id": String
})

module.exports = mongoose.model("usercache", UserCacheSchema)