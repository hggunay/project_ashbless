// ══════════════════════════════════════════════════════════════════════
// HAYALİ DİYARLAR — KEŞİF KAYDI ve ONARIM
// ══════════════════════════════════════════════════════════════════════
// Katalog:     diyarlar-katalog.js  (DIYAR_KATALOG)
// Eşleştirme:  diyar-esleme.js      (diyarBul, acilmasiGerekenDiyarlar)
// Bu dosya:    keşfin Firebase'e yazılması + eksikleri tamamlayan onarım.
//
// ──────────────────────────────────────────────────────────────────────
// VERİ YOLU (K3/K6 deseni)
// ──────────────────────────────────────────────────────────────────────
//   aa-v4/realmEvents/<kullanıcı> = [ {id, diyarId, ts, ...}, ... ]
//
// Kişi başına ayrı yol, KOŞULSUZ yazma. Ortak "diğer alanlar" bloğuna
// girmez → çakışma kontrolüne takılmaz, "SUNUCUYA KAYDEDİLEMEDİ (çakışma…)"
// bandı bu özellik yüzünden hiç çıkmaz. Kimse kimsenin yaprağına yazmaz.
//
// ⚠️ saveDb() ÇAĞIRILMIYOR. 2026-08-11'de reaksiyonlarda görülen hata buydu:
//    saveDb() Firebase'e yalnızca db.books[me]'yi yazar, başkasının kaydına
//    yazılan veri sessizce kaybolurdu. Burada her yazma doğrudan kendi
//    granüler yoluna gidiyor.
//
// ⚠️ Firebase boş diziyi saklamaz — hiç keşfi olmayan kullanıcının düğümü
//    hiç oluşmaz. Okuyan her yer `|| []` ile karşılıyor, sorun değil.
//
// ──────────────────────────────────────────────────────────────────────
// KEŞİF KALICIDIR
// ──────────────────────────────────────────────────────────────────────
// Keşif bir OLAY olarak yazılır, o anki kütüphaneden hesaplanmaz. Kitap
// silinse, "okunmadı"ya alınsa bile diyar kapanmaz — kaydı silen bir kod
// yolu bilerek YOK.
// ══════════════════════════════════════════════════════════════════════

const REALM_EVENTS_PATH = 'aa-v4/realmEvents/';

// ──────────────────────────────────────────────────────────────────────
// OKUMA YARDIMCILARI
// ──────────────────────────────────────────────────────────────────────
function realmEventsOf(user) {
  return (db.realmEvents && db.realmEvents[user]) || [];
}

// Haritanın soracağı asıl soru: bu kişi hangi diyarları keşfetti?
function kesfedilenDiyarIdleri(user) {
  return new Set(realmEventsOf(user).map(e => e.diyarId));
}

// Keşif kaynağı olabilecek her şey: bitmiş kitaplar + okunmuş hikâyeler.
// Hikâye kaydı da title+author taşıdığı için eşleştirme ikisinde de aynı.
// "Bitti" tanımı UYDURULMUYOR — kitaplarda uygulamanın kanonik readBooksOf()'u,
// hikâyelerde uygulamanın kendi status==='read' değeri kullanılıyor.
function diyarKaynaklari(user) {
  const kitaplar = readBooksOf(user).map(b => ({
    title: b.title,
    author: b.author,
    series: b.series,
    kaynak: 'kitap',
    kaynakId: b.id,
    ts: b.endDate || b.addedAt || null
  }));

  const hikayeler = ((db.stories && db.stories[user]) || [])
    .filter(s => s && s.title && s.status === 'read')
    .map(s => ({
      title: s.title,
      author: s.author,
      series: null,
      kaynak: 'hikaye',
      kaynakId: s.id,
      ts: s.readDate || s.addedAt || null
    }));

  // Eskiden yeniye: aynı diyarı birden fazla kaynak açıyorsa, keşif
  // İLK okunana yazılsın (rozet/harita geçmişi doğru sırada dursun).
  return kitaplar.concat(hikayeler)
    .sort((a, b) => new Date(a.ts || 0) - new Date(b.ts || 0));
}

