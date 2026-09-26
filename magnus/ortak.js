/* MAGNUS SAHNELERİ — ortak kontrol şeridi: lofi çalar + yağmur + pomodoro (25 Eylül).
   Kullanan: magnus/orman.html · magnus/kutuphane.html. <body data-sahne="orman|kutuphane">.
   magnus/ KENDİ KLASÖRÜ (25 Eylül): kendi simgesi + internetsiz çalışma (sw.js, kapsamı
   yalnız bu klasör — Ashbless'in önbelleksiz kuralına dokunmaz). Ashbless'te "Okuma Odası".
   Gökşin'in kararları:
   · Müzikler kendi Gemini lofi'leri (muzik/). Sırayla çalar, liste bitince başa döner.
   · Pomodoro: 25/5 ve 50/10 hazır + ELLE AYAR (odak/mola/uzun mola dakikası).
   · "Okuma biterken sesi azalarak sussun, başlarken artarak başlasın, molalarda ses yok."
   · Tarayıcı kutusu YOK (alert/confirm) — mesajlar sahnenin üstünde sönen yazı.
   · Simgeler SVG: emoji cihazdan cihaza değişiyor (Huawei tablet).
   Pomodoro durumu localStorage'da → sahne değişince sayaç kaldığı yerden sürer. */
