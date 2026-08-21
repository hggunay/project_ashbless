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
  // Gökşin'in 2026-08-12'de GERÇEK CİHAZDA ayarlayıp onayladığı değerler.
  // (Önceki set 2026-08-09'da önizlemede seçilmişti; aralık 603→922 büyüdü,
  //  görsel 90→80 küçüldü. Bu ikisi birlikte sis deliğinin görselin daha
  //  büyük kısmını açmasını sağlıyor: delik yarıçapı 0.20→0.29 aralığa çıktı.)
  //
  // 2026-08-13: aralık 922 → 700, döşeme 220 → 167. Katalog 26 diyara çıktı,
  // 4. halka açılmadan sığmıyordu (bkz. DH_KESIF_SIRASI kapasite notu).
  // Açılış görünümü DEĞİŞMEZ: açılış yakınlığı r.width/(aralık*3.2) ile
  // hesaplandığı için ekranda yine ~3 diyar yan yana duruyor. Değişen tek
  // şey uzaklaşınca daha çok diyar görülebilmesi. Döşeme de aynı oranda
  // küçüldü (220*700/922≈167), yoksa deniz dokusu diyarlara göre irileşirdi.
  ayar: {
    zemin: 'karanlikdeniz', solgun: 0, doseme: 167, dalga: 37,
    sis: true, etiket: true, grid: false,
    aralik: 700, gorsel: 80, yumusak: 65, sekil: 197, daginik: 9,
    kenar: 6, anim: 'dagil',
    // Azami yakınlık artık sabit bir sayı DEĞİL, ekran genişliğine oranlı:
    // "en fazla yakınlaştığında bir diyar görseli pencerenin yüzde kaçını
    // kaplasın". Bkz. dhEnCokOlcek(). Gökşin telefonda kaydırakla ayarlayıp
    // beğendiği değeri söyleyecek; bu sayı o zaman sabitlenecek.
    doluluk: 90
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

// ── KEŞİF SIRASI ──────────────────────────────────────────────────────
// Elle yazılmış ASİMETRİK sıra (2026-08-13, Gökşin).
//
// Önceden slotlar merkeze piksel uzaklığına göre sıralanıyordu. Sonuç
// kaçınılmaz olarak halka halka dolan bir ROZET/ÇİÇEK: 6. keşifte merkezin
// altı komşusu da doluyor ve harita "keşfedilmiş" değil "tasarlanmış"
// görünüyor. Koordinat sistemi ve geometri aynı kaldı, yalnızca slotların
// DOLMA SIRASI değişti.
//
// Sıradaki üç kasıtlı numara:
//   • #16-#18 merkezin dibindeki üç slot — en sona bırakıldı, böylece ilk
//     15 keşif boyunca kümenin İÇİNDE sisli cepler kalıyor.
//   • #4 ve #10 hiçbir dolu komşusu olmayan ADA (1,5 aralık ötede, arada
//     sis şeridi kalıyor; köprü çizilmiyor çünkü komşu değiller).
//   • Halkalar sırayla değil karışık tüketiliyor (#3 en dış halkada).
//
// ⚠️ KAPASİTE (2026-08-13'te yeniden hesaplandı): kaç diyarın sığacağını
// belirleyen şey DH.DUNYA / aralık ORANI'dır, tek başına ikisi değil —
// yerleşimin her ölçüsü aralıkla birlikte ölçekleniyor. Halkalar:
//   merkez 1 · 1. halka 6 · 2. halka 6 · 3. halka 6 · 4. halka 12  = 31 slot
// Katalog 17'den 26 diyara çıkınca 19 slot yetmedi; 4. halka açıldı ve
// aralık 922 → 700 küçültüldü (dünyayı 5400'e büyütmek yerine — büyük kamera
// elemanı bilinen performans tuzağı, küçültmenin ise maliyeti yok).
// Ölçüldü: 31 slotun en dar olanında bile görsel kenarı dünya sınırından
// 131px içeride. 31'i geçilecekse ya aralık daha da küçülmeli ya da bu liste
// 5. halkayla (6 slot daha) uzatılmalı.
const DH_KESIF_SIRASI = [
  [0,0], [1,-1], [0,1], [2,-1], [-2,0], [-1,1], [1,1], [-1,-1], [2,1], [-2,1],
  [0,-2], [1,-2], [2,0], [0,2], [-2,-1], [-1,-2], [0,-1], [1,0], [-1,0],
  // 4. halka — aynı mantık sürüyor: yönler karışık tüketiliyor, komşu
  // slotlar atlanıyor, hiçbir halka sırayla tamamlanmıyor.
  [3,-1], [-1,-3], [2,2], [-3,0], [1,2], [2,-2], [-2,2], [3,0], [-1,2],
  [-2,-2], [1,-3], [-3,-1]
];

// Liste yetmezse (katalog büyürse) eskisi gibi merkeze en yakın boş
// slotlarla tamamlanır — harita bozulmaz, sadece dış halkalar simetrik dolar.
function dhPozisyonlar(adet) {
  const liste = DH_KESIF_SIRASI.slice(0, adet).map(([q, r]) => ({ q, r }));
  if (liste.length >= adet) return liste;

  const alinan = new Set(liste.map(p => p.q + ',' + p.r));
  const yari = Math.ceil(Math.sqrt(Math.max(1, adet))) + 3;
  const kalan = [];
  for (let q = -yari; q <= yari; q++) {
    for (let r = -yari; r <= yari; r++) {
      if (alinan.has(q + ',' + r)) continue;
      const m = dhHexMerkezi(q, r, 1);
      kalan.push({ q, r, d: m.x * m.x + m.y * m.y });
    }
  }
  kalan.sort((a, b) => a.d - b.d || a.q - b.q || a.r - b.r);
  return liste.concat(kalan.slice(0, adet - liste.length));
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

  // i. keşif → sıranın i. slotu, oynatma YOK.
  // (Eskiden her diyar [0, i+2] arasından rastgele bir yerden başlayıp ilk
  //  boş slotu alıyordu; slotlar zaten simetrik dolduğu için bu ufak bir
  //  çeşitlilik katıyordu. Sıra artık elle tasarlandığına göre aynı rastgelelik
  //  tasarımı bozar: araya boşluk girip planlanan cepler/adalar kayıyordu.)
  const sira = dhPozisyonlar(katalog.length);
  // Katalog kaydının KOPYASI + konum (sarmalanmaz — sarmalanınca
  // slot.diyar.sahneler bir kat aşağıda kalıp undefined oluyordu).
  return katalog.map((d, i) => Object.assign({}, d, { q: sira[i].q, r: sira[i].r }));
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
/* user-select:none ŞART — fareyle haritayı kaydırırken tarayıcı metin seçimi
   başlatıyor, seçime giren görseller Chrome'da maviye boyanıyordu. Mobilde
   görünmüyordu çünkü dokunma seçim başlatmıyor (touch-action:none). */
#dhKutu { position:relative; width:100%; height:min(70vh,560px); overflow:hidden;
          background:#0a0f16; border-radius:8px; touch-action:none;
          -webkit-user-select:none; user-select:none;
          /* Keşfedilmemiş alan TAMAMEN SİYAH (2026-08-12, Gökşin'in isteği).
             Eskiden mavimsi bir sis rengiydi (#4e6076) ve altındaki deniz
             dokusu hafifçe seziliyordu. Şimdi hiçbir şey görünmüyor —
             harita karanlıkta duran adalar hâline geliyor.
             Geri almak için tek yapılacak bu rengi değiştirmek. */
          --sisRenk:#000000; --cizgi:rgba(176,202,232,.17);
          --isik1:rgba(196,224,255,.42); --isik2:rgba(150,186,226,.22);
          --isik3:rgba(120,160,200,0); --golge:rgba(0,0,0,.55); }
#dhDunya { position:absolute; top:0; left:0; transform-origin:0 0; cursor:grab; }
#dhKutu.suruklerken #dhDunya { cursor:grabbing; }
#dhZemin,#dhDoku,#dhKat,#dhSis,#dhSisTuval,#dhGrid { position:absolute; top:0; left:0; }
#dhZemin { background:radial-gradient(ellipse 65% 50% at 50% 45%, rgba(58,88,120,.30) 0%, rgba(58,88,120,0) 72%),
                     radial-gradient(ellipse 110% 85% at 50% 48%, #1d2c3c 0%, #131e2a 55%, #070c12 100%); }
#dhDoku { pointer-events:none; background-repeat:repeat; background-position:center;
          filter:invert(1); mix-blend-mode:screen; }
#dhKat { pointer-events:none; }
#dhSis { display:block; transition:opacity .5s ease; }
#dhKutu.sissiz #dhSis { opacity:0; }
/* Sisin tuvale çizilmiş kopyası — normalde ekranda görünen sis BUDUR, yukarıdaki
   canlı SVG yalnızca onu üretmeye yarayan kaynak. Gerekçesi dhSisRasterle()'de. */
#dhSisTuval { display:none; pointer-events:none; transition:opacity .5s ease; }
/* Keşif animasyonunun yaması: sisin O ANKİ hâlinden kırpılmış kopya, silinerek
   eriyor. dhKat'ın İÇİNDE ama z-index'i var — dhDunya bir yığın bağlamı
   (transform'u var) ve sis katmanlarının z-index'i yok, dolayısıyla 3 yamayı
   SİSİN ÜSTÜNE çıkarıyor. */
.dhKesifYama { position:absolute; pointer-events:none; z-index:3; }
#dhKutu.sissiz #dhSisTuval { opacity:0; }
#dhGrid { pointer-events:none; opacity:0; transition:opacity .3s; }
#dhKutu.gridAcik #dhGrid { opacity:1; }
#dhGrid polygon { fill:none; stroke:var(--cizgi); stroke-width:1.2; }
#dhGrid circle { fill:var(--cizgi); }
#dhVinyet { position:absolute; inset:0; z-index:5; pointer-events:none;
            background:radial-gradient(ellipse 75% 75% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,.58) 100%); }
/* Açılış perdesi — sisle aynı renk, KUTUNUN üstünde duruyor (dünyanın değil:
   4000x4000 dünyaya konan katman bilinen performans tuzağı, bkz. dosya başı).
   z-index 7: vinyetin (5) ve "henüz keşif yok" yazısının (6) de üstünde.
   Gerilirken anında kapanır (transition:none), bırakılırken yumuşakça açılır. */
#dhPerde { position:absolute; inset:0; z-index:7; pointer-events:none;
           background:var(--sisRenk); opacity:0; transition:opacity .5s ease; }
#dhKutu.perdeli #dhPerde { opacity:1; transition:none; }
@media (prefers-reduced-motion: reduce) { #dhPerde { transition:none; } }
/* ── ÇERÇEVE VE SÜSLER ────────────────────────────────────────────────
   Gökşin'in Canva'da hazırladığı altın çizimler (siyah zeminden saydama
   çevrildi). Hepsi KUTUYA sabit — dünyaya değil; harita kaydırılıp
   yakınlaştırılsa da yerlerinde duruyorlar.
   z-index 8: vinyetin (5), "henüz keşif yok" yazısının (6) ve perdenin (7)
   üstünde — perde inerken de çerçeve görünsün, boş bir çerçeveli harita gibi
   dursun. Oynatma düğmeleri (aynı 8) DOM'da sonra geldiği için üstte kalıyor.
   pointer-events:none ŞART — süslerin şeffaf kenarları haritanın
   kaydırılmasını yutardı (bulut tezgâhında tam olarak bu tuzağa düşülmüştü). */
#dhCerceve { position:absolute; inset:0; z-index:8; pointer-events:none;
             overflow:hidden; border-radius:8px; }
/* Köşeleri birleştiren ince altın çizgi. Tek parça kenar görseli KULLANILMIYOR:
   kenar uzunluğu telefonda ~546 px, PC'de ~960 px — tek görsel orada ya ezilir
   ya döşenirken ekleme yerlerinden bozulur. Köşeler sabit + çizgi esner. */
#dhCerceve::before { content:""; position:absolute; inset:7px; border-radius:5px;
                     border:1px solid rgba(201,162,39,.30); }
.dhKose { position:absolute; width:var(--koseBoy,64px); height:var(--koseBoy,64px);
          opacity:.92; }
/* Tek köşe çizimi aynalanarak dördü de üretiliyor. */
.dhKose.k1 { top:0; left:0; }
.dhKose.k2 { top:0; right:0; transform:scaleX(-1); }
.dhKose.k3 { bottom:0; left:0; transform:scaleY(-1); }
.dhKose.k4 { bottom:0; right:0; transform:scale(-1,-1); }
/* Pusula YALNIZCA dar ekranda. Geniş ekranda gemi kendi pusulasıyla geliyor,
   ikisi birden görünürse haritada iki pusula olurdu. */
/* Köşe süsünün ALTINDA duruyor (top = köşe boyu x 1.05): aynı hizada
   konunca 360 px'lik ekranda süsle çakışıyordu, ölçüldü. */
#dhPusula { position:absolute; width:var(--pusulaBoy,72px); opacity:.60;
            top:calc(var(--koseBoy,64px) * 1.05); right:calc(var(--koseBoy,64px) * .34); }
