/**
 * Calculate points for a standard correct answer with time decay.
 * points = Math.round(1000 * (timeRemaining / timeLimit))
 */
export function calculateTimeDecayPoints(
  timeRemainingMs: number,
  timeLimitMs: number,
  pointsBase: number = 1000
): number {
  if (timeRemainingMs <= 0) return 0;
  const ratio = Math.min(timeRemainingMs / timeLimitMs, 1);
  return Math.round(pointsBase * ratio);
}

/**
 * Apply joker multiplier (2x) to points.
 */
export function applyJokerMultiplier(
  points: number,
  isJoker: boolean
): number {
  return isJoker ? points * 2 : points;
}

/**
 * Calculate points for a slider question based on proximity.
 * The closest answer gets full points; others are scaled by how close they are.
 */
export function calculateSliderPoints(
  playerAnswer: number,
  correctAnswer: number,
  sliderMin: number,
  sliderMax: number,
  timeRemainingMs: number,
  timeLimitMs: number,
  pointsBase: number = 1000
): number {
  const range = sliderMax - sliderMin;
  if (range === 0) return pointsBase;

  const distance = Math.abs(playerAnswer - correctAnswer);
  const proximity = Math.max(0, 1 - distance / range);

  // Apply proximity and time decay
  const timeRatio = Math.min(timeRemainingMs / timeLimitMs, 1);
  return Math.round(pointsBase * proximity * timeRatio);
}

/**
 * Calculate points for a type_in question.
 * Exact match (case-insensitive) gets full time-decay points.
 * Host can override via manual marking.
 */
export function calculateTypeInPoints(
  playerAnswer: string,
  correctAnswer: string,
  timeRemainingMs: number,
  timeLimitMs: number,
  pointsBase: number = 1000
): { points: number; isCorrect: boolean } {
  const isCorrect =
    playerAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  if (!isCorrect) return { points: 0, isCorrect: false };
  return {
    points: calculateTimeDecayPoints(timeRemainingMs, timeLimitMs, pointsBase),
    isCorrect: true,
  };
}

/**
 * Score a standard question (multiple_choice, true_false, image_question).
 */
export function scoreStandardQuestion(
  playerAnswer: string,
  correctAnswer: string,
  timeRemainingMs: number,
  timeLimitMs: number,
  isJoker: boolean,
  pointsBase: number = 1000
): { points: number; isCorrect: boolean } {
  const isCorrect =
    playerAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  if (!isCorrect) return { points: 0, isCorrect: false };

  const basePoints = calculateTimeDecayPoints(
    timeRemainingMs,
    timeLimitMs,
    pointsBase
  );
  return {
    points: applyJokerMultiplier(basePoints, isJoker),
    isCorrect: true,
  };
}
