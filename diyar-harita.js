// ══════════════════════════════════════════════════════════════════════
// HAYALİ DİYARLAR — HARİTA ÇİZİMİ
// ══════════════════════════════════════════════════════════════════════
// Önizlemedeki (hayali diyar görselleri/onizleme.html) haritanın uygulama
// içi sürümü. Farklar:
//   • Sayfanın tamamını değil, verilen bir KUTUNUN içini kaplıyor
//   • Yalnızca KEŞFEDİLMİŞ diyarlar çiziliyor (keşfedilmemişin görseli
//     indirilmiyor bile)
//   • Ayarlar sabit; kaydıraklı şerit yalnızca test hesabında açılıyor
//
// Bağımlılıklar: diyarlar-katalog.js (DIYAR_KATALOG), diyarlar.js
//                (realmEventsOf), index.html (me)
// Görseller:     diyarlar/<dosya>.webp
//
// ⚠️ PERFORMANS — geçmişte yaşanmış, tekrarlanmaması gereken tuzaklar:
//   1. `will-change: transform` BÜYÜK kamera elemanına konulmaz. 4000×4000'lik
//      alanı tek katman olarak rasterlemeye zorluyor, Chrome'u boğuyor.
//   2. Sis bulut dokusu tüm dünyaya değil, 900×900'lük DESENE uygulanır.
//      Doğrudan uygulanınca ~16 milyon piksel prosedürel gürültü demek.
//   3. Turbulans filtresi her deliğe ayrı ayrı DEĞİL, hepsini kapsayan tek
//      üst gruba uygulanır. Ayrı ayrı uygulanınca 11 filtre geçişi oluyordu.
// ══════════════════════════════════════════════════════════════════════

const DH = {
  DUNYA: 4000,
  ORAN: Math.sqrt(3) / 2,
  NS: 'http://www.w3.org/2000/svg',
  kurulu: false,
  kutu: null,          // dış kap (overflow:hidden)
  dunya: null,         // kamera elemanı
  kam: { x: 0, y: 0, s: 1 },
  slotlar: [],
  slotHarita: new Map(),
  yerlesim: [],
  kesifler: new Set(),
  // Kullanıcının 2026-08-09'da seçip onayladığı ayarlar
  ayar: {
    zemin: 'karanlikdeniz', solgun: 0, doseme: 160, dalga: 46,
    sis: true, etiket: true, grid: false,
    aralik: 603, gorsel: 90, yumusak: 64, sekil: 170, daginik: 13,
    kenar: 6, anim: 'dagil'
  }
};

