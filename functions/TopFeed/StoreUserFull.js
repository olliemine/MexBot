const StoreMaps = require("./StoreMaps")
const fetch = require("node-fetch")
const Score = require("./Score")

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
		async function GetPage(Page) {
			return fetch(`https://scoresaber.com/api/player/${userid.beatsaber}/scores?limit=100&sort=recent&withMetadata=false&page=${Page.toString()}`)
			.then((res) => {
				return res
			})
		}
		async function GetPromises(Pages) {
			return new Promise((resolve, reject) => {
				let full = []
				firstpromises = []
				Pages.forEach((page) => {
					firstpromises.push(page);
				})
				async function GetPromise(pags) {
					promises = []
					pags.forEach(page => {
						promises.push(GetPage(page));
					})
					const unfulldata = await Promise.all(promises)
					let checkagain = []
					let counter = 0
					for(const data of unfulldata) {
						let page = pags[counter]
						counter++
						if(data.status == 200) {
							full.push(data)
							continue
						}
						checkagain.push(page)
					}
					if(checkagain.length) return setTimeout(() => { GetPromise(checkagain) }, 1000*20)
					resolve(full)
				}
				GetPromise(firstpromises)
			})
		}
		var pages = await getPages()
		const data = await GetPromises(pages)
		for await(let dataPage of data) {
			const body = await dataPage.json()
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
				newscores.push(new Score(score))
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