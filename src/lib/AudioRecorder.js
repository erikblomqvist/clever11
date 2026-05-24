const SILENCE_THRESHOLD = 0.01;
const SILENCE_CHECK_INTERVAL = 200;

export class AudioRecorder {
	/** @type {MediaRecorder | null} */
	#recorder = null;
	/** @type {AudioContext | null} */
	#audioCtx = null;
	/** @type {MediaStreamAudioSourceNode | null} */
	#source = null;
	/** @type {AnalyserNode | null} */
	#analyser = null;
	/** @type {number | null} */
	#silenceTimer = null;
	/** @type {number} */
	#silentMs = 0;
	/** @type {number} */
	#silenceTimeoutMs;
	/** @type {Blob[]} */
	#chunks = [];
	/** @type {((blob: Blob) => void) | null} */
	#resolveStop = null;
	/** @type {(() => void) | null} */
	onSilenceTimeout = null;

	/** @param {{ silenceTimeoutMs?: number }} [opts] */
	constructor(opts) {
		this.#silenceTimeoutMs = opts?.silenceTimeoutMs ?? 5000;
	}

	async start() {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
		});

		this.#audioCtx = new AudioContext();
		this.#source = this.#audioCtx.createMediaStreamSource(stream);
		this.#analyser = this.#audioCtx.createAnalyser();
		this.#analyser.fftSize = 256;
		this.#source.connect(this.#analyser);

		this.#chunks = [];
		this.#recorder = new MediaRecorder(stream, {
			mimeType: 'audio/webm;codecs=opus',
		});
		this.#recorder.ondataavailable = (e) => {
			if (e.data.size > 0) this.#chunks.push(e.data);
		};
		this.#recorder.onstop = () => {
			const blob = new Blob(this.#chunks, {
				type: 'audio/webm;codecs=opus',
			});
			this.#resolveStop?.(blob);
			this.#resolveStop = null;
		};
		this.#recorder.start(250);

		this.#silentMs = 0;
		this.#startSilenceDetection();
	}

	/** @returns {Promise<Blob>} */
	stop() {
		this.#stopSilenceDetection();
		return new Promise((resolve) => {
			if (!this.#recorder || this.#recorder.state === 'inactive') {
				resolve(
					new Blob(this.#chunks, { type: 'audio/webm;codecs=opus' }),
				);
				return;
			}
			this.#resolveStop = resolve;
			this.#recorder.stop();
			this.#recorder.stream.getTracks().forEach((t) => t.stop());
			this.#audioCtx?.close();
		});
	}

	get recording() {
		return this.#recorder?.state === 'recording';
	}

	#startSilenceDetection() {
		const data = new Float32Array(this.#analyser?.fftSize ?? 256);
		this.#silenceTimer = window.setInterval(() => {
			if (!this.#analyser) return;
			this.#analyser.getFloatTimeDomainData(data);
			const rms = Math.sqrt(
				data.reduce((sum, v) => sum + v * v, 0) / data.length,
			);
			if (rms < SILENCE_THRESHOLD) {
				this.#silentMs += SILENCE_CHECK_INTERVAL;
				if (this.#silentMs >= this.#silenceTimeoutMs) {
					this.onSilenceTimeout?.();
				}
			} else {
				this.#silentMs = 0;
			}
		}, SILENCE_CHECK_INTERVAL);
	}

	#stopSilenceDetection() {
		if (this.#silenceTimer != null) {
			clearInterval(this.#silenceTimer);
			this.#silenceTimer = null;
		}
	}
}
