module.exports = (m) => {
	return {
		map = m.leaderboard.id,
		songName = m.leaderboard.songName,
		songAuthorName = m.leaderboard.songAuthorName,
		mapAuthor = m.leaderboard.levelAuthorName,
		score = m.score.baseScore,
		hash = m.leaderboard.songHash.toUpperCase(),
		diff = m.leaderboard.difficulty.difficultyRaw,
		diffSort = m.leaderboard.difficulty.difficulty,
		date = m.score.timeSet,
		mods = m.score.modifiers.split(","), 
		pp = m.score.pp.toFixed(1),
		ranked = m.leaderboard.ranked,
		stars = m.leaderboard.stars,
		maxscore = m.leaderboard.maxScore
	}
}