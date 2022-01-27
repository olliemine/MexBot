const LevelSchema = require("../../models/LevelSchema")
const fetch = require("node-fetch")
const BaseLevelSchema = require("../../models/BaseLevelSchema")

module.exports = () => {
	return new Promise(async (resolve, reject) => {
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
				hashes += `${map},`
			})
			hashes = hashes.slice(0, -1)
			const res = await fetch(`https://beatsaver.com/api/maps/hash/${hashes}`)
			if(res.status == 404) {
				for await(var map of maps) {
					await LevelSchema.deleteMany({ "Hash": map})
					await BaseLevelSchema.deleteOne({ "Hash": map })
				}
				return
			}
			const body = await res.json()
			for await(var map of maps) {
				let info = maps.length == 1 ? body : body[map.toLowerCase()]
				if(!info) {
					updateBulkWrite.push({ deleteMany: {
						"filter": { "Hash": map }
					}})
					baseUpdateBulkWrite.push({ deleteOne: {
						"filter": { "Hash": map }
					}})
					continue
				}
				if(info.versions[0].hash.toUpperCase() != map) {
					updateBulkWrite.push({ deleteMany: {
						"filter": {"Hash": map}
					}})
					baseUpdateBulkWrite.push({ deleteOne: {
						"filter": { "Hash": map }
					} })
					continue
				}
				updateBulkWrite.push({ updateMany: {
					"filter": { "Hash": map },
					"update": { $set: { "Code": info.id  }}
				}})
				baseUpdateBulkWrite.push({ updateOne: {
					"filter": { "Hash": map },
					"update": { $set: { "Code": info.id  }}
				}})
				const ScoreMaps = allScoreDictHashes[map]
				if(!ScoreMaps) continue
				ScoreMaps.forEach(m => {
					const maxscore = GetMaxScore(info.versions[0].diffs, m)
					updateBulkWrite.push({updateOne: {
						"filter": { "LevelID": m.LevelID },
						"update": { $set: { "MaxScore": maxscore }}
					}})
				})
			}
			return
		}
		console.log("Started getting all")
		let allCodeHashes = await LevelSchema.find({ Code: null }).distinct("Hash")
		let allScoreHashes = await LevelSchema.find({ MaxScore: 0 })
		let allScoreDictHashes = {}
		allScoreHashes.forEach(map => {
			if(!allScoreDictHashes[map.Hash]) allScoreDictHashes[map.Hash] = []
			allScoreDictHashes[map.Hash].push(map)
		})
		let updateBulkWrite = []
		let baseUpdateBulkWrite = []
		let mapChunks = []
		for (let i = 0; i < allCodeHashes.length; i += 50) {
			mapChunks.push(allCodeHashes.slice(i, i + 50))
		}
		console.log(mapChunks.length)
		for await(const mapChunk of mapChunks) {
			await GetCode(mapChunk)
			console.log(baseUpdateBulkWrite.length)
		}
		console.log("exporting")
		await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false })
		await BaseLevelSchema.bulkWrite(baseUpdateBulkWrite, { ordered: false })
		console.log("finished exporting")
		resolve()
	})
}