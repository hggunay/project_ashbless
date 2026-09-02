// ══════════════════════════════════════════════════════════════════════
// HAYALİ DİYARLAR — EŞLEŞTİRME
// ══════════════════════════════════════════════════════════════════════
// "Bu kitap hangi diyarı açar?" sorusunun cevabı. Saf fonksiyonlar —
// hiçbir yere yazmaz, Firebase'e dokunmaz, ekranı değiştirmez.
// Katalog: diyarlar-katalog.js
// ══════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
// SADELEŞTİRME
// ──────────────────────────────────────────────────────────────────────
// "Dune Sapkinlari" ile "Dune Sapkınları" aynı sayılsın diye.
//
// ⚠️ TÜRKÇE TUZAĞI: 'I' harfi Türkçe kuralla 'ı'ya dönerdi ve King'in "IT"i
// "it" ile eşleşmezdi. Bu yüzden JS'in kendi toLowerCase'i (I→i) kullanılıp
// ardından 'ı' → 'i' katlanıyor. Sonuçta I, İ, ı, i hepsi 'i' oluyor.
function dnorm(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()                          // I→i, İ→i̇ (birleşik nokta kalır)
    .normalize('NFD')                       // ü→u+¨, ç→c+¸, ğ→g+˘ ...
    .replace(/[̀-ͯ]/g, '')        // ayrılan işaretleri at
    .replace(/ı/g, 'i')                     // 'ı'nın NFD karşılığı yok, elle
    .replace(/['’‘`´]/g, '')                // kesme işareti SİLİNİR, boşluğa dönmez:
                                            // "Anubis'in" == "Anubisin" olsun diye
    .replace(/[^a-z0-9]+/g, ' ')            // kalan noktalama → boşluk
    .trim()
    .replace(/\s+/g, ' ');
}

// ──────────────────────────────────────────────────────────────────────
// YAZAR EŞLEŞMESİ
// ──────────────────────────────────────────────────────────────────────
// Tam eşleşme, ya da katalogdaki yazarın SOYADI kitabın yazar alanında
// geçiyorsa kabul. Böylece "J.R.R. Tolkien" ile "John Ronald Reuel Tolkien"
// ve "Tolkien" aynı sayılır.
//
// ⚠️ Soyadı eşleşmesi tek başına yanlış pozitif üretebilir (ör. 'Herbert'
// hem Frank Herbert hem Herbert George Wells'te geçer). Bu yüzden
// baslikIcerir ve kitaplar tetikleyicilerinde yazar TEK BAŞINA yetmez —
// başlık koşulu da tutmak zorundadır. Yalnız `yazarlar` tetikleyicisinde
// yazar tek başına yeter, o yüzden oraya yalnızca tüm eserleri aynı
// dünyada geçen yazarlar yazılır.
function yazarUyar(kitabinYazari, katalogYazari) {
  const a = dnorm(kitabinYazari);
  const b = dnorm(katalogYazari);
  if (!a || !b) return false;
  if (a === b) return true;

  const bParcalar = b.split(' ');
  const soyad = bParcalar[bParcalar.length - 1];
  if (!soyad || soyad.length < 3) return false;   // "j", "r" gibi baş harfler soyad sayılmaz

  return a.split(' ').indexOf(soyad) > -1;
}

// Başlık eşleşmesi: ana başlık + takma adların hepsi denenir.
function baslikUyar(kitabinBasligi, katalogKaydi) {
  const t = dnorm(kitabinBasligi);
  if (!t) return false;
  const adaylar = [katalogKaydi.baslik].concat(katalogKaydi.takmaAdlar || []);
  return adaylar.some(a => dnorm(a) === t);
}

// ──────────────────────────────────────────────────────────────────────
// ANA FONKSİYON
// ──────────────────────────────────────────────────────────────────────
// Bir kitabın açtığı diyarı döndürür (katalog kaydı), yoksa null.
// Hangi tetikleyicinin tuttuğunu da söyler — hata ayıklamada ve
// "bu diyarı hangi kitap açtı" panelinde işe yarar.
function diyarBul(kitap, katalog) {
  if (!kitap || !kitap.title) return null;

  for (const diyar of katalog) {
    const t = diyar.tetikleyiciler || {};

    // 0) haric — bu diyarı AÇMAYACAK kitaplar. Geniş bir tetikleyicinin
    //    (yazarlar / baslikIcerir) yanlış yakaladığı kitapları tek tek eler.
    //    Sırası önemli: diğer dördünden ÖNCE bakılır ve tutarsa bu diyar
    //    tamamen atlanır — kitap başka bir diyara düşebilir.
    //    Gerekçe: yazar eşleşmesi SOYADA bakıyor, yani "Frank Herbert"
    //    kataloğu "Brian Herbert"i de yakalıyordu; ayrıca Tolkien ve Baum'un
    //    kendi dünyaları dışında kitapları var. (02.09.2026)
    if (t.haric && t.haric.some(k => baslikUyar(kitap.title, k))) continue;

    // 1) yazarlar — bu yazarın her kitabı
    if (t.yazarlar && t.yazarlar.some(y => yazarUyar(kitap.author, y))) {
      return { diyar, sebep: 'yazar' };
    }

    // 2) baslikIcerir — yazar tutuyorsa VE başlıkta ifade geçiyorsa
    if (t.baslikIcerir && t.baslikIcerir.some(k =>
        yazarUyar(kitap.author, k.yazar) &&
        dnorm(kitap.title).indexOf(dnorm(k.baslikIcerir)) > -1)) {
      return { diyar, sebep: 'baslik-icerir' };
    }

    // 3) kitaplar — başlık + yazar
    if (t.kitaplar && t.kitaplar.some(k =>
        baslikUyar(kitap.title, k) && yazarUyar(kitap.author, k.yazar))) {
      return { diyar, sebep: 'kitap' };
    }

    // 4) seriler — sadece ek ağ
    if (t.seriler && kitap.series &&
        t.seriler.some(s => dnorm(s) === dnorm(kitap.series))) {
      return { diyar, sebep: 'seri' };
    }
  }

  return null;
}

// Bir kullanıcının bitirdiği kitaplardan açılması GEREKEN diyarların
// id listesi. Onarım fonksiyonu ve ilk keşif hesabı bunu kullanır.
// bitmisKitaplar: index.html'deki readBooksOf(kullanici) çıktısı.
function acilmasiGerekenDiyarlar(bitmisKitaplar, katalog) {
  const sonuc = [];
  const gorulen = new Set();
  for (const kitap of bitmisKitaplar) {
    const bulunan = diyarBul(kitap, katalog);
    if (!bulunan) continue;
    if (bulunan.diyar.gizli) continue;          // gizlenmiş diyar yeni keşfe kapalı
    if (gorulen.has(bulunan.diyar.id)) continue; // aynı diyarı açan ikinci kitap: sessiz
    gorulen.add(bulunan.diyar.id);
    sonuc.push({ diyarId: bulunan.diyar.id, kitap, sebep: bulunan.sebep });
  }
  return sonuc;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { dnorm, yazarUyar, baslikUyar, diyarBul, acilmasiGerekenDiyarlar };
}
