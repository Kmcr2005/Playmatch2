/**
 * Elo Rating System Implementation
 * Based on chess rating system adapted for sports matchmaking
 */

/**
 * Calculate expected score for a player
 * @param {number} playerRating - Current rating of the player
 * @param {number} opponentRating - Current rating of the opponent
 * @returns {number} Expected score (0-1)
 */
function calculateExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new rating after a match
 * @param {number} currentRating - Current rating
 * @param {number} actualScore - Actual score (1 for win, 0.5 for draw, 0 for loss)
 * @param {number} expectedScore - Expected score
 * @param {number} kFactor - K-factor for rating adjustment
 * @returns {number} New rating
 */
function calculateNewRating(currentRating, actualScore, expectedScore, kFactor) {
  return Math.round((currentRating + kFactor * (actualScore - expectedScore)) * 100) / 100;
}

/**
 * Determine K-factor based on player experience
 * @param {number} gamesPlayed - Number of games played by the player
 * @returns {number} K-factor value
 */
function getKFactor(gamesPlayed) {
  if (gamesPlayed < 10) {
    return 32; // New players - higher volatility
  } else if (gamesPlayed < 30) {
    return 24; // Developing players
  } else {
    return 16; // Experienced players - lower volatility
  }
}

/**
 * Calculate rating changes for both players after a match
 * @param {Object} player1 - Player 1 data {rating, gamesPlayed}
 * @param {Object} player2 - Player 2 data {rating, gamesPlayed}
 * @param {string} result - Match result: 'player1_win', 'player2_win', 'draw'
 * @returns {Object} Rating changes for both players
 */
function calculateRatingChanges(player1, player2, result) {
  const player1Expected = calculateExpectedScore(player1.rating, player2.rating);
  const player2Expected = calculateExpectedScore(player2.rating, player1.rating);
  
  const player1KFactor = getKFactor(player1.gamesPlayed);
  const player2KFactor = getKFactor(player2.gamesPlayed);
  
  let player1ActualScore, player2ActualScore;
  
  switch (result) {
    case 'player1_win':
      player1ActualScore = 1;
      player2ActualScore = 0;
      break;
    case 'player2_win':
      player1ActualScore = 0;
      player2ActualScore = 1;
      break;
    case 'draw':
      player1ActualScore = 0.5;
      player2ActualScore = 0.5;
      break;
    default:
      throw new Error('Invalid match result');
  }
  
  const player1NewRating = calculateNewRating(
    player1.rating, 
    player1ActualScore, 
    player1Expected, 
    player1KFactor
  );
  
  const player2NewRating = calculateNewRating(
    player2.rating, 
    player2ActualScore, 
    player2Expected, 
    player2KFactor
  );
  
  return {
    player1: {
      newRating: player1NewRating,
      ratingChange: Math.round((player1NewRating - player1.rating) * 100) / 100,
      kFactor: player1KFactor
    },
    player2: {
      newRating: player2NewRating,
      ratingChange: Math.round((player2NewRating - player2.rating) * 100) / 100,
      kFactor: player2KFactor
    }
  };
}

/**
 * Calculate win probability for a player against an opponent
 * @param {number} playerRating - Player's rating
 * @param {number} opponentRating - Opponent's rating
 * @returns {number} Win probability (0-1)
 */
function calculateWinProbability(playerRating, opponentRating) {
  return calculateExpectedScore(playerRating, opponentRating);
}

/**
 * Check if two players are within acceptable rating range for matchmaking
 * @param {number} rating1 - First player's rating
 * @param {number} rating2 - Second player's rating
 * @param {number} maxDifference - Maximum rating difference allowed (default: 200)
 * @returns {boolean} True if within range
 */
function isWithinRatingRange(rating1, rating2, maxDifference = 200) {
  return Math.abs(rating1 - rating2) <= maxDifference;
}

/**
 * Get rating category based on rating value
 * @param {number} rating - Player's rating
 * @returns {string} Rating category
 */
function getRatingCategory(rating) {
  if (rating >= 2000) return 'Expert';
  if (rating >= 1800) return 'Advanced';
  if (rating >= 1600) return 'Intermediate+';
  if (rating >= 1400) return 'Intermediate';
  if (rating >= 1200) return 'Beginner+';
  return 'Beginner';
}

/**
 * Calculate rating difference for matchmaking
 * @param {number} player1Rating - First player's rating
 * @param {number} player2Rating - Second player's rating
 * @returns {number} Absolute rating difference
 */
function getRatingDifference(player1Rating, player2Rating) {
  return Math.abs(player1Rating - player2Rating);
}

module.exports = {
  calculateExpectedScore,
  calculateNewRating,
  getKFactor,
  calculateRatingChanges,
  calculateWinProbability,
  isWithinRatingRange,
  getRatingCategory,
  getRatingDifference
};
