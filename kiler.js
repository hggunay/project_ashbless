// ══════════════════════════════════════════════════════════════════════
// AL'IN KİLERİ — 🕳️ Tavşan Deliği (eski çalışma adı: Zaman Portalı)
// ══════════════════════════════════════════════════════════════════════
// Tasarım: `gelecek-planlar.md` → "Zaman Portalı (Cin Ali'nin anısına)" +
// "5 EKİM 2026". Okuma geçmişinde bir güne düşüp o gün elde ne olduğunu görmek.
//
// İsim 11/22/63'ten (Gökşin, 2026-10-05): fikir o kitabı okurken yaşanan bir
// hatadan doğdu — bayat bir sekme veriyi eski hâline döndürmüş, uygulama
// "geçmişe atan bir kapı" gibi davranmıştı. Kitapta kapı Al'ın lokantasının
// kilerinde ve hep 9 Eylül 1958, 11.58'e açılıyor. Burada sayaç her düşüşte
// o andan başlayıp seçilen güne dönüyor (Gökşin onayı: "her seferinde aynı
// güne açılmak sıkıcı olur" → gönderme sayaçta, sonuç her seferinde farklı).
// Başlıktaki 🐛 hatanın anıtı — açıklaması bilerek yok.
//
// KURALLAR (planlar dosyasından):
//  • Tarih UYDURULMAZ. Yalnızca yılı (yearOnly) ya da ayı bilinen kitaplar
//    "bu yıl/ay içinde, günü bilinmeyen" diye ayrıca gösterilir.
//  • Rastgele düşüş yalnızca DOLU günlere: önce kitap seçilir, sonra onun
//    günlerinden biri → uzun süren kitap kısa olanı ezmez.
//  • O gün boşsa en yakın dolu güne yönlendirir.
//  • Ziyaret modunda ziyaret edilen üyenin geçmişi (Gökşin: herkes görebilsin).

const KILER_KAPI = '1958-09-09';   // Al'ın kapısının açıldığı gün
const KILER_SAAT = '11.58';

let _kilerSonuc = null;            // son düşülen gün — sekme yeniden çizilince kaybolmasın
let _kilerKisi  = null;            // sonuç kimin geçmişinden (ziyaret değişince sıfırlanır)
let _kilerZamanlayici = null;

/* ── Gün aritmetiği: "YYYY-MM-DD" ↔ gün numarası (UTC; saat dilimi kaymasın) ── */
function kilerGunNo(t){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t||'');
  return m ? Math.round(Date.UTC(+m[1], +m[2]-1, +m[3]) / 864e5) : null;
}
function kilerGunMetni(n){
  const d = new Date(n*864e5);
  return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
}
function kilerGuzelTarih(t){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if(!m) return t;
  return new Date(+m[1], +m[2]-1, +m[3]).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
}
function kilerNoktali(t){ const p=t.split('-'); return p[2]+'.'+p[1]+'.'+p[0]; }
function kilerTarih(s){ return (typeof normalizeDate==='function') ? normalizeDate(s) : s; }

/* ── VERİ: kişinin "anları" ──────────────────────────────────────────────
   Her an bir gün aralığı: {bas, bit (gün no), tur, ad, yazar, id, ...}
   Belirsizler (yalnız yıl / yalnız ay) ayrı listede. */
