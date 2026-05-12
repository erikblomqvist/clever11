# 0002: Deepened Game Logic with Adapter Pattern

We moved the core game logic from a flat state object and disconnected utility functions into a class-based "Deep Module" (`Game` in `src/lib/game.svelte.js`) with an explicit persistence seam (`GamePersistenceAdapter` in `src/lib/gameAdapter.js`). This decision concentrates state and behavior in one place (improving locality) and hides complex Supabase interactions behind a small, behavioral interface (providing leverage and a clean testing surface).

## Status

Accepted

## Consequences

- **Testability**: The `Game` class can now be tested in isolation by providing a mock adapter, without requiring a Supabase connection or global mocks.
- **Complexity Management**: Views now interact with a higher-level API (e.g., `game.revealBlob()`) rather than orchestrating multiple state updates and persistence calls manually.
- **Indirection**: Adding a new persistence feature now requires updating both the adapter interface and its implementation, but this cost is offset by the clarity of the resulting seam.
