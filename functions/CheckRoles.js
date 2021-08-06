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
    
    if(rank >= 10) {
        if(Check(ranks[0])) Remove(ranks[0])
        return
    }
    // Is 10
    if(!Check(ranks[0])) Add(ranks[0])
    if(rank >= 3) {
        if(Check(ranks[1]) || Check(ranks[2]) || Check(ranks[3])) CheckAndRemove()
        return
    }
    //Is 3
    if(!Check(ranks[rank])) {
        Add(ranks[rank])
        CheckAndRemove()
    }
}
//const server = await DiscordClient.guilds.fetch("822514160154706010")
//const ranks = [server.roles.cache.get("823061333020246037"), server.roles.cache.get("823061825154580491"), server.roles.cache.get("824786196077084693"), server.roles.cache.get("824786280616689715")]