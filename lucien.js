// ══════════════════════════════════════════════════════════════════════
// LUCIEN'İN KÜTÜPHANESİ — 📚 kitap önerisi, 8 Ball kılığında
// ══════════════════════════════════════════════════════════════════════
// Tasarım: `gelecek-planlar.md` → "LUCIEN'İN KÜTÜPHANESİ" + eski "Magic 8 Ball"
// notu (2026-08-22). İsim Sandman'den: Rüyalar Diyarı'nın kütüphanecisi, rafları
// hiç yazılmamış kitaplarla dolu (Gökşin seçti, 2026-10-05).
//
// GÖRÜNÜŞ — Gökşin'in telefonundaki 8 Ball uygulamasından (video kare kare
// çözümlendi): üçgen YOK; siyah top + mercek. Dokununca içi kararır → bulanık
// yazılar döner → ortada cevap bulanıktan netleşir → halka renk alır.
// Dönen soluk yazılar = kişinin listelerindeki DİĞER kitap adları (Lucien'in rafları).
//
// ÇEKMECELER — Gökşin: "tek kurala bağlarsak hep aynı kitap çıkar". Her sallamada
// önce ağırlıkla bir çekmece, sonra içinden rastgele bir kitap. Boş çekmece atlanır
// (payı diğerlerine kalır) → yeni üyede yalnız mistik cevaplar kalır. Son 5 cevap
// tekrar etmez. Ağırlıklar EKRANDA YAZMAZ (oyun yardım metni kuralı).
//
// Yalnızca kendi profilinde — öneri kişiye özel.

const LUCIEN_SON_ANAHTAR = 'aa-lucien-son';
const LUCIEN_SES_ANAHTAR = 'aa-lucien-ses';
const LUCIEN_RENK = { seri:'#d4a72c', tsundoku:'#9b6bd6', raf:'#a87444', yeniden:'#4fae6a', yarim:'#c8642d', mistik:'#8a8a8a' };

/* Çekmeceler: ağırlık + renk + "neden" cümleleri ({k} kitap, {s} seri, {a} ay, {y} yıl).
   Her çekmecede birkaç cümle var ki aynı çekmece üst üste gelince de değişsin. */
const LUCIEN_CEKMECELER = [
  { ad:'seri',      agirlik:25, renk:'seri',
    neden:['{s} serisinde sıradaki kitap bu. Yolculuğu yarıda bırakma.',
           '{s} seni bekliyor. Kaldığın yerden devam.',
           'Lucien {s} rafının önünde durdu.'] },
  /* Fiziksel Kitap Rafı (Gökşin, 2026-10-06: "en kullanışlı veri orada"). Pay Tsundoku
     çekmecelerinden alındı (uzun 15→10, yeni 10→5, rastgele 15→10). */
  { ad:'raf',       agirlik:15, renk:'raf',
    neden:['Rafında duruyor, uzanman yeter.',
           'Bu kitap zaten evde.',
           'Rafın bir köşesinden sana bakıyor.'] },
  { ad:'uzun',      agirlik:10, renk:'tsundoku',
    neden:['{a} aydır rafta bekliyor. Tozunu sen alırsın.',
           'Rafın en eski sakini. {a} ay oldu.',
           '{a} ay önce "okuyacağım" demiştin.'] },
  { ad:'yeni',      agirlik:5,  renk:'tsundoku',
    neden:['Daha yeni aldın. Heves soğumadan.',
           'Rafa yeni geldi, sıcağı sıcağına.'] },
  { ad:'rastgele',  agirlik:10, renk:'tsundoku',
    neden:['Lucien gözünü kapatıp raftan bunu çekti.',
           'Tsundoku\'nun derinliklerinden geldi.',
           'Neden bu? Lucien de bilmiyor.'] },
  { ad:'sevilen',   agirlik:10, renk:'yeniden',
    neden:['Bir daha oku. Yine sevecek misin?',
           'Çok sevmiştin. Eski bir dostu ziyaret et.'] },
  { ad:'unutulan',  agirlik:5,  renk:'yeniden',
    neden:['{y}\'den beri görüşmediniz.',
           'En son {y}\'de okudun. Neler hatırlıyorsun?'] },
  { ad:'yarim',     agirlik:5,  renk:'yarim',
    neden:['Yarım bıraktın. Hâlâ seni bekliyor.',
           'Bir sayfa daha, sonra karar ver.'] },
  { ad:'ikinci',    agirlik:5,  renk:'yeniden',
    neden:['Belki ilk seferde haksızlık ettin.',
           'İkinci bir şans? Lucien ısrar ediyor.'] },
  { ad:'mistik',    agirlik:10, renk:'mistik', neden:[''] },
];

/* Veri yokken ve ara sıra (%10) çıkan cevaplar. Ortada BUNLAR yazar, altta neden yok. */
const LUCIEN_MISTIK = [
  'Raflar sisli. Sonra tekrar sor.',
  'Kuzgun uyuyor. Biraz bekle.',
  'Henüz yazılmamış bir kitap seni bekliyor.',
  'Cevap bir sayfa ötede.',
  'Kütüphane bu saatte kapalı.',
  'Bugün okuma değil, dinlenme günü.',
  'Gözlerini kapat, bir raf seç.',
  'Lucien kitabı arıyor. Bir çay koy.',
  'Önce elindekini bitir.',
  'Bu gece hiçbir kitap seni seçmedi.',
];
const LUCIEN_DOLGU = ['Belki…','Oku…','Bugün…','Sonra…','Sayfa…','Raf…','Rüya…','Kuzgun…'];

