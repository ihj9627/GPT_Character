/* Character Archive Mobile PWA service worker.
   Generated for the minimal mobile companion PWA pass on 2026-06-23. */
"use strict";

const CACHE_PREFIX = "character-archive-mobile";
const CACHE_NAME = `${CACHE_PREFIX}-v20260624-02`;
const APP_SHELL_URLS = [
  "./mobile.html",
  "./manifest.webmanifest?v=portrait-lock-01",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./mobile.css?v=scroll-restore-01",
  "./characters.js?v=world-profile-filter-20260623",
  "./story-taxonomy.js?v=world-intro-collapse01",
  "./story-data.js?v=noct-black-coffin-s1-01",
  "./generator-data.js?v=age-ranges-final01",
  "./mobile.js?v=library-tree-restore-01",
  "./story/ashrun/anika/shorts/identity-short.md",
  "./story/ashrun/ariel/shorts/identity-short.md",
  "./story/ashrun/aya/shorts/identity-short.md",
  "./story/ashrun/chloe/shorts/identity-short.md",
  "./story/ashrun/erissaBlackmoon/shorts/identity-short.md",
  "./story/ashrun/gaon/shorts/identity-short.md",
  "./story/ashrun/joy/shorts/identity-short.md",
  "./story/ashrun/niri/shorts/identity-short.md",
  "./story/ashrun/searra/shorts/identity-short.md",
  "./story/ashrun/shard/shorts/identity-short.md",
  "./story/ashrun/zahyra/shorts/identity-short.md",
  "./story/astra/garka/shorts/identity-short.md",
  "./story/astra/nagir/shorts/identity-short.md",
  "./story/astra/rust/shorts/identity-short.md",
  "./story/astra/tanilaEllamin/shorts/identity-short.md",
  "./story/astra/tiska/shorts/identity-short.md",
  "./story/corebelt/ada/shorts/identity-short.md",
  "./story/corebelt/barretha/shorts/identity-short.md",
  "./story/corebelt/elena/shorts/identity-short.md",
  "./story/corebelt/guile/shorts/identity-short.md",
  "./story/corebelt/kymayra/shorts/identity-short.md",
  "./story/corebelt/lunaFerrano/shorts/identity-short.md",
  "./story/corebelt/naia/shorts/identity-short.md",
  "./story/corebelt/nina/shorts/identity-short.md",
  "./story/corebelt/nova/shorts/identity-short.md",
  "./story/corebelt/othurcu/shorts/identity-short.md",
  "./story/corebelt/poko/shorts/identity-short.md",
  "./story/corebelt/rabi/shorts/identity-short.md",
  "./story/corebelt/raina/shorts/identity-short.md",
  "./story/corebelt/rona/shorts/identity-short.md",
  "./story/erebos/dreadna/shorts/identity-short.md",
  "./story/erebos/essy/shorts/identity-short.md",
  "./story/erebos/theira/shorts/identity-short.md",
  "./story/gatefall/lize/shorts/identity-short.md",
  "./story/gatefall/officina/shorts/identity-short.md",
  "./story/gatefall/rhanis/shorts/identity-short.md",
  "./story/gatefall/rowina/shorts/identity-short.md",
  "./story/gatefall/tachyon/shorts/identity-short.md",
  "./story/gatefall/wulin/shorts/identity-short.md",
  "./story/gatefall/yslra/shorts/identity-short.md",
  "./story/gatefall/zella/shorts/identity-short.md",
  "./story/lumia/floraDaisybay/shorts/identity-short.md",
  "./story/lumia/kristenCutton/shorts/identity-short.md",
  "./story/lumia/logan/shorts/identity-short.md",
  "./story/lumia/nive/shorts/identity-short.md",
  "./story/lumia/scar/shorts/identity-short.md",
  "./story/lumia/seoah/shorts/identity-short.md",
  "./story/lumia/vanPalaeon/shorts/identity-short.md",
  "./story/midrain/alice/shorts/identity-short.md",
  "./story/midrain/amy/shorts/identity-short.md",
  "./story/midrain/carmilla/shorts/identity-short.md",
  "./story/midrain/diana/shorts/identity-short.md",
  "./story/midrain/eliana/shorts/identity-short.md",
  "./story/midrain/gloomy/shorts/identity-short.md",
  "./story/midrain/luciel/shorts/identity-short.md",
  "./story/midrain/mindy/shorts/identity-short.md",
  "./story/midrain/misa/shorts/identity-short.md",
  "./story/midrain/roxy/shorts/identity-short.md",
  "./story/midrain/shirayeAilmaris/shorts/identity-short.md",
  "./story/midrain/sia/shorts/identity-short.md",
  "./story/midrain/umbra/shorts/identity-short.md",
  "./story/midrain/vega/shorts/identity-short.md",
  "./story/midrain/xi-xi/shorts/identity-short.md",
  "./story/noct/amelys/shorts/identity-short.md",
  "./story/noct/bianca/shorts/identity-short.md",
  "./story/noct/celina/shorts/identity-short.md",
  "./story/noct/elabiah/shorts/identity-short.md",
  "./story/noct/elysia/shorts/identity-short.md",
  "./story/noct/estrilIllas/shorts/identity-short.md",
  "./story/noct/freya/shorts/identity-short.md",
  "./story/noct/ines/shorts/identity-short.md",
  "./story/noct/lena/shorts/identity-short.md",
  "./story/noct/libra/shorts/identity-short.md",
  "./story/noct/luciaNox/shorts/identity-short.md",
  "./story/noct/luna/shorts/identity-short.md",
  "./story/noct/mibnas/shorts/identity-short.md",
  "./story/noct/moira/shorts/identity-short.md",
  "./story/noct/qeisel/shorts/identity-short.md",
  "./story/noct/scarlett/shorts/identity-short.md",
  "./story/noct/selby/shorts/identity-short.md",
  "./story/noct/serothan/shorts/identity-short.md",
  "./story/noct/siyo/shorts/identity-short.md",
  "./story/noct/sylvia/shorts/identity-short.md",
  "./story/noct/yul/shorts/identity-short.md",
  "./story/saffron-sea/castiella/shorts/identity-short.md",
  "./story/saffron-sea/mia/shorts/identity-short.md",
  "./story/saffron-sea/piffGabriel/shorts/identity-short.md",
  "./story/saffron-sea/serena/shorts/identity-short.md",
  "./story/saffron-sea/tina/shorts/identity-short.md",
  "./story/saffron-sea/vivian/shorts/identity-short.md",
  "./story/yeonmuk/chihwaseon/shorts/identity-short.md",
  "./story/yeonmuk/choa/shorts/identity-short.md",
  "./story/yeonmuk/gaeun/shorts/identity-short.md",
  "./story/yeonmuk/garnet/shorts/identity-short.md",
  "./story/yeonmuk/grace/shorts/identity-short.md",
  "./story/yeonmuk/iris/shorts/identity-short.md",
  "./story/yeonmuk/lia/shorts/identity-short.md",
  "./story/yeonmuk/lianhua/shorts/identity-short.md",
  "./story/yeonmuk/torqa/shorts/identity-short.md",
  "./story/yeonmuk/wubun/shorts/identity-short.md",
  "./story/noct/black-coffin-war/season-1/e01.md",
  "./story/noct/black-coffin-war/season-1/e02.md",
  "./story/noct/black-coffin-war/season-1/e03.md",
  "./story/noct/black-coffin-war/season-1/e04.md",
  "./story/noct/black-coffin-war/season-1/e05.md",
  "./story/noct/black-coffin-war/season-1/e06.md",
  "./story/noct/black-coffin-war/season-1/e07.md",
  "./story/noct/black-coffin-war/season-1/e08.md",
  "./story/noct/black-coffin-war/season-1/e09.md",
  "./story/noct/black-coffin-war/season-1/e10.md",
  "./story/noct/black-coffin-war/season-1/e11.md",
  "./story/noct/black-coffin-war/season-1/e12.md",
  "./story/noct/black-coffin-war/season-1/e13.md",
  "./story/noct/black-coffin-war/season-1/e14.md",
  "./story/noct/black-coffin-war/season-1/e15.md",
  "./story/noct/black-coffin-war/season-1/e16.md",
  "./story/noct/black-coffin-war/season-1/e17.md",
  "./story/noct/black-coffin-war/season-1/e18.md",
  "./story/noct/black-coffin-war/season-1/e19.md",
  "./story/noct/black-coffin-war/season-1/e20.md",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isCacheableSameOriginGet(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin;
}

function cacheSuccessfulResponse(request, response) {
  if (!response || !response.ok || response.type !== "basic") return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (!isCacheableSameOriginGet(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => cacheSuccessfulResponse("./mobile.html", response))
        .catch(() => caches.match("./mobile.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => cacheSuccessfulResponse(request, response))
          .catch(() => caches.match(request));
      })
  );
});