// ── Rastgelelik: aynı girdi → aynı çıktı ──────────────────────────────
function dhTohumla(metin) {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) { h ^= metin.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function dhUretec(tohum) {
  let s = tohum >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function dhTurbulans(genislik, frekans, oktav, tohum) {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + genislik + "' height='" + genislik + "'>" +
      "<filter id='f'><feTurbulence type='fractalNoise' baseFrequency='" + frekans +
        "' numOctaves='" + oktav + "' seed='" + tohum + "' stitchTiles='stitch'/>" +
        "<feColorMatrix type='saturate' values='0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(%23f)'/>" +
    "</svg>";
  return 'url("data:image/svg+xml,' +
    svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23') + '")';
}

// ── Hex geometrisi ────────────────────────────────────────────────────
function dhHexMerkezi(q, r, w) {
  const h = w * DH.ORAN;
  return { x: q * w * 0.75, y: r * h + (Math.abs(q % 2) === 1 ? h / 2 : 0) };
}
function dhKomsular(q, r) {
  const tek = Math.abs(q % 2) === 1;
  return tek
    ? [[q,r-1],[q,r+1],[q-1,r],[q-1,r+1],[q+1,r],[q+1,r+1]]
    : [[q,r-1],[q,r+1],[q-1,r-1],[q-1,r],[q+1,r-1],[q+1,r]];
}
function dhSapma(q, r) {
  const a = Math.sin(q * 127.1 + r * 311.7) * 43758.5453;
  const b = Math.sin(q * 269.5 + r * 183.3) * 43758.5453;
  return [ (a - Math.floor(a)) - 0.5, (b - Math.floor(b)) - 0.5 ];
}

// Merkeze GERÇEK PİKSEL uzaklığına göre sıralı pozisyonlar.
// (Komşu-komşu yayılan BFS kullanılırsa küme 3 sütun genişliğinde ama çok
//  uzun bir şerit hâline geliyor — ekranın orta hattında alt alta dizilmiş
//  görünüyorlar. Piksel uzaklığına göre sıralayınca küme yuvarlak çıkıyor.)
function dhPozisyonlar(adet) {
  const yari = Math.ceil(Math.sqrt(Math.max(1, adet))) + 3;
  const liste = [];
  for (let q = -yari; q <= yari; q++) {
    for (let r = -yari; r <= yari; r++) {
      const m = dhHexMerkezi(q, r, 1);
      liste.push({ q, r, d: m.x * m.x + m.y * m.y });
    }
  }
  liste.sort((a, b) => a.d - b.d || a.q - b.q || a.r - b.r);
  return liste.slice(0, adet);
}

// ══════════════════════════════════════════════════════════════════════
// YERLEŞİM
// ══════════════════════════════════════════════════════════════════════
// Yalnızca keşfedilmiş diyarlar yerleştirilir. Sıra, keşif olayının
// OLUŞTURULMA sırasıdır (e.id), keşif tarihi (e.ts) DEĞİL.
//
// Neden: onarım fonksiyonu geçmişe dönük bir keşif eklediğinde kaydı ts'ye
// göre araya sokar. Sıralama ts'ye dayansaydı, eski bir kitap girildiğinde
// listenin başına bir diyar girer ve HERKES yerinden oynardı — kullanıcının
// haritası bir sabah bambaşka görünürdü. e.id (Date.now) hep artan olduğu
// için yeni kayıt her zaman sona eklenir, eskiler yerinde kalır.
function dhKesifSirasi(kullanici) {
  const olaylar = (typeof realmEventsOf === 'function' ? realmEventsOf(kullanici) : []);
  return olaylar.slice().sort((a, b) => (a.id || 0) - (b.id || 0));
}

function dhYerlesim(kullanici) {
  const sirali = dhKesifSirasi(kullanici);
  const katalog = sirali
    .map(e => DIYAR_KATALOG.find(d => d.id === e.diyarId))
    .filter(Boolean);

  const sira = dhPozisyonlar(katalog.length * 6 + 12);
  const dolu = new Set();
  const sonuc = [];
  katalog.forEach((d, i) => {
    const rnd = dhUretec(dhTohumla(kullanici + '|' + d.id));
    const pencere = Math.min(sira.length, i + 3);
    const bas = Math.floor(rnd() * pencere);
    for (let j = 0; j < sira.length; j++) {
      const p = sira[(bas + j) % sira.length];
      const k = p.q + ',' + p.r;
      if (dolu.has(k)) continue;
      dolu.add(k);
      // Katalog kaydının KOPYASI + konum (sarmalanmaz — sarmalanınca
      // slot.diyar.sahneler bir kat aşağıda kalıp undefined oluyordu).
      sonuc.push(Object.assign({}, d, { q: p.q, r: p.r }));
      break;
    }
  });
  return sonuc;
}

// ══════════════════════════════════════════════════════════════════════
// ŞEKİLSİZ KENAR MASKESİ
// ══════════════════════════════════════════════════════════════════════
// Tek elips DEĞİL — üst üste binen 8-12 lekenin birleşimi. Elips yarıçapı
// %50'yi geçerse kenar yarı opak biter ve keskin dikdörtgen sınır görünür.
function dhMaskeUret(tohum, sert, sekil) {
  const rnd = dhUretec(tohum);
  const lekeler = [];
  function ekle(cx, cy, rx, ry) {
    const k = 49.5;
    rx = Math.min(rx, k - Math.abs(cx - 50));
    ry = Math.min(ry, k - Math.abs(cy - 50));
    if (rx < 4 || ry < 4) return;
    lekeler.push('radial-gradient(ellipse ' + rx.toFixed(1) + '% ' + ry.toFixed(1) +
      '% at ' + cx.toFixed(1) + '% ' + cy.toFixed(1) + '%, #000 0%, #000 ' +
      sert.toFixed(0) + '%, rgba(0,0,0,0) 100%)');
  }
  const adet = 7 + Math.floor(rnd() * 4);
  for (let i = 0; i < adet; i++) {
    const aci = (i / adet) * Math.PI * 2 + rnd() * 1.3;
    const uz  = (2 + rnd() * 13) * sekil;
    ekle(50 + Math.cos(aci) * uz, 50 + Math.sin(aci) * uz, 15 + rnd() * 23, 15 + rnd() * 23);
  }
  const uydu = 2 + Math.floor(rnd() * 3);
  for (let i = 0; i < uydu; i++) {
    const aci = rnd() * Math.PI * 2;
    const uz  = (13 + rnd() * 13) * sekil;
    const r   = 7 + rnd() * 10;
    ekle(50 + Math.cos(aci) * uz, 50 + Math.sin(aci) * uz, r, r * (0.65 + rnd() * 0.7));
  }
  return lekeler.join(', ');
}

// ══════════════════════════════════════════════════════════════════════
// CSS — modül kendi stilini enjekte ediyor (index.html'e stil eklenmiyor)
// ══════════════════════════════════════════════════════════════════════
function dhStilEkle() {
  if (document.getElementById('dhStil')) return;
  const s = document.createElement('style');
  s.id = 'dhStil';
  s.textContent = `
#dhKutu { position:relative; width:100%; height:min(70vh,560px); overflow:hidden;
          background:#0a0f16; border-radius:8px; touch-action:none;
          --sisRenk:#4e6076; --cizgi:rgba(176,202,232,.17);
          --isik1:rgba(196,224,255,.42); --isik2:rgba(150,186,226,.22);
          --isik3:rgba(120,160,200,0); --golge:rgba(0,0,0,.55); }
#dhDunya { position:absolute; top:0; left:0; transform-origin:0 0; cursor:grab; }
#dhKutu.suruklerken #dhDunya { cursor:grabbing; }
#dhZemin,#dhDoku,#dhKat,#dhSis,#dhGrid { position:absolute; top:0; left:0; }
#dhZemin { background:radial-gradient(ellipse 65% 50% at 50% 45%, rgba(58,88,120,.30) 0%, rgba(58,88,120,0) 72%),
                     radial-gradient(ellipse 110% 85% at 50% 48%, #1d2c3c 0%, #131e2a 55%, #070c12 100%); }
#dhDoku { pointer-events:none; background-repeat:repeat; background-position:center;
          filter:invert(1); mix-blend-mode:screen; }
#dhKat { pointer-events:none; }
#dhSis { display:block; transition:opacity .5s ease; }
#dhKutu.sissiz #dhSis { opacity:0; }
#dhGrid { pointer-events:none; opacity:0; transition:opacity .3s; }
#dhKutu.gridAcik #dhGrid { opacity:1; }
#dhGrid polygon { fill:none; stroke:var(--cizgi); stroke-width:1.2; }
#dhGrid circle { fill:var(--cizgi); }
#dhVinyet { position:absolute; inset:0; z-index:5; pointer-events:none;
            background:radial-gradient(ellipse 75% 75% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,.58) 100%); }
.dhDiyar { position:absolute; display:grid; place-items:center; }
.dhDiyar::before { content:""; position:absolute; inset:-18%; border-radius:50%;
  background:radial-gradient(ellipse 50% 50% at 50% 50%, var(--isik1) 0%, var(--isik2) 48%, var(--isik3) 80%); }
.dhDiyar img { position:relative; width:100%; height:auto; display:block;
  filter:drop-shadow(0 6px 18px var(--golge));
  -webkit-mask-image:var(--maske); mask-image:var(--maske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
.dhDiyar::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(6,11,18,0) 20%, rgba(6,11,18,.65) 52%, rgba(6,11,18,1) 78%);
  opacity:var(--karartma,0);
  -webkit-mask-image:var(--maske); mask-image:var(--maske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
.dhDiyar .dhEtiket { position:absolute; font-size:15px; letter-spacing:.22em;
  text-transform:uppercase; color:#f3e6cd; pointer-events:none;
  text-shadow:0 1px 4px rgba(0,0,0,.85), 0 0 14px rgba(0,0,0,.6); }
#dhKutu.etiketsiz .dhDiyar .dhEtiket { display:none; }
#dhBos { position:absolute; inset:0; display:grid; place-items:center; text-align:center;
         color:#cbbb95; font-size:.9rem; line-height:1.7; padding:1.5rem; z-index:6; }

/* Detay paneli */
#dhDetay { position:fixed; inset:0; z-index:9000; display:none; padding:20px;
  background:rgba(8,12,18,.86); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  align-items:center; justify-content:center; }
body.dhDetayAcik #dhDetay { display:flex; }
#dhDetayKart { position:relative; max-width:min(92vw,900px); max-height:92vh;
  display:flex; flex-direction:column; align-items:center; color:#f0e2c4; text-align:center; }
#dhDetaySahne { position:relative; width:min(72vh,100%); aspect-ratio:1/1; display:grid; place-items:center; }
#dhDetaySahne img { width:100%; height:100%; object-fit:cover; display:block;
  -webkit-mask-image:var(--dmaske); mask-image:var(--dmaske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
  filter:drop-shadow(0 10px 40px rgba(0,0,0,.7)); }
#dhDetaySahne::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(6,11,18,0) 42%, rgba(6,11,18,.55) 72%, rgba(6,11,18,.95) 100%);
  -webkit-mask-image:var(--dmaske); mask-image:var(--dmaske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
#dhDetayAd { margin-top:12px; font-size:22px; letter-spacing:.18em; text-transform:uppercase; }
#dhDetayNot { margin-top:6px; font-size:13px; font-style:italic; opacity:.78; max-width:60ch; }
#dhDetayKitap { margin-top:8px; font-size:12px; opacity:.72; line-height:1.7; max-width:66ch; }
#dhDetayKitap b { color:#f0d9a4; }
#dhSahneler { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; justify-content:center; }
#dhSahneler button { width:52px; height:52px; padding:0; overflow:hidden; cursor:pointer;
  border-radius:8px; background:none; border:1px solid rgba(226,207,170,.28); opacity:.55; }
#dhSahneler button img { width:100%; height:100%; object-fit:cover; display:block; }
#dhSahneler button.secili { opacity:1; border-color:#c9a24a; }
#dhDetayKapat { position:absolute; top:-8px; right:-8px; width:38px; height:38px; border-radius:50%;
  font:20px/1 sans-serif; cursor:pointer; color:#f0e2c4;
  background:rgba(32,26,20,.92); border:1px solid rgba(226,207,170,.28); }

/* Ayar şeridi — YALNIZCA test hesabında. Kilit açılırken silinecek. */
#dhAyarAc { margin-top:.5rem; font-size:.8rem; }
#dhAyar { display:none; flex-wrap:wrap; gap:10px; align-items:center; margin-top:.5rem;
  padding:10px; border:1px solid rgba(226,207,170,.22); border-radius:8px;
  background:rgba(32,26,20,.5); color:#e8dcc4; font-size:12px; }
#dhAyar.acik { display:flex; }
#dhAyar label { display:flex; align-items:center; gap:5px; white-space:nowrap; }
#dhAyar input[type=range] { width:86px; accent-color:#c9a24a; }
#dhAyar input[type=checkbox] { accent-color:#c9a24a; }
`;
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════════════
// KURULUM
// ══════════════════════════════════════════════════════════════════════
function dhKur(kapId) {
  dhStilEkle();
  const kap = document.getElementById(kapId);
  if (!kap) return false;

  kap.innerHTML =
    '<div id="dhKutu">' +
      '<div id="dhDunya">' +
        '<div id="dhZemin"></div><div id="dhDoku"></div><div id="dhKat"></div>' +
        '<svg id="dhSis"><defs>' +
          '<filter id="dhSisKenar" x="-50%" y="-50%" width="200%" height="200%">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="9" result="g"/>' +
            '<feDisplacementMap id="dhKaydir" in="SourceGraphic" in2="g" scale="44" ' +
              'xChannelSelector="R" yChannelSelector="G" result="d"/>' +
            '<feGaussianBlur id="dhBulanik" in="d" stdDeviation="14"/>' +
          '</filter>' +
          '<filter id="dhBulutDoku" x="0%" y="0%" width="100%" height="100%">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.0055" numOctaves="4" seed="4" stitchTiles="stitch"/>' +
            '<feColorMatrix type="saturate" values="0"/>' +
          '</filter>' +
          '<pattern id="dhBulutDesen" width="900" height="900" patternUnits="userSpaceOnUse">' +
            '<rect width="900" height="900" filter="url(#dhBulutDoku)"/></pattern>' +
          '<mask id="dhMaske" maskUnits="userSpaceOnUse">' +
            '<rect id="dhMaskeZemin" x="0" y="0" fill="#fff"/>' +
            '<g id="dhAcikAlan" filter="url(#dhSisKenar)">' +
              '<g id="dhKopruler"></g><g id="dhDelikler"></g></g>' +
          '</mask>' +
        '</defs>' +
        '<g mask="url(#dhMaske)">' +
          '<rect id="dhSisTaban" x="0" y="0"/>' +
          '<rect id="dhSisBulut" x="0" y="0" fill="url(#dhBulutDesen)" opacity="0.28" ' +
                'style="mix-blend-mode:overlay"/>' +
        '</g></svg>' +
        '<svg id="dhGrid"></svg>' +
      '</div>' +
      '<div id="dhVinyet"></div>' +
    '</div>';

  DH.kutu  = document.getElementById('dhKutu');
  DH.dunya = document.getElementById('dhDunya');
  document.getElementById('dhDoku').style.backgroundImage = 'url("diyarlar/deniz-dokusu.png")';

  dhDetayKur();
  dhOlaylar();
  DH.kurulu = true;
  return true;
}

// ── Kamera ────────────────────────────────────────────────────────────
function dhEnAzOlcek() {
  const r = DH.kutu.getBoundingClientRect();
  return Math.max(r.width / DH.DUNYA, r.height / DH.DUNYA);
}
function dhOlcekSinirla(s) { return Math.min(2.5, Math.max(dhEnAzOlcek(), s)); }
function dhKamSinirla() {
  const r = DH.kutu.getBoundingClientRect();
  DH.kam.s = dhOlcekSinirla(DH.kam.s);
  const g = DH.DUNYA * DH.kam.s;
  DH.kam.x = Math.min(0, Math.max(r.width  - g, DH.kam.x));
  DH.kam.y = Math.min(0, Math.max(r.height - g, DH.kam.y));
}
function dhKamUygula() {
  dhKamSinirla();
  DH.dunya.style.transform = 'translate(' + DH.kam.x.toFixed(1) + 'px,' +
    DH.kam.y.toFixed(1) + 'px) scale(' + DH.kam.s.toFixed(4) + ')';
}
function dhEkranaDunya(mx, my) {
  const r = DH.kutu.getBoundingClientRect();
  return { x: (mx - r.left - DH.kam.x) / DH.kam.s, y: (my - r.top - DH.kam.y) / DH.kam.s };
}
function dhOrtala(dx, dy) {
  const r = DH.kutu.getBoundingClientRect();
  DH.kam.x = r.width / 2 - dx * DH.kam.s;
  DH.kam.y = r.height / 2 - dy * DH.kam.s;
  dhKamUygula();
}

function dhOlaylar() {
  let surukle = null, cimdik = null;

  DH.kutu.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    surukle = { x: ev.clientX, y: ev.clientY, kx: DH.kam.x, ky: DH.kam.y,
                hareket: 0, tip: ev.pointerType || 'mouse' };
    DH.kutu.classList.add('suruklerken');
    DH.kutu.setPointerCapture(ev.pointerId);
  });
  DH.kutu.addEventListener('pointermove', ev => {
    if (!surukle) return;
    const dx = ev.clientX - surukle.x, dy = ev.clientY - surukle.y;
    surukle.hareket = Math.max(surukle.hareket, Math.abs(dx) + Math.abs(dy));
    DH.kam.x = surukle.kx + dx; DH.kam.y = surukle.ky + dy;
    dhKamUygula();
  });
  DH.kutu.addEventListener('pointerup', ev => {
    if (!surukle) return;
    // Dokunmatikte parmak her zaman birkaç piksel oynar; fare eşiği (5px)
    // kullanılınca her dokunuş "sürükleme" sayılıp panel hiç açılmıyordu.
    const esik = surukle.tip === 'touch' ? 14 : 5;
    const kisa = surukle.hareket < esik;
    surukle = null;
    DH.kutu.classList.remove('suruklerken');
    if (kisa) dhTiklama(ev.clientX, ev.clientY);
  });
  DH.kutu.addEventListener('pointercancel', () => {
    surukle = null; DH.kutu.classList.remove('suruklerken');
  });

  DH.kutu.addEventListener('wheel', ev => {
    ev.preventDefault();
    const r = DH.kutu.getBoundingClientRect();
    const eski = DH.kam.s;
    // SADECE ölçek kısıtlanır. Burada kamSinirla() çağrılırsa kam.x/kam.y de
    // kırpılır ve ardından gelen "imlecin altındaki nokta sabit kalsın"
    // hesabı bozulur — harita kenara yapışıp yatayda hareket etmez olur.
    DH.kam.s = dhOlcekSinirla(DH.kam.s * Math.pow(0.9988, ev.deltaY));
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    DH.kam.x = mx - (mx - DH.kam.x) * (DH.kam.s / eski);
    DH.kam.y = my - (my - DH.kam.y) * (DH.kam.s / eski);
    dhKamUygula();
  }, { passive: false });

  DH.kutu.addEventListener('touchstart', ev => {
    if (ev.touches.length === 2) {
      surukle = null;
      const r = DH.kutu.getBoundingClientRect(), [a, b] = ev.touches;
      cimdik = { mesafe: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                 mx: (a.clientX + b.clientX) / 2 - r.left,
                 my: (a.clientY + b.clientY) / 2 - r.top,
                 s: DH.kam.s, kx: DH.kam.x, ky: DH.kam.y };
    }
  }, { passive: false });
  DH.kutu.addEventListener('touchmove', ev => {
    if (!cimdik || ev.touches.length !== 2) return;
    ev.preventDefault();
    const [a, b] = ev.touches;
    const oran = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / cimdik.mesafe;
    DH.kam.s = dhOlcekSinirla(cimdik.s * oran);
    DH.kam.x = cimdik.mx - (cimdik.mx - cimdik.kx) * (DH.kam.s / cimdik.s);
    DH.kam.y = cimdik.my - (cimdik.my - cimdik.ky) * (DH.kam.s / cimdik.s);
    dhKamUygula();
  }, { passive: false });
  DH.kutu.addEventListener('touchend', () => { cimdik = null; });
}

// ══════════════════════════════════════════════════════════════════════
// ÇİZİM
// ══════════════════════════════════════════════════════════════════════
function dhGorselYolu(dosya) { return 'diyarlar/' + dosya; }

function dhSecilenSahne(diyar) {
  const s = (diyar && diyar.sahneler) || [];
  if (!s.length) return { dosya: '' };
  const tercih = dhSahneTercihi();
  const i = tercih[diyar.id];
  return s[(i >= 0 && i < s.length) ? i : 0];
}
function dhSahneTercihi() {
  try { return JSON.parse(localStorage.getItem('aa-diyar-sahne-' + me) || '{}'); }
  catch (e) { return {}; }
}
function dhSahneKaydet(diyarId, i) {
  const t = dhSahneTercihi(); t[diyarId] = i;
  try { localStorage.setItem('aa-diyar-sahne-' + me, JSON.stringify(t)); } catch (e) {}
}

function dhDelikYaricapi() {
  // Delik iki koşulu birden sağlamalı: (a) yan yana iki diyarın delikleri
  // birleşsin, aralarında sis şeridi kalmasın; (b) komşunun GÖRSELİNE
  // dokunmasın, yoksa bir diyar açılırken yanındaki yarım yamalak çıkar.
  const yayilma = 0.0815;
  const ustSinir = (0.866 - DH.ayar.daginik / 100) - (DH.ayar.gorsel / 100) / 2 - yayilma;
  return DH.ayar.aralik * Math.min(0.40, Math.max(0.20, ustSinir));
}

function dhCiz() {
  if (!DH.kurulu) return;
  const A = DH.ayar, W = A.aralik, H = W * DH.ORAN, orta = DH.DUNYA / 2;

  DH.kutu.classList.toggle('sissiz', !A.sis);
  DH.kutu.classList.toggle('etiketsiz', !A.etiket);
  DH.kutu.classList.toggle('gridAcik', A.grid);
  DH.kutu.style.setProperty('--karartma', A.kenar / 100);

  const doku = document.getElementById('dhDoku');
  doku.style.backgroundSize = (1248 * A.doseme / 100) + 'px ' + (608 * A.doseme / 100) + 'px';
  doku.style.opacity = A.dalga / 100;

  const kat = document.getElementById('dhKat');
  const delikler = document.getElementById('dhDelikler');
  const kopruler = document.getElementById('dhKopruler');
  const grid = document.getElementById('dhGrid');
  kat.innerHTML = ''; delikler.innerHTML = ''; kopruler.innerHTML = ''; grid.innerHTML = '';
  DH.slotlar = []; DH.slotHarita = new Map();

  DH.dunya.style.width = DH.DUNYA + 'px';
  DH.dunya.style.height = DH.DUNYA + 'px';
  ['dhZemin', 'dhDoku', 'dhKat'].forEach(id => {
    const el = document.getElementById(id);
    el.style.width = DH.DUNYA + 'px'; el.style.height = DH.DUNYA + 'px';
  });
  ['dhSis', 'dhGrid'].forEach(id => {
    const el = document.getElementById(id);
    el.setAttribute('width', DH.DUNYA); el.setAttribute('height', DH.DUNYA);
  });
  ['dhMaskeZemin', 'dhSisTaban', 'dhSisBulut'].forEach(id => {
    const el = document.getElementById(id);
    el.setAttribute('width', DH.DUNYA); el.setAttribute('height', DH.DUNYA);
  });
  document.getElementById('dhSisTaban').setAttribute('fill',
    getComputedStyle(DH.kutu).getPropertyValue('--sisRenk').trim() || '#4e6076');
  // Sis kenarının yayılması ARALIK'la ölçeklensin; sabit kalırsa küçük
  // deliklerde kenar taşıp komşu diyarın üzerine geliyor.
  document.getElementById('dhKaydir').setAttribute('scale', (W * 0.055).toFixed(1));
  document.getElementById('dhBulanik').setAttribute('stdDeviation', (W * 0.018).toFixed(1));

  DH.yerlesim = dhYerlesim(me);
  DH.kesifler = new Set(DH.yerlesim.map(d => d.q + ',' + d.r));

  const yariQ = Math.ceil(orta / (W * 0.75)) + 1;
  const yariR = Math.ceil(orta / H) + 1;
  const gridParcalar = [];

  for (let q = -yariQ; q <= yariQ; q++) {
    for (let r = -yariR; r <= yariR; r++) {
      const m = dhHexMerkezi(q, r, W);
      const hx = orta + m.x, hy = orta + m.y;
      if (hx < -W || hx > DH.DUNYA + W || hy < -H || hy > DH.DUNYA + H) continue;
      const [sx, sy] = dhSapma(q, r);
      const cx = hx + sx * W * (A.daginik / 100), cy = hy + sy * W * (A.daginik / 100);
      const slot = { q, r, cx, cy, diyar: DH.yerlesim.find(d => d.q === q && d.r === r) };
      DH.slotlar.push(slot);
      DH.slotHarita.set(q + ',' + r, slot);
      if (A.grid) {
        const p = [[hx-W/2,hy],[hx-W/4,hy-H/2],[hx+W/4,hy-H/2],
                   [hx+W/2,hy],[hx+W/4,hy+H/2],[hx-W/4,hy+H/2]]
          .map(v => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join(' ');
        gridParcalar.push('<polygon points="' + p + '"/>');
      }
    }
  }
  grid.innerHTML = gridParcalar.join('');

  DH.slotlar.forEach(sl => {
    if (sl.diyar) { dhYerlestir(sl); dhDelikAc(sl); }
  });
  DH.slotlar.forEach(sl => {
    if (!sl.diyar) return;
    dhKomsular(sl.q, sl.r).forEach(([kq, kr]) => {
      if (kq < sl.q || (kq === sl.q && kr < sl.r)) return;      // her çifti bir kez
      const k = DH.slotHarita.get(kq + ',' + kr);
      if (k && k.diyar) dhKopruCiz(sl, k);
    });
  });

  // Hiç keşif yoksa açıklama göster
  const eski = document.getElementById('dhBos');
  if (eski) eski.remove();
  if (!DH.yerlesim.length) {
    const b = document.createElement('div');
    b.id = 'dhBos';
    b.innerHTML = '<div>✨<br><br>Henüz hiçbir hayali diyar keşfetmedin.<br>' +
                  'Bir diyarda geçen kitabı bitirdiğinde burası canlanacak.</div>';
    DH.kutu.appendChild(b);
  }
}

function dhYerlestir(sl) {
  const g = DH.ayar.aralik * (DH.ayar.gorsel / 100);
  const kutu = document.createElement('div');
  kutu.className = 'dhDiyar';
  kutu.style.left = (sl.cx - g / 2) + 'px';
  kutu.style.top  = (sl.cy - g / 2) + 'px';
  kutu.style.width = g + 'px'; kutu.style.height = g + 'px';

  const dosya = dhSecilenSahne(sl.diyar).dosya;
  kutu.innerHTML = '<img alt="' + sl.diyar.ad + '">' +
                   '<span class="dhEtiket">' + sl.diyar.ad + '</span>';
  kutu.querySelector('img').src = encodeURI(dhGorselYolu(dosya));

  const tohum = dhTohumla(sl.diyar.id + '|' + dosya);
  kutu.style.setProperty('--maske', dhMaskeUret(tohum, DH.ayar.yumusak, DH.ayar.sekil / 100));
  // Etiket açılmış alanın İÇİNDE kalsın (sabit yüzde kullanılınca büyük
  // boyutlarda kutunun dibine düşüp hâlâ sisli bölgede kayboluyordu).
  const R = dhDelikYaricapi();
  kutu.querySelector('.dhEtiket').style.bottom = Math.max(4, g / 2 - R * 0.66) + 'px';

  document.getElementById('dhKat').appendChild(kutu);
  sl.el = kutu;
}

function dhDelikAc(sl) {
  const R = dhDelikYaricapi(), A = DH.ayar;
  const g = document.createElementNS(DH.NS, 'g');   // filtre üst grupta

  const ana = document.createElementNS(DH.NS, 'ellipse');
  ana.setAttribute('cx', sl.cx.toFixed(1));
  ana.setAttribute('cy', sl.cy.toFixed(1));
  ana.setAttribute('rx', R.toFixed(1));
  ana.setAttribute('ry', R.toFixed(1));
  ana.setAttribute('fill', '#000');
  g.appendChild(ana);

  // YAPRAKLAR — ana delik yarıçapı ~0.20*ARALIK iken görsel 0.90*ARALIK
  // genişliğinde; yani komşusu boş bir diyarın yalnızca ortası görünüyordu.
  // Delik bu kadar küçük çünkü DOLU bir komşunun görseline dokunmamalı.
  // Komşu slotta diyar yoksa korunacak bir şey de yok — o yöne açılabilir.
  dhKomsular(sl.q, sl.r).forEach(([kq, kr]) => {
    const komsu = DH.slotHarita.get(kq + ',' + kr);
    if (komsu && komsu.diyar) return;
    const hedef = komsu || { cx: sl.cx, cy: sl.cy };
    let dx = hedef.cx - sl.cx, dy = hedef.cy - sl.cy;
    const uz = Math.hypot(dx, dy);
    if (uz < 1) return;
    dx /= uz; dy /= uz;
    const yp = document.createElementNS(DH.NS, 'ellipse');
    yp.setAttribute('cx', (sl.cx + dx * A.aralik * 0.28).toFixed(1));
    yp.setAttribute('cy', (sl.cy + dy * A.aralik * 0.28).toFixed(1));
    yp.setAttribute('rx', (A.aralik * 0.26).toFixed(1));
    yp.setAttribute('ry', (A.aralik * 0.26).toFixed(1));
    yp.setAttribute('fill', '#000');
    g.appendChild(yp);
  });

  document.getElementById('dhDelikler').appendChild(g);
}

function dhKopruCiz(a, b) {
  // Köprü olmadan iki delik arasında yarı saydam bir sis şeridi kalıyor ve
  // komşu diyarlar birbirinden kopuk görünüyor.
  const kalinlik = DH.ayar.aralik * (DH.ayar.gorsel / 100) * 0.72;
  const l = document.createElementNS(DH.NS, 'line');
  l.setAttribute('x1', a.cx.toFixed(1)); l.setAttribute('y1', a.cy.toFixed(1));
  l.setAttribute('x2', b.cx.toFixed(1)); l.setAttribute('y2', b.cy.toFixed(1));
  l.setAttribute('stroke', '#000');
  l.setAttribute('stroke-linecap', 'round');
  l.setAttribute('stroke-width', kalinlik.toFixed(1));
  document.getElementById('dhKopruler').appendChild(l);
}

function dhTiklama(mx, my) {
  const d = dhEkranaDunya(mx, my);
  let iyi = null, enAz = Infinity;
  DH.slotlar.forEach(sl => {
    if (!sl.diyar) return;
    const uz = (sl.cx - d.x) ** 2 + (sl.cy - d.y) ** 2;
    if (uz < enAz) { enAz = uz; iyi = sl; }
  });
  if (!iyi) return;
  const yaricap = DH.ayar.aralik * (DH.ayar.gorsel / 100) * 0.5;
  if (Math.sqrt(enAz) <= yaricap) dhDetayAc(iyi.diyar);
}

// ══════════════════════════════════════════════════════════════════════
// DETAY PANELİ — diyarın tam boy hâli
// ══════════════════════════════════════════════════════════════════════
function dhDetayKur() {
  if (document.getElementById('dhDetay')) return;
  const d = document.createElement('div');
  d.id = 'dhDetay';
  d.innerHTML =
    '<div id="dhDetayKart">' +
      '<button id="dhDetayKapat" title="Kapat">✕</button>' +
      '<div id="dhDetaySahne"><img id="dhDetayGorsel" alt=""></div>' +
      '<div id="dhDetayAd"></div><div id="dhDetayNot"></div>' +
      '<div id="dhDetayKitap"></div><div id="dhSahneler"></div>' +
    '</div>';
  document.body.appendChild(d);
  document.getElementById('dhDetayKapat').addEventListener('click', dhDetayKapat);
  d.addEventListener('click', ev => { if (ev.target.id === 'dhDetay') dhDetayKapat(); });
  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && document.body.classList.contains('dhDetayAcik')) dhDetayKapat();
  });
}