function kilerVerisi(kisi){
  const bugun = kilerGunNo(todayLocal());
  const anlar = [], belirsiz = [];
  const kitaplar = ((db.books && db.books[kisi]) || []).filter(b => b && b.title && !String(b.title).startsWith('ISBN:'));

  for(const b of kitaplar){
    if(b.readingStatus==='wishlist' || b.readingStatus==='planned') continue;
    // Yeniden okunan kitabın önceki okumaları (index.html `oncekiOkumalar`, 2026-10-05)
    const onceki = (b.oncekiOkumalar||[]).filter(Boolean);
    onceki.forEach((o,i) => {
      const ob = kilerGunNo(kilerTarih(o.startDate)), oe = kilerGunNo(kilerTarih(o.endDate));
      const ko = { tur:'kitap', id:b.id, ad:b.title, yazar:b.author||'', okumaNo:i+1 };
      if(ob!==null && oe!==null && ob<=oe) anlar.push({...ko, bas:ob, bit:oe, basBilinir:true, bitBilinir:true});
      else if(oe!==null) anlar.push({...ko, bas:oe, bit:oe, basBilinir:false, bitBilinir:true});
      else if(ob!==null) anlar.push({...ko, bas:ob, bit:ob, basBilinir:true, bitBilinir:false});
      else if(o.yearOnly) belirsiz.push({...ko, yil:+o.yearOnly, ay:null});
    });
    const bas = kilerGunNo(kilerTarih(b.startDate));
    // Yeniden okuma sürerken endDate hâlâ ESKİ okumanın — bu okumanın bitişi değil
    const bit = b.rereadStarted ? null : kilerGunNo(kilerTarih(b.endDate));
    // YALNIZ 'reading' bugüne uzar. 'paused' uzamaz: yarım bırakılmış kitap
    // (Cro-Magnon, 2022'den beri) "1681. günüydü" diye çıkıyordu.
    const okunuyor = b.readingStatus==='reading';
    const k = { tur:'kitap', id:b.id, ad:b.title, yazar:b.author||'', okumaNo: onceki.length ? onceki.length+1 : 0 };

    if(bas!==null && bit!==null && bas<=bit){
      anlar.push({...k, bas, bit, basBilinir:true, bitBilinir:true});
    } else if(bas!==null && bit!==null){
      /* Başlangıç bitişten SONRA (ölçüldü 2026-10-05: Gökşin'de 4, Nimet'te 10).
         Yeniden okuma mı giriş hatası mı bilinmiyor → iki gün AYRI tek gün olarak
         gösterilir, "yeniden" gibi bir yorum EKLENMEZ. */
      anlar.push({...k, bas:bit, bit, basBilinir:false, bitBilinir:true});
      anlar.push({...k, bas, bit: okunuyor ? Math.max(bas,bugun) : bas, basBilinir:true, bitBilinir:false});
    } else if(bit!==null){
      anlar.push({...k, bas:bit, bit, basBilinir:false, bitBilinir:true});
    } else if(bas!==null){
      // Hâlâ okunuyorsa bugüne kadar sürer; değilse yalnız başladığı gün
      anlar.push({...k, bas, bit: okunuyor ? Math.max(bas,bugun) : bas, basBilinir:true, bitBilinir:false});
    } else if(b.month && /^\d{4}-\d{2}$/.test(b.month)){
      belirsiz.push({...k, yil:+b.month.slice(0,4), ay:b.month});
    } else if(b.yearOnly){
      belirsiz.push({...k, yil:+b.yearOnly, ay:null});
    }
  }

  // Kısa okumalar (öykü/yazı): tek gün
  const hikayeler = ((db.stories && db.stories[kisi]) || []).filter(Boolean);
  for(const h of hikayeler){
    if(!h.title) continue;
    const k = { tur: h.tur==='yazi' ? 'yazi' : 'oyku', id:h.id, ad:h.title, yazar:h.author||'' };
    const g = kilerGunNo(kilerTarih(h.readDate));
    if(g!==null) anlar.push({...k, bas:g, bit:g, basBilinir:true, bitBilinir:true});
    else if(/^\d{4}$/.test(String(h.readDate||'').trim())) belirsiz.push({...k, yil:+String(h.readDate).trim(), ay:null});
  }

  /* Gelecekteki tarihler yok sayılır, bugünü aşan aralıklar bugünde kesilir.
     Ölçüldü 2026-10-05: iki kısa okumada "25.09.2027" yazım hatası var — veri
     DEĞİŞTİRİLMEDİ (kural: canlı veriye onaysız dokunma), yalnızca portal atlıyor. */
  const gecerli = anlar.filter(a => a.bas <= bugun).map(a => a.bit > bugun ? {...a, bit:bugun} : a);
  return { anlar: gecerli, belirsiz, bugun };
}

function kilerOGun(veri, gun){ return veri.anlar.filter(a => a.bas<=gun && gun<=a.bit); }