(function(){
// Görünür sürüm (pomodoro panelinin altında): "cihaz hangi kodu çalıştırıyor?" tahmin edilmesin.
// sw.js SURUM'u ve sayfalardaki ortak.js?s= ile BİRLİKTE artır.
const SURUM_YAZI = "11";
const PARCALAR = [
  "Ink_and_Candlelight", "Afternoon_Porch_Light", "Paperback_Afternoon",
  "Rain_Against_Glass", "Sunlight_Through_Leaves", "Tea_and_Grey_Skies"
];
/* ── ORTAM SESLERİ (25 Eylül, Gökşin: "istediklerimizi üst üste aynı anda çalabilir miyiz …
   custom ses kombinleri kaydedebiliyorduk"). Sesler Pixabay/Freesound (Gökşin indirdi),
   hepsi ölçüldü: `ses` = varsayılan düzey (dosyaların yüksekliği farklı, biri ötekini
   bastırmasın). saat.wav: kaynak ~10 kat kısıktı → 3,5 kat yükseltilmiş kopya.
   tur "dongu" = kesintisiz döner · "ara" = arada bir, rastgele aralıkla (döngüde tuhaf olur).
   sayfa: dosyada 10 ayrı çevirme var (ölçüldü) → her seferinde BİRİ; kütüphanede Magnus'un
   sayfası döndüğü an çalar (Gökşin'in isteği), başka sahnede rastgele. */
const SESLER = [
  { id: "yagmur",      ad: "Yağmur",            tur: "dongu", ses: 0.5 },
  { id: "yagmur2",     ad: "Hafif yağmur",      tur: "dongu", ses: 0.45 },
  { id: "yagmur-kedi", ad: "Yağmur + mırlama",  tur: "dongu", ses: 0.5 },
  { id: "somine",      ad: "Şömine",            tur: "dongu", ses: 0.35 },
  { id: "saat",        ad: "Saat tik takı",     tur: "dongu", ses: 0.6, dosya: "saat.wav" },
  // kedi.wav: mırlama pes, en yüksekte bile zor duyuluyordu (Gökşin) → 4 kat yükseltilmiş kopya
  { id: "kedi",        ad: "Kedi mırlaması",    tur: "dongu", ses: 0.4, dosya: "kedi.wav" },
  { id: "kafe",        ad: "Kafe",              tur: "dongu", ses: 0.5 },
  { id: "nehir",       ad: "Dere",              tur: "dongu", ses: 0.75 },
  { id: "dalga",       ad: "Dalgalar",          tur: "dongu", ses: 0.6 },
  { id: "gece-ormani", ad: "Gece ormanı",       tur: "dongu", ses: 0.9 },
  { id: "ruzgar",      ad: "Ağaçlarda rüzgâr",  tur: "dongu", ses: 0.45 },
  { id: "ruzgar-cani", ad: "Rüzgâr çanı",       tur: "dongu", ses: 0.35 },
  { id: "baykus",      ad: "Baykuş",            tur: "ara", ses: 0.6, aralik: [45, 130] },
  { id: "caydanlik",   ad: "Çay dökme",         tur: "ara", ses: 0.6, aralik: [200, 480] },
  { id: "sayfa",       ad: "Sayfa çevirme",     tur: "ara", ses: 0.8, aralik: [25, 75],
    olaylar: [[0, .5], [1.5, 2], [2.75, 3.25], [4, 4.5], [5.25, 5.75], [7.5, 7.75],
              [8.75, 9], [10, 10.25], [11.5, 11.75], [12.5, 12.8]] },
];
const HAZIR_KARISIM = {
  kutuphane: [{ ad: "Kütüphane", sesler: { saat: 0.6, sayfa: 0.8 } },
              { ad: "Yağmurlu öğleden sonra", sesler: { yagmur2: 0.45, saat: 0.5, sayfa: 0.8 } }],
  orman:     [{ ad: "Gece ormanı", sesler: { "gece-ormani": 0.9, baykus: 0.6, ruzgar: 0.35 } },
              { ad: "Dere kenarı", sesler: { nehir: 0.7, "gece-ormani": 0.5 } }],
  oda:       [{ ad: "Şömine başı", sesler: { somine: 0.35, yagmur: 0.45, saat: 0.5, kedi: 0.4 } }],
};
const GENEL_KARISIM = [{ ad: "Kafe", sesler: { kafe: 0.5, yagmur2: 0.25 } }];
const SAHNE = document.body.dataset.sahne || "orman";
// Üç sahne (25 Eylül gecesi Oda eklendi): düğme sıradakine geçer, simgesi SIRADAKİNİ gösterir
const SAHNELER = [{ id: "kutuphane", ad: "Kütüphane" }, { id: "oda", ad: "Oda" }, { id: "orman", ad: "Orman" }];
const _si = Math.max(0, SAHNELER.findIndex(s => s.id === SAHNE));
const DIGER = { href: SAHNELER[(_si + 1) % 3].id + ".html", ad: SAHNELER[(_si + 1) % 3].ad, id: SAHNELER[(_si + 1) % 3].id };
try { localStorage.setItem("magnus-son-sahne", SAHNE); } catch (e) {}   // simgeden açılınca buraya
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
const ONIZLEME = new URLSearchParams(location.search).has("onizleme"); // kart resmi çekerken şerit yok
const SESLEN = 2500, KISIL = 8000;                                   // ms: açılış / kapanış süresi
const DEPO = "magnus-ortak-v1";

/* ── depo (sahne değişince sürsün; hata verirse sessizce yok say) ── */
function oku(){ try { return JSON.parse(localStorage.getItem(DEPO)) || {}; } catch (e) { return {}; } }
function yaz(d){ try { localStorage.setItem(DEPO, JSON.stringify(d)); } catch (e) {} }
let D = Object.assign({ parca: 0, sesler: {}, karisimlar: [], sure: { odak: 25, mola: 5, uzun: 15 }, pom: null }, oku());
// eski tek düğmeli yağmur (sürüm 1-3): 1 = yağmur, 2 = yağmur + kedi → karıştırıcıya
if (D.yagmur){ D.sesler[D.yagmur === 2 ? "yagmur-kedi" : "yagmur"] = 0.4; delete D.yagmur; }

/* ── SVG simgeler ── */
const S = (d, v = "0 0 24 24") => `<svg viewBox="${v}" width="20" height="20" fill="currentColor" aria-hidden="true">${d}</svg>`;
const SIMGE = {
  oynat: S('<path d="M8 5v14l11-7z"/>'),
  dur: S('<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'),
  sonraki: S('<path d="M6 6l9 6-9 6zM16 6h2v12h-2z"/>'),
  ses: S('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>'),
  saat: S('<circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 9v4l3 2M10 3h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>'),
  tam: S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
  sahne: {                                                                                // SIRADAKİ sahne
    kutuphane: S('<path d="M4 5h3v14H4zM9 5h3v14H9zM14.5 5.5l2.8-.8 3.6 13.5-2.8.8z"/>'), // kitaplar
    orman: S('<path d="M12 3l6 9h-3l4 6H5l4-6H6z"/>'),                                    // çam
    oda: S('<path d="M3 20h18M5 20V9h14v11M3 9h18M12 18c-2.5 0-3-2-1.5-4 .2 1 1 1.2 1.2.3.4-1.5 2.8-.8 2.3 1.6-.3 1.3-1 2.1-2 2.1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'), // şömine
  }[DIGER.id],
};

/* ── görünüm ── */
const css = document.createElement("style");
css.textContent = `
#mSerit{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);
  display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:14px;
  background:rgba(12,10,8,.72);border:1px solid rgba(255,220,170,.14);backdrop-filter:blur(6px);
  color:#e9dcc0;font:13px/1.2 system-ui,sans-serif;transition:opacity .8s;z-index:5;max-width:calc(100vw - 24px)}
#mSerit.gizli{opacity:0;pointer-events:none}
#mSerit button{background:none;border:0;color:inherit;width:36px;height:36px;border-radius:9px;
  display:grid;place-items:center;cursor:pointer;padding:0;flex:none}
#mSerit button:hover{background:rgba(255,220,170,.1)}
#mSerit button.acik{color:#ffc46b}
#mSerit button.yukleniyor{animation:mYukle 1s ease-in-out infinite}
@keyframes mYukle{50%{opacity:.35}}
#mSerit .ayrac{width:1px;height:22px;background:rgba(255,220,170,.16);margin:0 2px;flex:none}
#mParca{display:flex;align-items:center;gap:8px;min-width:0;max-width:210px}
#mParca img{width:30px;height:30px;border-radius:6px;object-fit:cover;flex:none}
#mParca span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#cdbfa3}
#mPomSure{font-variant-numeric:tabular-nums;color:#ffc46b;min-width:44px}
#mPomSure:empty{display:none}
#mPanel{position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom));transform:translateX(-50%);
  background:rgba(14,11,9,.92);border:1px solid rgba(255,220,170,.18);border-radius:14px;padding:14px 16px;
  color:#e9dcc0;font:14px/1.4 system-ui,sans-serif;z-index:6;width:min(320px,calc(100vw - 24px));display:none}
#mPanel.acik{display:block}
#mPanel h3{margin:0 0 10px;font-size:15px;font-weight:600;color:#ffc46b}
#mPanel .hazir{display:flex;gap:8px;margin-bottom:12px}
#mPanel .hazir button,#mPanel .alt button{flex:1;background:rgba(255,220,170,.08);border:1px solid rgba(255,220,170,.2);
  color:#e9dcc0;border-radius:9px;padding:8px;cursor:pointer;font:inherit}
#mPanel .hazir button.secili{border-color:#ffc46b;color:#ffc46b}
#mPanel label{display:flex;justify-content:space-between;align-items:center;margin:6px 0;color:#cdbfa3}
#mPanel input{width:64px;background:#1c1714;border:1px solid rgba(255,220,170,.2);color:#e9dcc0;
  border-radius:8px;padding:5px 8px;font:inherit;text-align:right}
#mPanel .alt{display:flex;gap:8px;margin-top:12px}
#mPanel .alt button.ana{background:#6b4a22;border-color:#b98a4a;color:#ffe2b0}
#mPanel .durum{margin-top:10px;color:#a8977a;font-size:13px;min-height:1.2em}
#mSesPanel{position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom));transform:translateX(-50%);
  background:rgba(14,11,9,.94);border:1px solid rgba(255,220,170,.18);border-radius:14px;padding:14px 16px;
  color:#e9dcc0;font:14px/1.4 system-ui,sans-serif;z-index:6;width:min(380px,calc(100vw - 24px));
  max-height:calc(100vh - 110px);overflow:auto;display:none}
#mSesPanel.acik{display:block}
#mSesPanel h3{margin:0 0 10px;font-size:15px;font-weight:600;color:#ffc46b}
.m-cipler{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.m-cip{background:rgba(255,220,170,.08);border:1px solid rgba(255,220,170,.22);color:#e9dcc0;border-radius:20px;
  padding:5px 11px;font:13px system-ui,sans-serif;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
.m-cip.kayitli{border-color:rgba(255,196,107,.45)}
.m-cip .sil{opacity:.6;padding:0 2px}
.m-cip.silinsin{border-color:#d9785a;color:#ffb39a}
.m-ses{display:grid;grid-template-columns:1fr 110px;align-items:center;gap:8px;padding:5px 0;
  border-top:1px solid rgba(255,220,170,.07)}
.m-ses label{display:flex;align-items:center;gap:8px;cursor:pointer;color:#cdbfa3}
.m-ses input[type=checkbox]{width:17px;height:17px;accent-color:#ffc46b}
.m-ses input[type=range]{width:110px;accent-color:#ffc46b}
.m-ses.kapali input[type=range]{opacity:.3}
.m-kaydet{display:flex;gap:8px;margin-top:12px}
.m-kaydet input{flex:1;min-width:0;background:#1c1714;border:1px solid rgba(255,220,170,.2);color:#e9dcc0;
  border-radius:8px;padding:7px 9px;font:inherit}
.m-kaydet button,.m-sesalt button{background:rgba(255,220,170,.08);border:1px solid rgba(255,220,170,.2);
  color:#e9dcc0;border-radius:9px;padding:7px 12px;cursor:pointer;font:inherit}
.m-sesalt{display:flex;gap:8px;margin-top:10px}
.m-sesalt button{flex:1}
#mMesaj{position:fixed;left:50%;top:18%;transform:translateX(-50%);color:#ffdca0;
  font:24px/1.3 Georgia,serif;letter-spacing:.5px;text-shadow:0 0 18px rgba(255,170,70,.5);
  opacity:0;transition:opacity 1.2s;pointer-events:none;z-index:7;text-align:center}
body.sakin{cursor:none}`;
document.head.appendChild(css);

const serit = document.createElement("div");
serit.id = "mSerit";
serit.innerHTML = `
  <button id="mOynat" title="Müzik">${SIMGE.oynat}</button>
  <div id="mParca"><img id="mKapak" alt=""><span id="mAd"></span></div>
  <button id="mSonraki" title="Sonraki parça">${SIMGE.sonraki}</button>
  <div class="ayrac"></div>
  <button id="mSes" title="Sesler">${SIMGE.ses}</button>
  <button id="mPom" title="Pomodoro">${SIMGE.saat}</button><span id="mPomSure"></span>
  <div class="ayrac"></div>
  <button id="mSahne" title="${DIGER.ad}">${SIMGE.sahne}</button>
  <button id="mTam" title="Tam ekran">${SIMGE.tam}</button>`;
document.body.appendChild(serit);
if (ONIZLEME) serit.style.display = "none";

const panel = document.createElement("div");
panel.id = "mPanel";
panel.innerHTML = `
  <h3>Pomodoro</h3>
  <div class="hazir"><button data-o="25" data-m="5" data-u="15">25 / 5</button><button data-o="50" data-m="10" data-u="20">50 / 10</button></div>
  <label>Odak (dk) <input id="mOdak" type="number" min="1" max="180"></label>
  <label>Mola (dk) <input id="mMola" type="number" min="1" max="60"></label>
  <label>Uzun mola, 4 turda bir (dk) <input id="mUzun" type="number" min="1" max="90"></label>
  <div class="alt"><button id="mPomBasla" class="ana">Başlat</button><button id="mPomKapat">Kapat</button></div>
  <div class="durum" id="mPomDurum"></div>
  <div class="durum" style="opacity:.5;font-size:11px">sürüm ${SURUM_YAZI}</div>`;
document.body.appendChild(panel);

const sesPanel = document.createElement("div");
sesPanel.id = "mSesPanel";
sesPanel.innerHTML = `
  <h3>Sesler</h3>
  <div class="m-cipler" id="mCipler"></div>
  <div id="mSesListe"></div>
  <div class="m-kaydet"><input id="mKarisimAd" maxlength="30" placeholder="Karışıma ad ver"><button id="mKaydet">Kaydet</button></div>
  <div class="m-sesalt"><button id="mHepsiKapat">Hepsini kapat</button><button id="mSesPanelKapat">Kapat</button></div>`;
document.body.appendChild(sesPanel);

const mesajKutu = document.createElement("div");
mesajKutu.id = "mMesaj";
document.body.appendChild(mesajKutu);
let mesajZ = null;
function mesaj(t){
  mesajKutu.textContent = t; mesajKutu.style.opacity = 1;
  clearTimeout(mesajZ); mesajZ = setTimeout(() => mesajKutu.style.opacity = 0, 5000);
}
const $ = id => document.getElementById(id);

/* ── ŞERİT görünür/gizli: dokununca, fare kıpırdayınca belirir; 4 sn sonra söner ── */
let sonDokunus = 0;
function uyan(){
  sonDokunus = Date.now();
  serit.classList.remove("gizli"); document.body.classList.remove("sakin");
}
setInterval(() => {
  if (panel.classList.contains("acik") || sesPanel.classList.contains("acik")) return;
  if (Date.now() - sonDokunus > 4000){ serit.classList.add("gizli"); document.body.classList.add("sakin"); }
}, 500);
["pointermove", "pointerdown", "keydown"].forEach(o => addEventListener(o, uyan));
uyan();

/* ── SES: yumuşak açılış/kapanış (volume rampası) ── */
const muzik = new Audio(); muzik.preload = "auto";
/* ORTAM SESİ DÖNGÜSÜ (Gökşin: "yağmur+kedi bitince kesilip tekrar başlıyor"). Tarayıcının
   kendi `loop`u sondan başa küt diye atlıyor ve dosyaların uçları birbirine uymuyor →
   İKİ kopya: bitişe CAPRAZ saniye kala ikincisi baştan girer, ilki çekilir. Dışarıya tek
   bir Audio gibi görünür (volume/play/pause/paused/src) → rampa() ve sus() aynen çalışır. */
/* KESİTLER (ölçüldü, 25 Eylül): dosyaların uçlarında açılma/sönme var — yağmur.mp3'ün
   başında ~4 sn açılma, sonunda ~6 sn sönme (son 2 sn tamamen sessiz); döngü sessiz
   kuyruğa denk gelip "kesilip birkaç saniye sonra başlıyordu". [baştan atla, sondan atla] sn. */
const KESIT = { "yagmur": [4, 6], "yagmur-kedi": [0.3, 1.2], "ruzgar": [3, 3] };
function donguSes(CAPRAZ = 3){
  const a = [new Audio(), new Audio()]; a.forEach(x => x.preload = "auto");
  let akt = 0, usta = 0, karisim = [1, 0], caprazda = false, zaman = null, kes = [0, 0];
  const uygula = () => a.forEach((x, i) => x.volume = Math.max(0, Math.min(1, usta * karisim[i])));
  a.forEach((x, i) => x.addEventListener("timeupdate", () => {
    if (i !== akt || caprazda || x.paused || !x.duration) return;
    if (x.currentTime < kes[0] - 0.5) { x.currentTime = kes[0]; return; }   // baştaki açılmayı atla
    if (x.duration - kes[1] - x.currentTime > CAPRAZ) return;
    const d = 1 - akt, y = a[d];
    if (document.hidden){
      // ARKA PLAN: telefon zamanlayıcıları donduruyor → yumuşak geçiş yarıda kalıp yağmur
      // susardı. Doğrudan geçiş (ses olayları arka planda da çalışıyor).
      y.currentTime = kes[0]; karisim[d] = 1; karisim[akt] = 0; uygula();
      y.play().catch(() => {}); x.pause(); akt = d; return;
    }
    caprazda = true;
    y.currentTime = kes[0]; karisim[d] = 0; uygula(); y.play().catch(() => {});
    const t0 = performance.now();
    clearInterval(zaman);
    zaman = setInterval(() => {
      const u = Math.min(1, (performance.now() - t0) / (CAPRAZ * 1000));
      karisim[d] = u; karisim[1 - d] = 1 - u; uygula();
      if (u >= 1){ clearInterval(zaman); a[1 - d].pause(); akt = d; caprazda = false; }
    }, 50);
  }));
  return {
    _rampa: null,
    get paused(){ return a[akt].paused; },
    get volume(){ return usta; }, set volume(v){ usta = v; uygula(); },
    set src(s){ clearInterval(zaman); caprazda = false; akt = 0; karisim = [1, 0];
                const ad = (s.split("/").pop() || "").replace(/\.(mp3|wav)$/, "");
                kes = KESIT[ad] || [0, 0];
                a.forEach(x => { x.pause(); x.src = s; }); uygula(); },
    play(){ return a[akt].play(); },
    pause(){ clearInterval(zaman); caprazda = false; karisim[1 - akt] = 0; karisim[akt] = 1;
             a.forEach(x => x.pause()); uygula(); },
  };
}
const HEDEF = { muzik: 0.8 };
function rampa(ses, hedef, ms, bitince){
  clearInterval(ses._rampa);
  const bas = ses.volume, t0 = performance.now();
  ses._rampa = setInterval(() => {
    const u = Math.min(1, (performance.now() - t0) / ms);
    ses.volume = Math.max(0, Math.min(1, bas + (hedef - bas) * u));
    if (u >= 1){ clearInterval(ses._rampa); if (bitince) bitince(); }
  }, 50);
}
let muzikIstek = false;                  // kullanıcı müzik istiyor mu (▶ / ⏸)
let sustur = false;                      // pomodoro molası: her şey sessiz
function parcaYukle(i, zaman){
  D.parca = (i + PARCALAR.length) % PARCALAR.length; yaz(D);
  const ad = PARCALAR[D.parca];
  muzik.src = `muzik/${ad}.mp3`;
  if (zaman) muzik.currentTime = zaman;
  $("mKapak").src = `muzik/${ad}-kapak.jpg`;
  $("mAd").textContent = ad.replace(/_/g, " ");
  // Kilit ekranı / bildirim alanı: parça adı, kapak (telefon arka planda daha güvenilir çalar)
  if ("mediaSession" in navigator) try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ad.replace(/_/g, " "), artist: "Magnus · Okuma Odası",
      artwork: [{ src: `muzik/${ad}-kapak.jpg`, sizes: "512x512", type: "image/jpeg" }]
    });
  } catch (e) {}
}
if ("mediaSession" in navigator) try {
  navigator.mediaSession.setActionHandler("play", () => { if (!(muzikIstek && !muzik.paused)) $("mOynat").click(); });
  navigator.mediaSession.setActionHandler("pause", () => { if (muzikIstek && !muzik.paused) $("mOynat").click(); });
  navigator.mediaSession.setActionHandler("nexttrack", () => $("mSonraki").click());
} catch (e) {}
async function cal(ses, hedef){
  try { ses.volume = 0; await ses.play(); rampa(ses, hedef, SESLEN); return true; }
  catch (e) { return false; }            // tarayıcı otomatik çalmayı engelledi: ▶ bekler
}
function sus(ses, ms = SESLEN){ rampa(ses, 0, ms, () => ses.pause()); }
function dugmeler(){
  $("mOynat").innerHTML = muzikIstek && !muzik.paused ? SIMGE.dur : SIMGE.oynat;
  const n = Object.keys(D.sesler).length;
  $("mSes").classList.toggle("acik", n > 0);
  $("mSes").title = n ? `Sesler (${n} açık)` : "Sesler";
  $("mPom").classList.toggle("acik", !!D.pom);
}

