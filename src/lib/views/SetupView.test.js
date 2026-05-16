import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

vi.mock('svelte-i18n', () => ({
	_: {
		subscribe: (fn) => {
			fn((key) => key);
			return () => {};
		},
	},
}));

vi.mock('$lib/supabase.js', () => ({ supabase: null }));

import SetupView from './SetupView.svelte';

function continueButton() {
	return screen.getByText('setup.continue').closest('button');
}

function addButton() {
	return screen.getAllByLabelText('setup.add_player_aria').at(-1);
}

function nameInput() {
	const inputs = screen.getAllByPlaceholderText(
		'setup.player_name_placeholder',
	);
	return inputs.at(-1);
}

async function typeName(name) {
	const input = nameInput();
	await fireEvent.input(input, { target: { value: name } });
}

async function addPlayerViaButton(name) {
	await typeName(name);
	await fireEvent.click(addButton());
}

describe('SetupView — add-row auto-commit', () => {
	afterEach(() => cleanup());

	const defaults = {
		oninit: () => {},
		onback: () => {},
	};

	it('enables Continue with 1 confirmed + valid add row', async () => {
		render(SetupView, { props: defaults });

		await addPlayerViaButton('Alice');
		expect(continueButton().disabled).toBe(true);

		await typeName('Bob');
		expect(continueButton().disabled).toBe(false);
	});

	it('keeps Continue disabled with 0 confirmed + valid add row', async () => {
		render(SetupView, { props: defaults });

		await typeName('Alice');
		expect(continueButton().disabled).toBe(true);
	});

	it('disables + button at 7 confirmed + valid add row, Continue enabled', async () => {
		render(SetupView, { props: defaults });

		for (const name of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']) {
			await addPlayerViaButton(name);
		}

		await typeName('P8');
		expect(addButton().disabled).toBe(true);
		expect(continueButton().disabled).toBe(false);
	});

	it('auto-commits add row player when Continue is pressed', async () => {
		render(SetupView, { props: defaults });

		await addPlayerViaButton('Alice');
		await typeName('Bob');
		await fireEvent.click(continueButton());

		expect(screen.getByText('1 / 2')).toBeTruthy();
	});

	it('does not add phantom player when add row is empty', async () => {
		render(SetupView, { props: defaults });

		await addPlayerViaButton('Alice');
		await addPlayerViaButton('Bob');
		await fireEvent.click(continueButton());

		expect(screen.getByText('1 / 2')).toBeTruthy();
	});
});