/* Gemi YALNIZCA geniş ekranda: telefonda kutu 360x546 ve zaten dar. */
#dhGemi { position:absolute; left:2.5%; bottom:1.5%; height:var(--gemiBoy,180px);
          width:auto; opacity:.38; }
/* Keşif animasyonunu yeniden oynatma düğmeleri — dünya haritasındakilerin
   (map.js, #map-anim-btns) hayali harita karşılığı, aynı yer ve aynı dil.
   z-index 8: vinyetin (5), "henüz keşif yok" yazısının (6) ve perdenin (7)
   üstünde. Perde açılırken gizleniyor, altında bir şey varmış izlenimi olmasın. */
#dhOynat { position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
  z-index:8; display:flex; gap:6px; flex-wrap:wrap; justify-content:center;
  transition:opacity .3s ease; }
#dhKutu.perdeli #dhOynat { opacity:0; pointer-events:none; }
#dhOynat button { background:rgba(26,15,0,.75); border:1px solid rgba(201,162,39,.6);
  border-radius:6px; cursor:pointer; font-size:.72rem; color:var(--gold,#c9a227);
  padding:.35rem .8rem; font-family:'Space Mono',monospace;
  backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
#dhOynat button:last-child { border-color:rgba(201,162,39,.4); }
#dhOynat button:disabled { opacity:.45; cursor:default; }
.dhDiyar { position:absolute; display:grid; place-items:center; }
.dhDiyar::before { content:""; position:absolute; inset:-18%; border-radius:50%;
  background:radial-gradient(ellipse 50% 50% at 50% 50%, var(--isik1) 0%, var(--isik2) 48%, var(--isik3) 80%); }
/* -webkit-user-drag:none — görselin kendisi sürüklenip "hayalet" kopyası
   imlece yapışıyordu; kaydırma o anda kesiliyordu. */
.dhDiyar img { position:relative; width:100%; height:auto; display:block;
  -webkit-user-drag:none;
  filter:drop-shadow(0 6px 18px var(--golge));
  -webkit-mask-image:var(--maske); mask-image:var(--maske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
.dhDiyar::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(6,11,18,0) 20%, rgba(6,11,18,.65) 52%, rgba(6,11,18,1) 78%);
  opacity:var(--karartma,0);
  -webkit-mask-image:var(--maske); mask-image:var(--maske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
/* Etiket boyutu kamera yakınlığına göre TERS ölçekleniyor: dünya
   koordinatında sabit 15px yazı, uzaklaşınca ekranda 5-6 piksele düşüp
   okunmaz hâle geliyordu. --olcek her kamera hareketinde güncelleniyor,
   böylece yazı ekranda hep ~13px kalıyor. Üst sınır (44px dünya) çok
   yakınlaşınca yazının devleşmesini engelliyor. */
.dhDiyar .dhEtiket { position:absolute;
  font-size:min(calc(13px / var(--olcek, 1)), 44px);
  letter-spacing:.18em; text-transform:uppercase; color:#f3e6cd; pointer-events:none;
  white-space:nowrap; transition:opacity .3s ease;
  text-shadow:0 1px 4px rgba(0,0,0,.9), 0 0 16px rgba(0,0,0,.75); }
/* Uzaktayken etiket okunacak boyuta çıkamıyor (uzun adlar görselden taşardı),
   o yüzden hiç gösterilmiyor: yeterince yaklaşınca yumuşakça beliriyor. */
#dhKutu.etiketUzak .dhEtiket { opacity:0; }
#dhKutu.etiketsiz .dhDiyar .dhEtiket { display:none; }
#dhBos { position:absolute; inset:0; display:grid; place-items:center; text-align:center;
         color:#cbbb95; font-size:.9rem; line-height:1.7; padding:1.5rem; z-index:6; }

/* Detay paneli */
#dhDetay { position:fixed; inset:0; z-index:9000; display:none; padding:20px;
  background:rgba(8,12,18,.86); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  align-items:center; justify-content:center; }
body.dhDetayAcik #dhDetay { display:flex; }
/* Görsel kaynağı 1024x1024. Panel eskiden min(72vh,100%) ile sınırlıydı ve
   PC'de ~415 CSS pikselde kalıyordu — kaynağın yarısından azı. Kağıt-kesme
   dokusunun görünmemesinin sebebi buydu, webp sıkıştırması değil (ölçüldü:
   ortalama fark 255'te 2). Sınır 1024'e kadar açıldı: artık büyük ekranda
   görsel neredeyse birebir çözünürlükte gösteriliyor. */
#dhDetayKart { position:relative; max-width:min(96vw,1024px); max-height:96vh;
  display:flex; flex-direction:column; align-items:center; color:#f0e2c4; text-align:center; }
/* touch-action:pan-y ŞART — sahneler arası yatay kaydırma için. Olmazsa
   tarayıcı yatay parmak hareketini kendi kaydırması sanıp olayları kesiyor;
   dikey hareket serbest kalsın diye "none" değil "pan-y". */
#dhDetaySahne { position:relative; width:min(78vh,100%,1024px); aspect-ratio:1/1;
  display:grid; place-items:center; touch-action:pan-y; }
/* -webkit-user-drag:none — haritadaki görsellerle aynı sebep: fareyle
   kaydırırken görselin "hayalet" kopyası imlece yapışıp hareketi kesiyor. */
#dhDetaySahne img { width:100%; height:100%; object-fit:cover; display:block;
  -webkit-user-drag:none; user-select:none;
  -webkit-mask-image:var(--dmaske); mask-image:var(--dmaske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
  transition:opacity .18s ease;
  filter:drop-shadow(0 10px 40px rgba(0,0,0,.7)); }
/* Vinyet dışarı çekildi: eskiden %42'de başlıyordu ve görselin kenarındaki
   kağıt-kesme katmanlarını da söndürüyordu. Artık %58'de başlıyor —
   üretim logosunun durduğu köşe hâlâ kapanıyor ama desen görünür kalıyor. */
#dhDetaySahne::after { content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(6,11,18,0) 58%, rgba(6,11,18,.45) 80%, rgba(6,11,18,.92) 100%);
  -webkit-mask-image:var(--dmaske); mask-image:var(--dmaske);
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; }
#dhDetayAd { margin-top:12px; font-size:22px; letter-spacing:.18em; text-transform:uppercase; }
/* Sahnenin kendi adı (Hogwarts, 9¾ Peronu...). Katalogda "ad" alanı
   yazılmamış sahnelerde gizleniyor — o zaman panel eskisi gibi diyar adı + açan kitap
   ile yetiniyor. BÜYÜK HARFE ÇEVRİLMİYOR: özel mekan adlarında rakam ve
   kesir işareti oluyor, versal hepsini okunmaz hâle getiriyor. */
#dhDetaySahneAd { margin-top:5px; font-size:15px; letter-spacing:.06em; color:#f0d9a4; }
#dhDetaySahneAd:empty { display:none; }
#dhDetayNot { margin-top:6px; font-size:13px; font-style:italic; opacity:.78; max-width:60ch; }
#dhDetayKitap { margin-top:8px; font-size:12px; opacity:.72; line-height:1.7; max-width:66ch; }
#dhDetayKitap b { color:#f0d9a4; }
#dhSahneler { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; justify-content:center; }
#dhSahneler button { width:52px; height:52px; padding:0; overflow:hidden; cursor:pointer;
  border-radius:8px; background:none; border:1px solid rgba(226,207,170,.28); opacity:.55; }
#dhSahneler button img { width:100%; height:100%; object-fit:cover; display:block; }
#dhSahneler button.secili { opacity:1; border-color:#c9a24a; }
/* z-index ŞART: buton kartın ilk çocuğu, görsel ondan SONRA geliyor ve
   HTML'de sonra gelen eleman üste çiziliyordu. Buton görselin sağ üst
   köşesiyle çakıştığı için tıklamalar görsele gidiyor, panel kapanmıyordu
   (2026-08-12'de kullanıcı bildirdi: "5-6 kez tıkladıktan sonra çıkıyor" —
   o da tıklamanın nihayet kartın dışına düşmesiydi).
   Dokunmatik için hedef de büyütüldü: 38 -> 46px. */
#dhDetayKapat { position:absolute; top:-10px; right:-10px; z-index:3;
  width:46px; height:46px; border-radius:50%;
  font:22px/1 sans-serif; cursor:pointer; color:#f0e2c4;
  background:rgba(32,26,20,.94); border:1px solid rgba(226,207,170,.35); }
#dhDetayKapat:hover { background:rgba(60,48,36,.98); }

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
          // Filtre alanı -50%/200% idi: kaplanan alan nesnenin DÖRT KATI.
          // Gereken taşma aslında küçük (yer değiştirme ~38px + bulanıklık
          // ~13px, toplam ~76px), oysa buradaki yüzdeler keşif alanının
          // tamamına göre hesaplanıyor ve o alan binlerce piksel. -20%/140%
          // ile işlenen alan yaklaşık YARIYA iniyor, görünüm aynı kalıyor:
          // tek diyar keşfedilmişken bile (en küçük durum, ~630px) payı
          // 126px oluyor, gereken 76px'in üstünde.
          '<filter id="dhSisKenar" x="-20%" y="-20%" width="140%" height="140%">' +
            // numOctaves: 2 → 1 (2026-08-14) → 2 (2026-08-17, GERİ ALINDI).
            // 14 Ağustos'ta performans için 1'e düşürülmüştü; bedeli sis kenarının
            // bir tık sadeleşmesiydi ve Gökşin bunu isteyerek kabul etmişti. O
            // gerekçe ARTIK YOK: sis her karede değil, çizim başına BİR KEZ
            // hesaplanıyor (bkz. dhSisRasterle). Yani ödenen görsel bedelin
            // karşılığında artık hiçbir şey alınmıyordu.
            // ÖLÇÜLDÜ (2026-08-17, önbellek kırılarak, 2 tur × 5 örnek):
            // resim üretimi oktav 1'de ~291 ms, oktav 2'de ~321 ms — çizim
            // başına ~30 ms. Bu süre açılışta perdenin arkasında geçiyor
            // (toplam ~1650 ms) ve sonra yalnızca yeni keşifte tekrarlanıyor.
            // KARE SÜRESİ DEĞİŞMİYOR: oktav 2 ile de her yakınlıkta ~17 ms
            // (ayrıca ölçüldü) — tuval sonuçta bir bitmap, nasıl üretildiği
            // kullanım maliyetini etkilemiyor.
            //
            // ⚠️ AMA GÖKŞİN FARKI GÖREMEDİ (2026-08-17, yerel test sayfasında
            // bakıp): "gayet akıcıydı, harita görünümü iyiydi, bir fark
            // hissetmedim." Yani bu ayarın ALGILANABİLİR bir faydası yok.
            // 1'e geri çevrilmedi çünkü dosya o sırada zaten depoya yüklenmişti
            // ve geri almak, görünürde aynı sonuç için fazladan bir yükleme
            // gerektirecekti. Sis kenarının ayrıntısını artırma fikri ileride
            // yine akla gelirse: DENENDİ, ÖLÇÜLDÜ, KULLANICI GÖREMEDİ.
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
        '<canvas id="dhSisTuval"></canvas>' +
        '<svg id="dhGrid"></svg>' +
      '</div>' +
      '<div id="dhVinyet"></div>' +
      '<div id="dhPerde"></div>' +
      '<div id="dhCerceve">' +
        '<img class="dhKose k1" alt=""><img class="dhKose k2" alt="">' +
        '<img class="dhKose k3" alt=""><img class="dhKose k4" alt="">' +
        '<img id="dhPusula" alt=""><img id="dhGemi" alt="">' +
      '</div>' +
      '<div id="dhOynat" style="display:none">' +
        '<button type="button" data-mod="son">▶ Tekrar Oynat</button>' +
        '<button type="button" data-mod="hepsi">⏮ Baştan Oynat</button>' +
      '</div>' +
    '</div>';

  DH.kutu  = document.getElementById('dhKutu');
  DH.dunya = document.getElementById('dhDunya');
  // #dhDunya yeni baştan yaratıldı, üstündeki --olcek gitti; önbelleği sıfırla
  // yoksa ilk dhKamUygula "değişmedi" sanıp değişkeni hiç yazmaz.
  DH.sonOlcek = null;
  document.getElementById('dhDoku').style.backgroundImage = 'url("diyarlar/deniz-dokusu.png")';

  dhDetayKur();
  dhOlaylar();
  dhOynatKur();
  dhSusKur();
  DH.kurulu = true;
  return true;
}