/* En yakın dolu gün — aynı uzaklıkta önce geçmişe bakar */
function kilerEnYakin(veri, gun){
  let enIyi = null;
  for(const a of veri.anlar){
    const hedef = gun < a.bas ? a.bas : (gun > a.bit ? a.bit : gun);
    const fark = Math.abs(hedef-gun);
    if(!enIyi || fark < enIyi.fark || (fark===enIyi.fark && hedef<enIyi.gun)) enIyi = {gun:hedef, fark};
  }
  return enIyi;
}

function kilerRastgeleGun(veri){
  if(!veri.anlar.length) return null;
  const a = veri.anlar[Math.floor(Math.random()*veri.anlar.length)];
  return a.bas + Math.floor(Math.random()*(a.bit-a.bas+1));
}

/* ── ÇİZİM ─────────────────────────────────────────────────────────────── */
function kilerSvg(){
  // Kiler: kapı kasası, iki raf, zeminde delik.
  // Renkler var(--gold) tonlarında — panel zemini KOYU (arayüz kalıpları notu).
  // Raflar (2026-10-07): çizilmiş dikdörtgen kavanozlar yerine Canva'dan iki ücretsiz görsel —
  // üst raf turuncu şişe/koli görselinin TEK rafı, alt raf yeşil kavanoz rafı (çizgiler kalınlaştırıldı);
  // ikisi de tek renk altına çevrildi, arka plan saydam (oyunlar/gorseller/kiler-raflar.png, 400×278).
  // Alt raf çizgi kalınlaştırması 4→2 (Gökşin: "çok aralıksız"). Görsel değişince href'teki ?s= artmalı (önbellek).
  // Delik kodla çiziliyor, görselin parçası DEĞİL (id'si animasyonda kullanılıyor).
  return `<svg viewBox="0 0 160 150" width="150" height="140" aria-hidden="true" style="flex-shrink:0;display:block">
    <defs>
      <radialGradient id="kilerDelikG" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#000"/><stop offset="70%" stop-color="#050308"/>
        <stop offset="100%" stop-color="#2a1d10"/>
      </radialGradient>
    </defs>
    <rect x="8" y="6" width="144" height="140" rx="3" fill="rgba(201,162,39,.05)" stroke="rgba(201,162,39,.45)" stroke-width="2"/>
    <image href="oyunlar/gorseller/kiler-raflar.png?s=2"x="19.6" y="9" width="120.8" height="84" preserveAspectRatio="xMidYMid meet"/>
    <ellipse cx="80" cy="118" rx="44" ry="16" fill="rgba(0,0,0,.35)"/>
    <ellipse id="kilerDelik" cx="80" cy="116" rx="36" ry="12" fill="url(#kilerDelikG)" stroke="rgba(201,162,39,.35)" stroke-width="1"/>
  </svg>`;
}

