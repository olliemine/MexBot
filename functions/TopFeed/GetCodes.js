const LevelSchema = require("../../models/LevelSchema")
const errorhandle = require("../error")
const fetch = require("node-fetch")
const BaseLevelSchema = require("../../models/BaseLevelSchema")

module.exports = () => {
	return new Promise(async (resolve, reject) => {
		let updateBulkWrite = []
		let baseUpdateBulkWrite = []
		console.log("execution")		
		async function GetCode(maps) {
			let hashes = ""
			maps.forEach((map) => {
				hashes += `${map},`
			})
			hashes = hashes.slice(0, -1)
			await fetch(`https://beatsaver.com/api/maps/hash/${hashes}`)
			.then(async (res) => {
				if(res.status == 404) {
					for await(var map of maps) {
						console.log(`deleting ${map}`)
						await LevelSchema.deleteMany({ "Hash": map})
						await BaseLevelSchema.deleteOne({ "Hash": map })
					}
					return
				}
				if(res.status != 200) {
					errorhandle(DiscordClient, new Error(`${res.status} ${res.statusText}`))
					return GetCode(maps)
				}
				const body = await res.json()
				for await(var map of maps) {
					let info = body[map.toLowerCase()]
					if(!info) {
						updateBulkWrite.push({ deleteMany: {
							"filter": { "Hash": map }
						} })
						baseUpdateBulkWrite.push({ deleteOne: {
							"filter": { "Hash": map }
						} })
						continue
					}
					if(info.versions[0].hash.toUpperCase() != map) {
						updateBulkWrite.push({ deleteMany: {
							"filter": {"Hash": map}
						}})
						baseUpdateBulkWrite.push({ deleteOne: {
							"filter": { "Hash": map }
						}})
						console.log("Deleting " + map)
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
				}
				return
			})
		}
		let allHashes = await LevelSchema.find({ Code: null }).distinct("Hash")
		console.log(`All uniqs ${allHashes.length}`)
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
		await LevelSchema.bulkWrite(updateBulkWrite, { ordered: false})
		await BaseLevelSchema.bulkWrite(baseUpdateBulkWrite, { ordered: false })
		resolve()
	})
}