/* ── ORTAM SESLERİ KARIŞTIRICISI ─────────────────────────────────────────
   D.sesler = { id: düzey } → AÇIK olanlar (seçim kalıcı; sahne değişse de, sayfa yeniden
   açılsa da). Döngüler donguSes (iki kopya, kesintisiz); "ara" sesler Web Audio ile
   (sayfa çevirmenin tek bir parçasını kesip çalabilmek için). Pomodoro molasında hepsi susar. */
const dongular = {};
let ak = null;                                          // Web Audio (zil + ara sesler)
const sesTanim = id => SESLER.find(s => s.id === id);
const dosyaYolu = t => `muzik/${t.dosya || t.id + ".mp3"}`;
function baglam(){
  ak = ak || new (window.AudioContext || window.webkitAudioContext)();
  if (ak.state === "suspended") ak.resume().catch(() => {});
  return ak;
}
function donguAl(id){
  if (!dongular[id]){ const d = donguSes(); d.src = dosyaYolu(sesTanim(id)); dongular[id] = d; }
  return dongular[id];
}
function ortamBaslat(){
  if (sustur) return;
  for (const [id, v] of Object.entries(D.sesler)){
    const t = sesTanim(id); if (!t || t.tur !== "dongu") continue;
    const d = donguAl(id);
    if (d.paused) cal(d, v); else rampa(d, v, 400);
  }
  araPlanla();
}
function ortamSustur(ms = 900){
  Object.values(dongular).forEach(d => { if (!d.paused) sus(d, ms); });
}
const ortamCaliyor = () => Object.values(dongular).some(d => !d.paused);
/* onizle: kutucuk elle işaretlenince "ara" ses HEMEN bir kez çalar (Gökşin: "seçtiğimde
   hemen duymuyorum, beklemem gerekiyor … seçip seçmeyeceğime karar verebilirim").
   Karışım uygulanırken önizleme YOK (birkaç ara ses aynı anda çalıp kulağı yorardı). */