// ──────────────────────────────────────────────────────────────────────
// YAZMA
// ──────────────────────────────────────────────────────────────────────
async function saveRealmEvents(user) {
  return fbSet(REALM_EVENTS_PATH + user, (db.realmEvents && db.realmEvents[user]) || []);
}

// Tek bir kaynak için keşif kaydı ekler. Zaten keşfedilmişse SESSİZ geçer
// (katalog taslağı kural 2) ve false döner.
async function checkAndAddRealmEvent(kaynakKayit) {
  if (!kaynakKayit || !kaynakKayit.title) return null;

  const bulunan = diyarBul(kaynakKayit, DIYAR_KATALOG);
  if (!bulunan) return null;
  if (bulunan.diyar.gizli) return null;          // gizlenmiş diyar yeni keşfe kapalı

  if (!db.realmEvents) db.realmEvents = {};
  if (!db.realmEvents[me]) db.realmEvents[me] = [];

  // Zaten keşfedilmiş mi? Aynı diyarı açan ikinci kitap sessiz geçer.
  if (db.realmEvents[me].some(e => e.diyarId === bulunan.diyar.id)) return null;

  db.realmEvents[me].push({
    id: Date.now(),
    diyarId: bulunan.diyar.id,
    ts: new Date().toISOString(),
    kaynak: kaynakKayit.kaynak || 'kitap',
    kaynakId: kaynakKayit.kaynakId || kaynakKayit.id || null,
    baslik: kaynakKayit.title,
    yazar: kaynakKayit.author || null,
    sebep: bulunan.sebep
  });

  await saveRealmEvents(me);
  return bulunan.diyar;
}

// ──────────────────────────────────────────────────────────────────────
// ONARIM — "🗺️ Eksik Diyarları Ekle"
// ──────────────────────────────────────────────────────────────────────
// Uygulamadaki "🌍 Eksik Ülkeleri Ekle" (backfillCountryEvents) ile aynı işi
// yapar: kütüphaneden yeniden türetir, YALNIZCA EKSİK OLANI ekler.
//
// Hiçbir kaydı silmez, ezmez, değiştirmez. Var olan keşifler olduğu gibi
// kalır — bu yüzden defalarca çalıştırmak zararsızdır.
//
// Neden baştan yazıldı: katalog büyüdükçe ya da bir takma ad eklendikçe,
// daha önce ıskalanmış kitaplar geçmişe dönük eşleşir. Kullanıcının
// verisine dokunmadan diyarı açmanın yolu budur.
function backfillRealmEvents(sessiz) {
  if (!db.books || !db.books[me]) return 0;
  if (!db.realmEvents) db.realmEvents = {};
  if (!db.realmEvents[me]) db.realmEvents[me] = [];

  const mevcut = new Set(db.realmEvents[me].map(e => e.diyarId));
  const kaynaklar = diyarKaynaklari(me);
  const eklenecek = acilmasiGerekenDiyarlar(kaynaklar, DIYAR_KATALOG)
    .filter(a => !mevcut.has(a.diyarId));

  if (!eklenecek.length) {
    if (!sessiz) notify('🗺️ Hayali diyarlar', 'Eklenecek yeni diyar bulunamadı.');
    return 0;
  }

  let sayac = 0;
  for (const a of eklenecek) {
    db.realmEvents[me].push({
      id: Date.now() + sayac,
      diyarId: a.diyarId,
      // Kitabın kendi tarihi kullanılıyor ki keşif geçmişte doğru yere otursun.
      ts: a.kitap.ts || new Date().toISOString(),
      kaynak: a.kitap.kaynak || 'kitap',
      kaynakId: a.kitap.kaynakId || null,
      baslik: a.kitap.title,
      yazar: a.kitap.author || null,
      sebep: a.sebep,
      onarim: true          // sonradan tamamlandığı belli olsun
    });
    sayac++;
  }

  db.realmEvents[me].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  saveRealmEvents(me);

  if (!sessiz) {
    notify('🗺️ Eksik diyarlar eklendi', sayac + ' diyar haritana eklendi.');
  }
  return sayac;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REALM_EVENTS_PATH, realmEventsOf, kesfedilenDiyarIdleri,
    diyarKaynaklari, saveRealmEvents, checkAndAddRealmEvent, backfillRealmEvents
  };
}