/* ── VERİ ─────────────────────────────────────────────────────────────── */
function lucienBitmisMi(b){
  return b && (b.readingStatus==='new' || b.readingStatus==='past' || !!(b.endDate||b.yearOnly)) && b.readingStatus!=='reading';
}
function lucienAyFarki(t){
  const z = Date.parse(t); if(!isFinite(z)) return null;
  return Math.max(0, Math.floor((Date.now()-z)/(30.44*864e5)));
}
function lucienKitapYili(b){
  const y = b.endDate ? +String(b.endDate).slice(0,4) : (b.yearOnly ? +b.yearOnly : null);
  return y || null;
}

/* Her çekmecenin adayları: {anahtar, ad, yazar, eylem, bookId?, seriId?, s?, a?, y?} */
function lucienAdaylar(){
  const kitaplar = (db.books && db.books[me] || []).filter(b => b && b.title && !String(b.title).startsWith('ISBN:'));
  const c = {}; LUCIEN_CEKMECELER.forEach(x => c[x.ad] = []);
  const kitapAday = (b, eylem, ek) => ({ anahtar:'k'+b.id, ad:b.title, yazar:b.author||'', bookId:b.id, eylem, ...(ek||{}) });

  // 📚 Seri devamı: en az bir kitabı bitmiş, sıradakine henüz başlanmamış seriler.
  // ⚠️ Silinmiş kitabın satırı seri kaydında kalabiliyor (Dune'da var, bkz. series.js
  // checkSeriesComplete) → bookId'si kütüphanede yoksa satır YOK sayılır. Öykü satırları da.
  try{
    // Anahtar = startPlannedBook'un beklediği seri kimliği (data.series[anahtar])
    const seriler = Object.entries((typeof mySeriesData==='function' ? mySeriesData().series : {}) || {});
    for(const [serAnahtar, ser] of seriler){
      if(!ser) continue;
      /* Elle yazılmış ("planned") satır kütüphanedeki kitaba BAĞLANMAMIŞ olabilir:
         Yüzüklerin Efendisi 3 bitmişti ama satır hâlâ "kralın dönüşü" (manualTitle)
         → Lucien ilk kez okunacakmış gibi önerdi (Gökşin, 2026-10-05). Kütüphanede AYNI
         ADLI kitap aranır. ❌ "Aynı seri + aynı numara" denendi, REDDEDİLDİ: numaralar
         tutarsız olabiliyor (Güneşin Tanrıları kitapta Robot #2, seri kaydında #3) →
         Çelik Mağaralar okunmuş sanıldı. */
      const ns = s => (typeof normalizeSeries==='function' ? normalizeSeries(s) : String(s||'').toLowerCase());
      const elleEslesen = bk => kitaplar.find(b => bk.manualTitle && ns(b.title)===ns(bk.manualTitle));
      const satirlar = (ser.books||[]).filter(Boolean)
        .map(bk => ({ bk, kitap: bk.bookId ? kitaplar.find(b => b.id===bk.bookId) : (bk.manualTitle ? elleEslesen(bk) || null : null) }))
        .filter(x => x.kitap || x.bk.manualTitle)
        .sort((p,q) => (parseFloat(p.bk.num)||999) - (parseFloat(q.bk.num)||999));
      if(!satirlar.some(x => x.kitap && lucienBitmisMi(x.kitap))) continue;
      const sirada = satirlar.find(x => !(x.kitap && lucienBitmisMi(x.kitap)));
      if(!sirada) continue;
      if(sirada.kitap){
        const d = sirada.kitap.readingStatus;
        if(d==='reading' || d==='paused') continue;          // zaten elinde
        c.seri.push(kitapAday(sirada.kitap, 'basla', { s:ser.name }));
      } else {
        c.seri.push({ anahtar:'s'+serAnahtar+':'+sirada.bk.manualTitle, ad:sirada.bk.manualTitle, yazar:sirada.bk.manualAuthor||'',
                      seriId:serAnahtar, eylem:'seriBasla', s:ser.name });
      }
    }
  }catch(e){}

  // ⏳ Tsundoku
  const tsundoku = kitaplar.filter(b => b.readingStatus==='wishlist' || b.readingStatus==='planned')
                           .sort((p,q) => String(p.addedAt||'').localeCompare(String(q.addedAt||'')));
  tsundoku.slice(0,3).forEach(b => c.uzun.push(kitapAday(b,'basla',{ a: lucienAyFarki(b.addedAt) ?? '?' })));
  tsundoku.slice(-3).reverse().forEach(b => c.yeni.push(kitapAday(b,'basla')));
  tsundoku.forEach(b => c.rastgele.push(kitapAday(b,'basla')));

  // 🗄️ Kitap Rafı: evde duran ama okunmamış kitaplar. Kitaplıkta AYNI ADLA aranır
  // (raf kaydı kitaba bağlı değil): bitmiş / okunuyor / yarım → atlanır (yarım kendi çekmecesinde);
  // Tsundoku'daysa o kitap kaydıyla, kitaplıkta yoksa "Kitaplığıma ekle" ile. Ödünçteki atlanır.
  try{
    const ad = t => String(t||'').toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();
    const rafKitaplari = ((db.shelf && db.shelf[me] && db.shelf[me].books) || [])
      .filter(r => r && r.title && !r.lent && !String(r.title).startsWith('ISBN:'));
    for(const r of rafKitaplari){
      const k = kitaplar.find(b => ad(b.title)===ad(r.title));
      if(!k) c.raf.push({ anahtar:'r'+r.id, ad:r.title, yazar:r.author||'', rafId:r.id, eylem:'rafEkle' });
      else if(k.readingStatus==='wishlist' || k.readingStatus==='planned') c.raf.push(kitapAday(k,'basla'));
    }
  }catch(e){}

  // 🔄 Yeniden okuma çekmeceleri (yalnız bitmiş, şu an okunmayan)
  const bitmis = kitaplar.filter(b => (b.readingStatus==='new' || b.readingStatus==='past'));
  const buYil = new Date().getFullYear();
  bitmis.filter(b => (b.rating||0) >= 4).forEach(b => c.sevilen.push(kitapAday(b,'yeniden')));
  bitmis.filter(b => { const y = lucienKitapYili(b); return y && y <= buYil-3; })
        .forEach(b => c.unutulan.push(kitapAday(b,'yeniden',{ y: lucienKitapYili(b) })));
  bitmis.filter(b => b.rating && b.rating <= 2.5).forEach(b => c.ikinci.push(kitapAday(b,'yeniden')));

  // 🚧 Yarım bırakılanlar
  kitaplar.filter(b => b.readingStatus==='paused').forEach(b => c.yarim.push(kitapAday(b,'devam')));

  // 🌫️ Mistik: her zaman dolu
  LUCIEN_MISTIK.forEach((m,i) => c.mistik.push({ anahtar:'m'+i, ad:m, mistik:true }));
  return c;
}