function sesAc(id, v, onizle){
  const t = sesTanim(id); if (!t) return;
  D.sesler[id] = v; yaz(D);
  if (t.tur === "dongu" && !sustur) cal(donguAl(id), v);
  if (t.tur === "ara"){ baglam(); tamponYukle(id); araPlanla(); if (onizle) tekCal(id); }
  dugmeler();
}
function sesKapat(id){
  delete D.sesler[id]; yaz(D);
  if (dongular[id] && !dongular[id].paused) sus(dongular[id], 700);
  araPlanla(); dugmeler();
}
function sesDuzey(id, v){
  D.sesler[id] = v; yaz(D);
  const d = dongular[id];
  if (d && !d.paused){ clearInterval(d._rampa); d.volume = v; }
}
/* "ara" sesler: dosya bir kez çözülür, her seferinde (sayfa için rastgele BİR çevirme) çalınır */
const tamponlar = {};
async function tamponYukle(id){
  if (tamponlar[id]) return tamponlar[id];
  try {
    const b = await (await fetch(dosyaYolu(sesTanim(id)))).arrayBuffer();
    tamponlar[id] = await new Promise((ok, no) => baglam().decodeAudioData(b, ok, no));
  } catch (e) {}
  return tamponlar[id];
}
/* YEDEK YOL (Gökşin: "baykuş, çay dökme, sayfa çevirmeyi hiç duyamadım"): Web Audio dosyayı
   fetch ile okuyor; dosyadan açılan sayfada (file://) Chrome buna izin vermiyor ve ses SESSİZCE
   çalmıyordu. Tampon yoksa sıradan bir çalarla: sayfa için bir çevirmenin başına sarıp sonunda durdur. */
