"use strict"
// self.addEventListener("activate", (event) => {
//   // Clean up old caches
// });

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('my-cache').then((cache) => {
      return cache.addAll([
        'index.html',
        'styles.css',
        'main.js',
        'tasks.js',
        'resources/tasks.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});