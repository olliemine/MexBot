const fetch = require('node-fetch')
const { scoresaberApi } = require("../info.json")

function getIdfromLink(link) {
	return link.match(/\d+/)[0]
}

async function resResolve(res, func, full) {
	if(res.status == 429) return setTimeout(() => {
		return func(full)
	}, 5000)
	if(res.status == 502) return func(full)
	if(res.status != 200) return {status: false, info: `${res.status} ${res.statusText}`}
	const body = await res.json()
	return {status: true, info: body}
}

module.exports.idSearch = async (id) => {
	const res = await fetch(`${scoresaberApi}/player/${id}/full`)
	return resResolve(res, module.exports.idSearch(), id)
}

module.exports.basicSearch = async (id) => {
	const res = await fetch(`${scoresaberApi}/player/${id}/basic`)
	return resResolve(res, module.exports.basicSearch(), id)
}

module.exports.nameSearch = async (name) => {
	if(name.length < 3 || name.length > 32) return {status: false, info: `404 Invalid Name`}
	const url = new URL(`${scoresaberApi}/players?search=${name}`)
	const res = await fetch(url)
	return resResolve(res, module.exports.nameSearch(), name)
}

module.exports.fullSearch = async (full) => {
	const regex = new RegExp("^https:\/\/scoresaber.com\/u\/[0-9]*(\\?.*)?$", "i")
	if(+full) return module.exports.idSearch(full)
	if(regex.test(full)) {
		const id = getIdfromLink(full)
		if(!+id) return {status: false, info: "Unknown error expected int got string"}
		return module.exports.idSearch(id)
	}
	return module.exports.nameSearch(full)
}