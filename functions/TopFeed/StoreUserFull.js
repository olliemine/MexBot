const StoreMaps = require("./StoreMaps")
const fetch = require("node-fetch")
const Score = require("./Score")
const { GetPromises } = require("../../Util")

module.exports = (userid) => {
	return new Promise(async (resolve, reject) => {
		let newscores = []
		let passed = false
		let firstmap
		async function getPages() {
			return fetch(`https://scoresaber.com/api/player/${userid.beatsaber}/scores?limit=1&sort=recent&withMetadata=true`)
			.then(async res => {
				const body = await res.json()
				return Array.from({length: Math.ceil(body.metadata.total / 100)}, (_, i) => i + 1)
			})
		}
		const pages = await getPages()
		let functionPages = []
		pages.forEach((page) => functionPages.push(`https://scoresaber.com/api/player/${userid.beatsaber}/scores?limit=100&sort=recent&withMetadata=false&page=${page.toString()}`))
		const data = await GetPromises(fetch, functionPages)
		if(!data) throw "Invalid Data"
		for await(let dataPage of data) {
			const body = dataPage
			if(!firstmap) firstmap = {
				id: body.playerScores[0].score.id,
				date: body.playerScores[0].score.timeSet
			}
			body.playerScores.forEach(score => {
				if(passed) return
				if(score.score.id == userid.lastmap) {
					passed = true
					return
				}
				newscores.push(Score(score))
			})
			if(passed) break
		}
		newscores.reverse()
		await StoreMaps(newscores, userid, firstmap).then(() =>{
			resolve()
			return
		})
	})
}