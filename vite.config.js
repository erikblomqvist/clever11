import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	envPrefix: ['VITE_', 'CLEVER11_'],
	build: {
		chunkSizeWarningLimit: 600,
	},
});
