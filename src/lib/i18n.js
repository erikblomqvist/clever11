import { register, init, getLocaleFromNavigator } from 'svelte-i18n';
import { browser } from '$app/environment';

const LOCALES = ['en', 'sv', 'no'];
const STORAGE_KEY = 'clever11_locale';

register('en', () => import('../i18n/en.json'));
register('sv', () => import('../i18n/sv.json'));
register('no', () => import('../i18n/no.json'));

function resolveInitialLocale() {
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && LOCALES.includes(stored)) return stored;
		const nav = getLocaleFromNavigator() ?? 'en';
		if (nav.startsWith('sv')) return 'sv';
		if (nav.startsWith('nb') || nav.startsWith('no') || nav.startsWith('nn')) return 'no';
	}
	return 'en';
}

export function setupI18n() {
	return init({
		fallbackLocale: 'en',
		initialLocale: resolveInitialLocale(),
	});
}

export function setLocale(locale) {
	if (!LOCALES.includes(locale)) return;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, locale);
	}
	init({ fallbackLocale: 'en', initialLocale: locale });
}

export { LOCALES };
