/* MAGNUS — İNTERNETSİZ ÇALIŞMA (25 Eylül).
   ⚠️ Kapsam YALNIZCA magnus/ klasörü. Ashbless'in kökteki sw.js'i bilerek hiçbir şey
   saklamaz (bayat kod 102 kitap kaybettirdi); bu dosya ona dokunamaz, Ashbless
   sayfaları bu işçinin kapsamında değil.
   · Sayfa/kod (html, js, manifest): ÖNCE AĞ — güncelleme varsa hemen gelsin; ağ yoksa kayıt.
   · Resim ve müzik: ÖNCE KAYIT. Müzik ilk çalındığında TAMAMI indirilip saklanır; tarayıcı
     parça parça (Range) isteyince saklanan dosyadan dilim kesilip verilir.
   Değişiklikte SURUM'u artır → eski kayıt silinir. (Müzik/ses HARİÇ: onlar SES_KAYIT'ta, sürümle silinmez.) */
// 2: müzik önbellekte yoksa BEKLETMEDEN ağdan (Gökşin'in telefonunda kesiliyordu)
// 3: kod HER SEFERİNDE sitede tazelenir (no-cache) + NoSleep. ortak.js SURUM_YAZI ile birlikte artır.
// 4: ses karıştırıcı (13 yeni ortam sesi, saat.wav)
// 5: ara sesler seçilince hemen bir kez çalar
// 6: ODA sahnesi (üç sahne)
// 7: ara seslerde yedek çalar (file://), kedi.wav, oda: saat/portre/sehpa
// 8: tuval görünen alana oturur, dikeyde "yan çevir", oda ateşi 144 sn sonra donmuyor
// 9: yan çevir notu 4 sn (dikey serbest, manifest any), orman ay ışığı + geniş fener, oda aydınlık
// 10: oda arka planı KALIN yazı + daha az karanlık (9'daki artış Gökşin'in cihazında fark edilmedi)
// 11: kütüphanede mum TABLODAN (gorsel/mum.png) + üstünde ASCII alev
// 12: oda duvarı koyu sıcak kahve + zemin, Magnus kalın/opak
// 13: odada gorsel/magnus-sandalye.png varsa ASCII Magnus yerine o (Gökşin'in çizimi için hazır yer)
// 14: HERBERT sahnesi (kütüphanenin başka bir günü; tablodan Magnus+fener, Herbert, kâğıtlar) + daktilo sesi
// 15: genel ses + müzik kaydırıcısı (hatırlanır), sahne değişince o sahnenin hazır karışımı
// 16: Herbert'te daktilo sesinin sert anında (ara sıra) kâğıda "imdat" — ortak.js ses zamanını bildirir
// 17: hazır karışıma dokununca "açık ama çalmayan" sesler de başlar (Dune 7 bazen çalmıyordu)
// 18: pomodoroya "Kaç tur?" (boş = sınırsız); son turun odağı bitince durur
// 19: döngü sesi moladan dönüşte dosya sonunda kalmışsa baştan başlar (saat 2. turda susuyordu)
// 20: müzik/ses ayrı kayıtta (SES_KAYIT) → kod güncellenince şarkılar silinip yeniden inmiyor
//     (Gökşin, 12 Ekim: 18 ve 19'dan hemen sonra müzik birkaç saniye susup yeniden başladı)
// 21: tur başında "Okuma vakti · 1 / 2", moladan dönüşte "Okumaya dönme vakti · 2 / 2"; turlar bitince SESSİZ bitiş hâli (▶ hepsini geri getirir)
// 22: ekran kapanıp açılınca yardımcı tuvaller yeniden kurulur (kütüphanede Magnus kayboluyordu); tur numarası mesajın alt satırında
// 23: döngü çalar her başlatmada durumunu sıfırlar + kopya sonuna gelirse diğeri girer (Herbert: bitişten sonra daktilo gelmiyordu)
// 24: üç yeni parça (Ink and Moonlight, Pages Past Midnight, Sunlight on the Shelves) + kapakları
// 25: odada Magnus + sandalye + sehpa 1,3 kat (yer varsa), halı sehpanın altında kesilmiyor, yatayda şömine biraz solda
// 26: oda — kalın pencere çerçevesi + camın üstünde "+" kayıt, sallanan bordo perde + korniş, kedinin oyuncak sepeti
// 27: odada kediye dokununca gözlerini açar, adı belirir (Ayraç); sepette tüylü olta
// 28: oda — hayalet demlik çay döker (çay sesi onunla eş), Şömine başına sayfa + çay sesi, Ayraç'ın gözü başında
// 29: oda — saatin 12'si bir boşluk sağda, kol 12'ye bakınca kısalır; Ayraç uyanınca İKİ virgül-göz yeşil "o" (ağız "4" yerinde), döngüde bir kez göz kırpar + bir kez pembe esner (o→O→o); şimşekte zikzak (1. çakış üst yarı, 2. alt yarı); buhar fincanın üstüne
// 30: oda — cam yeniden gece laciverdi (29'da dolgu yanlışlıkla yorum olmuştu), yağmur şimşekle aynı yönde ve belirgin, camdan süzülen damlalar, saatin 3/9'u içeride
// 31: oda — opak + kayıt, damlalar her bölmede ikişer ve kayıtta kaybolur; çay sesi ~2 sn önce (önceden yüklenir); hava karlıysa (veya ?kar=1) karlı pencere: kar, yığın, sol altta * dolu kardan adam, kırağı, şimşek yok
// 32: karlı pencerede kardan adam: kar biriktirir, silkelenir (kar saçılır), iki kez göz kırpar
const SURUM = "magnus-32";
// "magnus-" ile BAŞLAMAZ → activate'teki eski sürüm temizliği buna dokunmaz. Ses dosyası
// değiştirilirse adını değiştir (ya da bu adı artır), yoksa eski kopya çalmaya devam eder.
const SES_KAYIT = "magnusses-1";
const CEKIRDEK = [
  "./", "index.html", "orman.html", "kutuphane.html", "oda.html", "herbert.html", "ortak.js", "nosleep.min.js", "manifest.webmanifest",
  "gorsel/hayalet.png", "gorsel/hayalet-okuyan.png", "gorsel/mum.png", "ikon-192.png", "ikon-512.png",
  "gorsel/magnus-fener.png", "gorsel/herbert.png", "gorsel/herbert-aura.png", "gorsel/kagitlar.png", "gorsel/kagit-ucan.png",
  ...["Ink_and_Candlelight", "Afternoon_Porch_Light", "Paperback_Afternoon",
      "Rain_Against_Glass", "Sunlight_Through_Leaves", "Tea_and_Grey_Skies",
      "Ink_and_Moonlight", "Pages_Past_Midnight", "Sunlight_on_the_Shelves"].map(a => `muzik/${a}-kapak.jpg`)
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
  if (/\.(mp3|wav)$/.test(yol)) e.respondWith(muzik(e, e.request, url));
  else if (/\.(png|jpg|jpeg)$/.test(yol)) e.respondWith(onceKayit(e.request));
  else e.respondWith(onceAg(e.request));
});
async function onceAg(istek){
  const c = await caches.open(SURUM);
  try {
    /* no-cache: GitHub Pages dosyaları 10 dk "taze" gönderiyor; düz fetch o kopyayı kabul
       ediyordu → deploy sonrası cihaz ESKİ ortak.js'i çalıştırdı (yağmur hâlâ kesiliyordu).
       Şimdi her seferinde siteye soruluyor. (url ile: navigate isteği init'le kopyalanamıyor) */
    const y = await fetch(istek.url, { cache: "no-cache", credentials: "same-origin" });
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
async function muzik(e, istek, url){
  const c = await caches.open(SES_KAYIT);
  const anahtar = url.origin + url.pathname;
  const k = await c.match(anahtar);
  if (!k){
    /* KAYITTA YOK → BEKLETME (magnus-2). Eskiden tüm dosya (3-4 MB) inene kadar ses
       başlamıyordu; dengesiz internette uzun sessizlik, kopunca hiç çalmama. Şimdi istek
       olduğu gibi ağa gidiyor (anında akış), tam dosya ARKADA kaydediliyor. */
    e.waitUntil(fetch(anahtar).then(y => (y.ok && y.status === 200) ? c.put(anahtar, y) : null).catch(() => {}));
    return fetch(istek);
  }
  const aralik = istek.headers.get("range");
  if (!aralik) return k;
  const veri = await k.clone().blob();
  const m = /bytes=(\d*)-(\d*)/.exec(aralik) || [];
  const bas = m[1] ? +m[1] : 0, son = m[2] ? Math.min(+m[2], veri.size - 1) : veri.size - 1;
  return new Response(veri.slice(bas, son + 1), {
    status: 206,
    headers: { "Content-Type": k.headers.get("Content-Type") || "audio/mpeg","Content-Range": `bytes ${bas}-${son}/${veri.size}`,
               "Content-Length": String(son - bas + 1), "Accept-Ranges": "bytes" }
  });
}
