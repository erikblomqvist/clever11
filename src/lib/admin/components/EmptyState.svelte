<script>
	let { icon, title, body = '', children } = $props();
</script>

<div class="empty-state">
	<div class="empty-state__icon">
		{@render icon()}
	</div>
	<div class="empty-state__title">{title}</div>
	{#if body}
		<div class="empty-state__body">{body}</div>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		align-items: center;
		padding: 60px 24px;

		text-align: center;

		flex-direction: column;
		gap: 12px;
	}

	.empty-state__icon {
		display: grid;
		width: 44px;
		height: 44px;

		place-items: center;

		color: var(--fg-faint);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--r-2);
	}

	.empty-state__title {
		font-size: 15px;
		font-weight: 500;
	}

	.empty-state__body {
		max-width: 360px;

		font-size: 13px;
		line-height: 1.55;

		color: var(--fg-mute);
	}
</style>
