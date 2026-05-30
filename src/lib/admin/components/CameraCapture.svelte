<script>
	import { X, Undo2 } from 'lucide-svelte';

	let {
		/** @type {string | null} */
		deckName = null,
		/** @type {(file: File) => void} */
		oncapture,
		/** Request undo of the most recent shot. */
		onundo,
		/** Close the camera overlay. */
		onclose,
		/** @type {(err: any) => void} Stream failed to start. */
		onerror,
	} = $props();

	/** @type {HTMLVideoElement | null} */
	let videoEl = $state(null);
	/** @type {MediaStream | null} */
	let stream = $state(null);
	let starting = $state(true);
	let flashing = $state(false);
	/** @type {{ thumbUrl: string }[]} */
	let shots = $state([]);

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let flashTimer;

	const constraints = {
		video: {
			facingMode: { ideal: 'environment' },
			width: { ideal: 2560 },
			height: { ideal: 1440 },
		},
		audio: false,
	};

	// Start the camera on mount, tear it down on unmount.
	$effect(() => {
		let cancelled = false;
		(async () => {
			try {
				if (!navigator.mediaDevices?.getUserMedia) {
					throw new Error('Camera API unavailable.');
				}
				const next =
					await navigator.mediaDevices.getUserMedia(constraints);
				if (cancelled) {
					next.getTracks().forEach((track) => track.stop());
					return;
				}
				stream = next;
				starting = false;
			} catch (/** @type {any} */ err) {
				if (!cancelled) onerror?.(err);
			}
		})();

		return () => {
			cancelled = true;
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
				stream = null;
			}
			clearTimeout(flashTimer);
			shots.forEach((shot) => URL.revokeObjectURL(shot.thumbUrl));
		};
	});

	// Attach the stream once both the element and the stream exist.
	$effect(() => {
		if (videoEl && stream) {
			videoEl.srcObject = stream;
			videoEl.play().catch(() => {});
		}
	});

	function triggerFlash() {
		flashing = true;
		clearTimeout(flashTimer);
		flashTimer = setTimeout(() => (flashing = false), 140);
	}

	function capture() {
		const video = videoEl;
		if (!video || !video.videoWidth) return;
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const context = canvas.getContext('2d');
		if (!context) return;
		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const file = new File(
					[blob],
					`capture-${shots.length + 1}.jpg`,
					{ type: 'image/jpeg' },
				);
				const thumbUrl = URL.createObjectURL(blob);
				shots = [...shots, { thumbUrl }];
				triggerFlash();
				oncapture?.(file);
			},
			'image/jpeg',
			0.92,
		);
	}

	function undo() {
		if (shots.length === 0) return;
		const last = shots[shots.length - 1];
		URL.revokeObjectURL(last.thumbUrl);
		shots = shots.slice(0, -1);
		onundo?.();
	}

	const lastShot = $derived(shots[shots.length - 1] ?? null);
</script>

