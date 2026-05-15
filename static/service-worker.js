self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

// No-op fetch handler — required by Chrome to qualify for the install prompt.
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
	const data = parsePushData(event.data);
	const title = data.title || 'Inbox';
	const options = {
		body: data.body || '',
		icon: '/icon-192.png',
		data: { url: data.url || '/inbox' },
	};
	event.waitUntil(self.registration.showNotification(title, options));
});

function parsePushData(raw) {
	if (!raw) return {};
	try {
		return raw.json();
	} catch {
		return { title: 'Inbox', body: raw.text() };
	}
}

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = event.notification.data?.url || '/inbox';
	event.waitUntil(
		(async () => {
			const allClients = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true,
			});
			for (const client of allClients) {
				try {
					const clientUrl = new URL(client.url);
					if (clientUrl.pathname === targetUrl) {
						return client.focus();
					}
				} catch {
					// ignore malformed client URLs
				}
			}
			return self.clients.openWindow(targetUrl);
		})(),
	);
});
