const SHUTTER_SOUND_URL = '/sounds/camera-shutter.mp3';

/** @type {HTMLAudioElement | null} */
let shutterSound = null;

function getShutterSound() {
	if (typeof Audio === 'undefined') return null;
	if (shutterSound) return shutterSound;
	shutterSound = new Audio(SHUTTER_SOUND_URL);
	shutterSound.preload = 'auto';
	shutterSound.volume = 0.72;
	return shutterSound;
}

export function prepareCameraShutterSound() {
	getShutterSound()?.load();
}

export function playCameraShutterSound() {
	const sound = getShutterSound();
	if (!sound) return;
	sound.currentTime = 0;
	sound.play().catch(() => {});
}