function dhAcanKitaplar(diyar) {
  const t = diyar.tetikleyiciler || {}, p = [];
  if (t.yazarlar)     p.push(t.yazarlar.map(y => '<b>' + y + '</b>').join(', ') + ' — tüm kitapları');
  if (t.baslikIcerir) t.baslikIcerir.forEach(k => p.push('<b>' + k.baslikIcerir + '</b> serisi (' + k.yazar + ')'));
  if (t.kitaplar)     p.push(t.kitaplar.map(k => '<b>' + k.baslik + '</b>').join(' · '));
  return p.length ? 'Açan kitaplar: ' + p.join('<br>') : '';
}

function dhSahneGoster(diyar, i) {
  const s = diyar.sahneler[i] || diyar.sahneler[0];
  const img = document.getElementById('dhDetayGorsel');
  img.alt = diyar.ad + (s.ad ? ' — ' + s.ad : '');
  img.src = encodeURI(dhGorselYolu(s.dosya));
  // Haritadakiyle AYNI maske üreteci — aynı tohumla aynı siluet.
  // Kenarları söndüren vinyet de bu maskeyi kullanıyor (üretim logosu
  // görsellerin sağ alt köşesinde; burada sönüyor).
  document.getElementById('dhDetaySahne').style.setProperty('--dmaske',
    dhMaskeUret(dhTohumla(diyar.id + '|' + s.dosya), DH.ayar.yumusak, DH.ayar.sekil / 100));
  document.querySelectorAll('#dhSahneler button').forEach((b, j) =>
    b.classList.toggle('secili', j === i));
  dhSahneKaydet(diyar.id, i);
}

