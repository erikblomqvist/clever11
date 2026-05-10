# ADR 0001: SvelteKit Migration and SSR Strategy

## Status
Accepted

## Context
The project was originally built as a multi-page Svelte 5 Single Page Application (SPA) using Vite. While functional, this architecture lacked standard routing, server-side data fetching, and SEO optimizations. As the project grew, the manual management of routing (hashes and manual history API calls) became complex.

## Decision
We migrated the project to SvelteKit to leverage its unified framework, file-based routing, and built-in server capabilities.

### Rendering Strategy
1.  **SSR by Default:** We enabled Server-Side Rendering (SSR) for the landing pages and the Admin dashboard. This improves initial load performance and SEO.
2.  **CSR for Game Routes:** We explicitly disabled SSR (`export const ssr = false;`) for the `/game/[code]` routes.
3.  **Supabase SSR:** We adopted `@supabase/ssr` to manage authentication and data fetching on both the server and client.

## Rationale

### Why SvelteKit?
SvelteKit provides a standard way to handle routing, data loading, and server-side logic that is idiomatic to the Svelte ecosystem. It reduces boilerplate code significantly compared to the manual SPA approach.

### Why Disable SSR for Game Routes?
The game logic relies heavily on a global `$state` singleton (`src/lib/game.svelte.js`). In an SSR environment, global state can leak between concurrent user requests on the server. Additionally, the game routes use browser-specific APIs (like `screen.orientation.lock` and `document.startViewTransition`) that are not available on the server. 

By disabling SSR specifically for these routes, we:
- Avoid a massive and risky refactor of the core game state to be request-scoped.
- Prevent "window is not defined" errors during server rendering.
- Maintain the simplicity of the current game engine while still gaining the benefits of SvelteKit for the rest of the application.

### Why @supabase/ssr?
Standardizing on `@supabase/ssr` allows us to securely fetch data in SvelteKit `load` functions on the server, while keeping the client-side experience seamless via session cookies.

## Consequences

### Positive
- Unified codebase with a single entry point (`src/app.html`).
- Clean, semantic URLs (no more `#/questions`).
- Better performance and SEO for public-facing pages.
- Standardized API routes within `src/routes/api`.

### Negative/Neutral
- Game routes still require a client-side JS load before content appears (same as the previous SPA).
- Developers must be mindful of the SSR/CSR split when adding new global state.
- Some additional complexity in managing Supabase clients for both environments.
