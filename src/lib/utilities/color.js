/** @param {number} h @param {number} s @param {number} l */
export function hslToRgb(h, s, l) {
	h /= 360;
	s /= 100;
	l /= 100;
	if (s === 0) {
		const v = Math.round(l * 255);
		return [v, v, v];
	}
	const hue2rgb = (
		/** @type {number} */ p,
		/** @type {number} */ q,
		/** @type {number} */ t,
	) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const r = hue2rgb(p, q, h + 1 / 3);
	const g = hue2rgb(p, q, h);
	const b = hue2rgb(p, q, h - 1 / 3);
	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** @param {number} h @param {number} s @param {number} l */
export function hslToHex(h, s, l) {
	const [r, g, b] = hslToRgb(h, s, l);
	return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** @param {number} h @param {number} s @param {number} l */
export function hslToCss(h, s, l) {
	return `hsl(${h} ${s}% ${l}%)`;
}

/** @param {string} hex */
export function hexToHsl(hex) {
	const n = hex.replace('#', '');
	const r = parseInt(n.slice(0, 2), 16) / 255;
	const g = parseInt(n.slice(2, 4), 16) / 255;
	const b = parseInt(n.slice(4, 6), 16) / 255;
	return rgbToHsl(r * 255, g * 255, b * 255);
}

/** @param {number} r @param {number} g @param {number} b */
export function rgbToHsl(r, g, b) {
	r = Math.max(0, Math.min(255, r)) / 255;
	g = Math.max(0, Math.min(255, g)) / 255;
	b = Math.max(0, Math.min(255, b)) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l: l * 100 };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;
	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

/** @param {string} color */
export function parseHslString(color) {
	const match = color.match(
		/^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i,
	);
	if (!match) return null;
	return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

/** @param {string} color */
export function parseHexString(color) {
	const match = color.match(/^#([0-9a-f]{3,8})$/i);
	if (!match) return null;
	let hex = match[1];
	if (hex.length === 3 || hex.length === 4) {
		hex = hex
			.slice(0, 3)
			.split('')
			.map((c) => c + c)
			.join('');
	} else if (hex.length === 6 || hex.length === 8) {
		hex = hex.slice(0, 6);
	} else {
		return null;
	}
	return rgbToHsl(
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16),
	);
}

/** @param {string} color */
export function parseRgbString(color) {
	const match = color.match(
		/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i,
	);
	if (!match) return null;
	return rgbToHsl(Number(match[1]), Number(match[2]), Number(match[3]));
}
