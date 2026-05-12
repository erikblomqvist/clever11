import { createBrowserClient } from '@supabase/ssr';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Shared Supabase client instance.
 *
 * Note: In SvelteKit routes (+page.svelte, +layout.svelte), you should
 * prefer using the supabase client provided in the 'data' prop.
 */
export const supabase = url && key ? createBrowserClient(url, key) : null;
