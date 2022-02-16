module.exports = (map) => {
	return {
		map = map.leaderboard.id,
		songName = map.leaderboard.songName,
		songAuthorName = map.leaderboard.songAuthorName,
		mapAuthor = map.leaderboard.levelAuthorName,
		score = map.score.baseScore,
		hash = map.leaderboard.songHash.toUpperCase(),
		diff = map.leaderboard.difficulty.difficultyRaw,
		diffSort = map.leaderboard.difficulty.difficulty,
		date = map.score.timeSet,
		mods = map.score.modifiers.split(","), 
		pp = map.score.pp.toFixed(1),
		ranked = map.leaderboard.ranked,
		stars = map.leaderboard.stars,
		maxscore = map.leaderboard.maxScore
	}
}