importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

if (workbox) {
	console.log('Workbox loaded successfully.');
	// Precache core files
	workbox.precaching.precacheAndRoute([
    '/',
    'index.html',
    'favicon.ico'
  ]);
	// As a single page web app, we need to denote that all the individual notepad permalinks are not unique pages and should route to the root index.php
	// workbox.routing.registerNavigationRoute(
	// 	workbox.precaching.getCacheKeyForURL('/index.php'), {
	// 	whitelist: [
	// 		new RegExp('^/np/'),
	// 		new RegExp('^/local/')
	// 	],
	// 	blacklist: [
	// 		new RegExp('^/json/'),
	// 		new RegExp('/about'),
	// 		new RegExp('/credits'),
	// 		new RegExp('/contact'),
	// 		new RegExp('/404')
	// 	]
	// });
	// Cache all JSON files
	workbox.routing.registerRoute(
		new RegExp('.*\.json'),
		new workbox.strategies.StaleWhileRevalidate({
			cacheName: 'json',
		})
	);
	// Cache all JavaScript files Network First
	workbox.routing.registerRoute(
		new RegExp('.*\.js'),
		new workbox.strategies.StaleWhileRevalidate({
			cacheName: 'javascript',
		})
	);
	// Cache all CSS files
	workbox.routing.registerRoute(
		new RegExp('.*\.css'),
		new workbox.strategies.StaleWhileRevalidate({
			cacheName: 'css',
		})
	);

	// Cache all images
	workbox.routing.registerRoute(
		/\.(?:png|gif|jpg|jpeg|svg)$/,
		new workbox.strategies.CacheFirst({
			cacheName: 'images',
			plugins: [
				new workbox.expiration.Plugin({
					maxEntries: 60,
					maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
				}),
			],
		})
	);
} else {
	console.log('Workbox failed to load.');
}