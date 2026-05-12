<script>
	import { supabase } from '$lib/supabase.js';

	/** @type {{ id: string, email: string, name: string, is_admin: boolean }[]} */
	let users = $state([]);
	let loading = $state(true);
	let error = $state('');

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
			alert(err.message);
			return;
		}
		users = users.map((u) =>
			u.id === userId ? { ...u, is_admin: !current } : u,
		);
	}
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<h1 class="admin-page__title">Users</h1>
	</div>
	<p class="admin-hint">
		Users are created automatically when someone signs in via Supabase Auth.
		Toggle admin access here.
	</p>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else if error}
		<p class="admin-form-error">{error}</p>
	{:else if users.length === 0}
		<p class="admin-hint">No users yet.</p>
	{:else}
		<table class="admin-table">
			<thead>
				<tr>
					<th>Email</th>
					<th>Name</th>
					<th>Admin</th>
				</tr>
			</thead>
			<tbody>
				{#each users as user (user.id)}
					<tr>
						<td>{user.email}</td>
						<td>{user.name}</td>
						<td>
							<button
								class="admin-toggle"
								class:admin-toggle--on={user.is_admin}
								type="button"
								onclick={() =>
									toggleAdmin(user.id, user.is_admin)}
							>
								{user.is_admin ? 'Yes' : 'No'}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
