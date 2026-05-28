<script>
	let { compact = false } = $props();
</script>

<div class="logo">
	<div class="logo__badge mono">11</div>
	<div class="logo__text">
		<span class="logo__title">Clever 11</span>
		{#if !compact}
			<span class="logo__subtitle">Admin</span>
		{/if}
	</div>
</div>

<style>
	.logo {
		display: flex;
		align-items: center;

		gap: 10px;
	}

	.logo__badge {
		display: grid;
		width: 24px;
		height: 24px;

		font-size: 12px;
		font-weight: 700;
		letter-spacing: -0.04em;

		color: var(--accent-fg);
		background: var(--accent);
		border-radius: 5px;

		place-items: center;
	}

	.logo__text {
		display: flex;
		line-height: 1.1;

		flex-direction: column;
	}

	.logo__title {
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}

	.logo__subtitle {
		font-size: 11px;

		color: var(--fg-mute);
	}
</style>
