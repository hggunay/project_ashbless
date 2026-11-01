/* ══════════════════════════════════════════════════════════════════════
   🕯️ KÜTÜPHANECİNİN NOTU (2026-11-01, Gökşin + Kütüphaneci Ali)
   ══════════════════════════════════════════════════════════════════════
   Ana Sayfa'nın en üstünde, herkese görünen tek bir not. Perili kütüphane:
   bir hayalet kütüphaneci üyeleri izliyor ve adlarıyla laf atıyor.

   İki kaynak:
   1) EL YAZISI NOTLAR — `kutuphaneci-notlar.json` (depoda). Claude yazar ve
      YALNIZ bu dosyayı kendisi push edebilir (Gökşin'in 1.11 izni; başka her
      dosya için "gönder" kuralı geçerli). Dosya internette açık olduğu için
      içine ÖZEL BİLGİ YAZILMAZ: kitap adı, duyuru, şaka — o kadar.
      Biçim: [{"tarih":"2026-11-01","bitis":"2026-11-03","metin":"..."}]
      (bitis yoksa notun tarihinden itibaren 2 gün görünür)
   2) FISILTILAR — aşağıdaki kalıplar. Üyelerin KENDİ verisinden (giriş
      yapanların gördüğü db) doldurulur; dışarı hiçbir şey çıkmaz. Claude
      gelmese de pano her gün kendiliğinden yenilenir: "kütüphaneci gitmez".

   Hangi not: günün el yazısı notu varsa o; yoksa günün tarihine göre kalıp
   adaylarından biri (aynı gün herkes aynı notu görür, sayfa yenilense de).
   ✕ YOK — Gökşin: "hep açık olsun".
   Firebase'e hiçbir şey YAZMAZ.
   ══════════════════════════════════════════════════════════════════════ */

const KUTUPHANECI_DOSYA = 'kutuphaneci-notlar.json';
let kutuphaneciElNotlari = null;     // null = henüz okunmadı, [] = yok
let kutuphaneciIstekGitti = false;

