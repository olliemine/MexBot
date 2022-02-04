const BaseLevelSchema = require("../models/BaseLevelSchema")
const showsongs = require("./functions/showsongs")

module.exports = {
	name: "score",
	admin: false,
	dm: true,
	cooldown: -1,
	async execute(message, args) {
		if(!args.length) return message.channel.send({ content: "Please input the name of a map"})
		let mapResults = await BaseLevelSchema.aggregate([
			{
				'$search': {
					'index': 'Search',
					'compound': {
						'should': [{
							'text': {
								'query': args.join(" "),
								'path': ["SongName", "SongAuthorName", "MapAuthor", "Code"],
								'fuzzy': {
									'maxEdits': 2,
									'prefixLength': 3
								},
							},
						}],
					}
				}
			},
			{
			"$project": {
				"SongName": 1,
				"Code": 1,
				"MapAuthor": 1,
				"SongName": 1,
				"SongAuthorName": 1,
				"Ranked": 1,
				"Hash": 1,
				"Score": { "$meta": "searchScore" }
				}
			}
		]).limit(10)
		if(!mapResults.length) return message.channel.send({content: "No maps found"})
		let index = 0
		mapResults.forEach(m => {
			if(m.Ranked) mapResults[index].Score += 2
			index++
		})
		mapResults.sort((a, b) => {
			return b.Score - a.Score
		})	
		await showsongs(mapResults, message, "search")
	}
}