function kilerCiz(){
  const kap = document.getElementById('funContainer');
  if(!kap) return;
  const eski = document.getElementById('kilerBolum');
  if(eski) eski.remove();

  const kisi = (typeof viewing!=='undefined' && viewing) || me;
  if(_kilerKisi !== kisi){ _kilerSonuc = null; _kilerKisi = kisi; }
  const veri = kilerVerisi(kisi);
  const ilk = veri.anlar.length ? kilerGunMetni(Math.min(...veri.anlar.map(a=>a.bas))) : '';
  const bugun = todayLocal();

  let acik = true;
  try{ const p = JSON.parse(localStorage.getItem('aa-acc')||'{}'); if(p['al-kiler']===false) acik = false; }catch(e){}

  const dugme = `background:transparent;color:var(--gold);border:1px solid rgba(201,162,39,.5);border-radius:6px;
                 padding:.35rem .8rem;font-family:'Space Mono',monospace;font-size:.68rem;cursor:pointer`;
  const bos = !veri.anlar.length && !veri.belirsiz.length;

  const bolum = document.createElement('div');
  bolum.className = 'stats-section';
  bolum.id = 'kilerBolum';
  bolum.innerHTML = `
    <div class="stats-acc-header" onclick="toggleSection('al-kiler')">
      <div class="stats-section-title" style="margin-bottom:0">🍔 Al'ın Kileri</div>
      <span style="display:flex;align-items:center;gap:.5rem">
        <span style="font-size:.7rem;opacity:.55">🐛</span>
        <span class="acc-arrow${acik?' open':''}" id="arr-al-kiler">▶</span>
      </span>
    </div>
    <div class="stats-acc-body${acik?' open':''}" id="body-al-kiler" style="padding-top:.5rem">
      <div id="kilerSahne" style="position:relative;display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        ${kilerSvg()}
        <div style="flex:1;min-width:150px">
          <div style="font-family:'Playfair Display',serif;font-size:1.15rem;color:var(--gold-light)">Tavşan Deliği</div>
          <div style="font-size:.78rem;color:var(--parchment);opacity:.8;margin:.3rem 0 .7rem;line-height:1.45">
            ${bos ? 'Kilerin dibinde bir delik var ama aşağıda henüz hiçbir şey yok. Tarihli bir okuma ekleyince geçmiş burada birikmeye başlar.'
                  : 'Kilerin dibinde bir delik var. Merdiveni yok — düşersin. Nereye düşeceğin sana kalmış.'}
          </div>
          ${bos ? '' : `
          <div style="display:flex;flex-direction:column;gap:.45rem;align-items:flex-start">
            <button style="${dugme}" onclick="kilerDus('rastgele')">🎲 Rastgele bir güne düş</button>
            <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">
              <input type="date" id="kilerTarihKutu" min="${ilk}" max="${bugun}" value="${_kilerSonuc||''}"
                     style="background:rgba(0,0,0,.25);color:var(--parchment);border:1px solid rgba(201,162,39,.35);
                            border-radius:6px;padding:.28rem .4rem;font-family:'Space Mono',monospace;font-size:.68rem;color-scheme:dark">
              <button style="${dugme}" onclick="kilerDus('tarih')">📅 Bu güne düş</button>
            </div>
            <div id="kilerUyari" style="font-size:.68rem;color:var(--gold);min-height:1em"></div>
          </div>`}
        </div>
      </div>
      <div id="kilerSonuc"></div>
    </div>`;
  kap.appendChild(bolum);
  if(_kilerSonuc) kilerSonucCiz(veri, kilerGunNo(_kilerSonuc), false);
}

/* ── DÜŞÜŞ ─────────────────────────────────────────────────────────────── */
function kilerDus(nasil){
  const kisi = (typeof viewing!=='undefined' && viewing) || me;
  const veri = kilerVerisi(kisi);
  const uyari = document.getElementById('kilerUyari');
  if(uyari) uyari.textContent = '';
  let gun;
  if(nasil==='tarih'){
    const t = document.getElementById('kilerTarihKutu')?.value;
    gun = kilerGunNo(t);
    if(gun===null){ if(uyari) uyari.textContent = 'Önce bir tarih seç.'; return; }
    if(gun > veri.bugun){ if(uyari) uyari.textContent = 'Bu delik yalnızca geçmişe açılıyor.'; return; }
  } else {
    gun = kilerRastgeleGun(veri);
    // Hiç tarihli kayıt yoksa (yalnız yılı bilinenler): rastgele bir yılın ortasına
    if(gun===null && veri.belirsiz.length){
      const y = veri.belirsiz[Math.floor(Math.random()*veri.belirsiz.length)].yil;
      gun = kilerGunNo(y+'-07-01');
    }
    if(gun===null) return;
  }
  _kilerSonuc = kilerGunMetni(gun);
  const kutu = document.getElementById('kilerTarihKutu');
  if(kutu) kutu.value = _kilerSonuc;
  kilerAnimasyon(gun, () => kilerSonucCiz(veri, gun, true));
}

