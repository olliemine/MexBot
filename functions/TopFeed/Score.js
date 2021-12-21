module.exports = class Score {
	constructor(map) {
		this.map = map.leaderboard.id,
		this.songName = map.leaderboard.songName,
		this.songAuthorName = map.leaderboard.songAuthorName,
		this.mapAuthor = map.leaderboard.levelAuthorName,
		this.score = map.score.baseScore,
		this.hash = map.leaderboard.songHash,
		this.diff = map.leaderboard.difficulty.difficultyRaw,
		this.diffSort = map.leaderboard.difficulty.difficulty,
		this.date = map.score.timeSet,
		this.mods = map.score.modifiers.split(","), 
		this.pp = map.score.pp.toFixed(1),
		this.ranked = map.leaderboard.ranked,
		this.stars = map.leaderboard.stars
	}
}