// ── Kamera ────────────────────────────────────────────────────────────
function dhEnAzOlcek() {
  const r = DH.kutu.getBoundingClientRect();
  return Math.max(r.width / DH.DUNYA, r.height / DH.DUNYA);
}
// En çok yakınlık 2.5 → 1.6 (2026-08-14). Gerekçe sayısal: görseller 1024 px
// kaynaktan geliyor ve dünyada aralık*(gorsel/100) ≈ 630 birim kaplıyorlar,
// yani ekranda 1024 piksele 1024/630 ≈ 1.63 katta ulaşıyorlar. Ondan sonrası
// yeni ayrıntı göstermiyor, sadece aynı görüntüyü esnetiyor — eski 2.5 sınırında
// görsel kendi çözünürlüğünün 1.5 katına şişiyordu. Sınırı buraya çekmek
// görünürde hiçbir ayrıntı kaybettirmiyor ama sis filtresinin EN PAHALI olduğu
// bölgeyi tamamen ortadan kaldırıyor (Gökşin bildirdi: "ne kadar çok zoom
// yapılırsa o kadar takılıyor").
// ── Azami yakınlık ────────────────────────────────────────────────────
// İKİ sınırın küçüğü alınıyor, çünkü iki ayrı sebep var:
//
//   1) GÖRSEL ÇÖZÜNÜRLÜĞÜ (1.6, sabit) — kaynak görseller 1024 px ve dünyada
//      ~630 birim kaplıyorlar, yani 1.63 katta ekranda kendi çözünürlüklerine
//      ulaşıyorlar. Ötesi yeni ayrıntı değil, büyütülmüş bulanıklık.
//
//   2) EKRANA ORAN (yeni, 2026-08-17) — "bir diyar pencerenin en fazla yüzde
//      kaçını kaplasın". Gökşin bildirdi: "çok gereksiz çok fazla zoom yapıyor,
//      bir görselin adeta burnuna kadar girmek hoş durmuyor." Şikâyet
//      TELEFONA ÖZGÜ ve sebebi sınırın sabit bir sayı olmasıydı: 1.6 katta bir
//      diyar ekranda 896 px kaplıyor — PC'de (1366 px) genişliğin %66'sı,
//      tablette (~1100 px) %81'i, ama TELEFONDA (390 px) %230'u. Yani aynı
//      rakam küçük ekranda orantısız büyük çıkıyordu. Orana çevrilince his
//      her cihazda aynı oluyor; PC ve tablette 1.6 sınırı zaten devrede kaldığı
//      için orada hiçbir şey değişmiyor.
//
// Not: yakınlığı kısmak performansa da yarıyor ama ARTIK SEBEBİ SİS DEĞİL —
// sis rasterleştiği için maliyeti yakınlıktan bağımsız (her yakınlıkta ~17 ms).
// Kalan kazanç diyar görsellerinden geliyor (dhBuyugeGec eşiği aşılmıyor).
function dhEnCokOlcek() {
  const r = DH.kutu.getBoundingClientRect();
  const gorselDunya = DH.ayar.aralik * (DH.ayar.gorsel / 100);
  const oranli = (r.width * (DH.ayar.doluluk / 100)) / gorselDunya;
  // En az sınırının altına inmemeli, yoksa dar pencerede harita kilitlenir.
  return Math.max(dhEnAzOlcek(), Math.min(1.6, oranli));
}
function dhOlcekSinirla(s) { return Math.min(dhEnCokOlcek(), Math.max(dhEnAzOlcek(), s)); }
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

  // --olcek YALNIZCA yakınlık değiştiğinde yazılıyor. Eskiden her karede
  // yazılıyordu; etiketlerin punto'su bu değişkene bağlı olduğu için
  // (`.dhEtiket` kuralındaki calc), sadece sağa sola KAYDIRIRKEN bile
  // tüm etiketlerin yazı boyutu yeniden hesaplanıyordu — yakınlık hiç
  // değişmediği hâlde. Gökşin 2026-08-14'te tablette bildirdi: etiket
  // kapalıyken takılma azalıyor. Kaydırmada artık hiç maliyeti yok.
  const olcekYazi = DH.kam.s.toFixed(4);
  if (olcekYazi !== DH.sonOlcek) {
    DH.sonOlcek = olcekYazi;
    DH.dunya.style.setProperty('--olcek', olcekYazi);
    // 0.30'un altında yazı ekranda 13px'e çıkamıyor (üst sınır devreye giriyor);
    // okunmayan etiketi göstermek yerine gizliyoruz.
    DH.kutu.classList.toggle('etiketUzak', DH.kam.s < 0.30);
  }
}
// ── Kamera güncellemesini kare başına teke indir ──────────────────────
// Girdi olayları ekranın çizebildiğinden hızlı geliyor: dokunmatikte saniyede
// 120'ye kadar pointermove üretilebiliyor, ekran ise 60 kare çiziyor. Her
// olayda doğrudan dhKamUygula() çağrılınca istekler sıraya giriyor ve harita
// pürüzsüz görünse bile parmağın ARKASINDAN geliyor — Gökşin 2026-08-14'te
// tablette bildirdi: "sanki 1 saniye geriden geliyormuş gibi". Görünüm
// değişmiyor, yalnızca aynı kare içindeki fazla çizimler birleştiriliyor.
let dhKamKare = 0, dhDurduSayac = 0;
function dhKamIste() {
  // Fare tekerleğinde "parmak kalktı" anı yok; hareket durduktan kısa süre
  // sonra tam boy görsele geçişi burada tetikliyoruz.
  clearTimeout(dhDurduSayac);
  dhDurduSayac = setTimeout(dhBuyugeGec, 250);
  if (dhKamKare) return;
  dhKamKare = requestAnimationFrame(() => { dhKamKare = 0; dhKamUygula(); });
}
// Hareket bitince bekleyen kareyi iptal edip son konumu hemen uygula: sekme
// arka plana alınırsa requestAnimationFrame hiç çalışmaz ve harita bir adım
// geride kalırdı.
function dhKamHemen() {
  if (dhKamKare) { cancelAnimationFrame(dhKamKare); dhKamKare = 0; }
  clearTimeout(dhDurduSayac); dhDurduSayac = 0;
  dhKamUygula();
  // Tam boy görsele geçiş YALNIZCA hareket bittiğinde. Eskiden her kamera
  // güncellemesinde çağrılıyordu, yani kullanıcı parmağıyla yakınlaştırırken
  // harita bir yandan kayıyor bir yandan 1024'lük görseller indirilip
  // açılıyordu. Gökşin 2026-08-14'te telefonda bildirdi: "sürüklerken/
  // yakınlaştırırken ağır" — ve tam da küçük görseller canlıya çıktıktan
  // sonra başlamıştı, çünkü öncesinde her şey zaten büyük yükleniyordu ve
  // geçiş diye bir an yoktu. Hareket sırasında fazladan iş yapmamak, bu
  // dosyadaki diğer akıcılık düzeltmeleriyle aynı ilke.
  dhBuyugeGec();
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

// ── Çerçeve ve süsler ─────────────────────────────────────────────────
// ⚠️ DEPLOY: bu üç dosya da "diyarlar/" klasörüne yüklenmeli —
//    diyar-kose.webp · diyar-pusula.webp · diyar-gemi.webp
// Yüklenmezlerse harita BOZULMAZ: her görsel onerror'da kendini gizliyor,
// geriye yalnızca ince altın çizgi kalıyor.
const DH_SUS = { koseOran: 0.105, koseEnAz: 44, koseEnCok: 92,
                 pusulaOran: 0.10, pusulaEnAz: 58, pusulaEnCok: 88,
                 gemiEsik: 560, gemiYukOran: 0.46, gemiEnOran: 0.26 };

function dhSusKur() {
  const c = document.getElementById('dhCerceve');
  if (!c || c.dataset.kurulu) return;
  c.dataset.kurulu = '1';
  const ata = (el, dosya) => {
    if (!el) return;
    el.onerror = function () { this.style.visibility = 'hidden'; };
    el.src = encodeURI('diyarlar/' + dosya);
  };
  c.querySelectorAll('.dhKose').forEach(k => ata(k, 'diyar-kose.webp'));
  ata(document.getElementById('dhPusula'), 'diyar-pusula.webp');
  ata(document.getElementById('dhGemi'),   'diyar-gemi.webp');
  // Tablet döndürüldüğünde kutu genişliği değişiyor; boyutlar ve gemi/pusula
  // seçimi yeniden hesaplanmalı. dhCiz her boyut değişiminde çalışmıyor.
  window.addEventListener('resize', dhSusTazele);
}

// Boyutlar kutunun GERÇEK genişliğine göre — ortam sorgusu (media query)
// pencereyi ölçer, kutuyu değil; kutu ise `min(960px, kapsayıcı)` olduğu için
// ikisi aynı şey değil.
function dhSusTazele() {
  const c = document.getElementById('dhCerceve');
  if (!c || !DH.kutu) return;
  const r = DH.kutu.getBoundingClientRect();
  const sinirla = (v, az, cok) => Math.round(Math.max(az, Math.min(cok, v)));
  c.style.setProperty('--koseBoy', sinirla(r.width * DH_SUS.koseOran,
                                           DH_SUS.koseEnAz, DH_SUS.koseEnCok) + 'px');
  c.style.setProperty('--pusulaBoy', sinirla(r.width * DH_SUS.pusulaOran,
                                             DH_SUS.pusulaEnAz, DH_SUS.pusulaEnCok) + 'px');
  c.style.setProperty('--gemiBoy', Math.round(Math.min(r.height * DH_SUS.gemiYukOran,
                                                       r.width * DH_SUS.gemiEnOran)) + 'px');
  // Geniş ekranda gemi (kendi pusulasıyla), dar ekranda ayrı pusula.
  // İkisi birden asla görünmüyor — yoksa haritada iki pusula olurdu.
  const genis = r.width >= DH_SUS.gemiEsik;
  const gemi = document.getElementById('dhGemi'), pusula = document.getElementById('dhPusula');
  if (gemi)   gemi.style.display   = genis ? '' : 'none';
  if (pusula) pusula.style.display = genis ? 'none' : '';
}

// Yeniden oynatma düğmeleri.
//
// ⚠️ pointerdown DURDURULMALI. Harita kutusunun kendi pointerdown'ı hemen
// setPointerCapture çağırıyor; durdurulmazsa düğmeye basmak haritayı
// sürüklemeye başlıyor ve click hiç oluşmuyor.
//
// ⚠️ dhAyarSeridi'nin İÇİNE KOYMA: o şerit geçici, kilit açılırken silinecek.
// Bu düğmeler kalıcı bir özellik (dünya haritasında da var).
function dhOynatKur() {
  const kap = document.getElementById('dhOynat');
  if (!kap || kap.dataset.kurulu) return;
  kap.dataset.kurulu = '1';
  kap.addEventListener('pointerdown', ev => ev.stopPropagation());
  kap.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      dhKesifTekrar(b.dataset.mod);
    });
  });
}

// Hiç keşif yoksa düğmelerin işi yok; animasyon oynarken de basılamamalı.
function dhOynatTazele() {
  const kap = document.getElementById('dhOynat');
  if (!kap) return;
  const adet = (typeof dhKesifSirasi === 'function' ? dhKesifSirasi(me) : []).length;
  kap.style.display = adet ? '' : 'none';
  kap.querySelectorAll('button').forEach(b => { b.disabled = dhKesifOynuyor; });
}

// mod: 'son' → yalnızca son keşif · 'hepsi' → boş haritadan başlayarak hepsi
//      'tek' → yalnızca diyarId'si verilen keşif (akış kartından geliniyor)
function dhKesifTekrar(mod, diyarId) {
  if (dhKesifOynuyor) return;
  const sira = dhKesifSirasi(me).map(e => e.diyarId);
  if (!sira.length) return;
  const liste = mod === 'hepsi' ? sira
              : mod === 'tek'   ? sira.filter(id => id === diyarId)
              :                   sira.slice(-1);
  if (!liste.length) return;
  DH.bekleyen = new Set(liste);
  dhCiz();
  dhHaritaHazir().then(dhKesifKuyrugu);
}

// Akış kartından bir diyara gelinince o diyarın keşif animasyonunu hazırlar.
//
// ⚠️ SİS, BULUTLAR AÇILMADAN ÖNCE KAPANMALI. dhKesifTekrar iki iş yapıyor:
// dhCiz ile diyarın sisini HEMEN kapatıyor, oynatmayı ise kuyruğa bırakıyor
// (kuyruk bulutların açılmasını kendisi bekliyor). Bu yüzden burada bulutlar
// BEKLENMİYOR — beklenirse bulutlar açıldığında diyar bir an keşfedilmiş
// görünüyor, sonra üstü sisle kapanıyordu.
//
// ⚠️ ÖNCE BU GEZİNMENİN ÇİZİMİ BEKLENİYOR. Harita daha önce açılmışsa
// DH.kurulu zaten true; beklemeden davranılırsa hazırlık, hemen ardından gelen
// renderDiyarHarita tarafından eziliyor. Ölçüt DH.cizimNo — her dhCiz'de artıyor.
async function dhDiyaraGit(diyarId) {
  // ⚠️ HER AŞAMANIN KENDİ BÜTÇESİ VAR, ortak bir emniyet freni DEĞİL. İlk hâli
  // tek bir 20 sn'lik bütçeyi üçü arasında paylaştırıyordu; ilk aşama yavaş
  // olunca (harita kurulumu) sonrakilere hiç süre kalmıyor ve animasyon sessizce
  // hiç oynamıyordu. Ölçümde görüldü. Süreler cömert: bunlar yoklama
  // döngüsünün ÜST SINIRI, normalde çok önce çıkılıyor, beklemenin bedeli yok.
  const bekle = (kosul, ms) => new Promise(async res => {
    const son = performance.now() + ms;
    while (performance.now() < son && kosul()) await new Promise(r => setTimeout(r, 90));
    res();
  });
  const ilkCizim = DH.cizimNo || 0;
  await bekle(() => (DH.cizimNo || 0) === ilkCizim, 15000);
  await bekle(() => !(DH.kurulu && DH.slotlar && DH.slotlar.length), 15000);
  // Bu diyar zaten sıradaysa (ilk kez görülüyor) kendi kuyruğu oynatacak;
  // ikinci kez tetiklemek animasyonu üst üste bindirirdi.
  if (DH.bekleyen && DH.bekleyen.has(diyarId)) return;
  // Süregelen bir kuyruk "Baştan Oynat" olabilir — 16 diyar ~80 saniye sürüyor.
  await bekle(() => dhKesifOynuyor, 120000);
  dhKesifTekrar('tek', diyarId);
}

