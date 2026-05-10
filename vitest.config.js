import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.{js,ts}'],
		environment: 'happy-dom',
	},
	resolve: {
		conditions: ['browser'],
	},
});