function yedekCal(t, v){
  const a = new Audio(dosyaYolu(t)); a.volume = Math.min(1, v);
  if (t.olaylar){
    const [b, s] = t.olaylar[Math.floor(Math.random() * t.olaylar.length)];
    a.addEventListener("loadedmetadata", () => { a.currentTime = Math.max(0, b - 0.05); a.play().catch(() => {}); }, { once: true });
    setTimeout(() => a.pause(), (s - b + 0.35) * 1000 + 400);
  } else a.play().catch(() => {});
}
async function tekCal(id){
  const v = D.sesler[id]; if (v == null || sustur) return;
  const t = sesTanim(id), buf = await tamponYukle(id);
  if (!buf) return yedekCal(t, v);
  const c = baglam(), kaynak = c.createBufferSource(), g = c.createGain();
  kaynak.buffer = buf; g.gain.value = v; kaynak.connect(g); g.connect(c.destination);
  if (t.olaylar){
    const [a, b] = t.olaylar[Math.floor(Math.random() * t.olaylar.length)];
    kaynak.start(0, Math.max(0, a - 0.05), b - a + 0.25);
  } else kaynak.start();
}
const araZaman = {};
function araPlanla(){
  for (const t of SESLER){
    if (t.tur !== "ara") continue;
    // kütüphane ve odada sayfa sesi Magnus'un sayfasıyla eş → rastgele çalmaz
    const kapali = D.sesler[t.id] == null || ((SAHNE === "kutuphane" || SAHNE === "oda") && t.id === "sayfa");
    if (kapali){ clearTimeout(araZaman[t.id]); araZaman[t.id] = null; continue; }
    if (araZaman[t.id]) continue;
    const [a, b] = t.aralik;
    araZaman[t.id] = setTimeout(() => { araZaman[t.id] = null; tekCal(t.id); araPlanla(); },
                                (a + Math.random() * (b - a)) * 1000);
  }
}
// Kütüphane: Magnus'un sayfası döndüğü AN (kutuphane.html çağırır)
window.magnusSayfaSesi = () => { if (D.sesler.sayfa != null) tekCal("sayfa"); };

