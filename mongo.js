const mongoose = require("mongoose")
//const {mongoPath} = require("./config.json")

module.exports = async () => {
	await mongoose.connect(process.env.MONGOPATH, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	})
	return mongoose;
}