import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AnswerDialog from './AnswerDialog.svelte';

// Mock svelte-i18n
vi.mock('svelte-i18n', () => ({
	_: {
		subscribe: (fn) => {
			fn((key) => key);
			return () => {};
		},
	},
}));

describe('AnswerDialog', () => {
	it('shows label when usesImageOptions is false', () => {
		render(AnswerDialog, {
			props: {
				open: true,
				blobLabel: 'Label 1',
				correctAnswer: 'Correct',
				questionType: 'standard',
				usesImageOptions: false,
				onresult: () => {},
			},
		});

		expect(screen.queryByText('Label 1')).toBeTruthy();
	});

	it('hides label and shows image when usesImageOptions is true', () => {
		render(AnswerDialog, {
			props: {
				open: true,
				blobLabel: 'Label 2',
				correctAnswer: 'Correct',
				questionType: 'standard',
				usesImageOptions: true,
				optionImageUrl: 'test-image.jpg',
				onresult: () => {},
			},
		});

		expect(screen.queryByText('Label 2')).toBeNull();
		const img = screen.getByRole('img');
		expect(img).toBeTruthy();
		expect(img.getAttribute('src')).toBe('test-image.jpg');
		expect(img.getAttribute('alt')).toBe('Label 2');
	});
});
