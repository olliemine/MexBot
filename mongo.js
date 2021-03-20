const mongoose = require("mongoose")
const {password} = require("./config.json")
const mongoPath = `mongodb+srv://MexBot:${password}@cluster0.dcqnu.mongodb.net/MexBot?retryWrites=true&w=majority`

module.exports = async () => {
	await mongoose.connect(mongoPath, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false
	})
	return mongoose;
}