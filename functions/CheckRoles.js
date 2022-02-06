//This is now easier to read, I am much happy :D
//10, 1, 2, 3
const { serverId, topRoles } = require('../info.json')
const { client } = require("../index")

module.exports = async (rank, discorduser) => {
    const server = await client.guilds.fetch(serverId)
	const ranks = [server.roles.cache.get(topRoles[0]), server.roles.cache.get(topRoles[1]), server.roles.cache.get(topRoles[2]), server.roles.cache.get(topRoles[3])]
	const Check = (rank) => discorduser.roles.cache.find(r => r.id === rank.id)
    const Remove = (rank) => discorduser.roles.remove(rank)
    const Add = (rank) => discorduser.roles.add(rank)
    function CheckAndRemove() {
        for(let index = 1; index <= 3; index++) {
            if(index == rank) continue
            if(Check(ranks[index])) Remove(ranks[index])
        }
    }

    if(rank > 10) {
        if(Check(ranks[0])) Remove(ranks[0])
        return
    }
    // Is 10
    if(!Check(ranks[0])) Add(ranks[0])
    if(rank > 3) {
        return CheckAndRemove()
    }
    //Is 3
    if(!Check(ranks[rank])) {
        Add(ranks[rank])
        CheckAndRemove()
    }
}
//const server = await DiscordClient.guilds.fetch("905874757331857448")
//const ranks = [server.roles.cache.get("905874757331857454"), server.roles.cache.get("905874757331857457"), server.roles.cache.get("905874757331857456"), server.roles.cache.get("905874757331857455")]