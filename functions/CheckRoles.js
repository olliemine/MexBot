//This is now easier to read, I am much happy :D

module.exports = (rank, discorduser, ranks) => {
    function Check(rank) {
        return discorduser.roles.cache.find(r => r.id === rank.id)
    }
    function Remove(rank) {
        return discorduser.roles.remove(rank)
    }
    function Add(rank) {
        return discorduser.roles.add(rank)
    }
    function CheckAndRemove() {
        for(let index = 1; index <= 3; index++) {
            if(index == rank) continue
            if(Check(ranks[index])) Remove(ranks[index])
        }
        return
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