/* ── ÇEKİLİŞ ──────────────────────────────────────────────────────────── */
function lucienSonlar(){ try{ return JSON.parse(localStorage.getItem(LUCIEN_SON_ANAHTAR)||'[]'); }catch(e){ return []; } }
function lucienSonaEkle(anahtar){
  const s = lucienSonlar().filter(x => x!==anahtar); s.push(anahtar);
  try{ localStorage.setItem(LUCIEN_SON_ANAHTAR, JSON.stringify(s.slice(-5))); }catch(e){}
}
function lucienCek(adaylar){
  const son = lucienSonlar();
  const rastgele = d => d[Math.floor(Math.random()*d.length)];
  // Önce "son 5"i dışarıda bırakarak dene; olmazsa (az kitap) tekrar serbest
  for(const tekrarSerbest of [false, true]){
    const dolu = LUCIEN_CEKMECELER
      .map(cek => ({ cek, liste: adaylar[cek.ad].filter(a => tekrarSerbest || !son.includes(a.anahtar)) }))
      .filter(x => x.liste.length);
    // Mistik payı SABİT ~%10: boş çekmecelerin payı yalnız kitap çekmecelerine dağılır.
    // (Sınamada Nimet'te — seri/yarım/ikinci şans boş — mistik %35'e çıkıyordu.)
    // Gerçek kitap çekmecesi hiç yoksa (yeni üye) mistik tek başına kalır.
    const kitapAgirlik = dolu.filter(x => x.cek.ad!=='mistik').reduce((t,x) => t + x.cek.agirlik, 0);
    dolu.forEach(x => { x.agirlik = x.cek.ad==='mistik' ? (kitapAgirlik ? kitapAgirlik/9 : 1) : x.cek.agirlik; });
    const toplam = dolu.reduce((t,x) => t + x.agirlik, 0);
    if(!toplam) continue;
    let r = Math.random()*toplam;
    for(const x of dolu){
      r -= x.agirlik;
      if(r < 0){
        const aday = rastgele(x.liste);
        let neden = rastgele(x.cek.neden)
          .replace('{s}', aday.s||'').replace('{a}', aday.a??'').replace('{y}', aday.y||'');
        return { ...aday, cekmece:x.cek.ad, renk:LUCIEN_RENK[x.cek.renk], neden };
      }
    }
  }
  return { anahtar:'m0', ad:LUCIEN_MISTIK[0], mistik:true, cekmece:'mistik', renk:LUCIEN_RENK.mistik, neden:'' };
}

/* ── SES (Web Audio ile üretiliyor — dosya yok, telif yok) ───────────────
   Gökşin'in videosu ölçüldü (2026-10-06): ses bir KAYMA ya da sabit akor değil, sırayla
   giren hafif akortsuz notalar (~4.3 sn): mi tek → mi/re gidip gelir (titreme) + tiz
   pırıltı → la# girer → kısa DERİN iniş (do) → la# uzun söner. Cevaptan sonra alçak
   (~90 Hz) bir su çalkalanması. ❌ Önceki: 5 nota baştan sona aynı anda = "siren gibi
   tek düze, kulağı tırmalıyor" + tiz fışşş (6000→700 Hz). Ezgi bizim; kopya değil. */