function dhOlaylar() {
  let surukle = null, cimdik = null;

  DH.kutu.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    // Faredeki seçim/görsel-sürükleme davranışını daha başlarken kes (CSS'teki
    // user-select:none ile birlikte). Tıklama pointerup'ta elle işlendiği için
    // burada varsayılanı iptal etmek bir şey kaybettirmiyor.
    if (ev.pointerType === 'mouse') ev.preventDefault();
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
    dhKamIste();
  });
  DH.kutu.addEventListener('pointerup', ev => {
    if (!surukle) return;
    // Dokunmatikte parmak her zaman birkaç piksel oynar; fare eşiği (5px)
    // kullanılınca her dokunuş "sürükleme" sayılıp panel hiç açılmıyordu.
    const esik = surukle.tip === 'touch' ? 14 : 5;
    const kisa = surukle.hareket < esik;
    surukle = null;
    DH.kutu.classList.remove('suruklerken');
    dhKamHemen();
    if (kisa) dhTiklama(ev.clientX, ev.clientY);
  });
  DH.kutu.addEventListener('pointercancel', () => {
    surukle = null; DH.kutu.classList.remove('suruklerken');
    dhKamHemen();
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
    dhKamIste();
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
    dhKamIste();
  }, { passive: false });
  DH.kutu.addEventListener('touchend', () => { cimdik = null; dhKamHemen(); });
}

// ══════════════════════════════════════════════════════════════════════
// ÇİZİM
// ══════════════════════════════════════════════════════════════════════
function dhGorselYolu(dosya) { return 'diyarlar/' + dosya; }
function dhKucukYolu(dosya) { return 'diyarlar/kucuk/' + dosya; }

// ── Küçük görsel kopyaları ────────────────────────────────────────────
// Kaynak görseller 1024x1024; haritada 100-270 px, panelin küçük sahne
// karelerinde 52 px gösteriliyorlar. Tam boy açmak boşa iş: açılış
// süresinin çoğu indirme değil, bu çözme işiydi (2026-08-14 ölçümü).
// "diyarlar/kucuk/" içinde aynı adla 512'lik kopyalar duruyor.
//
// KOPYA YOKSA BÜYÜĞÜNE DÜŞER (onerror). Bu kasıtlı: Gökşin ileride yeni bir
// görsel eklediğinde küçük kopyasını üretmeyi unutsa da -- ya da Claude Code
// erişimi olmasa da -- harita çalışmaya devam etsin, sadece o görsel yavaş
// açılsın. Küçük kopyaları üretmek için: "hayali diyar görselleri" klasöründeki
// "▶ GÖRSEL KÜÇÜLT" dosyasına çift tıkla.
//
// ⚠️ DEPLOY: diyar-harita.js ile birlikte "diyarlar/kucuk" klasörü de
// yüklenmeli. Yüklenmezse uygulama bozulmaz ama her görsel önce boşuna
// aranıp sonra büyüğüne düşer -- yani ilk açılış BUGÜNKÜNDEN yavaş olur.
function dhGorselAta(img, dosya, kucukKullan) {
  const buyuk = encodeURI(dhGorselYolu(dosya));
  if (!kucukKullan) { img.src = buyuk; return; }
  img.dataset.buyuk = buyuk;
  img.onerror = function () { this.onerror = null; this.src = buyuk; };
  img.src = encodeURI(dhKucukYolu(dosya));
}

// Küçük kopya 512 px; görselin dünya boyu aralık*(gorsel/100) = ~630 px.
// Ekranda 512 pikseli aşınca esnetilmiş görünmeye başlar, o noktada büyüğe
// geçiyoruz. Eşiğin altında kalırken büyük dosya hiç indirilmiyor.
function dhBuyukEsigi() {
  return 512 / (DH.ayar.aralik * (DH.ayar.gorsel / 100));
}

