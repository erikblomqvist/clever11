<h1 class="home-title" aria-label="Clever 11">Clever<span>11</span></h1>

<style>
	.home-title {
		margin: 0;
		font-family: 'Erica One', sans-serif;
		font-size: clamp(3rem, 10vw, 6rem);
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-shadow: 0 2px 8px hsl(0 0% 0% / 0.2);
		color: var(--palette-white);
	}

	.home-title span {
		--hue: 233;
		
		position: relative;
		z-index: 1;
		isolation: isolate;

		margin-inline-start: 0.3ch;
		
		&::before {
			content: "";
			position: absolute;
			inset: 0;
			inset-block-start: 0.05em;
			inset-inline-start: -0.3em;
			z-index: -1;
			box-sizing: border-box;
			
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
			padding-inline: 0.3ch;
			background-color: hsl(var(--hue) 10% 15%);
			background-image:
				radial-gradient(
					91% 90% at 50% 50%,
					hsl(var(--hue) 10% 20%) 48%,
					hsl(var(--hue) 10% 20% / 0) 50%
				),
				radial-gradient(
					88% 88% at 47% 47%,
					hsl(var(--hue) 10% 85%) 43%,
					hsl(var(--hue) 10% 85% / 0) 50%
				),
				radial-gradient(
					65% 70% at 40% 60%,
					hsl(var(--hue) 10% 20%) 46%,
					hsl(var(--hue) 10% 20% / 0) 50%
				);
		}
	}
</style>