let _lucienSes = null;
function lucienSesAcikMi(){ try{ return localStorage.getItem(LUCIEN_SES_ANAHTAR)!=='kapali'; }catch(e){ return true; } }
function lucienSesAcKapa(d){
  const yeni = !lucienSesAcikMi();
  try{ localStorage.setItem(LUCIEN_SES_ANAHTAR, yeni?'acik':'kapali'); }catch(e){}
  if(d) d.textContent = yeni ? '🔊' : '🔇';
}
function lucienSesCal(){
  if(!lucienSesAcikMi()) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    if(!_lucienSes) _lucienSes = new AC();
    const ac = _lucienSes; if(ac.state==='suspended') ac.resume();
    const t0 = ac.currentTime;
    const ana = ac.createGain(); ana.gain.value = .22; ana.connect(ac.destination);

    // Bir nota: yumuşak giriş/çıkış + çok hafif titreşim (cam/su hissi). Döndürür: ses düğümü
    const nota = (f, bas, son, g, giris = .15, cikis = .35) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const lfo = ac.createOscillator(); lfo.frequency.value = 4.5 + Math.random();
      const lg = ac.createGain(); lg.gain.value = f*.003; lfo.connect(lg); lg.connect(o.frequency);
      const og = ac.createGain(); o.connect(og); og.connect(ana);
      og.gain.setValueAtTime(0, bas);
      og.gain.linearRampToValueAtTime(g, bas+giris);
      og.gain.setValueAtTime(g, Math.max(bas+giris, son-cikis));
      og.gain.linearRampToValueAtTime(0, son);
      o.start(bas); lfo.start(bas); o.stop(son+.05); lfo.stop(son+.05);
      return og;
    };

    // 1) Ezgi: sallamadan 0.3 sn sonra başlar, cevap yapışırken (4.6 sn) biter
    const s = t0 + .3;
    nota(659, s,      s+2.6, .30, .3);                 // mi — açılış
    // mi ↔ re gidip gelme: ikisi aynı anda çalar, hangisinin baskın olduğu değişir
    [[659,0],[587,1]].forEach(([f,sira]) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const og = ac.createGain(); og.gain.setValueAtTime(0, s+1.0); o.connect(og); og.connect(ana);
      for(let t = 1.0, i = 0; t < 2.35; t += .18, i++) og.gain.setTargetAtTime((i+sira)%2 ? .10 : .26, s+t, .04);
      og.gain.setTargetAtTime(0, s+2.35, .03);
      o.start(s+1.0); o.stop(s+2.6);
    });
    nota(993,  s+1.1, s+2.4, .08, .3);                 // tiz pırıltı
    nota(1653, s+1.2, s+2.3, .035, .3);
    // la# — en gür, uzun söner. Videoda 922 Hz ama Gökşin "son ses fazla tiz" dedi (2026-10-06)
    // → bir oktav aşağıda (461). Üstte bırakılan kısık 922 pırıltısı da kaldırıldı (hâlâ tiz geldi).
    nota(461,  s+2.2, s+4.3, .32, .25, 1.1);
    nota(1582, s+2.3, s+2.9, .03);
    nota(262,  s+2.5, s+3.05, .30, .1, .25);           // derine iniş
    nota(516,  s+2.5, s+3.0, .12, .1, .25);
    nota(1067, s+3.0, s+3.45, .07, .08, .2);
    nota(512,  s+3.0, s+3.4, .06, .08, .2);
    nota(330,  s+3.4, s+4.3, .08, .2, .6);             // altta kalan mi (bir oktav aşağı, aynı sebep)

    // 2) Su çalkalanması: alçak süzülmüş gürültü, dalga gibi kabarıp iner (cevap oturduktan sonra)
    const bas = t0 + 4.9, sure = 1.2;
    const tampon = ac.createBuffer(1, Math.floor(ac.sampleRate*sure), ac.sampleRate);
    const veri = tampon.getChannelData(0); for(let i=0;i<veri.length;i++) veri[i] = Math.random()*2-1;
    const kaynak = ac.createBufferSource(); kaynak.buffer = tampon;
    // Videoda ~90 Hz; telefon hoparlörü o kadar alçağı çalamaz → biraz yukarıda (280→160 Hz)
    const suzgec = ac.createBiquadFilter(); suzgec.type = 'lowpass'; suzgec.Q.value = 4;
    suzgec.frequency.setValueAtTime(280, bas); suzgec.frequency.linearRampToValueAtTime(160, bas+sure);
    const fg = ac.createGain();
    fg.gain.setValueAtTime(0, bas); fg.gain.linearRampToValueAtTime(.9, bas+.2); fg.gain.linearRampToValueAtTime(0, bas+sure);
    // Çalkalanma: ses saniyede 5 kez kabarır (zarfla ÇARPILIR, eksiye düşmez: .55 ± .45)
    const kabar = ac.createGain(); kabar.gain.value = .55;
    const dalga = ac.createOscillator(); dalga.frequency.value = 5;
    const dg = ac.createGain(); dg.gain.value = .45; dalga.connect(dg); dg.connect(kabar.gain);
    kaynak.connect(suzgec); suzgec.connect(fg); fg.connect(kabar); kabar.connect(ana);
    kaynak.start(bas); kaynak.stop(bas+sure); dalga.start(bas); dalga.stop(bas+sure);
  }catch(e){}
}