// Yakınlaşınca YALNIZCA ekranda olan diyarları büyük görsele çevirir.
// Hepsini çevirmek, görünmeyen onlarca görseli boşuna indirmek olurdu.
function dhBuyugeGec() {
  if (!DH.kutu || DH.kam.s < dhBuyukEsigi()) return;
  // Her kamera hareketinde çalışıyor. Çevrilecek görsel kalmadıysa hemen çık:
  // aşağıdaki döngü diyar başına getBoundingClientRect çağırıyor ve bu, tam
  // yakınlaştırılmışken sürükleme sırasında her karede yerleşim hesabı demek.
  if (!document.querySelector('#dhKat img[data-buyuk]')) return;
  const k = DH.kutu.getBoundingClientRect();
  document.querySelectorAll('#dhKat .dhDiyar').forEach(el => {
    const img = el.querySelector('img');
    if (!img || !img.dataset.buyuk) return;          // zaten büyük
    const r = el.getBoundingClientRect();
    if (r.right < k.left || r.left > k.right ||
        r.bottom < k.top || r.top > k.bottom) return; // ekran dışı
    img.onerror = null;
    img.src = img.dataset.buyuk;
    delete img.dataset.buyuk;
  });
}

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
    getComputedStyle(DH.kutu).getPropertyValue('--sisRenk').trim() || '#000000');
  // Sis siyah olduğu için bulut dokusu görünmez (overlay harmanı siyah zeminde
  // siyah kalır) — hesaplanmasına da gerek yok. Kapatmak aynı zamanda her
  // yakınlaştırmada yeniden çizilen bir turbulans deseninden kurtarıyor,
  // yani zayıf donanımda gözle görülür bir performans kazancı.
  document.getElementById('dhSisBulut').setAttribute('opacity', '0');
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

  // ⚠️ BEKLEYEN KEŞFİN SİSİ HİÇ AÇILMAZ (2026-08-22).
  // Önceki iki hâlde de delik ve köprüler herkes için çiziliyordu; keşfedilmemiş
  // diyar yalnızca üstüne konan bir örtüyle gizleniyordu. Gökşin canlıda gördü:
  // "yanyana iki diyar keşfediyoruz... mavi arkaplan üstünde 2 kara delik var".
  // Sis açık olduğu için altındaki DENİZ görünüyordu, örtüler de onun ortasında
  // yüzen lekeler gibi duruyordu — oysa keşfedilmemiş alan baştan sona karanlık
  // olmalı. Delik ve köprüler artık animasyon BİTİNCE ekleniyor
  // (bkz. dhKesifOynat), sis o an bir kez yeniden üretiliyor.
  DH.cizimNo = (DH.cizimNo || 0) + 1;
  DH.slotlar.forEach(sl => {
    if (!sl.diyar) return;
    dhYerlestir(sl);
    if (!dhBekliyor(sl.diyar.id)) dhDelikAc(sl);
  });
  DH.slotlar.forEach(sl => {
    if (!sl.diyar || dhBekliyor(sl.diyar.id)) return;
    dhKomsular(sl.q, sl.r).forEach(([kq, kr]) => {
      if (kq < sl.q || (kq === sl.q && kr < sl.r)) return;      // her çifti bir kez
      const k = DH.slotHarita.get(kq + ',' + kr);
      if (k && k.diyar && !dhBekliyor(k.diyar.id)) dhKopruCiz(sl, k);
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

  dhOynatTazele();
  dhSusTazele();

  // Sis geometrisi bu noktada tamam; ekranda gösterilecek kopyayı üret.
  // Söz saklanıyor: keşif animasyonu yamayı BU rasterden kırpıyor, hazır
  // olmadan başlarsa eski rasteri kopyalar (bkz. dhKesifKuyrugu).
  DH.sisSozu = dhSisRasterle();
}

// ══════════════════════════════════════════════════════════════════════
// SİS RASTERİ
// ══════════════════════════════════════════════════════════════════════
// Sis, haritanın EN PAHALI katmanı. Canlı bir SVG olarak durduğu sürece
// yakınlık her değiştiğinde (yani çimdiklemenin HER karesinde) baştan
// hesaplanıyor ve maliyeti yakınlıkla birlikte büyüyor. Çözüm: sis bir kez
// resme dönüştürülüp öyle gösteriliyor. Resim ölçeklemek ucuz ve maliyeti
// yakınlıktan bağımsız.
//
// ÖLÇÜM (2026-08-17, PC + yerel sunucu, 16 diyar, 390x700 kutu; her karede
// yakınlık değişerek — yani gerçek çimdikleme gibi; kare başına en hızlı süre):
//
//   yakınlık   canlı SVG    <img> içinde SVG    TUVAL
//      0.8       83 ms           83 ms          33 ms
//      1.6      250 ms          250 ms          33 ms
//      3.0      467 ms          467 ms          33 ms
//      4.4      467 ms          467 ms          33 ms
//
// Gökşin'in telefonu (Redmi Note 10 Pro, piksel yoğunluğu 2.75, 120 Hz) en çok
// yakınlıkta PC'nin 4.4'üne denk geliyor — orada 467 ms saniyede 2 kare demek.
// Bildirdiği belirti buydu: "özellikle yakınlaştırınca ağırlaşıyor, parmağımı
// geriden takip ediyor". Sisi kapatınca düzelmesi de bunu doğruluyordu.
//
// ⚠️ TUVAL ŞART, <img> YETMEZ (ölçüldü, yukarıdaki orta sütun): Chrome bir
// SVG'yi <img> içinde de VEKTÖR olarak tutar ve ölçek değişince yeniden çizer —
// yani hiçbir şey kazandırmaz. Kazanç ancak gerçek bir bitmap ile geliyor.
//
// ⚠️ ÖNCE DENENİP ÇÜRÜTÜLENLER (tekrar denemeye gerek yok, hepsi ölçüldü):
// yumuşak kenar filtresini kapatmak · sis katmanının yüzeyini 4000'den 1000'e
// düşürmek · maskeyi tamamen kaldırmak · 92 sis deliğini silmek. Dördü de en
// yakında hiçbir şey değiştirmedi. Pahalı olan sisin bir parçası değil,
// çizilmesinin kendisi.
//
// Çözünürlük 2048: sisin en ince ayrıntısı bulanıklık yarıçapı (aralık*0.018
// ≈ 12.6 dünya birimi). 2048'de bir piksel 1.95 dünya birimi, yani o bulanıklık
// ~6.5 piksele yayılıyor — yumuşaklık korunuyor. 1024'te 3.2 piksele düşer,
// sınırda kalır. Yükseltmek de bedava değil: tuval bellekte en x boy x 4 bayt
// tutuyor (2048'de ~17 MB, 4096'da ~67 MB — telefon için fazla).
const DH_SIS_RASTER = 2048;

// Söz döndürüyor: yeni raster EKRANA GELDİĞİNDE çözülüyor.
//
// sessiz=true → ESKİ RASTER ekranda kalır, canlı SVG'ye hiç geçilmez. Yalnızca
// keşif animasyonu kullanıyor: orada değişen bölgenin üstünde zaten sisin
// kopyası (yama) duruyor, yani eski rasterin o diyarın deliğini içermemesi
// görünmüyor. Kazancı gerçek — canlı SVG en pahalı katman, 300 ms boyunca
// ekranda tutmak animasyonun tam ortasına denk geliyordu.
function dhSisRasterle(sessiz) {
 return new Promise(bitti => {
  const svg = document.getElementById('dhSis');
  const tuval = document.getElementById('dhSisTuval');
  if (!svg || !tuval) { bitti(); return; }

  // Yeni raster hazır olana kadar CANLI sis görünür kalıyor: sis bir an bile
  // kalkmamalı (Gökşin, 2026-08-17 — "kullanım sırasında bir kez bile kalkacak
  // olursa amacından çıkmış olur"). Eski rasteri bırakmak normalde olmazdı,
  // yeni keşfedilen diyarın deliği onda yok — sessiz kipin şartı da bu.
  if (!sessiz) {
    svg.style.display = '';
    tuval.style.display = 'none';
  }

  // Sıra numarası: art arda iki çizim olursa geciken ESKİ rasterin yeniyi
  // ezmesini engelliyor (perdedeki dhPerdeNo ile aynı mantık).
  const no = (DH.sisNo = (DH.sisNo || 0) + 1);

  const kopya = svg.cloneNode(true);
  kopya.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  kopya.setAttribute('viewBox', '0 0 ' + DH.DUNYA + ' ' + DH.DUNYA);
  kopya.setAttribute('width', DH_SIS_RASTER);
  kopya.setAttribute('height', DH_SIS_RASTER);
  kopya.removeAttribute('id');

  const img = new Image();
  img.onload = function () {
    if (DH.sisNo !== no || !document.getElementById('dhSisTuval')) { bitti(); return; }
    tuval.width = DH_SIS_RASTER; tuval.height = DH_SIS_RASTER;
    tuval.style.width = DH.DUNYA + 'px';
    tuval.style.height = DH.DUNYA + 'px';
    const c = tuval.getContext('2d');
    c.clearRect(0, 0, DH_SIS_RASTER, DH_SIS_RASTER);
    c.drawImage(img, 0, 0, DH_SIS_RASTER, DH_SIS_RASTER);
    tuval.style.display = 'block';
    svg.style.display = 'none';
    bitti();
  };
  // GÜVENLİK AĞI: raster üretilemezse canlı SVG'ye düş. Harita yavaşlar ama
  // BOZULMAZ, sis de kaybolmaz. (Küçük görsellerdeki onerror -> büyüğüne düş
  // deseniyle aynı mantık.) Sessiz kipte de düşülüyor: eski raster, yeni
  // açılan deliği içermiyor.
  img.onerror = function () {
    if (DH.sisNo === no) { svg.style.display = ''; tuval.style.display = 'none'; }
    bitti();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' +
            encodeURIComponent(new XMLSerializer().serializeToString(kopya));
 });
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
  dhGorselAta(kutu.querySelector('img'), dosya, true);   // harita: küçük kopya

  const tohum = dhTohumla(sl.diyar.id + '|' + dosya);
  kutu.style.setProperty('--maske', dhMaskeUret(tohum, DH.ayar.yumusak, DH.ayar.sekil / 100));
  // Etiket açılmış alanın İÇİNDE kalsın (sabit yüzde kullanılınca büyük
  // boyutlarda kutunun dibine düşüp hâlâ sisli bölgede kayboluyordu).
  const R = dhDelikYaricapi();
  kutu.querySelector('.dhEtiket').style.bottom = Math.max(4, g / 2 - R * 0.66) + 'px';

  // Bekleyen keşif: görsel gizli başlar, keşif animasyonu onu belirtir.
  if (DH.bekleyen && DH.bekleyen.has(sl.diyar.id)) kutu.style.opacity = '0';

  document.getElementById('dhKat').appendChild(kutu);
  sl.el = kutu;
}

function dhDelikAc(sl) {
  const R = dhDelikYaricapi(), A = DH.ayar, W = A.aralik;
  const g = document.createElementNS(DH.NS, 'g');   // filtre üst grupta
  // Siluet diyara bağlı: aynı diyar her yeniden çizimde aynı şekli alsın
  // (dhCiz her ayar değişiminde ve detay panelinden dönüşte çalışıyor).
  const rnd = dhUretec(dhTohumla(sl.diyar.id + '|delik'));

  // Kusursuz daire + 60°'lik aralıklarla altı EŞ yaprak = altıgen/çiçek
  // siluet (2026-08-13'te Gökşin bildirdi: "hex sınırları görünüyor" —
  // görünen şey çizgi değil, sisin açıldığı alanın kendi şekliydi).
  // Ana delik hafifçe elipsleştirildi; yapraklar aşağıda düzensizleştiriliyor.
  const ana = document.createElementNS(DH.NS, 'ellipse');
  ana.setAttribute('cx', sl.cx.toFixed(1));
  ana.setAttribute('cy', sl.cy.toFixed(1));
  ana.setAttribute('rx', (R * (0.93 + rnd() * 0.14)).toFixed(1));
  ana.setAttribute('ry', (R * (0.93 + rnd() * 0.14)).toFixed(1));
  ana.setAttribute('fill', '#000');
  g.appendChild(ana);

  // YAPRAKLAR — ana delik yarıçapı ~0.29*ARALIK iken görsel 0.80*ARALIK
  // genişliğinde; yani yapraksız bırakılırsa diyarın yalnızca ortası görünür.
  // Delik bu kadar küçük çünkü DOLU bir komşunun görseline dokunmamalı.
  // Komşu slotta diyar yoksa korunacak bir şey de yok — o yöne açılabilir.
  const bosYon = [], doluKomsu = [];
  dhKomsular(sl.q, sl.r).forEach(([kq, kr]) => {
    const komsu = DH.slotHarita.get(kq + ',' + kr);
    if (!komsu) return;                                  // gridin dışı
    if (komsu.diyar) { doluKomsu.push(komsu); return; }
    const dx = komsu.cx - sl.cx, dy = komsu.cy - sl.cy;
    const uz = Math.hypot(dx, dy);
    if (uz > 1) bosYon.push(Math.atan2(dy, dx));
  });

  // Hiçbir leke DOLU komşunun görseline değmemeli. Yaprakların açısı artık
  // saptığı için "yalnızca boş yöne aç" kuralı tek başına yetmiyor: leke
  // dolu komşuya yaklaşıyorsa küçültülüyor, iyice küçülüyorsa çizilmiyor.
  const guvenli = W * ((A.gorsel / 100) * 0.5 + 0.02);
  function leke(x, y, r) {
    doluKomsu.forEach(k => { r = Math.min(r, Math.hypot(x - k.cx, y - k.cy) - guvenli); });
    if (r < W * 0.06) return;
    const e = document.createElementNS(DH.NS, 'ellipse');
    e.setAttribute('cx', x.toFixed(1)); e.setAttribute('cy', y.toFixed(1));
    e.setAttribute('rx', r.toFixed(1)); e.setAttribute('ry', r.toFixed(1));
    e.setAttribute('fill', '#000');
    g.appendChild(e);
  }

  // Altı yöne de aynı boyda yaprak açılınca siluet altıgen çıkıyordu. İki
  // müdahale: (a) yönlerin bir kısmı hiç açılmıyor — bu tarafta diyarın kıyısı
  // siste kalıyor; (b) kalanların açısı ±18°, uzaklığı ve boyu sapıyor.
  for (let i = bosYon.length - 1; i > 0; i--) {           // Fisher-Yates
    const j = Math.floor(rnd() * (i + 1));
    const t = bosYon[i]; bosYon[i] = bosYon[j]; bosYon[j] = t;
  }
  const atla = bosYon.length >= 5 ? 2 : (bosYon.length >= 3 ? 1 : 0);
  bosYon.slice(0, bosYon.length - atla).forEach(yon => {
    const aci = yon + (rnd() - 0.5) * 0.63;
    const uz  = W * (0.22 + rnd() * 0.11);
    leke(sl.cx + Math.cos(aci) * uz, sl.cy + Math.sin(aci) * uz, W * (0.19 + rnd() * 0.09));
  });

  // Serpinti: siluette kalan düzgün kavisleri de kırıyor. Yönü tamamen
  // serbest; dolu komşuya denk gelirse yukarıdaki kısıt zaten söndürüyor.
  const serpinti = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < serpinti; i++) {
    const aci = rnd() * Math.PI * 2;
    const uz  = W * (0.28 + rnd() * 0.10);
    leke(sl.cx + Math.cos(aci) * uz, sl.cy + Math.sin(aci) * uz, W * (0.09 + rnd() * 0.06));
  }

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
      '<div id="dhDetayAd"></div><div id="dhDetaySahneAd"></div>' +
      '<div id="dhDetayNot"></div>' +
      '<div id="dhDetayKitap"></div><div id="dhSahneler"></div>' +
    '</div>';
  document.body.appendChild(d);
  document.getElementById('dhDetayKapat').addEventListener('click', dhDetayKapat);
  d.addEventListener('click', ev => { if (ev.target.id === 'dhDetay') dhDetayKapat(); });
  dhSahneKaydirmaKur();
  window.addEventListener('keydown', ev => {
    if (!document.body.classList.contains('dhDetayAcik')) return;
    if (ev.key === 'Escape') dhDetayKapat();
    // Masaüstünde kaydırmanın karşılığı ok tuşları.
    else if (ev.key === 'ArrowRight') dhSahneAtla(1);
    else if (ev.key === 'ArrowLeft')  dhSahneAtla(-1);
  });
}

// ── Sahneler arası geçiş ──────────────────────────────────────────────
// Küçük sahne kareleri baştan beri vardı; eksik olan hareketin kendisiydi
// (Gökşin 2026-08-22'de hatırlattı: "birden fazla görseli olan diyarın resmini
// büyüttüğümüzde kaydırarak resimler arası geçiş yapabilecektik").
//
// yon: +1 sonraki · -1 önceki. Uçlarda başa/sona SARIYOR — 2-4 sahnelik küçük
// bir galeride durdurmak, kullanıcıya "bozuk mu?" dedirtiyor.
function dhSahneAtla(yon) {
  if (!DH.detay) return;
  const n = (DH.detay.diyar.sahneler || []).length;
  if (n < 2) return;
  dhSahneGoster(DH.detay.diyar, (DH.detay.i + yon + n) % n);
}

// Kaydırma. Eşik 40 px ve hareket YATAY olmalı — yoksa her dokunuş sahne
// değiştirir, panelde dikey kaydırma da imkânsızlaşırdı.
function dhSahneKaydirmaKur() {
  const sahne = document.getElementById('dhDetaySahne');
  if (!sahne || sahne.dataset.kaydirma) return;
  sahne.dataset.kaydirma = '1';
  let bas = null;
  sahne.addEventListener('pointerdown', ev => {
    if (!DH.detay || (DH.detay.diyar.sahneler || []).length < 2) return;
    bas = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
  });
  sahne.addEventListener('pointerup', ev => {
    if (!bas || ev.pointerId !== bas.id) { bas = null; return; }
    const dx = ev.clientX - bas.x, dy = ev.clientY - bas.y;
    bas = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    dhSahneAtla(dx < 0 ? 1 : -1);          // sola çekmek "sonraki"
  });
  sahne.addEventListener('pointercancel', () => { bas = null; });
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
  DH.detay = { diyar, i };                 // kaydırma ve ok tuşları buradan okuyor

  // Kısa sönüm: maske ve görsel aynı anda değiştiği için sert geçişte
  // bir kare boyunca eski maske yeni görselin üstünde kalıyor.
  // ⚠️ Yükleme dinleyicisi src'DEN ÖNCE bağlanmalı; ayrıca önbellekten gelen
  // görselde load hiç tetiklenmeyebilir, o yüzden complete kontrolü de var —
  // yoksa görsel opacity 0'da takılı kalır.
  const goster = () => { img.style.opacity = '1'; };
  img.style.opacity = '0';
  img.addEventListener('load', goster, { once: true });
  // Detay paneli 1024 px'e kadar büyüyor — burada TAM BOY görsel kullanılır,
  // kalite düşmesin. Küçük kopyalar yalnızca harita ve sahne kareleri için.
  dhGorselAta(img, s.dosya, false);
  if (img.complete && img.naturalWidth) goster();
  // Sahne adı yalnızca katalogda yazılmışsa görünür (CSS'te :empty gizliyor).
  document.getElementById('dhDetaySahneAd').textContent = s.ad || '';
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
      // Sahne kareleri 52 px — küçük kopya fazlasıyla yeter.
      dhGorselAta(b.querySelector('img'), s.dosya, true);
      b.addEventListener('click', () => dhSahneGoster(diyar, i));
      kutu.appendChild(b);
    });
  }
  dhSahneGoster(diyar, dhSahneTercihi()[diyar.id] || 0);
  document.body.classList.add('dhDetayAcik');
}

function dhDetayKapat() {
  document.body.classList.remove('dhDetayAcik');
  DH.detay = null;          // panel kapalıyken ok tuşları sahne değiştirmesin
  dhCiz();                  // sahne tercihi değişmiş olabilir
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
  ['dalga',   'Dalga',        0,  100, 1],
  // En fazla yakınlaştığında bir diyarın pencere genişliğine oranı (%).
  // 230 = bugünkü davranış (telefonda diyar ekrana sığmıyor), 100 = tam ekran,
  // 75 = etrafında sis ve komşular görünür kalıyor.
  ['doluluk', 'Azami yakınlık %', 40, 230, 1]
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
      // Azami yakınlık YALNIZCA kamerayı ilgilendiriyor. dhCiz() çağırmak
      // sis rasterini her kaydırak adımında boşuna yeniden üretirdi (~300 ms,
      // telefonda daha fazla) ve kaydırak takılmış hissettirirdi. Kamerayı
      // yeniden sınırlamak yeterli: kullanıcı sınırın ötesindeyse geri çekilir,
      // değilse hiçbir şey olmaz.
      if (k === 'doluluk') { dhKamHemen(); return; }
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
                     dhPozisyonlar, dhKesifSirasi, dhYerlesim, dhMaskeUret,
                     DH_KESIF_SIRASI, dhDelikYaricapi, dhDelikAc };
}