function kutGun(d) {   // yerel tarih → 'YYYY-MM-DD'
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}
function kutGunFarki(tarih) {   // 'YYYY-MM-DD' → bugünden kaç gün önce
  if (!tarih) return null;
  const t = new Date(String(tarih).substring(0, 10) + 'T00:00:00');
  if (isNaN(t)) return null;
  return Math.round((new Date(kutGun() + 'T00:00:00') - t) / 86400000);
}
function kutTohum(s) {   // aynı gün → aynı seçim
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function kutuphaneciElNotlariniGetir() {
  if (kutuphaneciIstekGitti) return;
  kutuphaneciIstekGitti = true;
  fetch(KUTUPHANECI_DOSYA + '?t=' + Date.now(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : [])
    .then(j => { kutuphaneciElNotlari = Array.isArray(j) ? j : []; kutuphaneciNotuCiz(); })
    .catch(() => { kutuphaneciElNotlari = []; });
}

// Notlarda adı geçecek üyeler: test hesabı ve gizli profiller hariç,
// son 90 günde bir hareketi olanlar.
function kutUyeler() {
  const users = (typeof db !== 'undefined' && db.users) || {};
  return Object.keys(users).filter(u => {
    if (u === 'deneme' || !users[u] || users[u].publicProfile === false) return false;
    const books = (db.books && db.books[u]) || [];
    return books.some(b => b && [b.startDate, b.endDate, b.addedAt].some(t => {
      const g = kutGunFarki(t); return g !== null && g <= 90;
    }));
  });
}
function kutAd(u) { return escapeHtml((db.users[u] || {}).displayName || u); }
function kutKitap(t) { return '«' + escapeHtml(t) + '»'; }

// Her kalıp, uyuyorsa bir cümle döndürür; uymuyorsa null.
const KUT_KALIPLAR = [
  // Aynı anda birden çok kitap
  u => {
    const ok = (db.books[u] || []).filter(b => b && b.readingStatus === 'reading');
    if (ok.length < 2) return null;
    if (ok.length === 2)
      return `${kutAd(u)} aynı anda hem ${kutKitap(ok[0].title)} hem ${kutKitap(ok[1].title)} okuyor. İki kitap geceleri komodinde yer kavgası ediyor, sesleri ta arşivden duyuluyor 👀`;
    return `${kutAd(u)} aynı anda ${ok.length} kitap okuyor. Raflar endişeli. Ayraçlar sendika kurmayı düşünüyor 👀`;
  },
  // Uzun süredir okunan kitap
  u => {
    const ok = (db.books[u] || []).filter(b => b && b.readingStatus === 'reading' && kutGunFarki(b.startDate) >= 5 && kutGunFarki(b.startDate) <= 60)  // çok eskiyse unutulmuş say, laf atma
      .sort((a, b) => kutGunFarki(b.startDate) - kutGunFarki(a.startDate))[0];
    if (!ok) return null;
    const g = kutGunFarki(ok.startDate);
    return `${kutAd(u)}, ${kutKitap(ok.title)} ${g} gündür komodininde. Kitaplar sabırlıdır, bekler. Ama sayfa kenarlarına ince bir toz konmaya başladı, söylemedi deme 🕸️`;
  },
  // Tsundoku yığını
  u => {
    const ts = (db.books[u] || []).filter(b => b && b.readingStatus === 'wishlist');
    if (ts.length < 5) return null;
    const en = ts.slice().sort((a, b) => String(a.addedAt || '').localeCompare(String(b.addedAt || '')))[0];
    return `${kutAd(u)}, Tsundoku yığınında ${ts.length} kitap var. Geceleri "önce ben!" diye birbirleriyle kavga ettiklerini duyuyorum. En çok bağıran ${kutKitap(en.title)}. En eskisi o.`;
  },
  // Bu ay bitenler
  u => {
    const ay = kutGun().substring(0, 7);
    const n = (db.books[u] || []).filter(b => b && b.endDate && String(b.endDate).startsWith(ay)).length;
    if (n < 2) return null;
    return `${kutAd(u)} bu ay ${n} kitap bitirdi. Raflar alkışladı, ama çok sessizce. Burası kütüphane.`;
  },
  // Son 3 günde biten
  u => {
    const b = (db.books[u] || []).filter(b => b && b.endDate && kutGunFarki(b.endDate) !== null && kutGunFarki(b.endDate) <= 3)
      .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0];
    if (!b) return null;
    return `${kutAd(u)} ${kutKitap(b.title)} kitabını bitirdi. Kapak kapanırken bir iç çekiş duydum. Kitaptan mı geldi, okurundan mı, bilemedim 📖`;
  },
  // Uzun aradan sonra dönen üye: en yeni hareketi son 3 günde, ondan önceki 30+ gün önce
  u => {
    const g = [];
    (db.books[u] || []).forEach(b => b && [b.startDate, b.endDate, b.addedAt].forEach(t => { const x = kutGunFarki(t); if (x !== null && x >= 0) g.push(x); }));
    g.sort((a, b) => a - b);
    if (!g.length || g[0] > 3) return null;
    const onceki = g.find(x => x > g[0]);
    if (onceki === undefined || onceki - g[0] < 30) return null;
    return `Oo, ${kutAd(u)} gelmiş! Sabırla bekliyorduk. Mumlar onun için yeniden yakıldı, koltuğunun tozu alındı 🕯️`;
  },
  // Yarım bırakılan
  u => {
    const b = (db.books[u] || []).filter(b => b && b.readingStatus === 'paused')[0];
    if (!b) return null;
    return `${kutAd(u)}, ${kutKitap(b.title)} hâlâ yarım bıraktığın sayfada açık duruyor. Gece bekçisi olarak söylüyorum: o sayfa seni bekliyor.`;
  },
];

// İki üye arasında: biri bir yazarı okurken öbürünün rafında aynı yazar (ya da
// adında o yazar geçen bir kitap) var mı?
function kutOrtakYazar(uyeler) {
  const out = [];
  uyeler.forEach(u => (db.books[u] || []).filter(b => b && b.readingStatus === 'reading' && b.author).forEach(ok => {
    const yazar = aramaKatla(ok.author);
    if (yazar.length < 4) return;
    uyeler.filter(v => v !== u).forEach(v => {
      const es = (db.books[v] || []).find(b => b && (aramaKatla(b.author) === yazar || aramaKatla(b.title).includes(yazar)));
      if (es) out.push(`${kutAd(u)} ${kutKitap(ok.title)} okuyor. Bir de bakıyorum, ${kutAd(v)} da ${kutKitap(es.title)} kitabını rafına koymuş. ${escapeHtml(ok.author)} bu kütüphaneye iki kapıdan birden girmiş 🚪🚪`);
    });
  }));
  return out;
}

// Kimseye özel olmayan, kütüphanenin kendi sesi. Pano asla boş kalmasın diye.
function kutAmbiyans(uyeler) {
  const tum = [];
  uyeler.forEach(u => (db.books[u] || []).forEach(b => { if (b && b.title) tum.push(b.title); }));
  const r = tum.length ? tum[kutTohum(kutGun() + 'k') % tum.length] : null;
  const L = [
    'Bugün raflar sakin. Yalnız mumun cızırtısı ve bir sayfanın kendi kendine çevrilme sesi...',
    'Dün gece biri okuma salonunda ayraç unutmuş. Sahibi çıkmazsa ben kullanacağım. Hayaletlerin de okuyacak kitabı var.',
    'Kütüphane kuralı 1: Fısıltıyla konuşulur. Kütüphane kuralı 2: Fısıldayan ben olsam bile.',
    'Pencereden ay ışığı vuruyor. Bu ışıkta okunan kitaplar daha iyi hatırlanır derler. Ben uydurdum, ama doğru olabilir.',
  ];
  if (r) {
    L.push(`Bu gece raflar arasında dolaştım ve ${kutKitap(r)} kitabının yerini değiştirdim. Fark eden olursa ödül yok. Sadece ben bilirim 👻`);
    L.push(`${kutKitap(r)} bugün rafından bana göz kırptı. Kitaplar bazen kendilerini hatırlatmak ister.`);
  }
  return L;
}

function kutuphaneciMetni() {
  const bugun = kutGun();
  // 1) El yazısı not
  const el = (kutuphaneciElNotlari || []).filter(n => {
    if (!n || !n.tarih || !n.metin) return false;
    const bitis = n.bitis || kutGun(new Date(new Date(n.tarih + 'T00:00:00').getTime() + 2 * 86400000));
    return n.tarih <= bugun && bugun <= bitis;
  }).sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
  if (el) return { metin: escapeHtml(el.metin), el: true };
  // 2) Fısıltı
  const uyeler = kutUyeler();
  const ozel = [];
  uyeler.forEach(u => KUT_KALIPLAR.forEach(k => { try { const s = k(u); if (s) ozel.push(s); } catch (e) {} }));
  try { ozel.push(...kutOrtakYazar(uyeler)); } catch (e) {}
  // Çoğu gün üyelere laf atılsın; dörtte bir gün kütüphanenin kendi sesi.
  const tohum = kutTohum(bugun);
  const havuz = (ozel.length && tohum % 4 !== 0) ? ozel : kutAmbiyans(uyeler);
  return { metin: havuz[tohum % havuz.length], el: false };
}

/* ✉️ KÜTÜPHANECİYE MEKTUP: üye kendi kaydına yazar (db.users[me].kutuphaneciMektuplari,
   lastFeedVisit ile aynı yol; kural değişikliği gerekmez — herkes kendi users düğümüne yazabiliyor).
   Claude gece yedeğinden okur, sonraki el yazısı notunda cevaplar. Son 5 mektup tutulur. */
function kutMektupAc() {
  const f = document.getElementById('kutMektupForm');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
function kutMektupBirak() {
  const ta = document.getElementById('kutMektupMetin'), bilgi = document.getElementById('kutMektupBilgi');
  const m = (ta && ta.value || '').trim().slice(0, 500);
  if (!m || !me || !db.users[me]) return;
  const L = (db.users[me].kutuphaneciMektuplari || []).slice(-4);
  L.push({ m, ts: Date.now() });
  db.users[me].kutuphaneciMektuplari = L;
  saveDb();
  ta.value = '';
  document.getElementById('kutMektupForm').style.display = 'none';
  bilgi.textContent = 'Mektubun masaya bırakıldı. Kütüphaneci gelince okuyacak 🕯️';
}

function kutuphaneciNotuCiz() {
  const kutu = document.getElementById('kutuphaneciNotu');
  if (!kutu || typeof db === 'undefined' || !db.users) return;
  kutuphaneciElNotlariniGetir();
  const { metin, el } = kutuphaneciMetni();
  if (kutu.dataset.metin === metin) return;   // aynı not → yeniden canlandırma
  kutu.dataset.metin = metin;
  kutu.innerHTML = `
    <div class="kut-baslik"><span class="kut-mum">🕯️</span> ${el ? 'Kütüphanecinin Notu' : 'Raflar arasından bir fısıltı...'}</div>
    <div class="kut-metin">${metin}</div>
    <div class="kut-imza">— Kütüphaneci (Ali)</div>
    <div class="kut-alt"><button class="kut-yaz" onclick="kutMektupAc()">✉️ Kütüphaneciye yaz</button><span id="kutMektupBilgi" class="kut-bilgi"></span></div>
    <div id="kutMektupForm" style="display:none">
      <textarea id="kutMektupMetin" maxlength="500" rows="3" placeholder="Masaya bir not bırak... (herkes görmez, yalnız kütüphaneci okur)"></textarea>
      <button class="kut-yaz kut-birak" onclick="kutMektupBirak()">Masaya bırak</button>
    </div>`;
}