/* Düşüş — Gökşin'in tarifi (2026-10-05, ilk sürüm "olup bitiyor" dedi):
   1) delik büyür, kutusundan TAŞIP tüm ekranı kaplar, ekran simsiyah olur
   2) sayaç belirir: 09.09.1958 · 11.58'de bir an durur, sonra tarihler döner
   3) seçilen güne gelince bekler, sayaç söner
   4) karanlık KÜÇÜLEREK deliğin yerine geri çekilir
   5) ancak ondan sonra o günün kitabı bulanıktan netleşir.
   Siyahlık sayfanın üstünde sabit bir katman; şekli `clip-path: ellipse()` —
   başta deliğin kendi ölçüsü ve yeri, sonra ekranın köşegeni kadar. */
let _kilerDusuyor = false;
function kilerAnimasyon(hedef, bitince){
  const delik = document.getElementById('kilerDelik');
  const azHareket = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(azHareket || !delik){ bitince(); return; }
  if(_kilerDusuyor) return;
  _kilerDusuyor = true;
  clearInterval(_kilerZamanlayici);
  const sonuc = document.getElementById('kilerSonuc');
  if(sonuc) sonuc.innerHTML = '';

  const bekle = ms => new Promise(r => setTimeout(r, ms));
  const delikSekli = () => {
    const r = delik.getBoundingClientRect();
    return `ellipse(${r.width/2}px ${r.height/2}px at ${r.left+r.width/2}px ${r.top+r.height/2}px)`;
  };
  /* Büyürken deliğin ELİPS oranı korunur (Gökşin, 2026-10-05: daire olup
     şekil değiştiriyordu). k = en uzak köşeyi içine alan büyütme katsayısı:
     köşe (dx,dy) için (dx/(k·a))² + (dy/(k·b))² ≤ 1 → k ≥ √((dx/a)² + (dy/b)²). */
  const ekranSekli = () => {
    const r = delik.getBoundingClientRect();
    const a = r.width/2, b = r.height/2, cx = r.left+a, cy = r.top+b;
    let k = 0;
    for(const x of [0, innerWidth]) for(const y of [0, innerHeight])
      k = Math.max(k, Math.hypot((x-cx)/a, (y-cy)/b));
    k *= 1.05;
    return `ellipse(${a*k}px ${b*k}px at ${cx}px ${cy}px)`;
  };

  const perde = document.createElement('div');
  perde.style.cssText = `position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;
    justify-content:center;clip-path:${delikSekli()};-webkit-clip-path:${delikSekli()}`;
  const sayac = document.createElement('div');
  sayac.style.cssText = `font-family:'Space Mono',monospace;color:var(--gold-light,#e8c66a);text-align:center;
    letter-spacing:.08em;opacity:0;transition:opacity .45s ease`;
  perde.appendChild(sayac);
  document.body.appendChild(perde);
  // Düşerken sayfa kaymasın, delik yerinde kalsın. Kaydırma çubuğu kaybolunca sayfa
  // yana kaymasın diye boşluğu kadar sağ dolgu.
  const eskiTasma = document.body.style.overflow, eskiDolgu = document.body.style.paddingRight;
  const cubuk = innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if(cubuk > 0) document.body.style.paddingRight = cubuk + 'px';

  const sayacYaz = (gunNo, saatGorunurluk) => {
    sayac.innerHTML = `<div style="font-size:clamp(1.8rem,8vw,3rem)">${kilerNoktali(kilerGunMetni(gunNo))}</div>
      <div style="font-size:clamp(.9rem,3.5vw,1.2rem);opacity:${saatGorunurluk};margin-top:.4rem">${KILER_SAAT}</div>`;
  };
  const sekilGec = (sekil, sure, egri) => {
    perde.style.transition = `clip-path ${sure}ms ${egri}, -webkit-clip-path ${sure}ms ${egri}`;
    perde.style.clipPath = sekil; perde.style.webkitClipPath = sekil;
    return bekle(sure);
  };

  (async () => {
    try{
      perde.getBoundingClientRect();                                        // başlangıç şekli otursun
      await sekilGec(ekranSekli(), 1100, 'cubic-bezier(.55,0,.8,.35)');      // 1) düşüş: yavaş başlar, hızlanır
      const bas = kilerGunNo(KILER_KAPI);
      sayacYaz(bas, .7);
      sayac.style.opacity = '1';                                            // 2) Al'ın kapısı
      await bekle(1100);
      await new Promise(tamam => {                                          //    tarihler döner
        const sure = 2600, adim = 40; let gecen = 0;
        _kilerZamanlayici = setInterval(() => {
          gecen += adim;
          const t = Math.min(1, gecen/sure);
          const e = t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;            // yavaş başla, hızlan, yavaşla
          sayacYaz(Math.round(bas + (hedef-bas)*e), (1-t)*.7);
          if(t>=1){ clearInterval(_kilerZamanlayici); tamam(); }
        }, adim);
      });
      await bekle(900);                                                     // 3) vardık
      sayac.style.opacity = '0';
      await bekle(450);
      await sekilGec(delikSekli(), 1000, 'cubic-bezier(.2,.65,.3,1)');      // 4) karanlık deliğe çekilir
    } finally {
      perde.remove();
      document.body.style.overflow = eskiTasma;
      document.body.style.paddingRight = eskiDolgu;
      _kilerDusuyor = false;
    }
    bitince();                                                              // 5) kitap belirir
    setTimeout(() => document.getElementById('kilerSonucKutu')?.scrollIntoView({behavior:'smooth', block:'nearest'}), 100);
  })();
}

