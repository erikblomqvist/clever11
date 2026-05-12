<script>
	import {
		Info,
		TriangleAlert,
		CircleX,
		CircleCheck,
		MessageSquare,
	} from 'lucide-svelte';

	/**
	 * @type {{
	 *   variant?: 'default' | 'info' | 'warning' | 'error' | 'success',
	 *   title?: string,
	 *   description?: string,
	 *   action?: import('svelte').Snippet,
	 * }}
	 */
	let { variant = 'default', title, description, action } = $props();

	const icons = {
		default: MessageSquare,
		info: Info,
		warning: TriangleAlert,
		error: CircleX,
		success: CircleCheck,
	};

	const Icon = $derived(icons[variant]);
</script>

<div
	class="message message--{variant}"
	role={variant === 'error' ? 'alert' : 'status'}
>
	<span class="message__icon">
		<Icon size={16} strokeWidth={2.25} />
	</span>
	{#if title}
		<p class="message__title">{title}</p>
	{/if}
	{#if description}
		<p class="message__description">{description}</p>
	{/if}
	{#if action}
		<div class="message__action">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.message {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.125rem 0.75rem;

		border-radius: 0.625rem;
		border: 1.5px solid var(--_border);
		padding: 0.75rem 1rem;
		background: var(--_bg);

		font-family: var(--font-family-body);
		text-align: start;

		--_color: var(--grayscale-700);
		--_bg: var(--grayscale-100);
		--_border: var(--grayscale-200);
		--_icon: var(--grayscale-500);
		--_title: var(--grayscale-900);
		--_desc: var(--grayscale-700);
	}

	.message--info {
		--_bg: hsl(206 80% 95%);
		--_border: hsl(206 100% 40%);
		--_icon: hsl(206 100% 40%);
		--_title: hsl(206 90% 22%);
		--_desc: hsl(206 50% 35%);
	}

	.message--warning {
		--_bg: hsl(40 100% 94%);
		--_border: hsl(30 85% 42%);
		--_icon: hsl(30 85% 42%);
		--_title: hsl(28 80% 22%);
		--_desc: hsl(30 55% 35%);
	}

	.message--error {
		--_bg: hsl(0 85% 95%);
		--_border: hsl(356 83% 41%);
		--_icon: hsl(356 83% 41%);
		--_title: hsl(0 70% 25%);
		--_desc: hsl(0 45% 38%);
	}

	.message--success {
		--_bg: hsl(152 55% 93%);
		--border: hsl(162 70% 30%);
		--_icon: hsl(162 70% 30%);
		--_title: hsl(160 60% 18%);
		--_desc: hsl(158 40% 32%);
	}

	.message__icon {
		vertical-align: middle;

		translate: 0 0.125rem;

		color: var(--_icon);
	}

	.message__title {
		grid-column-start: 2;

		margin: 0;

		font-size: 0.875rem;
		font-weight: 500;
		line-height: calc(1.25 / 0.875);
		color: var(--_title);

		& + .message__description {
			grid-row: 2;
		}
	}

	.message__description {
		grid-column-start: 2;

		margin: 0;

		font-size: 0.8125rem;
		line-height: calc(1.25 / 0.875);
		color: var(--_desc);
	}

	.message__action {
		grid-row: 1 / -1;
		grid-column: 3;
	}
</style>
