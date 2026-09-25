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
const SURUM_YAZI = "3";
const PARCALAR = [
  "Ink_and_Candlelight", "Afternoon_Porch_Light", "Paperback_Afternoon",
  "Rain_Against_Glass", "Sunlight_Through_Leaves", "Tea_and_Grey_Skies"
];
const YAGMURLAR = [null, "yagmur", "yagmur-kedi"];                   // düğme bunlar arasında döner
const YAGMUR_ADI = ["", "yağmur", "yağmur + kedi"];
const SAHNE = document.body.dataset.sahne || "orman";
const DIGER = SAHNE === "orman" ? { href: "kutuphane.html", ad: "Kütüphane" }
                                : { href: "orman.html", ad: "Orman" };
try { localStorage.setItem("magnus-son-sahne", SAHNE); } catch (e) {}   // simgeden açılınca buraya
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
const ONIZLEME = new URLSearchParams(location.search).has("onizleme"); // kart resmi çekerken şerit yok
const SESLEN = 2500, KISIL = 8000;                                   // ms: açılış / kapanış süresi
const DEPO = "magnus-ortak-v1";

/* ── depo (sahne değişince sürsün; hata verirse sessizce yok say) ── */
function oku(){ try { return JSON.parse(localStorage.getItem(DEPO)) || {}; } catch (e) { return {}; } }
function yaz(d){ try { localStorage.setItem(DEPO, JSON.stringify(d)); } catch (e) {} }
let D = Object.assign({ parca: 0, yagmur: 0, sure: { odak: 25, mola: 5, uzun: 15 }, pom: null }, oku());

/* ── SVG simgeler ── */
const S = (d, v = "0 0 24 24") => `<svg viewBox="${v}" width="20" height="20" fill="currentColor" aria-hidden="true">${d}</svg>`;
const SIMGE = {
  oynat: S('<path d="M8 5v14l11-7z"/>'),
  dur: S('<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'),
  sonraki: S('<path d="M6 6l9 6-9 6zM16 6h2v12h-2z"/>'),
  yagmur: S('<path d="M7 15a4 4 0 010-8 5 5 0 019.6 1.2A3.5 3.5 0 0117 15z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  saat: S('<circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 9v4l3 2M10 3h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>'),
  tam: S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
  sahne: SAHNE === "orman"
    ? S('<path d="M4 5h3v14H4zM9 5h3v14H9zM14.5 5.5l2.8-.8 3.6 13.5-2.8.8z"/>')          // kitaplar
    : S('<path d="M12 3l6 9h-3l4 6H5l4-6H6z"/>'),                                         // çam
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
  <button id="mYagmur" title="Yağmur sesi">${SIMGE.yagmur}</button>
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
  if (panel.classList.contains("acik")) return;
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
const KESIT = { "yagmur": [4, 6], "yagmur-kedi": [0.3, 1.2] };
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
                const ad = (s.split("/").pop() || "").replace(/\.mp3$/, "");
                kes = KESIT[ad] || [0, 0];
                a.forEach(x => { x.pause(); x.src = s; }); uygula(); },
    play(){ return a[akt].play(); },
    pause(){ clearInterval(zaman); caprazda = false; karisim[1 - akt] = 0; karisim[akt] = 1;
             a.forEach(x => x.pause()); uygula(); },
  };
}
const yagmur = donguSes();
const HEDEF = { muzik: 0.8, yagmur: 0.35 };
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
  $("mYagmur").classList.toggle("acik", !!D.yagmur);
  $("mYagmur").title = D.yagmur ? "Yağmur: " + YAGMUR_ADI[D.yagmur] : "Yağmur sesi";
  $("mPom").classList.toggle("acik", !!D.pom);
}
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
$("mYagmur").onclick = async () => {
  D.yagmur = (D.yagmur + 1) % YAGMURLAR.length; yaz(D);
  if (!D.yagmur) sus(yagmur, 900);
  else {
    yagmur.src = `muzik/${YAGMURLAR[D.yagmur]}.mp3`;
    if (!sustur) await cal(yagmur, HEDEF.yagmur);
    mesaj(YAGMUR_ADI[D.yagmur]);
  }
  dugmeler();
};

/* ── ZİL: dosya yok, küçük bir çan sesi sentezleniyor ── */
let ak = null;
function zil(){
  try {
    ak = ak || new (window.AudioContext || window.webkitAudioContext)();
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
$("mPom").onclick = () => { panel.classList.toggle("acik"); panelDoldur(); uyan(); };
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
    if (D.yagmur){ yagmur.src = `muzik/${YAGMURLAR[D.yagmur]}.mp3`; cal(yagmur, HEDEF.yagmur); }
  } else {
    sustur = true;                                     // molada ses yok
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
    if (!yagmur.paused) sus(yagmur, Math.max(500, kalan));
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
if (D.yagmur) yagmur.src = `muzik/${YAGMURLAR[D.yagmur]}.mp3`;
if (D.pom){
  sustur = D.pom.mod !== "odak";
  if (D.pom.bitis - Date.now() < -60000){ pomBitir(); }             // çoktan bitmiş eski sayaç
}
if (devam && devam.caliyor && !sustur){
  muzikIstek = true;
  cal(muzik, HEDEF.muzik).then(ok => {
    if (!ok){ muzikIstek = false; mesaj("Müzik için oynat düğmesine dokun"); }
    if (ok && D.yagmur) cal(yagmur, HEDEF.yagmur);
    dugmeler();
  });
}
dugmeler();
})();
