// Minimal stub. Push handling lands in a later issue (see #33).
self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

// No-op fetch handler — required by Chrome to qualify for the install prompt.
self.addEventListener('fetch', () => {});