/* ── panel ── */
function karisimlar(){
  return [...(HAZIR_KARISIM[SAHNE] || []).map(k => ({ ...k, hazir: true })),
          ...GENEL_KARISIM.map(k => ({ ...k, hazir: true })),
          ...D.karisimlar.map((k, i) => ({ ...k, sira: i }))];
}
function karisimUygula(k){
  Object.keys(D.sesler).forEach(id => { if (!(id in k.sesler)) sesKapat(id); });
  for (const [id, v] of Object.entries(k.sesler)){
    if (D.sesler[id] == null) sesAc(id, v); else sesDuzey(id, v);
  }
  if (sustur) mesaj("Mola sürüyor — sesler odakla başlayacak");
  sesPanelCiz();
}
let silinecek = null, silZ = null;
function sesPanelCiz(){
  $("mCipler").innerHTML = karisimlar().map((k, i) => {
    const sil = k.hazir ? "" : `<span class="sil" data-sil="${k.sira}">${silinecek === k.sira ? "silinsin mi?" : "×"}</span>`;
    return `<button class="m-cip${k.hazir ? "" : " kayitli"}${silinecek === k.sira && !k.hazir ? " silinsin" : ""}" data-k="${i}">${k.ad.replace(/[<>&"]/g, "")}${sil}</button>`;
  }).join("");
  $("mSesListe").innerHTML = SESLER.map(t => {
    const acik = D.sesler[t.id] != null, v = acik ? D.sesler[t.id] : t.ses;
    return `<div class="m-ses${acik ? "" : " kapali"}"><label><input type="checkbox" data-id="${t.id}"${acik ? " checked" : ""}> ${t.ad}</label>
      <input type="range" min="0.05" max="1" step="0.05" value="${v}" data-duzey="${t.id}"></div>`;
  }).join("");
}
$("mCipler").onclick = (e) => {
  const s = e.target.closest("[data-sil]");
  if (s){
    e.stopPropagation();
    const i = +s.dataset.sil;
    if (silinecek === i){ D.karisimlar.splice(i, 1); yaz(D); silinecek = null; mesaj("Karışım silindi"); }
    else { silinecek = i; clearTimeout(silZ); silZ = setTimeout(() => { silinecek = null; sesPanelCiz(); }, 3000); }
    return sesPanelCiz();
  }
  const b = e.target.closest("[data-k]"); if (!b) return;
  const k = karisimlar()[+b.dataset.k]; if (k){ karisimUygula(k); mesaj(k.ad); }
};
$("mSesListe").onchange = (e) => {
  const id = e.target.dataset.id;
  if (id){
    const r = $("mSesListe").querySelector(`[data-duzey="${id}"]`);
    if (e.target.checked) sesAc(id, +r.value, true); else sesKapat(id);
    sesPanelCiz();
  }
  // "ara" sesin kaydırıcısı BIRAKILINCA bir kez çalar: yeni düzey hemen duyulsun
  const dz = e.target.dataset.duzey;
  if (dz && D.sesler[dz] != null && sesTanim(dz).tur === "ara") tekCal(dz);
};
$("mSesListe").oninput = (e) => {
  const id = e.target.dataset.duzey;
  if (id && D.sesler[id] != null) sesDuzey(id, +e.target.value);
};
$("mKaydet").onclick = () => {
  if (!Object.keys(D.sesler).length){ mesaj("Önce birkaç ses aç"); return; }
  const ad = ($("mKarisimAd").value.trim() || `Karışımım ${D.karisimlar.length + 1}`).slice(0, 30);
  D.karisimlar.push({ ad, sesler: { ...D.sesler } }); yaz(D);
  $("mKarisimAd").value = ""; sesPanelCiz(); mesaj(`"${ad}" kaydedildi`);
};
$("mHepsiKapat").onclick = () => { Object.keys(D.sesler).forEach(sesKapat); sesPanelCiz(); };
$("mSesPanelKapat").onclick = () => sesPanel.classList.remove("acik");
$("mSes").onclick = () => {
  panel.classList.remove("acik");
  sesPanel.classList.toggle("acik"); sesPanelCiz(); uyan();
};
/* Parça bitince sıradaki DOĞRUDAN tam seste (rampasız). Gökşin'in telefonu: uygulama
   arka plandayken parça bitti, sıradaki başlamadı — rampa setInterval'la açılıyor, telefon
   arka plandaki zamanlayıcıları donduruyor → yeni parça ses 0'da kalıyordu. */