// Harita KURULUYSA içeriği yeniden çizer ve kamerayı olduğu yerde bırakır.
// Yeni bir diyar keşfedildiğinde kullanıcının baktığı yer sıfırlanmasın diye
// ayrı duruyor — renderDiyarHarita() her çağrıldığında haritayı ortalıyor,
// sekme değiştirirken doğru ama "arada bir kitap eklendi" durumunda değil.
// Kurulu değilse false döner, çağıran taraf tam kurulumu yapar.
function yenileDiyarHarita() {
  if (!DH.kurulu || !document.getElementById('dhKutu')) return false;
  dhCiz();
  return true;
}

// ══════════════════════════════════════════════════════════════════════
// AÇILIŞ PERDESİ
// ══════════════════════════════════════════════════════════════════════
// Sekmeye ilk girildiğinde diyar görselleri tek tek beliriyordu; Gökşin
// bunu "ilk yüklemede takılıyor gibi" diye bildirdi (2026-08-13). Sorun
// hız değil dağınıklık: harita hazır olmadan gösteriliyor. Çözüm, yükleme
// bitene kadar her şeyi sis renginde bir perdenin arkasında tutup tek
// hamlede açmak.
//
// SÜRE BİLEREK SABİT DEĞİL — perde yükleme ne kadar sürerse o kadar kalır,
// bir kare fazla değil. Sabit bir bekleme koymak hazır olan haritayı boşuna
// bekletir; yorucu his oradan gelir. Görseller önbellekteyse (ikinci giriş)
// perde neredeyse hiç görünmeden geçer, doğrusu da bu.
//
// Yalnızca renderDiyarHarita() perdeyi gerer, yenileDiyarHarita() GERMEZ:
// kullanıcı haritaya bakarken kitap eklediğinde harita kararmamalı.
// Emniyet freni (ms). ÖLÇÜLDÜ (2026-08-14, PC + yerel sunucu, 16 diyar):
// ilk giriş 1650-2280 ms, ikinci giriş 27-54 ms (önbellek).
// ⚠️ Bu sürenin "görsel çözme"den geldiği ilk sanılmıştı; YANLIŞ çıktı.
// Parçalara ayrılınca: çizim 92 ms, ağ 887 ms, kalanı ağı beklemek. Yerel test
// sunucusu (tek iş parçacıklı PowerShell) istekleri sırayla veriyor — 16 istek
// 0-7 ms'de başlayıp 370→887 ms arasında dosya başına ~32 ms'lik merdivenle
// bitiyor. Yani yerel ölçüm dosya boyutuna DEĞİL sunucunun kuyruğuna bağlı;
// burada görsel küçültmenin etkisi ölçülemez. Telefonda ve gerçek internette
// ilk giriş bundan yavaş olacağı için fren 2.5 sn'de tutulamaz: sürekli
// devreye girer ve perde hiçbir işe yaramaz. Fren bir zamanlama ayarı DEĞİL,
// yalnızca "görsel hiç gelmezse perde asılı kalmasın" emniyetidir — bu yüzden
// beklenen en kötü süreden rahatça yüksek olmalı.
const DH_PERDE_ENCOK = 5000;

function dhPerdeGer() {
  if (!DH.kutu) return;
  DH.perdeNo = (DH.perdeNo || 0) + 1;
  DH.kutu.classList.add('perdeli');
}

// Perde beklerken kullanıcı sekmeler arasında gidip gelirse ikinci bir açılış
// başlıyor. Numara kontrolü, biten ESKİ beklemenin yeni perdeyi vaktinden önce
// açmasını engelliyor.
function dhPerdeBirak(no) {
  if (!DH.kutu || DH.perdeNo !== no) return;
  DH.kutu.classList.remove('perdeli');
}

// Açılışta EKRANDA OLAN diyarların görselini seçer. Hepsini beklemek yanlıştı
// (2026-08-14, Gökşin tablette bildirdi: "sis açıldığında son 1-2 görsel hâlâ
// yükleniyordu") — 16 görsel tablette 5 sn'lik emniyet frenini tetikliyor,
// fren de perdeyi yükleme bitmeden açıyordu. Ekran dışındaki diyarlar zaten
// görünmüyor; kullanıcı haritayı gezerken sessizce yükleniyorlar.
// Ölçüm .dhDiyar kutusundan yapılıyor, img'den DEĞİL: img'in yüksekliği
// auto ve görsel yüklenene kadar 0, yani daha yüklenmemiş olanları ölçemezdik.
function dhAcilistaGorunenler() {
  const k = DH.kutu.getBoundingClientRect();
  const payX = k.width * 0.1, payY = k.height * 0.1;   // kenara yakınlar da dahil
  return Array.prototype.slice.call(
      document.querySelectorAll('#dhKat .dhDiyar'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.right  > k.left   - payX && r.left < k.right  + payX &&
             r.bottom > k.top    - payY && r.top  < k.bottom + payY;
    })
    .map(el => el.querySelector('img'))
    .filter(Boolean);
}

// Bir görselin GERÇEKTEN çizmeye hazır olmasını bekler.
//
// Neden doğrudan img.decode() DEĞİL (2026-08-14'te canlıda yaşandı): küçük
// kopyalar siteye yüklenmemişti, her görsel önce 404 alıp dhGorselAta'nın
// yedeğiyle büyüğüne düşüyordu. decode() ilk istekte reddedilince perde
// "hazır" sanıp açılıyor, sonra büyük görseller tek tek gözün önünde
// çiziliyordu — yani yedek devreye girdiğinde perde işlevini kaybediyordu.
//
// Çözüm: 'error' dinlenmiyor. Yedek yeni bir 'load' doğuracak; onu bekliyoruz.
// İkisi de başarısızsa hiç çözülmez ve perdeyi emniyet freni açar (doğrusu bu).
function dhGorselHazir(img) {
  const coz = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve());
  if (img.complete && img.naturalWidth) return coz();
  return new Promise(res => {
    img.addEventListener('load', () => coz().then(res), { once: true });
  });
}

function dhPerdeCoz() {
  const no = DH.perdeNo;
  const gorseller = dhAcilistaGorunenler();
  // Hiç keşif yok ya da açılışta hiçbiri ekranda değil: beklenecek bir şey yok.
  if (!gorseller.length) { dhPerdeBirak(no); return; }

  let bitti = false;
  const birak = () => { if (bitti) return; bitti = true; dhPerdeBirak(no); };

  // Emniyet freni: bozuk bir görsel ya da kopan bağlantı yüzünden perde
  // kapalı kalmasın. Takılı perde, çözmeye çalıştığımız takılmadan beterdir.
  setTimeout(birak, DH_PERDE_ENCOK);

  // (requestAnimationFrame KULLANILMIYOR: sekme arka plandayken hiç çalışmıyor,
  // perde asılı kalırdı.)
  Promise.allSettled(gorseller.map(dhGorselHazir)).then(birak);
}

// ══════════════════════════════════════════════════════════════════════
// KEŞİF ANİMASYONU
// ══════════════════════════════════════════════════════════════════════
// Yeni bir diyar keşfedildiğinde, haritaya ilk girişte sis o diyarın üstünde
// DAĞINIK parçalar halinde eriyor ve diyar beliriyor.
//
// ⚠️ SİS HER KAREDE YENİDEN ÜRETİLMİYOR. Sis 2026-08-17'de tuvale rasterlendi
// (dhSisRasterle) ve telefondaki akıcılık oradan geliyor; 4 saniye boyunca
// her karede yeniden üretmek o kazancı geri verirdi. Bunun yerine keşfedilmemiş
// diyarın sisi dhCiz'de HİÇ AÇILMIYOR (delik de köprü de çizilmiyor); sırası
// gelince sis bir kez açılıp yeniden üretiliyor ve üstüne, açılmadan ÖNCEKİ
// hâlinin kopyası (yama) konuyor. Animasyon o yamadan parça silmekten ibaret.
//
// Ayarlar Gökşin'in deneme tezgâhında onayladığı değerler:
// sure=4000 · parca=8 · dagi=45% · gecikme=55% · kenar=85%
// govdeR / govdeAralik = gövde parçalarının son yarıçapı (aralık cinsinden).
//   ⚠️ AYARI BÜYÜTME. Ölçüldü (2026-08-22): parçalar delikten belirgin büyük
//   olunca erime p≈0,6'da her şeyi açıp bitiyor ve geriye 1,6 saniye ölü zaman
//   kalıyor — Gökşin'in bildirdiği "bir süre duruyor, hiçbir şey olmuyor" tam
//   olarak buydu. Değerler, erimenin deliğin kıyısına p=1'de varması için
//   seçildi.
// kopruBasla = köprülerin erimeye başladığı an; sonuncusu p=1'de bitiyor.
// sonum      = yamanın sonundaki kısa sönüm.
const DH_KESIF = { sure: 4000, parca: 8, dagi: 0.45, gecikme: 0.55, kenar: 0.85,
                   govdeR: 0.50, govdeAralik: 0.18, kopruBasla: 0.42,
                   kameraSure: 900, sonum: 260 };

// Bekleyen (henüz izlenmemiş) keşiflerin diyar id'leri.
DH.bekleyen = new Set();
function dhBekliyor(id) { return !!(DH.bekleyen && DH.bekleyen.has(id)); }

// Son bakış zamanı — dünya haritasındaki desenin AYNISI (map.js:437-467):
// Firebase birincil, localStorage çevrimdışı yedek. Aynı ekranda iki farklı
// mekanizma olmasın diye bilerek aynı şekilde yazıldı.
function dhSonBakis() {
  try {
    if (typeof db !== 'undefined' && db.users && db.users[me] &&
        typeof db.users[me].diyarVisit === 'number') return db.users[me].diyarVisit;
    return parseInt(localStorage.getItem('aa-diyar-visit-' + me) || '0', 10) || 0;
  } catch (e) { return 0; }
}
function dhBakisiYaz() {
  const t = Date.now();
  try {
    if (typeof db !== 'undefined' && db.users && db.users[me]) {
      db.users[me].diyarVisit = t;
      if (typeof saveDb === 'function') saveDb();
    }
  } catch (e) {}
  try { localStorage.setItem('aa-diyar-visit-' + me, String(t)); } catch (e) {}
}

// Son bakıştan SONRA keşfedilmiş diyarlar. Keşif sırasına göre döner.
function dhBekleyenKesifler() {
  const son = dhSonBakis();
  return dhKesifSirasi(me)
    .filter(e => new Date(e.ts).getTime() > son)
    .map(e => e.diyarId);
}

// Diyarın çevresinden, SİSİN O ANKİ HÂLİNİ olduğu gibi kırpıp üste koyar.
//
// ⚠️ ÖRTÜYÜ ELDE ÇİZMEYE ÇALIŞMA. İki kez denendi, ikisi de Gökşin'in gözüne
// takıldı:
//   1) dikdörtgen dolgu → komşunun açık alanını örten siyah kare;
//   2) diyarın şeklinde leke → diyar açılınca eritecek bir şey kalmıyor,
//      animasyon donuyor, sonra delik ve köprüler bir anda beliriyor
//      ("bir süre duruyor... sonra pat diye çevresindeki arkaplan mavisi
//      ortaya çıkıp komşu görselle birleşiyor", 2026-08-22).
// Elde çizilen her şekil ya eksik ya fazla kalıyor. Sisin KENDİ kopyası ise
// tanımı gereği tam: ekrandaki rasterden kırpıldığı için üste konduğu anda
// hiçbir şeyi değiştirmiyor, komşunun açık alanı açık kalıyor, kenarları
// sisin kendi düzensiz kenarı oluyor.
//
// Yarıçap 1.25*aralık: açılacak her şeyi içine almalı — delik yaprakları
// (~0.61*aralık) ve keşfedilmiş komşulara giden köprüler (komşu merkezi
// 0.866*aralık'ta). Ötesinde sis zaten değişmiyor.
function dhSisYamasi(sl) {
  const tuval = document.getElementById('dhSisTuval');
  if (!tuval || !tuval.width) return null;          // raster yoksa yama da yok
  const H = DH.ayar.aralik * 1.25;                  // dünya biriminde yarı boy
  const kk = tuval.width / DH.DUNYA;                // dünya birimi → raster pikseli
  const COZ = Math.max(64, Math.round(2 * H * kk));

  const c = document.createElement('canvas');
  c.width = COZ; c.height = COZ;
  c.className = 'dhKesifYama';
  c.style.left = (sl.cx - H) + 'px';
  c.style.top  = (sl.cy - H) + 'px';
  c.style.width = (2 * H) + 'px'; c.style.height = (2 * H) + 'px';

  const ctx = c.getContext('2d');
  ctx.drawImage(tuval, (sl.cx - H) * kk, (sl.cy - H) * kk, 2 * H * kk, 2 * H * kk,
                       0, 0, COZ, COZ);

  document.getElementById('dhKat').appendChild(c);
  return { el: c, ctx, COZ, H };
}

