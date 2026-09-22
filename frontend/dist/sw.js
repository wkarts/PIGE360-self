const CACHE='pige360-shell-f538488daa7ff3be'; const ASSETS=["/","/index.html","/app.js","/portal.js","/renders.js","/app.css","/vendor/vue-3.5.13.global.prod.js","/apple-touch-icon.png","/branding/pige360/logo-horizontal.png","/branding/pige360/logo-horizontal.svg","/branding/pige360/logo-stacked.png","/branding/pige360/symbol.png","/branding/pige360/symbol.svg","/branding/pige360/tokens.css","/branding/pige360/tokens.json","/favicon.ico","/favicon.svg","/icons/icon-192.png","/icons/icon-512.png","/manifest.webmanifest","/online.html"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pige360-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/health/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(url.pathname==='/online.html'?'/online.html':'/index.html')));return;}
 if(ASSETS.includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
