<script>
	import { onMount, tick } from 'svelte';
	import { ChevronLeft, Mic, Send, Square } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';
	import { AudioRecorder } from '$lib/AudioRecorder.js';

	let body = $state('');
	let submitting = $state(false);
	let error = $state('');
	let lastIssue = $state(/** @type {null | number} */ (null));
	let transcribing = $state(false);

	let textarea;
	let listening = $state(false);
	let baseBeforeSpeech = '';
	/** @type {AudioRecorder | null} */
	let recorder = null;

	onMount(() => {
		textarea?.focus();
		recorder = new AudioRecorder({ silenceTimeoutMs: 5000 });
		recorder.onSilenceTimeout = () => stopDictation();
	});

	async function toggleMic() {
		if (listening) {
			stopDictation();
			return;
		}
		error = '';
		baseBeforeSpeech = body ? body + ' ' : '';
		try {
			await recorder?.start();
			listening = true;
		} catch {
			error = 'Could not start mic';
		}
	}

	async function stopDictation() {
		if (!listening) return;
		listening = false;
		transcribing = true;
		try {
			const blob = await recorder?.stop();
			if (!blob || blob.size === 0) {
				transcribing = false;
				return;
			}
			const form = new FormData();
			form.append('audio', blob, 'recording.webm');
			const res = await fetch('/api/inbox/transcribe', {
				method: 'POST',
				body: form,
			});
			if (!res.ok) {
				error = 'Transcription failed — interim text kept';
				return;
			}
			const { text } = await res.json();
			body = (baseBeforeSpeech + text).trimStart();
		} catch {
			error = 'Transcription failed — interim text kept';
		} finally {
			transcribing = false;
		}
	}

	async function submit() {
		const trimmed = body.trim();
		if (!trimmed || submitting) return;
		if (listening) {
			listening = false;
			recorder?.stop();
		}
		submitting = true;
		error = '';
		try {
			const res = await fetch('/api/inbox/capture', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: trimmed }),
			});
			if (!res.ok) {
				error = `Capture failed (${res.status})`;
				return;
			}
			const data = await res.json();
			lastIssue = data.number;
			body = '';
			await tick();
			textarea?.focus();
		} catch {
			error = 'Network error';
		} finally {
			submitting = false;
		}
	}

	function onKey(e) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			submit();
		}
	}
</script>

<svelte:head>
	<title>Inbox — new note</title>
</svelte:head>

<div class="inbox">
	<form
		class="inbox__form"
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<a class="inbox__back" href="/inbox">
			<ChevronLeft size={20} />
			<span>Inbox</span>
		</a>

		<h1 class="inbox__title">New note</h1>

		<div class="inbox__textarea-wrap">
			<textarea
				bind:this={textarea}
				bind:value={body}
				onkeydown={onKey}
				class="inbox__textarea"
				class:inbox__textarea--transcribing={transcribing}
				placeholder={listening ? 'Listening…' : "What's the idea?"}
				rows="2"
				disabled={submitting}
			></textarea>
			{#if transcribing}
				<span class="inbox__processing">Transcribing…</span>
			{/if}
		</div>

		<div class="inbox__row">
			<Button
				class={listening
					? 'inbox__mic inbox__mic--on'
					: transcribing
						? 'inbox__mic inbox__mic--busy'
						: 'inbox__mic'}
				variant="secondary"
				icon={listening ? Square : Mic}
				text={listening
					? 'Stop'
					: transcribing
						? 'Processing…'
						: 'Speak'}
				onclick={toggleMic}
				disabled={submitting || transcribing}
				aria-pressed={listening}
			/>
			<Button
				class="inbox__submit"
				type="submit"
				icon={Send}
				text={submitting ? 'Sending…' : 'Capture'}
				disabled={submitting || !body.trim()}
			/>
		</div>

		{#if error}
			<p class="inbox__error" role="alert">{error}</p>
		{/if}
		{#if lastIssue !== null}
			<p class="inbox__ok" role="status">
				Captured as issue #{lastIssue}
			</p>
		{/if}
	</form>
</div>

<style>
	.inbox {
		box-sizing: border-box;
		min-height: 100dvh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-block: max(1.5rem, env(safe-area-inset-top))
			max(1.5rem, env(safe-area-inset-bottom));
		padding-inline: 1rem;
		background: radial-gradient(
			75% 75% at calc(var(--spotlight-x) * 1%)
				calc(var(--spotlight-y) * 1%),
			var(--palette-purple-start),
			var(--palette-purple-end)
		);
		color: var(--palette-white);
		font-family: var(--font-family-primary);
	}

	.inbox__form {
		width: 100%;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.inbox__back {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.5rem 0.375rem 0;
		margin-left: -0.25rem;
		font-family: var(--font-family-primary);
		font-size: var(--font-size-sm);
		color: var(--color-muted);
		text-decoration: none;
		border-radius: 0.375rem;
	}

	.inbox__back:hover {
		color: var(--palette-white);
	}

	.inbox__back:focus-visible {
		outline: 2px solid var(--palette-purple-light);
		outline-offset: 2px;
	}

	.inbox__title {
		margin: 0;
		font-family: var(--font-family-display);
		font-size: var(--font-size-xl);
		font-weight: 600;
		color: var(--palette-white);
	}

	.inbox__textarea-wrap {
		position: relative;
	}

	.inbox__textarea {
		box-sizing: border-box;
		width: 100%;
		min-height: 80px;
		padding: 0.75rem 1rem;
		font-family: var(--font-family-primary);
		font-size: var(--font-size-md);
		line-height: 1.4;
		background-color: var(--palette-white);
		color: var(--palette-black);
		border: 3px solid var(--palette-purple-start);
		border-radius: 0.5rem;
		field-sizing: content;
		resize: vertical;
		transition: opacity 0.3s ease;
	}

	.inbox__textarea--transcribing {
		opacity: 0.5;
	}

	.inbox__textarea:focus {
		outline: 3px solid var(--palette-purple-start);
		outline-offset: 2px;
	}

	.inbox__textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.inbox__processing {
		position: absolute;
		bottom: 0.5rem;
		right: 0.75rem;
		font-size: var(--font-size-xs, 0.75rem);
		color: var(--palette-purple-start);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.inbox__row {
		display: flex;
		gap: 8px;
	}

	.inbox__row :global(.inbox__mic),
	.inbox__row :global(.inbox__submit) {
		flex: 1;
	}

	.inbox__row :global(.inbox__mic--on) {
		background-color: var(--color-coral);
		animation: pulse 1.5s ease-in-out infinite;
	}

	.inbox__row :global(.inbox__mic--on:hover:not(:disabled)) {
		background-color: lch(from var(--color-coral) calc(l + 5) c h);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.inbox__error {
		color: var(--color-coral);
		margin: 0;
	}

	.inbox__ok {
		color: var(--color-mint);
		margin: 0;
	}
</style>
