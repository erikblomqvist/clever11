<script>
	import { onMount, tick } from 'svelte';

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
		<textarea
			bind:this={textarea}
			bind:value={body}
			onkeydown={onKey}
			class="inbox__textarea"
			placeholder="What's the idea?"
			rows="8"
			disabled={submitting}
		></textarea>

		<div class="inbox__row">
			{#if speechSupported}
				<button
					type="button"
					class="inbox__mic"
					class:inbox__mic--on={listening}
					onclick={toggleMic}
					disabled={submitting}
					aria-pressed={listening}
				>
					{listening ? '● Stop' : '🎤 Speak'}
				</button>
			{/if}
			<button
				type="submit"
				class="inbox__submit"
				disabled={submitting || !body.trim()}
			>
				{submitting ? 'Sending…' : 'Capture'}
			</button>
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
		min-height: 100dvh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: env(safe-area-inset-top, 16px) 16px 16px;
		background: #0f1115;
		color: #f5f5f5;
	}

	.inbox__form {
		width: 100%;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.inbox__textarea {
		width: 100%;
		min-height: 40dvh;
		padding: 16px;
		font-size: 18px;
		line-height: 1.4;
		background: #1a1d24;
		color: inherit;
		border: 1px solid #2a2f3a;
		border-radius: 12px;
		resize: vertical;
	}

	.inbox__textarea:focus {
		outline: 2px solid #4f8cff;
		outline-offset: 1px;
	}

	.inbox__row {
		display: flex;
		gap: 8px;
	}

	.inbox__mic,
	.inbox__submit {
		flex: 1;
		min-height: 48px;
		padding: 0 16px;
		font-size: 16px;
		font-weight: 600;
		border: none;
		border-radius: 10px;
		cursor: pointer;
	}

	.inbox__mic {
		background: #2a2f3a;
		color: #f5f5f5;
	}

	.inbox__mic--on {
		background: #c0392b;
	}

	.inbox__submit {
		background: #4f8cff;
		color: #fff;
	}

	.inbox__submit:disabled,
	.inbox__mic:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.inbox__error {
		color: #ff7676;
		margin: 0;
	}

	.inbox__ok {
		color: #8fe39a;
		margin: 0;
	}
</style>
