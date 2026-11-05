// Garde l'application disponible hors connexion (les données passent par le cache de Firestore).
// Changer le numéro de version à chaque mise en ligne pour forcer la mise à jour sur les téléphones.
const C="bcv-v23";
const FILES=["./","index.html","css/app.css","firebase-config.js","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","favicon.ico",
  "img/logo-noir.png","img/logo-blanc.png","img/favicon.png","img/qr-adhesion.png",
  "js/outils.js","js/donnees.js","js/rappels.js","js/vues/vitrine.js","js/vues/cours.js","js/vues/chiots.js","js/vues/wiki.js","js/vues/membres.js","js/vues/messages.js","js/vues/compta.js","js/vues/cabane.js","js/app.js",
  "vendor/firebase-app-compat.js","vendor/firebase-auth-compat.js","vendor/firebase-firestore-compat.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
// Réseau d'abord (toujours la dernière version), cache en secours sans connexion.
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;const u=new URL(e.request.url);
  if(u.origin!==location.origin&&u.host!=="fonts.googleapis.com"&&u.host!=="fonts.gstatic.com")return;
  const req=e.request.mode==="navigate"?new Request(e.request.url,{cache:"no-cache",credentials:"same-origin"}):new Request(e.request,{cache:"no-cache"});
  e.respondWith(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request)));
});
// Toucher une notification de rappel ouvre l'app sur l'agenda (et la notification disparaît).
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window"}).then(l=>{const w=l[0];if(w){w.focus();w.navigate&&w.navigate("./#agenda")}else self.clients.openWindow("./#agenda")}));
});
