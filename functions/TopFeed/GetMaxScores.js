const LevelSchema = require("../../models/LevelSchema")
const errorhandle = require("../error")
const fetch = require("node-fetch")

module.exports = () => {
	return new Promise(async (resolve, reject) => {
		console.log("execution")
		let updateBulkWrite = []
		function GetMaxScore(diffs, map) {
			let diff
			for(const diffinfo of diffs) {
				if(diffinfo.characteristic == map.DiffInfo.Mode && diffinfo.difficulty == map.DiffInfo.Diff) {
					diff = diffinfo
					break
				} 
			}
			if(!diff?.notes) {
				console.log(map.Hash)
				return null
			}
			if(diff.notes == 1) return 115;
			if(diff.notes <= 4) return 115 + (diff.notes - 1) * 115 * 2;
			if(diff.notes <= 13) return 115 + 4 * 115 * 2 + (diff.notes - 5) * 115 * 4
			return 115 + 4 * 115 * 2 + 8 * 115 * 4 + (diff.notes - 13) * 115 * 8
		}
		async function GetCode(maps) {
			let hashes = ""
			maps.forEach((map) => {
				hashes += `${map[0].Hash},`
			})
			hashes = hashes.slice(0, -1)
			const res = await fetch(`https://beatsaver.com/api/maps/hash/${hashes}`)
			if(res.status != 200) {
				errorhandle(DiscordClient, new Error(`${res.status} ${res.statusText}`))
				return GetCode(maps)
			}
			const body = await res.json()
			for await(var map of maps) {
				let info = body[map[0].Hash.toLowerCase()] || body
				const MapsDict = HashDict[map[0].Hash]
				MapsDict.forEach(m => {
					const maxscore = GetMaxScore(info.versions[0].diffs, m)
					updateBulkWrite.push({updateOne: {
						"filter": { "LevelID": m.LevelID },
						"update": { $set: { "MaxScore": maxscore }}
					}})
				})
			}
			return
		}
		let allHashes = await LevelSchema.find({ MaxScore: 0 })
		let HashDict = {}
		allHashes.forEach(map => {
			if(!HashDict[map.Hash]) HashDict[map.Hash] = []
			HashDict[map.Hash].push(map)
		})
		allHashes = Object.values(HashDict)
		console.log(`All ${allHashes.length}`)
		let mapChunks = []
		for (let i = 0; i < allHashes.length; i += 50) {
			mapChunks.push(allHashes.slice(i, i + 50))
		}
		console.log(mapChunks.length)
		for await(const mapChunk of mapChunks) {
			
				await GetCode(mapChunk)
			
			console.log(updateBulkWrite.length)
		}
		console.log("finished")
		await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false })
		console.log("finished exporting")
		resolve()
	})
}