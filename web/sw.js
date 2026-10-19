/* Service worker: mở nhanh + chạy offline. Mạng trước (luôn lấy bản mới nhất), mất mạng thì dùng bản đã lưu. */
importScripts('js/version.js');/* đổi số trong version.js => trình duyệt coi sw.js là mới => tự cập nhật */
const CACHE='qr-manager-'+self.APP_VERSION;
const FILES=['./','index.html','css/qr-manager.css','js/qr-manager.js','js/version.js','js/native-shim.js','js/jsqr.min.js','js/zxing.min.js','js/quet-ma.js','js/i18n.js','js/settings.js','manifest.webmanifest','privacy.html','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(m=>m||caches.match('index.html'))));
});
