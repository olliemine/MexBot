//Note, this fucking sucks and is really hard to fucking read
//I will also probably never change this

module.exports = (rank, discorduser, ranks) => {
    if(rank <= 10) {//Top 10?
        if(!discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.add(ranks[0])//Checkar si tiene role y si no dar role
        if(rank <= 3) {//Es top 3?
            if(!discorduser.roles.cache.find(r => r.id === ranks[rank].id)) {//Tiene el role?
                discorduser.roles.add(ranks[rank])
                for (let index = 1; index <= 3; index++) {
                    if(index == rank) continue
                    if(discorduser.roles.cache.find(r => r.id === ranks[index].id)) discorduser.roles.remove(ranks[index])
                }
            }
        } else if(discorduser.roles.cache.find(r => r.id === ranks[1].id) || discorduser.roles.cache.find(r => r.id === ranks[2].id) || discorduser.roles.cache.find(r => r.id === ranks[3].id)) { //Quitar roles y return
            for (let index = 1; index <= 3; index++) {
                discorduser.roles.remove(ranks[index])
            }
        }
    } else if(discorduser.roles.cache.find(r => r.id === ranks[0].id)) discorduser.roles.remove(ranks[0]) //Quitar role y return
}