<div class="cam" class:cam--flash={flashing}>
	<video class="cam__feed" bind:this={videoEl} autoplay playsinline muted
	></video>

	<!-- Card framing guide (non-cropping alignment hint) -->
	<div class="cam__guide-wrap" aria-hidden="true">
		<div class="cam__guide"></div>
	</div>

	{#if starting}
		<div class="cam__starting">Starting camera…</div>
	{/if}

	<!-- Top bar -->
	<div class="cam__top">
		<span class="cam__deck">
			{#if deckName}
				<span class="cam__deck-dot"></span>{deckName}
			{:else}
				<span class="cam__deck-none">No deck selected</span>
			{/if}
		</span>
		<button class="cam__done" type="button" onclick={() => onclose?.()}>
			<X size={14} />
			Done
		</button>
	</div>

	<!-- Bottom controls -->
	<div class="cam__bottom">
		<div class="cam__count">
			<span class="cam__count-num mono">{shots.length}</span>
			<span class="cam__count-label">
				shot{shots.length === 1 ? '' : 's'}
			</span>
		</div>

		<button
			class="cam__shutter"
			type="button"
			onclick={capture}
			disabled={starting}
			aria-label="Take photo"
		>
			<span class="cam__shutter-ring"></span>
		</button>

		<div class="cam__undo-slot">
			{#if lastShot}
				<button
					class="cam__undo"
					type="button"
					onclick={undo}
					aria-label="Undo last shot"
				>
					<img src={lastShot.thumbUrl} alt="" />
					<span class="cam__undo-badge"><Undo2 size={11} /></span>
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.cam {
		display: flex;
		position: fixed;
		inset: 0;
		z-index: 100;
		overflow: hidden;

		background: lch(0% 0 0);

		flex-direction: column;
	}

	.cam__feed {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;

		object-fit: cover;
	}

	/* Flash on capture */
	.cam::after {
		position: absolute;
		inset: 0;
		z-index: 3;

		background: lch(100% 0 0);
		opacity: 0;

		content: '';
		pointer-events: none;
	}

	.cam--flash::after {
		animation: cam-flash 140ms ease;
	}

	@keyframes cam-flash {
		0% {
			opacity: 0;
		}
		40% {
			opacity: 0.7;
		}
		100% {
			opacity: 0;
		}
	}

	/* ─── Framing guide ─── */

	.cam__guide-wrap {
		display: grid;
		position: absolute;
		inset: 0;
		z-index: 1;

		place-items: center;

		pointer-events: none;
	}

	.cam__guide {
		width: min(82vw, 58vh);

		/* Card silhouette: large radius left corners, smaller right */
		border: 2px solid lch(100% 0 0 / 0.85);
		border-radius: 24% 8% 8% 24%;
		box-shadow: 0 0 0 100vmax lch(0% 0 0 / 0.32);

		aspect-ratio: 1;
	}

	.cam__starting {
		display: grid;
		position: absolute;
		inset: 0;
		z-index: 2;

		font-size: 0.8125rem;

		color: lch(100% 0 0 / 0.8);

		place-items: center;
	}

	/* ─── Top bar ─── */

	.cam__top {
		display: flex;
		position: relative;
		z-index: 4;
		padding: max(16px, env(safe-area-inset-top)) 16px 16px;
		align-items: center;
		justify-content: space-between;

		background: linear-gradient(lch(0% 0 0 / 0.55), lch(0% 0 0 / 0));

		gap: 12px;
	}

	.cam__deck {
		display: inline-flex;
		align-items: center;

		font-size: 0.8125rem;
		font-weight: 500;

		color: lch(100% 0 0 / 0.92);

		gap: 7px;
	}

	.cam__deck-dot {
		width: 7px;
		height: 7px;

		background: var(--accent);
		border-radius: 50%;
	}

	.cam__deck-none {
		color: lch(100% 0 0 / 0.55);
	}

	.cam__done {
		display: inline-flex;
		align-items: center;
		height: 34px;
		padding: 0 14px;

		font-size: 0.8125rem;
		font-weight: 600;

		color: lch(100% 0 0 / 0.92);
		background: lch(100% 0 0 / 0.14);
		border: 1px solid lch(100% 0 0 / 0.2);
		border-radius: 100px;
		cursor: pointer;

		gap: 6px;
	}

	/* ─── Bottom controls ─── */

	.cam__bottom {
		display: grid;
		position: relative;
		z-index: 4;
		margin-top: auto;
		padding: 20px 24px max(24px, env(safe-area-inset-bottom));
		align-items: center;

		background: linear-gradient(lch(0% 0 0 / 0), lch(0% 0 0 / 0.55));

		grid-template-columns: 1fr auto 1fr;
	}

	.cam__count {
		display: inline-flex;
		align-items: baseline;

		color: lch(100% 0 0 / 0.92);

		gap: 5px;
	}

	.cam__count-num {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.cam__count-label {
		font-size: 0.75rem;

		color: lch(100% 0 0 / 0.6);
	}

	.cam__shutter {
		display: grid;
		width: 72px;
		height: 72px;
		padding: 0;

		background: lch(100% 0 0 / 0.18);
		border: 3px solid lch(100% 0 0 / 0.95);
		border-radius: 50%;
		cursor: pointer;

		place-items: center;
		justify-self: center;

		transition: transform 80ms ease;
	}

	.cam__shutter:active {
		transform: scale(0.92);
	}

	.cam__shutter:disabled {
		opacity: 0.4;
	}

	.cam__shutter-ring {
		width: 56px;
		height: 56px;

		background: lch(100% 0 0 / 0.95);
		border-radius: 50%;
	}

	.cam__undo-slot {
		display: flex;
		justify-content: flex-end;
	}

	.cam__undo {
		display: block;
		position: relative;
		width: 52px;
		height: 52px;
		padding: 0;

		background: none;
		border: 2px solid lch(100% 0 0 / 0.7);
		border-radius: var(--r-2);
		cursor: pointer;
	}

	.cam__undo img {
		width: 100%;
		height: 100%;

		object-fit: cover;

		border-radius: calc(var(--r-2) - 2px);
	}

	.cam__undo-badge {
		display: grid;
		position: absolute;
		bottom: -6px;
		right: -6px;
		width: 20px;
		height: 20px;

		color: lch(100% 0 0);
		background: var(--danger);
		border-radius: 50%;
		box-shadow: 0 1px 4px lch(0% 0 0 / 0.5);

		place-items: center;
	}
</style>