/* ── ÇİZİM ────────────────────────────────────────────────────────────── */
function lucienStilEkle(){
  if(document.getElementById('lucienStil')) return;
  const st = document.createElement('style'); st.id = 'lucienStil';
  st.textContent = `
    .lc-top{position:relative;width:min(72vw,270px);aspect-ratio:1;margin:.4rem auto 0;border-radius:50%;cursor:pointer;
      background:radial-gradient(circle at 32% 26%,#5a5a5a 0%,#1d1d1d 22%,#070707 60%,#000 100%);
      box-shadow:0 10px 30px rgba(0,0,0,.6),inset 0 -8px 20px rgba(255,255,255,.04);-webkit-tap-highlight-color:transparent}
    .lc-top:active{transform:scale(.985)}
    .lc-top.lc-salla{animation:lcSalla .5s ease}
    @keyframes lcSalla{0%,100%{transform:translate(0,0)}20%{transform:translate(-7px,3px) rotate(-3deg)}40%{transform:translate(6px,-4px) rotate(3deg)}60%{transform:translate(-5px,2px)}80%{transform:translate(3px,-1px)}}
    .lc-halka{position:absolute;inset:17%;border-radius:50%;padding:4px;
      background:conic-gradient(from 200deg,#1a1a1a,var(--lc-renk,#666),#1a1a1a 40%,var(--lc-renk,#666) 70%,#1a1a1a);
      box-shadow:0 0 18px -2px var(--lc-renk,transparent);transition:box-shadow 1s ease}
    .lc-mercek{position:relative;width:100%;height:100%;border-radius:50%;overflow:hidden;
      -webkit-mask-image:-webkit-radial-gradient(white,black);
      background:radial-gradient(circle at 50% 45%,#121212,#000 75%)}
    .lc-girdap{position:absolute;inset:0;transition:opacity .9s ease}
    .lc-kure{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
    .lc-yazi{position:absolute;left:50%;top:50%;width:max-content;white-space:normal;text-align:center;line-height:1.15;
      overflow-wrap:break-word;font-family:'Space Mono',monospace;font-size:clamp(.42rem,2vw,.52rem);color:#9a9a9a}
    .lc-cevap{position:absolute;inset:18%;display:flex;align-items:center;justify-content:center;text-align:center;
      font-family:'Playfair Display',serif;font-size:clamp(.82rem,4vw,1.02rem);line-height:1.2;color:#cfcfcf;
      transition:opacity 1.3s ease,filter 1.3s ease,color 1s ease;overflow-wrap:anywhere}
    @media (prefers-reduced-motion: reduce){.lc-top.lc-salla{animation:none}}
  `;
  document.head.appendChild(st);
}

function lucienCiz(){
  const kap = document.getElementById('funContainer');
  if(!kap) return;
  const eski = document.getElementById('lucienBolum');
  if(eski) eski.remove();
  if(typeof viewing!=='undefined' && viewing) return;      // yalnız kendi profilinde
  lucienStilEkle();

  let acik = true;
  try{ const p = JSON.parse(localStorage.getItem('aa-acc')||'{}'); if(p['lucien']===false) acik = false; }catch(e){}

  const bolum = document.createElement('div');
  bolum.className = 'stats-section';
  bolum.id = 'lucienBolum';
  bolum.innerHTML = `
    <div class="stats-acc-header" onclick="toggleSection('lucien')">
      <div class="stats-section-title" style="margin-bottom:0">📚 Lucien'in Kütüphanesi</div>
      <span class="acc-arrow${acik?' open':''}" id="arr-lucien">▶</span>
    </div>
    <div class="stats-acc-body${acik?' open':''}" id="body-lucien" style="padding-top:.3rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:.76rem;color:var(--parchment);opacity:.8">Ne okusam? Topa dokun, Lucien raflara baksın.</div>
        <button onclick="lucienSesAcKapa(this)" title="Sesi aç / kapat"
          style="background:transparent;border:1px solid rgba(201,162,39,.35);border-radius:6px;padding:.2rem .45rem;font-size:.72rem;color:var(--gold);cursor:pointer">${lucienSesAcikMi()?'🔊':'🔇'}</button>
      </div>
      <div class="lc-top" id="lcTop" onclick="lucienSalla()" role="button" aria-label="Lucien'e sor">
        <div class="lc-halka" id="lcHalka">
          <div class="lc-mercek">
            <div class="lc-girdap" id="lcGirdap" style="opacity:0"></div>
            <div class="lc-cevap" id="lcCevap" style="opacity:.35">?</div>
          </div>
        </div>
      </div>
      <div id="lcAlt" style="min-height:4.2rem;text-align:center;margin-top:.7rem"></div>
    </div>`;
  kap.appendChild(bolum);
}