/* ── SONUÇ ─────────────────────────────────────────────────────────────── */
function kilerSatir(a, gun){
  const tik = a.tur==='kitap' ? `onclick="openBook(${a.id})"` : `onclick="openStoryDetail('${(typeof viewing!=='undefined'&&viewing)||me}', ${JSON.stringify(a.id).replace(/"/g,'&quot;')})"`;
  const simge = a.tur==='kitap' ? '📖' : (a.tur==='yazi' ? '📰' : '📜');
  const not = a.not
    || (a.bas===a.bit && a.basBilinir && a.bitBilinir ? (a.tur==='kitap' ? 'Başladığın gün bitirdin.' : 'O gün okudun.')
    :  gun===a.bit && a.bitBilinir ? 'O gün bitirdin.'
    :  gun===a.bas && a.basBilinir ? 'O gün başladın.'
    :  a.basBilinir ? `Bu kitabın ${gun - a.bas + 1}. günüydü.` : '')
    + (a.okumaNo ? ` (${a.okumaNo}. okuma)` : '');
  return `<div ${tik} style="cursor:pointer;display:flex;gap:.6rem;align-items:flex-start;padding:.5rem .6rem;margin-top:.4rem;
              background:rgba(201,162,39,.07);border:1px solid rgba(201,162,39,.2);border-radius:6px">
      <div style="font-size:1.3rem;line-height:1">${simge}</div>
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:.98rem;color:var(--parchment)">${escapeHtml(a.ad)}</div>
        ${a.yazar?`<div style="font-size:.72rem;color:var(--parchment);opacity:.65">— ${escapeHtml(a.yazar)}</div>`:''}
        ${not?`<div style="font-size:.7rem;color:var(--gold);opacity:.9;margin-top:.15rem">${not}</div>`:''}
      </div>
    </div>`;
}

