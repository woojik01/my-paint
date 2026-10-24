const PREFIX='my-paint:'+self.registration.scope+':';
const VERSION=PREFIX+'v7';
const ASSETS=['./','./index.html','./app/style.css','./app/tokens.css','./app/main.js','./app/model.js','./app/storage.js','./app/formats.js','./app/binary.js','./app/ui.js','./app/preferences.js','./app/layers.js','./app/brush.js','./app/geometry.js','./app/encode-worker.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS))));
// Updates wait for existing clients to close; edits are never interrupted by skipWaiting.
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==VERSION)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith((async()=>{const cache=await caches.open(VERSION),saved=await cache.match(e.request,{ignoreSearch:true});if(saved)return saved;try{return await fetch(e.request);}catch(error){if(e.request.mode==='navigate')return cache.match('./index.html');throw error;}})());});
self.addEventListener('message',e=>{if(e.data?.type==='OFFLINE_READY')e.waitUntil((async()=>{const c=await caches.open(VERSION),ready=(await Promise.all(ASSETS.map(a=>c.match(a)))).every(Boolean);e.ports[0]?.postMessage({ready});})());});
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')e.waitUntil(self.skipWaiting());});
self.addEventListener('notificationclick',e=>{if(e.notification.data?.type!=='update')return;e.notification.close();e.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows[0];if(client){await client.focus();client.postMessage({type:'APPLY_UPDATE'});}else await self.clients.openWindow(self.registration.scope+'?applyUpdate=1');})());});
