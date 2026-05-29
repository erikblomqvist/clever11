<script>
	/** @type {{ onlogin: (user: import('@supabase/supabase-js').User) => void, supabase?: import('@supabase/supabase-js').SupabaseClient|null }} */
	let { onlogin, supabase: supabaseProp } = $props();
	import { supabase as supabaseGlobal } from '$lib/supabase.js';
	import Logo from './components/Logo.svelte';
	import AdminIcon from './components/AdminIcon.svelte';

	const supabase = $derived(supabaseProp ?? supabaseGlobal);

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let resetting = $state(false);
	let error = $state('');
	let notice = $state('');

	async function handleSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (!supabase) return;
		loading = true;
		error = '';
		notice = '';
		const { data, error: authError } =
			await supabase.auth.signInWithPassword({ email, password });
		if (authError) {
			loading = false;
			error = authError.message;
			return;
		}
		if (!data.user) {
			error = 'Login failed.';
			loading = false;
			return;
		}

		// Check admin flag
		const { data: userData } = await supabase
			.from('users')
			.select('is_admin')
			.eq('id', data.user.id)
			.single();

		if (!userData?.is_admin) {
			await supabase.auth.signOut();
			loading = false;
			error = 'You do not have admin access.';
			return;
		}
		onlogin(data.user);
		loading = false;
	}

	async function handleForgot() {
		if (!supabase) return;
		error = '';
		notice = '';
		if (!email) {
			error = 'Enter your email first, then tap Forgot.';
			return;
		}
		resetting = true;
		const { error: resetError } =
			await supabase.auth.resetPasswordForEmail(email);
		resetting = false;
		if (resetError) {
			error = resetError.message;
			return;
		}
		notice = `If an account exists for ${email}, a reset link is on its way.`;
	}
</script>

<div class="login">
	<div class="login__glow login__glow--coral" aria-hidden="true"></div>
	<div class="login__glow login__glow--lime" aria-hidden="true"></div>

	<div class="login__brand">
		<Logo />
	</div>

	<form class="login__card" onsubmit={handleSubmit}>
		<h1 class="login__title">Sign in to admin</h1>

		<div class="login__fields">
			<div class="login__field">
				<label class="login__label" for="login-email">Email</label>
				<div class="login__input">
					<input
						id="login-email"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						disabled={loading}
					/>
				</div>
			</div>

			<div class="login__field">
				<div class="login__label-row">
					<label class="login__label" for="login-password"
						>Password</label
					>
					<button
						class="login__forgot"
						type="button"
						onclick={handleForgot}
						disabled={loading || resetting}
					>
						{resetting ? 'Sending…' : 'Forgot?'}
					</button>
				</div>
				<div class="login__input">
					<input
						id="login-password"
						type="password"
						bind:value={password}
						required
						autocomplete="current-password"
						disabled={loading}
					/>
				</div>
			</div>

			{#if error}
				<p class="login__alert login__alert--error" role="alert">
					{error}
				</p>
			{/if}
			{#if notice}
				<p class="login__alert login__alert--ok" role="status">
					{notice}
				</p>
			{/if}

			<button class="login__submit" type="submit" disabled={loading}>
				{#if loading}
					<span class="login__spinner" aria-hidden="true"></span>
					Signing in…
				{:else}
					Sign in
					<AdminIcon name="arrow" size={15} />
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	.login {
		display: flex;
		position: relative;
		overflow: hidden;
		width: 100%;
		min-height: 100dvh;
		padding: 48px;
		align-items: center;
		justify-content: center;

		background: var(--bg);
	}

	.login__glow {
		position: absolute;
		z-index: 0;

		pointer-events: none;
	}

	.login__glow--coral {
		top: -30%;
		right: -25%;
		width: 560px;
		height: 560px;

		background: radial-gradient(
			ellipse at center,
			lch(66.4% 63.9 41 / 0.1),
			transparent 65%
		);
	}

	.login__glow--lime {
		bottom: -30%;
		left: -20%;
		width: 480px;
		height: 480px;

		background: radial-gradient(
			ellipse at center,
			lch(94.2% 90.2 115 / 0.06),
			transparent 65%
		);
	}

	.login__brand {
		position: absolute;
		top: 24px;
		left: 28px;
		z-index: 1;
	}

	.login__card {
		display: flex;
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 400px;
		padding: 36px 36px 30px;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-4);
		box-shadow: var(--shadow-2);

		flex-direction: column;
	}

	.login__title {
		margin: 0 0 24px;

		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.login__fields {
		display: flex;

		flex-direction: column;
		gap: 14px;
	}

	.login__field {
		display: flex;

		flex-direction: column;
		gap: 6px;
	}

	.login__label-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;

		gap: 8px;
	}

	.login__label {
		font-size: 12.5px;
		font-weight: 500;

		color: var(--fg-mute);
	}

	.login__forgot {
		font-size: 12px;

		color: var(--accent-2);

		transition: color 80ms ease;
	}

	.login__forgot:hover:not(:disabled) {
		color: var(--accent-2-hover);
	}

	.login__forgot:disabled {
		color: var(--fg-faint);
		cursor: default;
	}

	.login__input {
		display: flex;
		align-items: center;
		width: 100%;
		height: var(--h-input);
		padding: 0 14px;

		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);

		transition:
			border-color 80ms ease,
			box-shadow 80ms ease;

		gap: 8px;
	}

	.login__input:focus-within {
		border-color: var(--border-accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}

	.login__input input {
		width: 100%;

		font-size: 14px;

		color: var(--fg);
	}

	.login__input input::placeholder {
		color: var(--fg-faint);
	}

	.login__alert {
		margin: 0;
		padding: 9px 12px;

		font-size: 13px;

		border-radius: var(--r-2);
	}

	.login__alert--error {
		color: var(--danger);
		background: var(--danger-soft);
		border: 1px solid lch(63.3% 63.5 19 / 0.25);
	}

	.login__alert--ok {
		color: var(--ok);
		background: var(--ok-soft);
		border: 1px solid lch(86.6% 57.6 150 / 0.25);
	}

	.login__submit {
		display: inline-flex;
		height: var(--h-input);
		margin-top: 6px;
		align-items: center;
		justify-content: center;

		font-size: 13px;
		font-weight: 600;

		color: var(--accent-fg);
		background: var(--accent);
		border: 1px solid transparent;
		border-radius: var(--r-2);
		box-shadow:
			0 0 0 1px lch(94.2% 90.2 115 / 0.25),
			0 8px 24px -8px lch(94.2% 90.2 115 / 0.35);
		cursor: pointer;

		transition: background 80ms ease;

		gap: 8px;
	}

	.login__submit:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.login__submit:focus-visible {
		outline: 2px solid var(--accent-hover);
		outline-offset: 2px;
	}

	.login__submit:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.login__spinner {
		display: inline-block;
		width: 14px;
		height: 14px;

		border: 2px solid lch(0% 0 0 / 0.3);
		border-top-color: var(--accent-fg);
		border-radius: 50%;

		animation: spin var(--dur-spin) linear infinite;
	}

	@media (max-width: 480px) {
		.login {
			padding: 24px;
		}

		.login__brand {
			top: 20px;
			left: 20px;
		}

		.login__card {
			max-width: 360px;
			padding: 28px 22px 24px;
		}

		.login__title {
			font-size: 22px;
		}
	}
</style>