// Erimenin parçaları. İKİ TÜR var ve ikincisi zorunlu:
//
//  · GÖVDE — diyarın üstünde dağınık açılan lekeler; Gökşin'in tezgâhta
//    onayladığı desen. p=govdeBitis'te tamamlanıyor.
//  · KÖPRÜ — açılmış her komşuya doğru SIRAYLA ilerleyen lekeler. Bunlar
//    olmadan erime diyarla birlikte bitiyor, sonra delik ve köprüler bir anda
//    beliriyordu (Gökşin, 2026-08-22: "bir süre duruyor, hiçbir şey olmuyor.
//    sonra pat diye çevresindeki arkaplan mavisi ortaya çıkıp komşu görselle
//    birleşiyor"). Ölçüldü: gövde parçaları tek başına p≈0,6'da her şeyi
//    açıyor, geri kalan 1,6 saniye ölü zaman oluyordu.
//
// Cömert yarıçap SORUN DEĞİL, tersine gerekli: yamanın altındaki sis zaten son
// hâlde, yani fazla silmek fazla açmak değil, yalnızca sisi ortaya çıkarmak.
// Erimenin GÖRÜNEN şekli deliğin ve köprülerin kendi şekli oluyor.
function dhKesifParcalari(sl, COZ, H) {
  const olcek = COZ / (2 * H);            // dünya birimi → yama pikseli
  const yari = COZ / 2;
  const W = DH.ayar.aralik, g = W * (DH.ayar.gorsel / 100);
  const rnd = dhUretec(dhTohumla(sl.diyar.id + '|kesif'));
  const parcalar = [];

  for (let i = 0; i < DH_KESIF.parca; i++) {
    const aci = (i / DH_KESIF.parca) * Math.PI * 2 + rnd() * 1.1;
    const uz  = W * 0.34 * DH_KESIF.dagi * (0.4 + rnd() * 1.6);
    parcalar.push({
      x: yari + Math.cos(aci) * uz * olcek,
      y: yari + Math.sin(aci) * uz * olcek,
      r: W * (DH_KESIF.govdeR + rnd() * DH_KESIF.govdeAralik) * olcek,
      gec: (i / DH_KESIF.parca) * DH_KESIF.gecikme * (0.5 + rnd()),
      bit: 1
    });
  }

  // Köprüler: komşunun merkezine doğru dört adım. Son adım tam p=1'de bitiyor,
  // yani animasyonun son anına kadar gözle görülür bir şey oluyor.
  dhKomsular(sl.q, sl.r).forEach(([kq, kr]) => {
    const k = DH.slotHarita.get(kq + ',' + kr);
    if (!k || !k.diyar || dhBekliyor(k.diyar.id)) return;
    const dx = k.cx - sl.cx, dy = k.cy - sl.cy;
    [0.30, 0.55, 0.80, 1.0].forEach((f, i) => {
      const gec = DH_KESIF.kopruBasla + (1 - DH_KESIF.kopruBasla) * (i / 4);
      parcalar.push({
        x: yari + dx * f * olcek, y: yari + dy * f * olcek,
        r: g * 0.62 * olcek, gec, bit: Math.min(1, gec + 0.34)
      });
    });
  });
  return parcalar;
}

