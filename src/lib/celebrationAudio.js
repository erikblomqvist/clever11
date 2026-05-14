/**
 * Inline Web Audio synthesis for easter-egg unlock celebrations.
 *
 * Why inline (no asset files): the AudioContext is created lazily on the
 * first user-gesture-driven call, which satisfies Safari's autoplay policy
 * without any permission prompt. Both sounds are short (<300ms) and
 * generated from oscillators + gains — zero kilobytes shipped.
 */

/** @type {AudioContext | null} */
let ctx = null;

function getCtx() {
	if (ctx) return ctx;
	const Ctor =
		window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
	if (!Ctor) return null;
	ctx = new Ctor();
	return ctx;
}

/**
 * Play a tone at the given frequency, start offset, and duration.
 * Uses a short attack/release envelope to avoid clicks.
 *
 * @param {AudioContext} c
 * @param {number} freq
 * @param {number} startOffset seconds from "now"
 * @param {number} duration seconds
 * @param {number} peakGain 0–1
 * @param {OscillatorType} type
 */
function tone(c, freq, startOffset, duration, peakGain, type = 'sine') {
	const osc = c.createOscillator();
	const gain = c.createGain();
	osc.type = type;
	osc.frequency.value = freq;
	osc.connect(gain).connect(c.destination);

	const t0 = c.currentTime + startOffset;
	const attack = 0.005;
	const release = 0.04;
	gain.gain.setValueAtTime(0, t0);
	gain.gain.linearRampToValueAtTime(peakGain, t0 + attack);
	gain.gain.setValueAtTime(peakGain, t0 + duration - release);
	gain.gain.linearRampToValueAtTime(0, t0 + duration);

	osc.start(t0);
	osc.stop(t0 + duration + 0.02);
}

/**
 * Ascending C-E-G-C arpeggio (~180ms total). The MAGIC unlock chime —
 * fanfare-shaped, major-key, "you summoned something" energy.
 */
export function playSparkleChime() {
	const c = getCtx();
	if (!c) return;
	if (c.state === 'suspended') c.resume();
	// C5, E5, G5, C6
	const notes = [523.25, 659.25, 783.99, 1046.5];
	const step = 0.045;
	const dur = 0.09;
	notes.forEach((f, i) => tone(c, f, i * step, dur, 0.18, 'triangle'));
}

/**
 * Descending whoosh + ding (~280ms). The pinch unlock — "you pried open
 * the cupboard and stuff tumbled out."
 */
export function playWhooshDing() {
	const c = getCtx();
	if (!c) return;
	if (c.state === 'suspended') c.resume();

	// Whoosh: sawtooth swept from 600 → 120 Hz, filtered, ~180ms
	const osc = c.createOscillator();
	const filter = c.createBiquadFilter();
	const gain = c.createGain();
	osc.type = 'sawtooth';
	filter.type = 'lowpass';
	filter.frequency.value = 1200;
	osc.connect(filter).connect(gain).connect(c.destination);

	const t0 = c.currentTime;
	const whooshDur = 0.18;
	osc.frequency.setValueAtTime(600, t0);
	osc.frequency.exponentialRampToValueAtTime(120, t0 + whooshDur);
	gain.gain.setValueAtTime(0, t0);
	gain.gain.linearRampToValueAtTime(0.12, t0 + 0.01);
	gain.gain.linearRampToValueAtTime(0, t0 + whooshDur);
	osc.start(t0);
	osc.stop(t0 + whooshDur + 0.02);

	// Ding: bright bell tone at the tail (A6)
	tone(c, 1760, whooshDur - 0.02, 0.12, 0.16, 'sine');
}