function dhDetayAc(diyar) {
  dhDetayKur();
  document.getElementById('dhDetayAd').textContent = diyar.ad;
  document.getElementById('dhDetayNot').textContent = diyar.not || '';
  document.getElementById('dhDetayKitap').innerHTML = dhAcanKitaplar(diyar);

  const kutu = document.getElementById('dhSahneler');
  kutu.innerHTML = '';
  if ((diyar.sahneler || []).length > 1) {
    diyar.sahneler.forEach((s, i) => {
      const b = document.createElement('button');
      b.title = s.ad || ('Sahne ' + (i + 1));
      b.innerHTML = '<img alt="">';
      b.querySelector('img').src = encodeURI(dhGorselYolu(s.dosya));
      b.addEventListener('click', () => dhSahneGoster(diyar, i));
      kutu.appendChild(b);
    });
  }
  dhSahneGoster(diyar, dhSahneTercihi()[diyar.id] || 0);
  document.body.classList.add('dhDetayAcik');
}

function dhDetayKapat() {
  document.body.classList.remove('dhDetayAcik');
  dhCiz();      // sahne tercihi değişmiş olabilir
}

// ══════════════════════════════════════════════════════════════════════
// DIŞARIYA AÇILAN GİRİŞ
// ══════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
// AYAR ŞERİDİ — ⚠️ YALNIZCA TEST HESABI, GEÇİCİ
// ══════════════════════════════════════════════════════════════════════
// Kilit açılırken (herkese sunulurken) bu bölüm ve onu çağıran satır
// TAMAMEN SİLİNECEK. Nihai tasarımda haritanın altında ayar yoktur.
//
// Var olma sebebi: mobil için doğru sis/boyut değerlerini masaüstünde
// tahmin etmek zor. Gökşin gerçek telefonda parmağıyla ayarlayıp
// "📋 Ayarları kopyala" ile değerleri iletecek, değerler koda sabitlenecek.
const DH_AYAR_ALANLARI = [
  ['aralik',  'Aralık',     400, 1300, 1],
  ['gorsel',  'Görsel',      30,  110, 1],
  ['yumusak', 'Yumuşaklık',  10,   80, 1],
  ['sekil',   'Şekil',        0,  220, 1],
  ['daginik', 'Dağınıklık',   0,   25, 1],
  ['kenar',   'Kenar',        0,   85, 1],
  ['doseme',  'Döşeme',      40,  220, 1],
  ['dalga',   'Dalga',        0,  100, 1]
];