// Parçaları p ilerlemesine göre yamadan siler.
function dhKesifErit(ctx, parcalar, p) {
  ctx.globalCompositeOperation = 'destination-out';
  parcalar.forEach(pa => {
    const y = Math.max(0, Math.min(1, (p - pa.gec) / Math.max(0.05, pa.bit - pa.gec)));
    if (!y) return;
    const R = pa.r * y;
    const gr = ctx.createRadialGradient(pa.x, pa.y, 0, pa.x, pa.y, R);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(DH_KESIF.kenar, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(pa.x, pa.y, R, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
}

// Kamerayı bir noktaya yumuşakça kaydırır.
//
// ⚠️ HEDEF ÖNCE SINIRLANIYOR. dhKamSinirla kamerayı dünyanın içinde tutuyor;
// uzaktayken bir diyarı ekranın tam ortasına almak çoğu zaman MÜMKÜN DEĞİL.
// Ham hedefe doğru yumuşatılırsa kamera ilk karelerde duvara çarpıp orada
// kalıyor: kısa bir kayma, sonra hiçbir şey. Gökşin 2026-08-22'de bunu gördü
// ("kamera kaymıyor... kaymıyoruz, zıplıyoruz"). Ulaşılabilir hedefe
// yumuşatınca hareket sürenin tamamına yayılıyor.
// Hiç yer kalmamışsa (tam uzaklaşmış harita) beklemeden dönüyor — yoksa
// ekranda hiçbir şeyin olmadığı ölü bir saniye oluyor.
function dhKameraKaydir(dx, dy, sure) {
  return new Promise(res => {
    const r = DH.kutu.getBoundingClientRect();
    const x0 = DH.kam.x, y0 = DH.kam.y;
    const g = DH.DUNYA * DH.kam.s;
    const x1 = Math.min(0, Math.max(r.width  - g, r.width  / 2 - dx * DH.kam.s));
    const y1 = Math.min(0, Math.max(r.height - g, r.height / 2 - dy * DH.kam.s));
    if (!sure || Math.hypot(x1 - x0, y1 - y0) < 1) {
      DH.kam.x = x1; DH.kam.y = y1; dhKamUygula(); res(); return;
    }
    const t0 = performance.now();
    (function adim(t) {
      const p = Math.min(1, (t - t0) / sure);
      const e = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2;   // ease-in-out
      DH.kam.x = x0 + (x1 - x0) * e; DH.kam.y = y0 + (y1 - y0) * e;
      dhKamUygula();
      if (p < 1) requestAnimationFrame(adim); else res();
    })(t0);
  });
}

// Tek bir diyarın keşif animasyonu.
//
// AKIŞ (sırası önemli):
//   1. Sisin o anki hâli diyarın çevresinden kırpılıp üste konuyor (yama).
//      Kopya olduğu için ekranda hiçbir şey değişmiyor.
//   2. Sis GERÇEKTEN açılıyor: delik + köprüler çiziliyor, raster sessizce
//      yenileniyor. Yama üstünü örttüğü için bu da görünmüyor.
//   3. Kamera diyara kayıyor.
//   4. Yama parça parça eriyor — altından SON HÂL çıkıyor: önce diyar, sonra
//      çevresindeki deniz, sonra komşulara uzanan köprüler. Kesintisiz.
//   5. Yama kaldırılıyor. Altındaki zaten son hâl olduğu için hiçbir şey
//      değişmiyor — ne sıçrama, ne devir, ne bekleme.
//
// Bu sıra Gökşin'in 2026-08-22'de bildirdiği iki kusurun karşılığı: erime
// artık diyarla bitmiyor (denizi ve köprüyü de o eritiyor), sonunda da
// eklenecek bir şey kalmıyor.
function dhKesifOynat(sl, durum) {
  return new Promise(async res => {
    const cizim = DH.cizimNo;
    const yama = dhSisYamasi(sl);

    // Sis açılıyor; yama perdeliyor. Köprü çifti YALNIZCA burada kuruluyor —
    // dhCiz bekleyen diyarın hiçbir köprüsünü çizmiyor, çift iki kez çizilmiş
    // olmuyor.
    if (DH.cizimNo === cizim) {
      DH.bekleyen.delete(sl.diyar.id);
      dhDelikAc(sl);
      dhKomsular(sl.q, sl.r).forEach(([kq, kr]) => {
        const k = DH.slotHarita.get(kq + ',' + kr);
        if (k && k.diyar && !dhBekliyor(k.diyar.id)) dhKopruCiz(sl, k);
      });
      if (sl.el) sl.el.style.opacity = '';
      await dhSisRasterle(!!yama);       // yama varsa sessiz: canlı SVG'ye hiç geçme
    }
    if (!yama) { res(); return; }        // raster yoksa animasyonsuz aç, sis bozulmasın

    const { ctx, COZ } = yama;
    // ⚠️ Parçalar KAMERADAN ÖNCE hesaplanıyor: köprü parçaları o an açılmış
    // komşulara bakıyor ve sıradaki diyar araya girmemeli.
    const parcalar = dhKesifParcalari(sl, COZ, yama.H);
    await dhKameraKaydir(sl.cx, sl.cy, durum.atlandi ? 0 : DH_KESIF.kameraSure);

    const t0 = performance.now();
    (function kare(t) {
      const p = durum.atlandi ? 1 : Math.min(1, (t - t0) / DH_KESIF.sure);
      dhKesifErit(ctx, parcalar, p);

      if (p < 1) { requestAnimationFrame(kare); return; }
      // Yamanın köşelerinde kalan artık, altındaki sisin AYNISI — kaldırmak
      // görünmez. Yine de kısa bir sönüm konuyor: eritilmemiş bir kırıntı
      // kalırsa sertçe kaybolmasın.
      const sonum = durum.atlandi ? 0 : DH_KESIF.sonum;
      yama.el.style.transition = 'opacity ' + sonum + 'ms linear';
      yama.el.style.opacity = '0';
      setTimeout(() => yama.el.remove(), sonum + 60);
      res();
    })(t0);
  });
}

// Bekleyen tüm keşifleri sırayla oynatır. Ekrana dokunulursa hepsi atlanır.
//
// ⚠️ AYNI ANDA İKİ KUYRUK ÇALIŞAMAZ. renderDiyarHarita her çağrıldığında
// kuyruğu tetikliyor; harita birden çok kez çizilirse (sekme değişimi, detay
// panelinden dönüş, ayar şeridi) ikinci kuyruk birincisi bitmeden başlıyor ve
// animasyonlar üst üste biniyordu — ölçümde aynı anda 2 örtü görüldü.
// (Bulut geçişindeki dhBulutMesgul kilidiyle aynı sınıftan hata.)
let dhKesifOynuyor = false;
async function dhKesifKuyrugu() {
  if (dhKesifOynuyor || !DH.bekleyen.size) return;
  dhKesifOynuyor = true;
  dhOynatTazele();                    // düğmeler oynarken pasif

  // ⚠️ ÇİZİMİN RASTERİ BEKLENMELİ. Yama, ekrandaki rasterin kopyası; dhCiz onu
  // yeniden üretmeye başlar ama BEKLEMEZ (~300 ms). Beklenmezse yama, deliğin
  // hâlâ AÇIK olduğu ESKİ rasterden kırpılıyor: boş çıkıyor, eritecek bir şey
  // kalmıyor, diyar anında beliriyor — ama sayaç yine 4 sn işlediği için
  // düğmeler boşuna kapalı kalıyor. Gökşin 2026-08-22'de "Tekrar Oynat"ta
  // gördü: "görsel siyah olup hemen beliriyor, yanıp söner gibi; ama buton
  // kapalı kalmaya devam ediyor". İlk açılışta gizleniyordu, çünkü orada
  // görsellerin yüklenmesi rastere zaman tanıyor.
  try { await DH.sisSozu; } catch (e) {}

  // ⚠️ BULUT GEÇİŞİ DE BEKLENMELİ. renderDiyarHarita kuyruğu bulutlar HÂLÂ
  // KAPALIYKEN tetikliyor (geçişin "harita değişsin" adımının içinden);
  // beklenmezse animasyonun ilk ~2,5 saniyesi açılan bulutların ardında
  // görünmeden geçiyor.
  if (typeof dhBulutMesgul !== 'undefined') {
    const bitis = performance.now() + 12000;
    while (dhBulutMesgul && performance.now() < bitis)
      await new Promise(r => setTimeout(r, 90));
  }

  const durum = { atlandi: false };
  const atla = () => { durum.atlandi = true; };
  DH.kutu.addEventListener('pointerdown', atla, { once: false });

  try {
    for (const id of Array.from(DH.bekleyen)) {
      const sl = DH.slotlar.find(s => s.diyar && s.diyar.id === id);
      if (sl) await dhKesifOynat(sl, durum);
    }
  } finally {
    // Hata çıksa da kilit ve dinleyici mutlaka bırakılmalı; yoksa keşif
    // animasyonu bir daha hiç oynamaz.
    DH.kutu.removeEventListener('pointerdown', atla);
    // Sırası gelmeyen kalmışsa (slot bulunamadı, arada harita yeniden çizildi)
    // o diyarın sisi hâlâ kapalı ve görseli gizli. Kuyruk kapanırken harita
    // normal hâliyle bir kez daha çiziliyor ki hiçbir diyar görünmez kalmasın.
    const eksik = DH.bekleyen.size > 0;
    DH.bekleyen.clear();
    dhBakisiYaz();
    dhKesifOynuyor = false;
    if (eksik) dhCiz(); else dhOynatTazele();
  }
}

// ══════════════════════════════════════════════════════════════════════
// BULUT GEÇİŞİ
// ══════════════════════════════════════════════════════════════════════
// Dünya haritası ↔ hayali harita geçişinde bulutlar iki yandan kayarak
// gelip ortada buluşuyor, ekranı gizliyor; arkada harita değişiyor;
// harita HAZIR OLUNCA bulutlar yanlara çekilip siliniyor.
//
// Dizilim Gökşin'in ELLE yerleştirmesidir (2026-08-20), rastgele üretim
// DEĞİL. Değiştirmek gerekirse tezgâh duruyor:
// "hayali diyar görselleri\bulut-denemesi.html" — orada düzenleyip
// "Ayarları kopyala" ile çıkan JSON buraya yapıştırılır.
//
// ⚠️ KATMAN TÜM EKRANI kaplıyor (position:fixed), yalnızca harita kutusunu
// değil. Sebep: hayali haritaya geçerken kutu aşağı doğru uzuyor ve sayfa
// kaydırılıyor (harita ekranda ortalansın diye, Gökşin istedi). Katman
// yalnızca kutuyu örtseydi bu kayma kenarlardan görünürdü.
//
// ⚠️ SÜRE SABİT DEĞİL: bulutlar harita hazır olana kadar kapalı bekliyor
// (Gökşin'in kararı). Böylece animasyon süs olmaktan çıkıp gerçekten
// beklenecek süreyi dolduruyor. Emniyet freni DH_PERDE_ENCOK.
// Bulutlar diğer harita görselleriyle birlikte `diyarlar/` altında duruyor.
// (2026-08-20'de kısa süre `images/` denendi ve geri alındı — canlıdaki yer
// burası, kodla canlı ayrı düşmesin.)
const DH_BULUT_KLASOR = 'diyarlar/';
const DH_BULUT_DOSYA = ['bulut-1.webp', 'bulut-2.webp', 'bulut-3.webp'];
// Kaynak görsellerin en/boy oranları (1200×436, 1200×466, 1200×435).
// Sabit yazılı ki yerleşim görsel yüklenmesini beklemeden hesaplanabilsin.
// Görseller değişirse bu üç sayı da güncellenmeli.
const DH_BULUT_ORAN = [2.7523, 2.5751, 2.7586];

const DH_BULUT_GECIS = { kapanis: 1500, acilis: 2500, kayma: 210, sonum: 100,
                         egri: 'cubic-bezier(.5,0,.75,0)' };
const DH_BULUT_OLCU  = { bindirme: 14, disTasma: 18 };
const DH_BULUT_DIZILIM = {
  sol: [
    { s:0, x:0.4036, y:0.3954, h:1.0240, d:0,   a:true  },
    { s:1, x:0.2038, y:0.6525, h:0.6917, d:0,   a:false },
    { s:1, x:0.3796, y:0.5218, h:0.6361, d:0,   a:false },
    { s:2, x:0.2168, y:1.0163, h:0.9237, d:-24, a:false },
    { s:1, x:0.3307, y:1.1253, h:1.2021, d:12,  a:false },
    { s:1, x:0.3932, y:0.8137, h:0.5000, d:0,   a:false },
    { s:1, x:0.4467, y:0.2778, h:0.7777, d:0,   a:false }
  ],
  sag: [
    { s:0, x:0.7669, y:0.5196, h:0.9503, d:0,   a:false },
    { s:0, x:0.7428, y:-0.2930, h:0.8750, d:-6, a:true  },
    { s:1, x:0.5866, y:0.1253, h:0.8325, d:-12, a:false },
    { s:2, x:0.7305, y:0.0577, h:0.6748, d:0,   a:false },
    { s:1, x:0.6319, y:-0.0142, h:0.9469, d:0,  a:true  }
  ]
};

let dhBulutKat = null, dhBulutOnYuklendi = false;

// Bulut görselleri toplam ~442 KB ve ÇÖZÜLMELERİ ~275 ms sürüyor (ölçüldü,
// 2026-08-20). Geçiş anında indirilirse kullanıcı sekmeye basar, bir saniye
// hiçbir şey olmaz, sonra bulutlar gelir — o ölü an animasyonu bozuyor.
// Harita paneli açılır açılmaz arka planda indirilip çözülüyor.
// Yalnızca test hesabında çağrılıyor (bkz. index.html switchStatsTab).
function dhBulutOnYukle() {
  if (dhBulutOnYuklendi) return;
  dhBulutOnYuklendi = true;
  DH_BULUT_DOSYA.forEach(d => {
    const im = new Image();
    im.onload = () => { if (im.decode) im.decode().catch(() => {}); };
    im.src = DH_BULUT_KLASOR + d;
  });
}

function dhBulutStil() {
  if (document.getElementById('dhBulutStil')) return;
  const s = document.createElement('style');
  s.id = 'dhBulutStil';
  s.textContent =
    '#dhBulutKat{position:fixed;inset:0;z-index:9500;pointer-events:none;overflow:hidden}' +
    '#dhBulutKat.tiklanir{pointer-events:auto;cursor:pointer}' +
    '#dhBulutKat .dhBulutGrup{position:absolute;left:0;top:0;will-change:transform,opacity}' +
    '#dhBulutKat img{position:absolute;user-select:none;-webkit-user-drag:none}';
  document.head.appendChild(s);
}

// Katmanı kurar ve bulutları o anki EKRAN ölçüsüne göre yerleştirir.
function dhBulutKur() {
  dhBulutStil();
  if (dhBulutKat) dhBulutKat.remove();
  const en = window.innerWidth, boy = window.innerHeight;
  const ov  = DH_BULUT_OLCU.bindirme / 100 * boy;
  const dis = DH_BULUT_OLCU.disTasma / 100 * boy;
  const seritBoy = Math.round(boy / 2 + ov + dis);
  const seritEn  = Math.round(en * 1.6);
  const sol = Math.round((en - seritEn) / 2);
  const ust = { sol: Math.round(boy / 2 + ov - seritBoy) };
  const alt = { sol: Math.round(boy / 2 - ov) };

  dhBulutKat = document.createElement('div');
  dhBulutKat.id = 'dhBulutKat';

  const gruplar = {};
  [['sol', ust.sol], ['sag', alt.sol]].forEach(([ad, tepe]) => {
    const g = document.createElement('div');
    g.className = 'dhBulutGrup';
    g.style.width = seritEn + 'px'; g.style.height = seritBoy + 'px';
    g.style.left = sol + 'px'; g.style.top = tepe + 'px';
    DH_BULUT_DIZILIM[ad].forEach(b => {
      const img = document.createElement('img');
      img.src = DH_BULUT_KLASOR + DH_BULUT_DOSYA[b.s];
      const h = b.h * seritBoy, w = h * DH_BULUT_ORAN[b.s];
      img.style.width = w + 'px'; img.style.height = h + 'px';
      img.style.left = (b.x * seritEn - w / 2) + 'px';
      img.style.top  = (b.y * seritBoy - h / 2) + 'px';
      img.style.transform = 'rotate(' + b.d + 'deg)' + (b.a ? ' scaleX(-1)' : '');
      g.appendChild(img);
    });
    gruplar[ad] = g;
    dhBulutKat.appendChild(g);
  });
  document.body.appendChild(dhBulutKat);
  return { gruplar, en };
}

// acilma: 0 = kapalı (ekran gizli) · 1 = tamamen açık (ekran temiz)
function dhBulutDurum(gruplar, en, acilma, sure) {
  const k = acilma * en * (DH_BULUT_GECIS.kayma / 100);
  const f = DH_BULUT_GECIS.sonum / 100;
  const op = f > 0 ? Math.max(0, Math.min(1, 1 - (acilma - (1 - f)) / f)) : 1;
  const gecis = sure ? ('transform ' + sure + 'ms ' + DH_BULUT_GECIS.egri +
                        ',opacity ' + sure + 'ms ' + DH_BULUT_GECIS.egri) : 'none';
  gruplar.sol.style.transition = gecis; gruplar.sag.style.transition = gecis;
  gruplar.sol.style.transform = 'translateX(' + (-k) + 'px)';
  gruplar.sag.style.transform = 'translateX(' + ( k) + 'px)';
  gruplar.sol.style.opacity = op; gruplar.sag.style.opacity = op;
}

// Beklerken dokunulursa hemen biter (Gökşin: "sık ziyaretlerde usandırıcı
// olmasın"). durum, o geçişe ait tekil nesne: atlandı bilgisi ve o an
// bekleyen adımı uyandıracak işlev.
//
// ⚠️ İlk hâli çalışmıyordu: atlama yalnızca O AN bekleyen adımı bitiriyordu,
// ardından gelen açılış beklemesi sıfırdan tam süre işliyordu — dokunmak
// hiçbir şeyi kısaltmıyordu (ölçüldü: 4920 ms). Artık atlandı bilgisi geçiş
// boyunca taşınıyor ve sonraki beklemeler hiç başlamıyor.
function dhBekle(ms, durum) {
  if (durum.atlandi) return Promise.resolve();
  return new Promise(res => {
    let bitti = false, t = 0;
    const fin = () => { if (bitti) return; bitti = true; clearTimeout(t);
                        if (durum.uyandir === fin) durum.uyandir = null; res(); };
    t = setTimeout(fin, ms);
    durum.uyandir = fin;
  });
}

// Haritanın çizmeye hazır olmasını bekler — perdeyle AYNI ölçüt.
function dhHaritaHazir() {
  return new Promise(res => {
    let bitti = false;
    const fin = () => { if (bitti) return; bitti = true; res(); };
    setTimeout(fin, DH_PERDE_ENCOK);          // emniyet freni
    if (!DH.kutu || !document.getElementById('dhKat')) { fin(); return; }
    const g = dhAcilistaGorunenler();
    if (!g.length) { fin(); return; }
    Promise.allSettled(g.map(dhGorselHazir)).then(fin);
  });
}

// isFn: bulutlar KAPALIYKEN çalışacak iş (harita değişimi, kaydırma…).
//
// ⚠️ AYNI ANDA İKİ GEÇİŞ ÇALIŞAMAZ. switchHaritaTuru bu fonksiyonu beklemeden
// dönüyor; sekmeye hızlı iki kez basılırsa ikinci çağrı birincinin katmanını
// siler, sonra birincisi ikincininkini kaldırır ve ekran bulutla kaplı
// kalabilir. Meşgulken yeni istek yok sayılıyor — düğmeler zaten orada,
// kullanıcı animasyon bitince tekrar basabilir.
let dhBulutMesgul = false;
async function dhBulutGecisi(isFn) {
  const azHareket = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (azHareket) { await isFn(); return; }          // erişilebilirlik: animasyon yok
  if (dhBulutMesgul) { return; }
  dhBulutMesgul = true;

  const { gruplar, en } = dhBulutKur();
  const kat = dhBulutKat;                           // kendi katmanını tut
  const durum = { atlandi: false, uyandir: null };
  kat.classList.add('tiklanir');
  const atla = () => { durum.atlandi = true; if (durum.uyandir) durum.uyandir(); };
  kat.addEventListener('pointerdown', atla);

  dhBulutDurum(gruplar, en, 1, 0);                  // açık (ekran dışında) başla
  void kat.offsetWidth;                             // tarayıcı başlangıcı görsün
  dhBulutDurum(gruplar, en, 0, DH_BULUT_GECIS.kapanis);   // iki yandan gelip kapan
  await dhBekle(DH_BULUT_GECIS.kapanis, durum);

  try { await isFn(); } catch (e) {}                // iş patlasa da bulut açılmalı
  // ⚠️ Bu bekleme ATLANMAZ, atlansa bile: yarım yüklenmiş bir haritayı
  // açmak, beklemekten kötü. Zaten ikinci ziyarette önbellekten anında döner.
  await dhHaritaHazir();

  if (durum.atlandi) {
    dhBulutDurum(gruplar, en, 1, 0);                // dokunuldu: sona atla
  } else {
    dhBulutDurum(gruplar, en, 1, DH_BULUT_GECIS.acilis);  // yanlara çekil + sil
    await dhBekle(DH_BULUT_GECIS.acilis, durum);
  }

  kat.removeEventListener('pointerdown', atla);
  kat.remove();
  if (dhBulutKat === kat) dhBulutKat = null;
  dhBulutMesgul = false;
}

function renderDiyarHarita(kapId) {
  if (!DH.kurulu || !document.getElementById('dhKutu')) {
    if (!dhKur(kapId || 'diyarHaritaKutu')) return;
  }
  dhPerdeGer();   // çizimden ÖNCE: görsellerin belirmesi perdenin arkasında kalsın
  // Bekleyen keşifler ÇİZİMDEN ÖNCE belirleniyor: dhYerlestir bunlara bakıp
  // diyar görselini gizli başlatıyor, animasyon onu açıyor.
  DH.bekleyen = new Set(dhBekleyenKesifler());
  dhCiz();
  // Açılış yakınlığı kutu genişliğine bağlı: ~3 diyar yan yana görünsün.
  // Sabit bir değer bırakılırsa telefonda tek bir diyar ekranı taşırıyor.
  const r = DH.kutu.getBoundingClientRect();
  DH.kam.s = Math.max(dhEnAzOlcek(), Math.min(0.85, r.width / (DH.ayar.aralik * 3.2)));
  dhOrtala(DH.DUNYA / 2, DH.DUNYA / 2);
  dhPerdeCoz();   // kamera yerleştikten SONRA: perde açılınca her şey yerli yerinde
  // Bekleyen keşifler varsa, harita göründükten sonra sırayla oynat.
  if (DH.bekleyen.size) dhHaritaHazir().then(dhKesifKuyrugu);
}
