import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { fireEvent } from '@testing-library/dom';
import AnswerDialog from './AnswerDialog.svelte';

afterEach(() => cleanup());

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

	describe('rank question type', () => {
		it('renders 1-10 button grid with no reveal step', () => {
			render(AnswerDialog, {
				props: {
					open: true,
					blobLabel: 'Rank blob',
					correctAnswer: 7,
					questionType: 'rank',
					onresult: () => {},
				},
			});

			expect(screen.queryByText('answer_dialog.reveal')).toBeNull();

			for (let n = 1; n <= 10; n++) {
				expect(
					screen.getByRole('button', { name: String(n) }),
				).toBeTruthy();
			}
		});

		it('fires onresult(true) when the correct number is clicked', async () => {
			const onresult = vi.fn();
			render(AnswerDialog, {
				props: {
					open: true,
					blobLabel: 'Rank blob',
					correctAnswer: 7,
					questionType: 'rank',
					onresult,
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: '7' }));

			await new Promise((r) => setTimeout(r, 1100));
			expect(onresult).toHaveBeenCalledWith(true);
		});

		it('fires onresult(false) when a non-matching number is clicked', async () => {
			const onresult = vi.fn();
			render(AnswerDialog, {
				props: {
					open: true,
					blobLabel: 'Rank blob',
					correctAnswer: 7,
					questionType: 'rank',
					onresult,
				},
			});

			await fireEvent.click(screen.getByRole('button', { name: '3' }));

			await new Promise((r) => setTimeout(r, 1100));
			expect(onresult).toHaveBeenCalledWith(false);
		});

		it('renders used numbers as disabled and clicks are no-ops', async () => {
			const onresult = vi.fn();
			render(AnswerDialog, {
				props: {
					open: true,
					blobLabel: 'Rank blob',
					correctAnswer: 7,
					questionType: 'rank',
					usedRankAnswers: [2, 5, 9],
					onresult,
				},
			});

			for (const n of [2, 5, 9]) {
				const btn = screen.getByRole('button', { name: String(n) });
				expect(/** @type {HTMLButtonElement} */ (btn).disabled).toBe(
					true,
				);
				await fireEvent.click(btn);
			}

			await new Promise((r) => setTimeout(r, 1100));
			expect(onresult).not.toHaveBeenCalled();

			const available = screen.getByRole('button', { name: '4' });
			expect(/** @type {HTMLButtonElement} */ (available).disabled).toBe(
				false,
			);
		});
	});
});
