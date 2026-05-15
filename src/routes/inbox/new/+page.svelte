<script>
	import { onMount, tick } from 'svelte';
	import { ChevronLeft, Mic, Send, Square } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';

	let body = $state('');
	let submitting = $state(false);
	let error = $state('');
	let lastIssue = $state(/** @type {null | number} */ (null));

	let textarea;
	let recognition = $state(/** @type {any} */ (null));
	let listening = $state(false);
	let speechSupported = $state(false);
	let baseBeforeSpeech = '';

	onMount(() => {
		textarea?.focus();
		const Ctor =
			/** @type {any} */ (window).SpeechRecognition ||
			/** @type {any} */ (window).webkitSpeechRecognition;
		if (!Ctor) return;
		speechSupported = true;
		const r = new Ctor();
		// Prefer Swedish; browser falls back automatically if not installed.
		r.lang = 'sv-SE';
		r.continuous = true;
		r.interimResults = true;
		r.onresult = (event) => {
			let transcript = '';
			for (let i = event.resultIndex; i < event.results.length; i++) {
				transcript += event.results[i][0].transcript;
			}
			body = (baseBeforeSpeech + ' ' + transcript).trimStart();
		};
		r.onerror = (e) => {
			listening = false;
			if (e.error === 'language-not-supported' && r.lang === 'sv-SE') {
				r.lang = 'en-US';
			} else if (e.error !== 'no-speech' && e.error !== 'aborted') {
				error = 'Mic error: ' + e.error;
			}
		};
		r.onend = () => {
			listening = false;
		};
		recognition = r;
	});

	function toggleMic() {
		if (!recognition) return;
		if (listening) {
			recognition.stop();
			return;
		}
		error = '';
		baseBeforeSpeech = body ? body + ' ' : '';
		try {
			recognition.start();
			listening = true;
		} catch {
			error = 'Could not start mic';
		}
	}

	async function submit() {
		const trimmed = body.trim();
		if (!trimmed || submitting) return;
		if (listening) recognition?.stop();
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
		// ⌘/Ctrl+Enter submits
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

		<textarea
			bind:this={textarea}
			bind:value={body}
			onkeydown={onKey}
			class="inbox__textarea"
			placeholder="What's the idea?"
			rows="2"
			disabled={submitting}
		></textarea>

		<div class="inbox__row">
			{#if speechSupported}
				<Button
					class={listening
						? 'inbox__mic inbox__mic--on'
						: 'inbox__mic'}
					variant="secondary"
					icon={listening ? Square : Mic}
					text={listening ? 'Stop' : 'Speak'}
					onclick={toggleMic}
					disabled={submitting}
					aria-pressed={listening}
				/>
			{/if}
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
		resize: vertical;
	}

	.inbox__textarea:focus {
		outline: 3px solid var(--palette-purple-start);
		outline-offset: 2px;
	}

	.inbox__textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
	}

	.inbox__row :global(.inbox__mic--on:hover:not(:disabled)) {
		background-color: lch(from var(--color-coral) calc(l + 5) c h);
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
