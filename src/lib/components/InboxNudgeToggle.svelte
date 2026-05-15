<script>
	import { onMount } from 'svelte';
	import { Bell, BellOff } from 'lucide-svelte';
	import Button from '$lib/components/Button.svelte';

	/** @type {{ vapidPublicKey: string }} */
	let { vapidPublicKey } = $props();

	/** @type {'loading' | 'unsupported' | 'default' | 'granted' | 'denied'} */
	let state = $state('loading');
	let busy = $state(false);
	let error = $state('');

	onMount(() => {
		if (
			typeof window === 'undefined' ||
			!('Notification' in window) ||
			!('serviceWorker' in navigator) ||
			!('PushManager' in window)
		) {
			state = 'unsupported';
			return;
		}
		state = /** @type {typeof state} */ (Notification.permission);
	});

	async function enable() {
		if (!vapidPublicKey) {
			error = 'Push is not configured (missing VAPID key).';
			return;
		}
		busy = true;
		error = '';
		try {
			const permission = await Notification.requestPermission();
			state = /** @type {typeof state} */ (permission);
			if (permission !== 'granted') return;

			const registration = await navigator.serviceWorker.ready;
			let subscription = await registration.pushManager.getSubscription();
			if (!subscription) {
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
				});
			}

			const json = subscription.toJSON();
			const res = await fetch('/api/inbox/push/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					endpoint: json.endpoint,
					p256dh: json.keys?.p256dh,
					auth: json.keys?.auth,
					user_agent: navigator.userAgent,
				}),
			});
			if (!res.ok) {
				error = `Could not save subscription (${res.status}).`;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not enable nudge.';
		} finally {
			busy = false;
		}
	}

	/** @param {string} base64 */
	function urlBase64ToUint8Array(base64) {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const normalized = (base64 + padding)
			.replace(/-/g, '+')
			.replace(/_/g, '/');
		const raw = atob(normalized);
		const output = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
		return output;
	}
</script>

{#if state === 'default'}
	<div class="nudge">
		<Button
			size="sm"
			variant="primary"
			icon={Bell}
			text={busy ? 'Enabling…' : 'Enable daily nudge'}
			onclick={enable}
			disabled={busy}
		/>
		{#if error}
			<p class="nudge__error" role="alert">{error}</p>
		{/if}
	</div>
{:else if state === 'granted'}
	<div class="nudge nudge--on">
		<Bell size={14} />
		<span>Daily nudge: on</span>
	</div>
{:else if state === 'denied'}
	<div class="nudge nudge--denied">
		<BellOff size={14} />
		<span
			>Notifications are blocked. Re-enable in your browser's site
			settings to receive the daily nudge.</span
		>
	</div>
{/if}

<style>
	.nudge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.nudge--on,
	.nudge--denied {
		font-size: var(--font-size-xs);
		color: var(--color-muted);
	}

	.nudge--denied {
		color: var(--color-coral);
	}

	.nudge__error {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-coral);
	}
</style>