let _lucienMesgul = false;
function lucienSalla(){
  if(_lucienMesgul) return;
  _lucienMesgul = true;
  const top = document.getElementById('lcTop'), halka = document.getElementById('lcHalka');
  const girdap = document.getElementById('lcGirdap'), cevapEl = document.getElementById('lcCevap');
  const alt = document.getElementById('lcAlt');
  if(!top){ _lucienMesgul = false; return; }

  const adaylar = lucienAdaylar();
  const cevap = lucienCek(adaylar);
  lucienSonaEkle(cevap.anahtar);
  lucienSesCal();

  /* CAM KÜRE — yazılar cam bir kürenin YÜZEYİNE yapışık (Gökşin, 2026-10-05).
     4. tur (2026-10-06), "böyle daha kötü oldu" şikâyetlerinin karşılığı:
     · Yazılar 2-3 satıra kırılır (dar kutu), tek uzun satır değil.
     · Gerçek CSS 3B: her yazı kürenin teğet düzlemine oturur, eğimi/perspektifi tarayıcı
       çizer. ❌ Önceki 2B basıklaştırma (scaleX) "küreye iğne gibi dik" duruyordu.
     · Cevap BAŞTAN tam adıyla kürede; sonda yazı değişmez, küre öne gelince büyür.
     · Dönüş tek eksende, tek yönde, su direnciyle yavaşlar; sonda hafif sallanır.
       ❌ Önceki: serbest dönüşten sonra en kısa yoldan hedefe gidiş → çoğu zaman TERS
       yöne dönüyordu. Şimdi hedef önce seçilir, başlangıç ondan GERİYE doğru üretilir.
     · Görünürlük (Gökşin'in tarifi): başta hepsi bulanık; çoğu yazı sahte leke (süs);
       gerçek adaylar cevabın hemen çevresinde → sonda bulanık ama hafif okunur;
       arkadakiler hiç okunmaz. */
  const merW = top.getBoundingClientRect().width * .66 - 8;      // mercek çapı
  const KR = merW/2 * .92;                                       // küre yarıçapı
  const kisalt = (a,n) => a.length>n ? a.slice(0,n-1)+'…' : a;
  const derece = Math.PI/180;

  // Cevap kürenin "önünde" (0,0,1). Dönüşün sonunda küre sıfır konumuna döner → cevap tam öne, dik gelir.
  const yazilar = [{ metin:cevap.ad, tur:'cevap', p:[0,0,1], egim:0 }];
  // Gerçek aday adları (en çok 4) cevabın hemen çevresine
  const komsular = [...new Set(Object.values(adaylar).flat().filter(a => !a.mistik && a.ad!==cevap.ad).map(a => a.ad))]
    .sort(() => Math.random()-.5).slice(0, 4);
  const aci0 = Math.random()*360;
  komsular.forEach((ad,j) => {
    const b = (34 + Math.random()*8)*derece, psi = (aci0 + j*360/komsular.length + Math.random()*30-15)*derece;
    yazilar.push({ metin:kisalt(ad,34), tur:'komsu', egim:Math.random()*50-25,
                   p:[Math.sin(b)*Math.cos(psi), Math.sin(b)*Math.sin(psi), Math.cos(b)] });
  });
  // Geri kalanı sahte lekeler: cevaptan uzak noktalara (Fibonacci dağılımından seçilir)
  const harfler = 'aeiourlnmstkdyz';
  const sahteYazi = () => Array.from({length:1+Math.floor(Math.random()*3)}, () =>
    Array.from({length:3+Math.floor(Math.random()*5)}, () => harfler[Math.floor(Math.random()*harfler.length)]).join('')).join(' ');
  const bosYer = [];
  for(let i=0, M=44; i<M; i++){
    const y = 1 - 2*(i+.5)/M, r = Math.sqrt(1-y*y), th = i*2.39996;
    if(Math.sin(th)*r < .5) bosYer.push([Math.cos(th)*r, y, Math.sin(th)*r]);   // cevaptan 60°+ uzak
  }
  bosYer.sort(() => Math.random()-.5);
  while(yazilar.length < 18 && bosYer.length)
    yazilar.push({ metin:sahteYazi(), tur:'sahte', p:bosYer.pop(), egim:Math.random()*80-40 });

  // Her yazı kürenin teğet düzlemine: rotateY(boylam) rotateX(enlem) translateZ(yarıçap)
  const yerlesim = y => {
    const enlem = Math.asin(-y.p[1]), boylam = Math.atan2(y.p[0], y.p[2]);
    return `translate(-50%,-50%) rotateY(${boylam}rad) rotateX(${enlem}rad) translateZ(${KR}px) rotate(${y.egim}deg)`;
  };
  girdap.style.perspective = Math.round(merW*2.4) + 'px';
  girdap.innerHTML = '<div class="lc-kure">' + yazilar.map(y =>
    `<span class="lc-yazi" style="max-width:${Math.round(merW*(y.tur==='cevap'?.36:.28))}px;transform:${yerlesim(y)}">${escapeHtml(y.metin)}</span>`
  ).join('') + '</div>';
  const kure = girdap.firstChild, spanlar = [...kure.children];

  // 1) Salla, içi kararsın
  top.classList.remove('lc-salla'); void top.offsetWidth; top.classList.add('lc-salla');
  halka.style.setProperty('--lc-renk', '#555');
  halka.style.boxShadow = '';
  cevapEl.style.transition = 'opacity .5s ease, filter .5s ease';
  cevapEl.style.opacity = '0'; cevapEl.style.filter = 'blur(8px)';
  girdap.style.transition = 'opacity .5s ease';
  girdap.style.opacity = '0';
  alt.style.transition = 'opacity .4s ease'; alt.style.opacity = '0';

  // Dönüş ekseni çoğunlukla ekran düzleminde → yazılar önden geçer
  const ea = Math.random()*Math.PI*2;
  const A = (v => { const l = Math.hypot(...v); return v.map(x => x/l); })([Math.cos(ea), Math.sin(ea), (Math.random()-.5)*.4]);
  const donusMatrisi = a => {                                   // eksen A etrafında a radyan (Rodrigues)
    const c = Math.cos(a), s = Math.sin(a), k = 1-c, [x,y,z] = A;
    return [[c+x*x*k,   x*y*k-z*s, x*z*k+y*s],
            [y*x*k+z*s, c+y*y*k,   y*z*k-x*s],
            [z*x*k-y*s, z*y*k+x*s, c+z*z*k ]];
  };
  const ciz = (a, sis, yakin = 0) => {
    const R = donusMatrisi(a);
    kure.style.transform = `translateZ(${yakin.toFixed(1)}px) matrix3d(${R[0][0]},${R[1][0]},${R[2][0]},0,${R[0][1]},${R[1][1]},${R[2][1]},0,${R[0][2]},${R[1][2]},${R[2][2]},0,0,0,0,1)`;
    spanlar.forEach((sp,i) => {
      const y = yazilar[i];
      if(y.yapisti) return;
      const t = (R[2][0]*y.p[0] + R[2][1]*y.p[1] + R[2][2]*y.p[2] + 1) / 2;   // 1 ön, 0 arka
      let bulan = (1-t)*3.4 + sis, op = .07 + .8*Math.pow(t,1.6);
      if(y.tur==='sahte'){ bulan += 2.2; op *= .75; }                       // hiç okunmaz
      if(y.tur==='komsu') bulan = Math.max(bulan, .9);                      // sezilir ama net değil
      // Bulanıklık pahalı: yalnız 0.2px'lik adım değişince yeniden yaz (telefonda takılmasın)
      const b = Math.round(bulan*5)/5, o = Math.round(op*50)/50;
      if(y.b !== b){ y.b = b; sp.style.filter = `blur(${b}px)`; }
      if(y.o !== o){ y.o = o; sp.style.opacity = String(o); }
    });
  };

  /* Su direnci: açı θ(u) = Θ·(1−e^(−K·u)) / (1−e^(−K)), tek yönde. Sonra aynı hızla
     biraz taşar ve sönerek geri gelir (sönümlü salınım). Θ ≈ 0.6-0.9 tur: yavaş. */
  const THETA = (.6 + Math.random()*.3) * 2*Math.PI, K = 2.6;
  const T_BAS = 600, D = 4000, SAL = 1000;                     // ms: kararma · dönüş · salınım
  const ek = 1 - Math.exp(-K);
  const sonHiz = THETA * K*Math.exp(-K)/ek / (D/1000);         // rad/sn, dönüş biterken
  const w = 2*Math.PI/1.1, tau = .35;
  const aci = t => t < D ? -THETA*(1 - (1-Math.exp(-K*t/D))/ek)
                         : (sonHiz/w) * Math.sin(w*(t-D)/1000) * Math.exp(-(t-D)/1000/tau);
  const sisi = t => { const u = Math.min(1, Math.max(0, (t/D - .55)/.45)); return 2.6*(1 - u*u*(3-2*u)); };
  const azHareket = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  ciz(azHareket ? 0 : aci(0), azHareket ? 0 : sisi(0));

  /* 4) Küre yüzeye çıkar (Gökşin, 2026-10-06): yazı tek başına öne fırlamaz; BÜTÜN KÜRE
     sudan yükselir gibi ekrana yaklaşır, öndeki cevap bu yüzden büyüyüp okunur hâle gelir,
     çevredekiler büyüyerek kenarlara kayar. ❌ Önceki: yalnız cevap yazısı büyüyordu.
     Yaklaşma ölçülü + yazılar küçük (Gökşin): cevap tek başına kalmasın, komşular kürenin
     üstünde, yerlerinde, yarı okunur dursun. */
  const YAKIN = merW*.3, T_YAKIN = 1300;                        // cevap ~1.2 kat büyür
  const yakinlik = t => { const u = Math.min(1, Math.max(0, (t-D)/T_YAKIN)); return YAKIN*(1 - Math.pow(1-u, 3)); };
  const renk = cevap.mistik ? '#bdbdbd' : cevap.renk;
  const benim = spanlar[0];
  const yapis = () => {
    yazilar[0].yapisti = true;
    benim.style.transition = 'filter .7s ease, color .9s ease, opacity .5s ease';
    benim.style.filter = 'blur(0)'; benim.style.opacity = '1'; benim.style.color = renk;
    // Halka renk alır, altta neden + düğme
    setTimeout(() => {
      halka.style.setProperty('--lc-renk', cevap.renk);
      halka.style.boxShadow = `0 0 22px -2px ${cevap.renk}`;
      alt.innerHTML = lucienAltHtml(cevap);
      alt.style.transition = 'opacity .9s ease'; alt.style.opacity = '1';
      _lucienMesgul = false;
    }, 1300);
  };
  const soldur = () => spanlar.slice(1).forEach(sp => {         // küre geride kalır
    sp.style.transition = 'opacity .8s ease';
    sp.style.opacity = (parseFloat(sp.style.opacity)*.7).toFixed(3);
  });

  setTimeout(() => {
    girdap.style.transition = 'opacity .8s ease';
    girdap.style.opacity = '1';
    if(azHareket){ ciz(0, 0, YAKIN); yapis(); soldur(); return; }
    const t0 = performance.now();
    const kare = simdi => {
      const t = simdi - t0;
      if(t >= D + Math.max(SAL, T_YAKIN)){ ciz(0, 0, YAKIN); return soldur(); }
      ciz(aci(t), sisi(t), yakinlik(t));
      if(t >= D && !yazilar[0].yapisti) yapis();
      requestAnimationFrame(kare);
    };
    requestAnimationFrame(kare);
  }, T_BAS);
}

