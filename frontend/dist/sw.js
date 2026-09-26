const CACHE='pige360-shell-5ddcd2217c996cd1'; const ASSETS=["/","/index.html","/app.js","/portal.js","/renders.js","/app.css","/vendor/vue-3.5.13.global.prod.js","/apple-touch-icon.png","/assist.css","/diagnostic-client.js","/dossier.css","/favicon.ico","/favicon.svg","/icons/icon-192.png","/icons/icon-512.png","/institution-layout.css","/manifest.webmanifest","/mfa.css","/online.html","/ui-icons.svg","/workspace.css"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pige360-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin)return;
 const publicIdentity=url.pathname==='/manifest.webmanifest'||url.pathname==='/api/v1/institution/identity'||url.pathname==='/api/v1/institution/theme.css'||url.pathname==='/api/v1/institution/icon.png'||url.pathname.startsWith('/api/v1/institution/assets/');
 if(publicIdentity){event.respondWith(caches.open('pige360-public-identity').then(async cache=>{try{const response=await fetch(event.request);if(response.ok){await cache.put(event.request,response.clone());const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-24)).map(key=>cache.delete(key)));}return response;}catch(error){const cached=await cache.match(event.request);if(cached)return cached;throw error;}}));return;}
 if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/health/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(url.pathname==='/online.html'?'/online.html':'/index.html')));return;}
 // Nunca atender uma URL de outro build com bytes deste cache.
 if(ASSETS.includes(url.pathname))event.respondWith((url.searchParams.has('v')&&url.searchParams.get('v')!=='5ddcd2217c996cd1')?fetch(event.request):caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreSearch:true})).then(cached=>cached||fetch(event.request)));
});
