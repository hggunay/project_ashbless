/* ══════════════════════════════════════════════════════════════════════
   SERVİS İŞÇİSİ — YALNIZCA "UYGULAMA OLARAK YÜKLENEBİLME" İÇİN (2026-09-19)
   ══════════════════════════════════════════════════════════════════════
   Gökşin bilgisayara yükleyince uygulama ayrı pencerede değil sıradan bir
   sekmede açıldı. Ölçüldü: manifest, ikonlar ve başlangıç adresi doğruydu ama
   tarayıcı "yüklenebilir" sinyalini (beforeinstallprompt) hiç vermiyordu.
   Eksik olan tek şart buydu: Chrome, bir siteyi uygulama olarak yüklemek için
   `fetch` olayını dinleyen bir servis işçisi arıyor.

   ⚠️⚠️ BU DOSYA HİÇBİR ŞEYİ ÖNBELLEĞE ALMAZ — VE ALMAMALI.
   Sıradan bir servis işçisi dosyaları saklar; o zaman deploy edilen yeni kod
   cihazda ESKİ kalır. Bu projede bunun bedeli ağır: bayat kod 2026-08-22'de
   102 kitabın kaybına yol açan sınıftan bir hata. Burada `fetch` dinleniyor
   ama `respondWith` ÇAĞRILMIYOR; istek olduğu gibi ağa gidiyor. Yani davranış
   servis işçisi yokmuş gibi, tek farkı tarayıcının artık yüklemeye izin vermesi.

   Buraya önbellekleme eklemek istenirse: önce `?s=` sürüm damgası düzeniyle
   nasıl birleşeceğine karar verilmeli (bkz. index.html'deki script etiketleri).
   ══════════════════════════════════════════════════════════════════════ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* bilerek boş: istek ağa gidiyor */ });
