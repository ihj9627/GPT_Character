/* World Archive PWA service worker. */
"use strict";

const CACHE_PREFIX = "world-archive-pwa";
const CACHE_NAME = `${CACHE_PREFIX}-orientation-lock-20260625-01`;
const APP_SHELL_URLS = [
  "./",
  "./world.html",
  "./world.css?v=worldcup-winner-button-style-20260625-01",
  "./world.js?v=orientation-lock-20260625-01",
  "./characters.js?v=world-genre-character-20260625-01",
  "./story-data.js?v=identity-short-60-20260625-01",
  "./story-taxonomy.js?v=world-genre-character-20260625-01",
  "./generator-data.js?v=generator-outerwear-20260625-01",
  "./manifest.webmanifest?v=orientation-lock-20260625-01",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./tools/world-character-upload-template.xlsx"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isRuntimeAsset(url) {
  return (
    url.pathname.includes("/assets/") ||
    url.pathname.includes("/story/") ||
    url.pathname.endsWith(".md") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".xlsx")
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return cache.match("./world.html");
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isRuntimeAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
