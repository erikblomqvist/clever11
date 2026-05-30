/**
 * Tiny synthesized camera shutter sound.
 *
 * Kept inline like the setup celebration sounds so the camera overlay does not
 * need an audio asset and can prepare playback from the shutter button gesture.
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

export function prepareCameraShutterSound() {
	const c = getCtx();
	if (!c) return;
	if (c.state === 'suspended') c.resume();
}

export function playCameraShutterSound() {
	const c = getCtx();
	if (!c) return;
	if (c.state === 'suspended') c.resume();

	const t0 = c.currentTime;
	const output = c.createGain();
	output.gain.setValueAtTime(0, t0);
	output.gain.linearRampToValueAtTime(0.22, t0 + 0.004);
	output.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
	output.connect(c.destination);

	const click = c.createOscillator();
	click.type = 'square';
	click.frequency.setValueAtTime(1450, t0);
	click.frequency.exponentialRampToValueAtTime(520, t0 + 0.035);
	click.connect(output);
	click.start(t0);
	click.stop(t0 + 0.045);

	const body = c.createOscillator();
	body.type = 'triangle';
	body.frequency.setValueAtTime(180, t0 + 0.018);
	body.frequency.exponentialRampToValueAtTime(90, t0 + 0.11);
	body.connect(output);
	body.start(t0 + 0.018);
	body.stop(t0 + 0.12);
}
