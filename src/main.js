import '@fontsource/erica-one/latin-400.css';
import '@fontsource/bricolage-grotesque/latin.css';
import '@fontsource/inter/latin.css';
import '@fontsource/nunito/latin.css';
import '@fontsource/sometype-mono/latin.css';

import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';
import { setupI18n } from './lib/i18n.js';

setupI18n().then(() => {
	mount(App, { target: document.getElementById('app') });
});
