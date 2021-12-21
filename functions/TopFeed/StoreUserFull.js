const StoreMaps = require("./StoreMaps")
const fetch = require("node-fetch")
const Score = require("./Score")

module.exports = (userid, DiscordClient) => {
	return new Promise((resolve, reject) => {
		let newscores = []
		let passed = false
		let firstmap
		function Timeout(Page) {
			console.log("waiting 25 sec")
			setTimeout(() => {
				GetMap(Page)
			}, (1000*60)*25)
		}
		function GetMap(Page) {
			fetch(`https://scoresaber.com/api/player/${userid.beatsaber}/scores?limit=100&sort=recent&withMetadata=false&page=${Page.toString()}`)
			.then(async (res) => {
				console.log(Page)
				if(res.status == 429) return Timeout(Page)
				if(res.status == 404) {
					await StoreMaps(newscores, userid, firstmap, DiscordClient).then(() => {})
					resolve()
					return
				}
				if(res.status == 520) return GetMap(Page)
				const body = await res.json()
				if(Page == 1) firstmap = {
					id: body.playerScores[0].score.id,
					date: body.playerScores[0].score.timeSet
				}
				body.playerScores.forEach(score => {
					if(passed) return
					if(score.score.id == userid.lastmap) {
						passed = true
						return
					}
					newscores.push(new Score(score))
				})
				if(!passed) return GetMap(Page + 1)
				await StoreMaps(newscores, userid, firstmap, DiscordClient).then(() =>{
					resolve()
					return
				})
			})
		}
		GetMap(1)			
	})
}