muzik.addEventListener("ended", () => {
  parcaYukle(D.parca + 1);
  if (muzikIstek && !sustur){ clearInterval(muzik._rampa); muzik.volume = HEDEF.muzik; muzik.play().catch(() => {}); }
});
muzik.addEventListener("play", dugmeler); muzik.addEventListener("pause", dugmeler);
/* KENDİNİ TOPARLAMA (Gökşin'in telefonu, dengesiz internet): ağ hatasında 2 sn sonra
   kaldığı yerden tekrar; 3 denemede olmazsa sıradaki parça. Yüklenirken ▶ yanıp söner
   ("çalışmıyor mu?" diye art arda basılmasın). */
let hataSay = 0;
muzik.addEventListener("error", () => {
  if (!muzikIstek || sustur) return;
  const t = muzik.currentTime || 0;
  setTimeout(() => {
    if (++hataSay > 3){ hataSay = 0; parcaYukle(D.parca + 1); }
    else parcaYukle(D.parca, t);
    if (muzikIstek && !sustur) cal(muzik, HEDEF.muzik).then(dugmeler);
  }, 2000);
});
muzik.addEventListener("waiting", () => $("mOynat").classList.add("yukleniyor"));
muzik.addEventListener("playing", () => { hataSay = 0; $("mOynat").classList.remove("yukleniyor"); });
muzik.addEventListener("pause", () => $("mOynat").classList.remove("yukleniyor"));

$("mOynat").onclick = async () => {
  if (muzikIstek && !muzik.paused){ muzikIstek = false; sus(muzik, 900); }
  else {
    muzikIstek = true;
    if (sustur){ mesaj("Mola sürüyor — müzik odakla başlayacak"); dugmeler(); return; }
    await cal(muzik, HEDEF.muzik);
  }
  dugmeler();
};
$("mSonraki").onclick = async () => {
  parcaYukle(D.parca + 1);
  if (muzikIstek && !sustur) await cal(muzik, HEDEF.muzik);
};
/* ── ZİL: dosya yok, küçük bir çan sesi sentezleniyor ── */
function zil(){
  try {
    baglam();
    const t = ak.currentTime;
    [[660, 0], [880, 0.18], [990, 0.36]].forEach(([f, d]) => {
      const o = ak.createOscillator(), g = ak.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.18, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 2.2);
      o.connect(g); g.connect(ak.destination); o.start(t + d); o.stop(t + d + 2.3);
    });
  } catch (e) {}
}

/* ── POMODORO ── */
const dk = n => Math.max(1, Math.min(180, Math.round(Number(n) || 1)));
function panelDoldur(){
  $("mOdak").value = D.sure.odak; $("mMola").value = D.sure.mola; $("mUzun").value = D.sure.uzun;
  panel.querySelectorAll(".hazir button").forEach(b =>
    b.classList.toggle("secili", +b.dataset.o === D.sure.odak && +b.dataset.m === D.sure.mola && +b.dataset.u === D.sure.uzun));
  $("mPomBasla").textContent = D.pom ? "Durdur" : "Başlat";
  $("mPomDurum").textContent = D.pom ? `${D.pom.tur}. tur · ${D.pom.mod === "odak" ? "odak" : "mola"}` : "";
}
function sureleriAl(){
  D.sure = { odak: dk($("mOdak").value), mola: dk($("mMola").value), uzun: dk($("mUzun").value) }; yaz(D); panelDoldur();
}
["mOdak", "mMola", "mUzun"].forEach(id => $(id).addEventListener("change", sureleriAl));
panel.querySelectorAll(".hazir button").forEach(b => b.onclick = () => {
  D.sure = { odak: +b.dataset.o, mola: +b.dataset.m, uzun: +b.dataset.u }; yaz(D); panelDoldur();
});
$("mPom").onclick = () => { sesPanel.classList.remove("acik"); panel.classList.toggle("acik"); panelDoldur(); uyan(); };
$("mPomKapat").onclick = () => panel.classList.remove("acik");
$("mPomBasla").onclick = () => {
  if (D.pom){ pomBitir(); mesaj("Pomodoro durdu"); }
  else { sureleriAl(); evreBasla("odak", 1); }
  panelDoldur();
};
function evreBasla(mod, tur){
  const dakika = mod === "odak" ? D.sure.odak : mod === "uzun" ? D.sure.uzun : D.sure.mola;
  D.pom = { mod, tur, bitis: Date.now() + dakika * 60000, kisildi: false }; yaz(D);
  if (mod === "odak"){
    sustur = false; muzikIstek = true;                 // okumaya başlarken ses yavaşça açılır
    cal(muzik, HEDEF.muzik).then(dugmeler);
    ortamBaslat();
  } else {
    sustur = true;                                     // molada ses yok
    ortamSustur(800);
  }
  dugmeler(); panelDoldur();
}
function pomBitir(){
  D.pom = null; yaz(D); sustur = false;
  $("mPomSure").textContent = ""; dugmeler();
}
function pomTik(){
  if (!D.pom) return;
  const kalan = D.pom.bitis - Date.now();
  if (D.pom.mod === "odak" && !D.pom.kisildi && kalan <= KISIL){  // okuma biterken sesler azalarak susar
    D.pom.kisildi = true; yaz(D);
    if (!muzik.paused) sus(muzik, Math.max(500, kalan));
    ortamSustur(Math.max(500, kalan));
  }
  if (kalan <= 0){
    zil();
    if (D.pom.mod === "odak"){
      const uzun = D.pom.tur % 4 === 0;
      mesaj(uzun ? "Uzun mola zamanı" : "Mola zamanı");
      evreBasla(uzun ? "uzun" : "mola", D.pom.tur);
    } else {
      mesaj("Okumaya dönme vakti");
      evreBasla("odak", D.pom.tur + 1);
    }
    return;
  }
  const s = Math.ceil(kalan / 1000);
  $("mPomSure").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  $("mPomSure").title = D.pom.mod === "odak" ? "odak" : "mola";
}
setInterval(pomTik, 500);

