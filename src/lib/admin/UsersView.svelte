<script>
	import { supabase } from '$lib/supabase.js';
	import { Users } from 'lucide-svelte';
	import Toggle from './components/Toggle.svelte';
	import EmptyState from './components/EmptyState.svelte';
	import Toast from './components/Toast.svelte';

	/** @type {{ id: string, email: string, name: string, is_admin: boolean }[]} */
	let users = $state([]);
	let loading = $state(true);
	let error = $state('');
	/** @type {Toast|null} */
	let toastRef = $state(null);

	$effect(() => {
		loadUsers();
	});

	async function loadUsers() {
		const { data, error: err } = await supabase
			.from('users')
			.select('id, email, name, is_admin')
			.order('email');
		if (err) {
			error = err.message;
		} else {
			users = data ?? [];
		}
		loading = false;
	}

	async function toggleAdmin(
		/** @type {string} */ userId,
		/** @type {boolean} */ current,
	) {
		const { error: err } = await supabase
			.from('users')
			.update({ is_admin: !current })
			.eq('id', userId);
		if (err) {
			toastRef?.show(err.message);
			return;
		}
		users = users.map((u) =>
			u.id === userId ? { ...u, is_admin: !current } : u,
		);
	}
</script>

<div class="uv">
	<div class="uv__header">
		<h1 class="uv__title">Users</h1>
		<p class="uv__subtitle">
			Users are created automatically when someone signs in via Supabase
			Auth. Toggle admin access here.
		</p>
	</div>

	{#if loading}
		<div class="uv__status">Loading…</div>
	{:else if error}
		<div class="uv__status uv__status--error">{error}</div>
	{:else if users.length === 0}
		<EmptyState
			title="No users yet."
			body="Users will appear once someone signs in."
		>
			{#snippet icon()}
				<Users size={18} />
			{/snippet}
		</EmptyState>
	{:else}
		<!-- Desktop table -->
		<div class="uv__table">
			<div class="uv__table-head">
				<span class="uv__col-label">Email</span>
				<span class="uv__col-label">Name</span>
				<span class="uv__col-label">Admin</span>
			</div>
			{#each users as user (user.id)}
				<div class="uv__row">
					<span class="uv__row-email">{user.email}</span>
					<span class="uv__row-name">{user.name}</span>
					<div class="uv__row-toggle">
						<Toggle
							checked={user.is_admin}
							onchange={() => toggleAdmin(user.id, user.is_admin)}
						/>
					</div>
				</div>
			{/each}
		</div>

		<!-- Mobile cards -->
		<div class="uv__cards">
			{#each users as user (user.id)}
				<div class="uv__card">
					<div class="uv__card-info">
						<span class="uv__card-email">{user.email}</span>
						<span class="uv__card-name">{user.name}</span>
					</div>
					<Toggle
						checked={user.is_admin}
						onchange={() => toggleAdmin(user.id, user.is_admin)}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>

<Toast bind:this={toastRef} />

<style>
	/* ─── Page header ──────────────────────────────────────────── */

	.uv__header {
		margin-bottom: 4px;
	}

	.uv__title {
		margin: 0;

		font-size: 1.5rem;
		text-wrap: balance;
		font-weight: 600;
		letter-spacing: -0.02em;
	}

	.uv__subtitle {
		margin: 4px 0 0;

		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	/* ─── Status ───────────────────────────────────────────────── */

	.uv__status {
		padding: 48px 24px;

		font-size: 0.75rem;
		text-align: center;

		color: var(--fg-mute);
	}

	.uv__status--error {
		color: var(--danger);
	}

	/* ─── Desktop table ────────────────────────────────────────── */

	.uv__table {
		margin: 16px -24px 0;
	}

	.uv__table-head {
		display: grid;
		height: 36px;
		padding: 0 24px;
		align-items: center;

		background: var(--bg-2);
		border-bottom: 1px solid var(--border);

		grid-template-columns: 1fr 1fr 100px;
		gap: 16px;
	}

	.uv__col-label {
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		color: var(--fg-mute);
	}

	.uv__row {
		display: grid;
		min-height: 52px;
		padding: 0 24px;
		align-items: center;

		border-bottom: 1px solid var(--border);

		transition: background 80ms ease;

		grid-template-columns: 1fr 1fr 100px;
		gap: 16px;
	}

	.uv__row:hover {
		background: var(--surface);
	}

	.uv__row-email {
		overflow: hidden;

		font-size: 0.875rem;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg);
	}

	.uv__row-name {
		overflow: hidden;

		font-size: 0.875rem;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg-mute);
	}

	.uv__row-toggle {
		display: flex;
		align-items: center;
	}

	/* ─── Mobile cards ─────────────────────────────────────────── */

	.uv__cards {
		display: none;
		margin: 0 -24px;
		padding: 12px 24px;

		flex-direction: column;
		gap: 8px;
	}

	.uv__card {
		display: flex;
		padding: 12px;
		align-items: center;

		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--r-3);

		gap: 12px;
	}

	.uv__card-info {
		display: flex;
		min-width: 0;

		flex: 1;
		flex-direction: column;
		gap: 2px;
	}

	.uv__card-email {
		overflow: hidden;

		font-size: 0.875rem;
		text-overflow: ellipsis;
		white-space: nowrap;

		color: var(--fg);
	}

	.uv__card-name {
		font-size: 0.75rem;

		color: var(--fg-mute);
	}

	/* ─── Responsive ───────────────────────────────────────────── */

	@media (max-width: 768px) {
		.uv__table {
			display: none;
		}

		.uv__cards {
			display: flex;
		}
	}
</style>