function dhAyarSeridi(kap) {
  if (document.getElementById('dhAyar')) return;

  const ac = document.createElement('button');
  ac.id = 'dhAyarAc';
  ac.className = 'btn btn-sm';
  ac.textContent = '⚙️ Ayarlar (test)';
  ac.onclick = () => document.getElementById('dhAyar').classList.toggle('acik');
  kap.appendChild(ac);

  const s = document.createElement('div');
  s.id = 'dhAyar';
  s.innerHTML =
    DH_AYAR_ALANLARI.map(([k, ad, min, max]) =>
      '<label>' + ad + ' <input type="range" data-k="' + k + '" min="' + min +
      '" max="' + max + '" value="' + DH.ayar[k] + '"><span data-v="' + k + '">' +
      DH.ayar[k] + '</span></label>').join('') +
    '<label><input type="checkbox" data-b="sis" checked> Sis</label>' +
    '<label><input type="checkbox" data-b="etiket" checked> Etiket</label>' +
    '<label><input type="checkbox" data-b="grid"> Hex</label>' +
    '<button class="btn btn-sm" id="dhKopyala">📋 Ayarları kopyala</button>';
  kap.appendChild(s);

  s.addEventListener('input', ev => {
    const k = ev.target.dataset.k, b = ev.target.dataset.b;
    if (k) {
      DH.ayar[k] = +ev.target.value;
      const g = s.querySelector('[data-v="' + k + '"]');
      if (g) g.textContent = ev.target.value;
    } else if (b) {
      DH.ayar[b] = ev.target.checked;
    } else return;
    dhCiz();
  });

  document.getElementById('dhKopyala').onclick = async () => {
    const metin = 'HAYALİ DİYAR HARİTA AYARLARI\n' +
      Object.entries(DH.ayar).map(([k, v]) => k + '=' + v).join(' · ') +
      '\n\nJSON: ' + JSON.stringify(DH.ayar);
    let ok = false;
    try { await navigator.clipboard.writeText(metin); ok = true; } catch (e) {}
    document.getElementById('dhKopyala').textContent = ok ? '✓ Kopyalandı' : '✕ Kopyalanamadı';
    setTimeout(() => {
      const b = document.getElementById('dhKopyala');
      if (b) b.textContent = '📋 Ayarları kopyala';
    }, 2500);
  };
}

// Node testinde saf fonksiyonlar okunabilsin diye (tarayıcıda etkisiz).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DH, dhTohumla, dhUretec, dhHexMerkezi, dhKomsular,
                     dhPozisyonlar, dhKesifSirasi, dhYerlesim, dhMaskeUret };
}

function renderDiyarHarita(kapId) {
  if (!DH.kurulu || !document.getElementById('dhKutu')) {
    if (!dhKur(kapId || 'diyarHaritaKutu')) return;
  }
  dhCiz();
  // Açılış yakınlığı kutu genişliğine bağlı: ~3 diyar yan yana görünsün.
  // Sabit bir değer bırakılırsa telefonda tek bir diyar ekranı taşırıyor.
  const r = DH.kutu.getBoundingClientRect();
  DH.kam.s = Math.max(dhEnAzOlcek(), Math.min(0.85, r.width / (DH.ayar.aralik * 3.2)));
  dhOrtala(DH.DUNYA / 2, DH.DUNYA / 2);
}
