/* MAGNUS — İNTERNETSİZ ÇALIŞMA (25 Eylül).
   ⚠️ Kapsam YALNIZCA magnus/ klasörü. Ashbless'in kökteki sw.js'i bilerek hiçbir şey
   saklamaz (bayat kod 102 kitap kaybettirdi); bu dosya ona dokunamaz, Ashbless
   sayfaları bu işçinin kapsamında değil.
   · Sayfa/kod (html, js, manifest): ÖNCE AĞ — güncelleme varsa hemen gelsin; ağ yoksa kayıt.
   · Resim ve müzik: ÖNCE KAYIT. Müzik ilk çalındığında TAMAMI indirilip saklanır; tarayıcı
     parça parça (Range) isteyince saklanan dosyadan dilim kesilip verilir.
   Değişiklikte SURUM'u artır → eski kayıt silinir. */
const SURUM = "magnus-1";
const CEKIRDEK = [
  "./", "index.html", "orman.html", "kutuphane.html", "ortak.js", "manifest.webmanifest",
  "gorsel/hayalet.png", "gorsel/hayalet-okuyan.png", "ikon-192.png", "ikon-512.png",
  ...["Ink_and_Candlelight", "Afternoon_Porch_Light", "Paperback_Afternoon",
      "Rain_Against_Glass", "Sunlight_Through_Leaves", "Tea_and_Grey_Skies"].map(a => `muzik/${a}-kapak.jpg`)
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(CEKIRDEK)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(a => a.startsWith("magnus-") && a !== SURUM).map(a => caches.delete(a))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || !url.href.startsWith(self.registration.scope)) return;
  const yol = url.pathname;
  if (yol.endsWith(".mp3")) e.respondWith(muzik(e.request, url));
  else if (/\.(png|jpg|jpeg)$/.test(yol)) e.respondWith(onceKayit(e.request));
  else e.respondWith(onceAg(e.request));
});
async function onceAg(istek){
  const c = await caches.open(SURUM);
  try {
    const y = await fetch(istek);
    if (y.ok) c.put(istek, y.clone());
    return y;
  } catch (err) {
    return (await c.match(istek, { ignoreSearch: true })) || Response.error();
  }
}
async function onceKayit(istek){
  const c = await caches.open(SURUM);
  const k = await c.match(istek, { ignoreSearch: true });
  if (k) return k;
  const y = await fetch(istek);
  if (y.ok) c.put(istek, y.clone());
  return y;
}
async function muzik(istek, url){
  const c = await caches.open(SURUM);
  const anahtar = url.origin + url.pathname;
  let k = await c.match(anahtar);
  if (!k){
    try {
      const y = await fetch(anahtar);                        // Range'siz: dosyanın tamamı
      if (!y.ok) return y;
      await c.put(anahtar, y.clone());
      k = y;
    } catch (err) { return Response.error(); }
  }
  const aralik = istek.headers.get("range");
  if (!aralik) return k;
  const veri = await k.clone().blob();
  const m = /bytes=(\d*)-(\d*)/.exec(aralik) || [];
  const bas = m[1] ? +m[1] : 0, son = m[2] ? Math.min(+m[2], veri.size - 1) : veri.size - 1;
  return new Response(veri.slice(bas, son + 1), {
    status: 206,
    headers: { "Content-Type": "audio/mpeg", "Content-Range": `bytes ${bas}-${son}/${veri.size}`,
               "Content-Length": String(son - bas + 1), "Accept-Ranges": "bytes" }
  });
}
