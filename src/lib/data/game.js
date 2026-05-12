/**
 * null  = unanswered
 * true  = answered correctly
 * false = answered incorrectly
 * @typedef {boolean|null} BlobState
 */

/**
 * @typedef {{
 *   text: string,
 *   backgroundColor: string,
 * }} ColorAnswer
 */

/**
 * @typedef {boolean|string|number|ColorAnswer} CorrectAnswer
 */

/**
 * @typedef {{
 *   type: import('./questionTypes.js').QuestionType,
 *   text: string,
 *   deck: string,
 *   answers: string[],
 *   correctAnswers: CorrectAnswer[],
 *   blobs?: BlobState[],
 * }} Question
 */