function kilerSonucCiz(veri, gun, canli){
  const yer = document.getElementById('kilerSonuc');
  if(!yer) return;
  const tarih = kilerGunMetni(gun);
  const yil = +tarih.slice(0,4), ay = tarih.slice(0,7);
  let govde = '';

  const oGun = kilerOGun(veri, gun);
  if(oGun.length){
    govde = oGun.map(a => kilerSatir(a, gun)).join('');
  } else {
    // Günü bilinmeyen kayıtlar: kitap başına tarih UYDURULMAZ, olduğu gibi söylenir.
    const ayIcinde = veri.belirsiz.filter(b => b.ay===ay);
    const yilIcinde = veri.belirsiz.filter(b => b.yil===yil && !b.ay);
    const belirsizler = ayIcinde.concat(yilIcinde);
    if(belirsizler.length){
      const goster = belirsizler.slice(0, 6);
      const ayAdi = new Date(yil, +ay.slice(5)-1, 1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
      govde = `<div style="font-size:.78rem;color:var(--parchment);opacity:.85;margin-top:.3rem;line-height:1.45">
          Bu tarihte kesin bilinen bir kitap yok — ama günü bilinmeyen şunları okumuşsun:
        </div>` +
        goster.map(b => kilerSatir({...b, basBilinir:false, bitBilinir:false, bas:gun, bit:gun,
                                    not: b.ay ? ayAdi+' içinde' : yil+' içinde'}, null)).join('') +
        (belirsizler.length>goster.length ? `<div style="font-size:.7rem;opacity:.6;margin-top:.3rem;color:var(--parchment)">…ve ${belirsizler.length-goster.length} kitap daha.</div>` : '');
    } else {
      const yakin = kilerEnYakin(veri, gun);
      if(yakin){
        const yon = yakin.gun < gun ? 'önce' : 'sonra';
        govde = `<div style="font-size:.78rem;color:var(--parchment);opacity:.85;margin-top:.3rem">
            O gün elinde kitap yoktu. En yakın anın <b style="color:var(--gold-light)">${yakin.fark} gün ${yon}</b>, ${kilerGuzelTarih(kilerGunMetni(yakin.gun))}:
          </div>` + kilerOGun(veri, yakin.gun).map(a => kilerSatir(a, yakin.gun)).join('');
      } else {
        govde = `<div style="font-size:.78rem;color:var(--parchment);opacity:.8;margin-top:.3rem">Bu günün karanlığında hiçbir şey yok.</div>`;
      }
    }
  }

  yer.innerHTML = `
    <div id="kilerSonucKutu" style="margin-top:.9rem;padding:.7rem .8rem;border-left:2px solid var(--gold);background:rgba(0,0,0,.18);
         border-radius:0 6px 6px 0;${canli?'filter:blur(8px);opacity:0;transition:filter 1.3s ease,opacity 1.3s ease':''}">
      <div style="font-family:'Space Mono',monospace;font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);opacity:.85">Düştüğün gün</div>
      <div style="font-family:'Playfair Display',serif;font-size:1.15rem;color:var(--gold-light);margin:.15rem 0 .1rem">${kilerGuzelTarih(tarih)}</div>
      ${govde}
      <div style="display:flex;justify-content:flex-end;margin-top:.6rem">
        <button onclick="kilerTirman()" style="background:transparent;color:var(--gold);border:1px solid rgba(201,162,39,.4);border-radius:6px;
                padding:.25rem .7rem;font-family:'Space Mono',monospace;font-size:.62rem;cursor:pointer">↩ Geri tırman</button>
      </div>
    </div>`;
  if(canli){
    const k = document.getElementById('kilerSonucKutu');
    requestAnimationFrame(() => requestAnimationFrame(() => { k.style.filter = 'none'; k.style.opacity = '1'; }));
  }
}

/* Kapanış Okuyucu Falı'nın `falKapat`ıyla AYNI (Gökşin, 2026-10-05: "pat diye
   kapanıyor"): yazı 1.6 sn'de bulanıklaşıp söner, sonra kutu yüksekliği kapanır. */
function kilerTirman(){
  const k = document.getElementById('kilerSonucKutu');
  const yer = document.getElementById('kilerSonuc');
  if(!k || !yer || k.dataset.kapaniyor) return;
  k.dataset.kapaniyor = '1';
  _kilerSonuc = null;
  const kutu = document.getElementById('kilerTarihKutu');
  if(kutu) kutu.value = '';
  k.style.transition = 'opacity 1.6s ease, filter 1.6s ease';
  k.style.opacity = '0';
  k.style.filter = 'blur(6px)';
  setTimeout(() => {
    yer.style.overflow = 'hidden';
    yer.style.maxHeight = yer.scrollHeight + 'px';
    yer.getBoundingClientRect();
    yer.style.transition = 'max-height .8s ease';
    yer.style.maxHeight = '0';
  }, 1200);
  setTimeout(() => {
    yer.innerHTML = '';
    yer.style.transition = yer.style.maxHeight = yer.style.overflow = '';
  }, 2100);
}
