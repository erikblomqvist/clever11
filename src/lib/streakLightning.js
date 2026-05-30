/**
 * Procedural streak lightning for the question wheel.
 *
 * Jagged bolts are drawn on a <canvas> and regenerated in short bursts so they
 * snap to new shapes and fade, reading as real crackling electricity. This
 * deliberately avoids animated SVG filters (feTurbulence/feDisplacementMap),
 * which re-rasterize per frame on the CPU and stutter badly on WebKit/iPad.
 */

const TWO_PI = Math.PI * 2;

function makeBolt(cx, cy, radius, now) {
	const a0 = Math.random() * TWO_PI;
	const span = (0.12 + Math.random() * 0.24) * TWO_PI;
	const dir = Math.random() < 0.5 ? 1 : -1;
	const segments = 9 + Math.floor(Math.random() * 7);
	const points = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const ang = a0 + dir * span * t;
		// Envelope keeps the bolt hugging the rim at its ends and jagged in the
		// middle, so it reads as an arc crawling along the ring.
		const envelope = Math.sin(t * Math.PI);
		const jitter = (Math.random() - 0.5) * radius * 0.16 * envelope;
		const r = radius + jitter;
		points.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
	}
	return { points, born: now, life: 80 + Math.random() * 110 };
}

function strokePath(ctx, points) {
	ctx.beginPath();
	ctx.moveTo(points[0][0], points[0][1]);
	for (let i = 1; i < points.length; i++) {
		ctx.lineTo(points[i][0], points[i][1]);
	}
	ctx.stroke();
}

/**
 * Start the canvas lightning loop. Returns a stop() that cancels the RAF loop
 * and disconnects the resize observer.
 * @param {HTMLCanvasElement} canvas
 */
export function createStreakLightning(canvas) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return () => {};

	let raf = 0;
	let bolts = /** @type {ReturnType<typeof makeBolt>[]} */ ([]);
	let lastSpawn = 0;
	let dpr = 1;
	let w = 0;
	let h = 0;
	let coreColor = 'white';

	function resize() {
		const rect = canvas.getBoundingClientRect();
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		w = rect.width;
		h = rect.height;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		// `color` is set from --streak-color in CSS; read the resolved rgb once.
		const resolved = getComputedStyle(canvas).color;
		if (resolved) coreColor = resolved;
	}

	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	resize();

	function frame(now) {
		if (now - lastSpawn > 60) {
			lastSpawn = now;
			const cx = w / 2;
			const cy = h / 2;
			const radius = (Math.min(w, h) / 2) * 0.95;
			const count = 1 + Math.floor(Math.random() * 2);
			for (let i = 0; i < count; i++) {
				bolts.push(makeBolt(cx, cy, radius, now));
			}
			if (bolts.length > 16) bolts = bolts.slice(-16);
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		const maxDim = Math.max(w, h);
		for (const b of bolts) {
			const age = (now - b.born) / b.life;
			if (age >= 1) continue;
			const alpha = Math.sin((1 - age) * Math.PI * 0.5);
			// Wide soft halo.
			ctx.globalAlpha = alpha * 0.4;
			ctx.strokeStyle = coreColor;
			ctx.lineWidth = maxDim * 0.014;
			strokePath(ctx, b.points);
			// Bright thin core.
			ctx.globalAlpha = alpha;
			ctx.lineWidth = Math.max(1, maxDim * 0.0045);
			strokePath(ctx, b.points);
		}

		bolts = bolts.filter((b) => now - b.born < b.life);
		raf = requestAnimationFrame(frame);
	}

	raf = requestAnimationFrame(frame);

	return function stop() {
		cancelAnimationFrame(raf);
		ro.disconnect();
	};
}