function lucienAltHtml(c){
  if(c.mistik) return `<div style="font-size:.72rem;color:var(--parchment);opacity:.6;font-style:italic">Bir daha sor.</div>`;
  const dugme = (yazi, js) => `<button onclick="${js}" style="margin-top:.55rem;background:rgba(74,103,65,.2);color:var(--moss);
      border:1px solid rgba(74,103,65,.45);border-radius:6px;padding:.32rem .8rem;font-family:'Space Mono',monospace;font-size:.66rem;cursor:pointer">${yazi}</button>`;
  let eylem = '';
  if(c.eylem==='basla')     eylem = dugme('📖 Okumaya başla', `lucienEylem('basla',${c.bookId})`);
  if(c.eylem==='yeniden')   eylem = dugme('🔄 Tekrar oku',    `lucienEylem('basla',${c.bookId})`);
  if(c.eylem==='devam')     eylem = dugme('📖 Devam et',      `lucienEylem('devam',${c.bookId})`);
  if(c.eylem==='seriBasla') eylem = dugme('📖 Okumaya başla', `lucienSeriBasla(this)`);
  if(c.eylem==='rafEkle')   eylem = dugme('📖 Kitaplığıma ekle', `lucienRafEkle(this)`);
  const ad = c.bookId ? `<span onclick="openBook(${c.bookId})" style="cursor:pointer;text-decoration:underline dotted rgba(201,162,39,.5)">${escapeHtml(c.ad)}</span>` : escapeHtml(c.ad);
  return `
    <div style="font-family:'Playfair Display',serif;font-size:.98rem;color:var(--gold-light)">${ad}</div>
    ${c.yazar?`<div style="font-size:.72rem;color:var(--parchment);opacity:.65">— ${escapeHtml(c.yazar)}</div>`:''}
    <div style="font-size:.76rem;color:var(--parchment);opacity:.88;margin-top:.3rem;font-style:italic">${escapeHtml(c.neden)}</div>
    <div ${c.eylem==='seriBasla'?`data-seri="${escapeHtml(String(c.seriId))}" data-ad="${escapeHtml(c.ad)}" data-yazar="${escapeHtml(c.yazar||'')}"`:''}${c.eylem==='rafEkle'?` data-raf="${escapeHtml(String(c.rafId))}"`:''}>${eylem}</div>`;
}

