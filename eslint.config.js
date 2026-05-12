import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
		rules: {
			'svelte/no-navigation-without-resolve': 'off',
			'no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
	{
		files: ['api/**/*.js', 'scripts/**/*.js', 'utilities/**/*.js'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		ignores: [
			'dist/',
			'node_modules/',
			'.claude/',
			'.svelte-kit/',
			'.vercel/',
		],
	},
];
