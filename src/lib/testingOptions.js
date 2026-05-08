const FORCED_FIRST_QUESTION_ID_KEY = 'clever11:forced-first-question-id';

export function getForcedFirstQuestionId() {
	if (typeof localStorage === 'undefined') return null;
	const value = localStorage.getItem(FORCED_FIRST_QUESTION_ID_KEY)?.trim();
	return value || null;
}

/** @param {string} questionId */
export function setForcedFirstQuestionId(questionId) {
	const value = questionId.trim();
	if (!value) {
		clearForcedFirstQuestionId();
		return;
	}
	localStorage.setItem(FORCED_FIRST_QUESTION_ID_KEY, value);
}

export function clearForcedFirstQuestionId() {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(FORCED_FIRST_QUESTION_ID_KEY);
}