/* Eylemler mevcut düğmelerin AYNI fonksiyonlarını çağırır (Tsundoku "Okumaya başla",
   modal "Tekrar Oku" / "Devam et", Serilerim "📖 Başla") — yeni yol açılmadı. */
function lucienEylem(tur, bookId){
  if(tur==='basla' && typeof startReadingFromWishlist==='function') startReadingFromWishlist(bookId);
  if(tur==='devam' && typeof resumeReading==='function') resumeReading(bookId);
  lucienBitti();
}
function lucienSeriBasla(btn){
  const d = btn.parentElement.dataset;
  if(typeof startPlannedBook==='function') startPlannedBook(d.seri, d.ad, d.yazar);
  lucienBitti();
}
// Raftaki "📖 Kitaplığıma ekle" ile aynı yol: bilgileri forma aktarır, Kitaplarım'a geçer
function lucienRafEkle(btn){
  // data-* yazıya çevirir; asıl kimliği (sayı da olabilir) raf kaydından geri bul
  const id = btn.parentElement.dataset.raf;
  const r = ((db.shelf && db.shelf[me] && db.shelf[me].books) || []).find(b => b && String(b.id)===id);
  if(r && typeof addShelfBookToLibrary==='function') addShelfBookToLibrary(r.id);
}
function lucienBitti(){
  const alt = document.getElementById('lcAlt');
  if(alt) alt.innerHTML = `<div style="font-size:.78rem;color:var(--gold);margin-top:.4rem">✓ İyi okumalar. Lucien rafı düzeltiyor.</div>`;
}