/* ── TUVAL = GÖRÜNEN ALAN (Gökşin'in telefonu, yatay): CSS'teki 100vh telefon tarayıcısında
   adres çubuğunu da içine alıyor → sahnenin altı (halı, kedi, Magnus) ekrandan taşıyordu.
   Tuval, görünen alanın gerçek boyuna (innerWidth/innerHeight) oturtuluyor. ── */
const tuv = document.getElementById("c");
function tuvalBoyu(){ if (tuv){ tuv.style.width = innerWidth + "px"; tuv.style.height = innerHeight + "px"; } }
addEventListener("resize", tuvalBoyu); tuvalBoyu();

/* ── DİKEY TELEFON: "yan çevir" notu. Gökşin (26 Eylül): kalıcı olmasın, birkaç saniye görünüp
   kaybolsun — orman ve kütüphane dikeyde de güzel, isteyen dikey kullanabilsin. Sayfa açılışında
   bir kez; dokununca hemen kapanır. ── */
const yanCevir = document.createElement("div");
yanCevir.id = "mYanCevir";
yanCevir.innerHTML = `<svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/><path d="M20 9a7 7 0 0 1 0 6M18 7l2 2-2 2" /></svg>
  <div>Telefonunu yan çevir</div>`;
document.body.appendChild(yanCevir);
const yanCss = document.createElement("style");
yanCss.textContent = `#mYanCevir{position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;
  gap:14px;background:rgba(0,0,0,.72);color:#ffdca0;font:20px/1.3 Georgia,serif;z-index:4;text-align:center;transition:opacity .8s}
#mYanCevir.gidiyor{opacity:0;pointer-events:none}
#mYanCevir svg{animation:mCevir 2.4s ease-in-out infinite}
@keyframes mCevir{0%,30%{transform:rotate(0)}60%,100%{transform:rotate(90deg)}}`;
document.head.appendChild(yanCss);
function yanCevirKapat(){
  yanCevir.classList.add("gidiyor");
  setTimeout(() => { yanCevir.style.display = "none"; }, 800);
}
if (innerHeight > innerWidth && innerWidth < 700 && !ONIZLEME){
  yanCevir.style.display = "flex";
  yanCevir.addEventListener("pointerdown", yanCevirKapat);
  setTimeout(yanCevirKapat, 4000);
}

/* ── SAHNE geçişi + TAM EKRAN + ekran kararmasın ── */
$("mSahne").onclick = () => {
  D.devam = { caliyor: muzikIstek && !muzik.paused, zaman: muzik.currentTime || 0 }; yaz(D);
  location.href = DIGER.href;
};
$("mTam").onclick = async () => {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch (e) {}
};
/* EKRAN KARARMASIN (Gökşin: "tablette sürekli açık kalmıyor"). Eskiden yalnız Wake Lock
   API'si vardı ve yalnız ilk dokunuşta isteniyordu; Huawei tarayıcısı gibi desteklemeyenlerde
   hiç çalışmıyordu. NoSleep.js (MIT, magnus/nosleep.min.js — internetsiz de olsun diye kopya):
   destek varsa Wake Lock, yoksa görünmez sessiz minik video. Video yolu bir DOKUNUŞ ister →
   her dokunuşta (açık değilse) yeniden denenir; arka plandan dönünce de. */
const uyanik = typeof NoSleep === "function" ? new NoSleep() : null;
async function ekranAcik(){
  try { if (uyanik && !uyanik.isEnabled) await uyanik.enable(); } catch (e) {}
}
addEventListener("pointerdown", ekranAcik);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") ekranAcik(); });
ekranAcik();                                           // Wake Lock destekleniyorsa dokunuş beklemez

/* ── açılış: kalınan parça; sahne değişiminden geldiyse çalmayı sürdürmeyi dene ── */
const devam = D.devam; delete D.devam; yaz(D);
parcaYukle(D.parca, devam && devam.zaman);
if (D.pom){
  sustur = D.pom.mod !== "odak";
  if (D.pom.bitis - Date.now() < -60000){ pomBitir(); }             // çoktan bitmiş eski sayaç
}
if (devam && devam.caliyor && !sustur){
  muzikIstek = true;
  cal(muzik, HEDEF.muzik).then(ok => {
    if (!ok){ muzikIstek = false; mesaj("Müzik için oynat düğmesine dokun"); }
    dugmeler();
  });
}
/* Açık sesler (seçim kalıcı): hemen başlatmayı dene; tarayıcı engellerse İLK DOKUNUŞTA başlar. */
if (Object.keys(D.sesler).length && !sustur) ortamBaslat();
addEventListener("pointerdown", () => {
  if (Object.keys(D.sesler).length && !sustur && !ortamCaliyor()) ortamBaslat();
}, { once: true });
dugmeler();
// Deneme: ?panel=ses → ses paneli açık gelir (ekran görüntüsü için)
if (new URLSearchParams(location.search).get("panel") === "ses") $("mSes").click();
})();
