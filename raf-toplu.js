// ══════════════════════════════════════════════════════════════════════
// RAF — FOTOĞRAFTAN TOPLU KİTAP EKLEME (2026-10-06)
// ══════════════════════════════════════════════════════════════════════
// Tasarım: `gelecek-planlar.md` → "Raf Fotoğrafından Toplu Kitap Ekleme" + 6 Ekim notu.
//
// YOL C (Gökşin seçti): uygulama hiçbir yapay zekâya BAĞLANMAZ, API yok. Kullanıcı raf
// fotoğrafını kendi yapay zekâ uygulamasına (Gemini, ChatGPT…) okutur; buradaki
// "📋 Komutu kopyala" ona ne yazacağını verir. Gelen liste kutuya yapıştırılır →
// her satır kaynaklarda aranır (fetchBookInfo, tek eklemedeki aramanın aynısı) →
// DÜZELTME EKRANI → Kaydet. ❌ Elenenler: tarayıcıda OCR (sırtlarda isabet düşük),
// Google Vision (faturalandırma + yeni anahtar).
//
// ⚠️ VERİ: raf `aa-shelf/<kişi>` komple yazılıyor, K7 damga koruması arkasında
// (bkz. index.html saveDb). Toplu ekleme = hepsini diziye ekle + TEK saveDb.
// Bayat sekme yakalanırsa yazma iptal olur, db.shelf tazelenir → bizim kitaplar
// bellekten düşer; liste bu yüzden kayıt DOĞRULANANA dek ekranda + taslakta kalır.
// id'ler 'sb_'+Date.now() → döngüde aynı milisaniye çakışır, sıra eki şart.
//
// "✓ okudum" (Gökşin, 06.10): uygulamadan ÖNCE okunmuş raf kitapları. Raf kaydına
// `okundu:true` yazılır; Lucien bunları önermez. Raftaki ✏️ ile sonradan değişir.
// Barkodla satır ekleme 2. adıma bırakıldı (Gökşin onayı).

const RAF_TOPLU_KOMUT =
`Bu fotoğraftaki kitap sırtlarını soldan sağa, yukarıdan aşağı oku. Alt alta bir liste yaz: her kitap AYRI SATIRDA olsun, şu biçimde:
Kitap Adı — Yazar
Kitap adlarını ve yazarları Türkçe harfleriyle (ç, ğ, ı, ö, ş, ü) yaz. Yazarı göremiyorsan yalnızca kitap adını yaz. Okuyamadığın ya da emin olmadığın satırın başına ? koy. Fotoğrafta göremediğin bir kitabı tahminle ekleme. Başka hiçbir şey yazma: açıklama, numara, madde işareti yok.`;

const RAF_TOPLU_ILK = 5, RAF_TOPLU_ADIM = 10;   // uzun liste kuralı: 5 görünür, her basışta 10 daha
let _rt = { satirlar: [], rafId: '', gorunen: RAF_TOPLU_ILK, araniyor: false, bitti: 0, vazgecOnay: false };

function rafTopluTaslakAnahtar(){ return 'aa-raf-toplu-taslak-' + (typeof me!=='undefined' ? me : ''); }
function rafTopluTaslakKaydet(){
  try{
    if(_rt.satirlar.length) localStorage.setItem(rafTopluTaslakAnahtar(), JSON.stringify({ satirlar:_rt.satirlar, rafId:_rt.rafId }));
    else localStorage.removeItem(rafTopluTaslakAnahtar());
  }catch(e){}
}
function rafTopluTaslakYukle(){
  try{
    const t = JSON.parse(localStorage.getItem(rafTopluTaslakAnahtar()) || 'null');
    if(t && Array.isArray(t.satirlar) && t.satirlar.length){
      // Arama yarıda kaldıysa "aranıyor" satırları bulunamadı sayılır
      t.satirlar.forEach(r => { if(r.durum==='bekliyor') r.durum = 'yok'; });
      _rt.satirlar = t.satirlar; _rt.rafId = t.rafId || '';
    }
  }catch(e){}
}

/* ── METİN ────────────────────────────────────────────────────────────── */
function rafTopluNorm(s){
  return String(s||'').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
// Yapay zekânın yazdığı listeyi satırlara böl: numara/madde/kalın işaretlerini at,
// "Ad — Yazar" ayır, başında ? olanı "emin değil" say.
function rafTopluAyikla(metin){
  return String(metin||'').split('\n').map(s => s.trim()).filter(Boolean)
    .filter(s => !/:\s*$/.test(s))                                   // "Fotoğraftaki kitaplar:" gibi başlıklar
    .map(s => {
      s = s.replace(/^\s*(?:[-*•·]|\d+\s*[.)-])\s*/, '').replace(/\*\*/g, '').trim();
      let supheli = false;
      if(/^\?/.test(s)){ supheli = true; s = s.replace(/^\?+\s*/, ''); }
      if(/\(\?\)|\?\s*$/.test(s)){ supheli = true; s = s.replace(/\s*\(\?\)\s*/g, ' ').replace(/\s*\?+\s*$/, '').trim(); }
      const p = s.split(/\s+[—–-]\s+/);
      const ad = (p[0]||'').replace(/^["“'']+|["”'']+$/g, '').trim();
      const yazar = p.slice(1).join(' - ').trim();
      return { ham:s, ad, yazar, supheli };
    })
    .filter(x => x.ad);
}
/* Okunan ad (a) ile kaynağın getirdiği ad (b) aynı kitap mı? SIKI: birebir, ya da
   kaynaktaki alt başlık/parantez atılınca birebir, ya da küçük yazım farkı (%85+).
   ❌ "biri öbürünü içeriyorsa" / "kelimelerin yarısı" denendi: "Dune" ↔ "Dune Mesih"
   aynı sayıldı → kaynak yanlış kitabı getirince doğru ad sessizce değişirdi. */
function rafTopluBenzer(a, b){
  const x = rafTopluNorm(a);
  if(!x || !rafTopluNorm(b)) return false;
  const ham = String(b);
  const adaylar = [ham, ham.replace(/\([^)]*\)/g, ''), ...ham.split(/[:：]/)].map(rafTopluNorm).filter(Boolean);
  const oran = (p, q) => {                                     // 1 − düzeltme mesafesi / uzunluk
    const m = p.length, n = q.length; if(!m || !n) return 0;
    let once = Array.from({length:n+1}, (_,j) => j);
    for(let i=1;i<=m;i++){
      const simdi = [i];
      for(let j=1;j<=n;j++) simdi[j] = Math.min(once[j]+1, simdi[j-1]+1, once[j-1] + (p[i-1]===q[j-1]?0:1));
      once = simdi;
    }
    return 1 - once[n] / Math.max(m, n);
  };
  return adaylar.some(y => y===x || oran(x, y) >= .85);
}

// Büyük/küçük harf + Türkçe harf farkını yok say: "Çirkin Gece Kuşu" = "Cirkin gece Kusu"
function rafTopluKatla(s){
  return rafTopluNorm(s).replace(/[çğıöşüâîû]/g, c => ({ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u',â:'a',î:'i',û:'u'})[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}
// Okunan ad, kaynak adının kendisi ya da alt başlıksız/parantezsiz hâliyle harf biçimi dışında aynı mı?
function rafTopluAyniAd(a, b){
  const x = rafTopluKatla(a), ham = String(b||'');
  return !!x && [ham, ham.replace(/\([^)]*\)/g, ''), ...ham.split(/[:：]/)].some(y => rafTopluKatla(y)===x);
}
/* Yazarlar uyuşuyor mu? Biri boşsa evet. Değilse kısa olanın SOYADI öbüründe geçmeli:
   "Miguel de Cervantes" ↔ "Miguel de Cervantes Saavedra" evet; "Stefan Zweig" ↔ "Thomas Humeau"
   hayır (Satranç'ın yazarı sessizce değişmişti, 07.10) → satır "kaynak başka kitap buldu" olur. */
function rafTopluYazarUyar(a, b){
  const x = rafTopluKatla(a).split(' ').filter(Boolean), y = rafTopluKatla(b).split(' ').filter(Boolean);
  if(!x.length || !y.length) return true;
  const [kisa, uzun] = x.length <= y.length ? [x, y] : [y, x];
  return uzun.includes(kisa[kisa.length-1]);
}

/* Kaynağın getirdiği yazarı temizle (07.10): "derleyen Frederick H. Martens" → ön ek atılır;
   Latin dışı harfle gelen ("Джозеф Джекобс") kullanılmaz, boş kalır — çoğu üye okuyamaz,
   doğru mu diye de denetlenemez. */
function rafTopluKaynakYazar(s){
  s = String(s||'').replace(/^\s*(?:derleyen|derleyenler|çeviren|çevirmen|hazırlayan|hazırlayanlar|editör|ed\.|yayına hazırlayan)\s*:?\s+/i, '').trim();
  return /[^\p{Script=Latin}\p{N}\s.,'’&()\-]/u.test(s) ? '' : s;
}

/* ── AKIŞ ─────────────────────────────────────────────────────────────── */
function rafTopluAc(){
  const kutu = document.getElementById('rafTopluKutu');
  if(!kutu) return;
  const acilacak = kutu.style.display==='none';
  kutu.style.display = acilacak ? '' : 'none';
  // Ekleme akordeonunun 2000px tavanı uzun listeyi kesmesin
  const govde = document.getElementById('shelfAddAccBody');
  if(govde) govde.style.maxHeight = acilacak ? 'none' : '';
  if(acilacak){ if(!_rt.satirlar.length) rafTopluTaslakYukle(); rafTopluCiz(); }
}

function rafTopluKomutKopyala(btn){
  const tamam = () => { if(btn){ btn.textContent = '✓ Kopyalandı'; setTimeout(() => { btn.textContent = '📋 Komutu kopyala'; }, 2000); } };
  try{
    navigator.clipboard.writeText(RAF_TOPLU_KOMUT).then(tamam, () => rafTopluKomutSec());
  }catch(e){ rafTopluKomutSec(); }
}
function rafTopluKomutSec(){                                   // pano izni yoksa: metni seç, kullanıcı kopyalasın
  const el = document.getElementById('rafTopluKomut');
  if(el){ el.focus(); el.select(); }
  if(typeof mesajGoster==='function') mesajGoster('Komut seçildi — basılı tutup "Kopyala"ya bas.', 'uyari');
}

async function rafTopluAra(){
  if(_rt.araniyor) return;
  const metin = document.getElementById('rafTopluMetin')?.value || '';
  _rt.rafId = document.getElementById('rafTopluRaf')?.value || '';
  // ChatGPT'den kopyalanan liste tek satır geldi (07.10): "Ad — Yazar Ad — Yazar…" güvenle bölünemez
  const satirSayisi = metin.split('\n').filter(s => s.trim()).length;
  if(satirSayisi===1 && (metin.match(/\s[—–-]\s/g) || []).length >= 3){
    if(typeof mesajGoster==='function') mesajGoster('Liste tek satır geldi. Yapay zekâdan her kitabı ayrı satıra yazmasını iste.', 'uyari');
    return;
  }
  const liste = rafTopluAyikla(metin);
  if(!liste.length){ if(typeof mesajGoster==='function') mesajGoster('Liste boş. Yapay zekâdan gelen listeyi kutuya yapıştır.', 'uyari'); return; }

  _rt.satirlar = liste.map(x => ({ ham:x.ham, ad:x.ad, yazar:x.yazar, kaynakAd:'', kaynakYazar:'',
                                   durum:'bekliyor', supheli:x.supheli, ekle:!x.supheli, okudum:false }));
  _rt.araniyor = true; _rt.bitti = 0; _rt.gorunen = RAF_TOPLU_ILK;
  rafTopluCiz();

  // Aynı anda 3 arama: 40 kitap ~1 dk (fetchBookInfo yazar/seri için ek sorgular da yapıyor)
  let sira = 0;
  const isci = async () => {
    while(sira < _rt.satirlar.length){
      const r = _rt.satirlar[sira++];
      try{
        const info = (typeof fetchBookInfo==='function') ? await fetchBookInfo(r.ad, r.yazar, '') : null;
        if(info) info.author_clean = rafTopluKaynakYazar(info.author_clean);
        // fetchBookInfo bulamayınca girilen adı geri veriyor → "bulundu" için gerçek veri ara
        const buldu = info && (info.pages || info.pub_year || (info.genres && info.genres.length) ||
                               (info.title_clean && info.title_clean!==r.ad));
        if(!buldu) r.durum = 'yok';
        else if(rafTopluBenzer(r.ad, info.title_clean) && rafTopluYazarUyar(r.yazar, info.author_clean)){
          r.durum = 'bulundu';
          // Kaynak çoğu zaman Türkçe harfsiz/küçük harfli ("Cirkin gece Kusu") → yapay zekânın yazdığı
          // ad, kaynaktakinden yalnız harf biçimiyle ayrılıyorsa KALIR; yazım hatasıysa kaynağınki gelir.
          if(!rafTopluAyniAd(r.ad, info.title_clean)) r.ad = info.title_clean;
          if(!r.yazar) r.yazar = info.author_clean || '';
        } else {
          // Kaynak başka bir kitap getirmiş olabilir → kullanıcının satırı kalsın, öneri gösterilsin
          r.durum = 'farkli'; r.kaynakAd = info.title_clean; r.kaynakYazar = info.author_clean || '';
        }
      }catch(e){ r.durum = 'yok'; }
      _rt.bitti++;
      rafTopluCiz();
    }
  };
  await Promise.all([isci(), isci(), isci()]);
  _rt.araniyor = false;
  rafTopluCiftleriIsaretle();
  rafTopluOkunanlariIsaretle();
  rafTopluTaslakKaydet();
  rafTopluCiz();
}

// Rafta zaten olanlar: "ekle" kutusu boş gelir (aynı rafı iki kez çekince ikiye katlanmasın).
// Listede birden çok geçenler (07.10): TEK satırda birleşir, adet = kaç kez geçtiği → rafa qty
// olarak gider. Yapay zekâ yanlışlıkla iki kez yazabilir (Gemini "Korku") → satırda uyarı + adet kutusu.
function rafTopluCiftleriIsaretle(){
  const raftaki = new Set(((typeof myShelf==='function' ? myShelf().books : []) || []).map(b => rafTopluKatla(b.title)));
  const ilk = new Map();
  _rt.satirlar = _rt.satirlar.filter(r => {
    const n = rafTopluKatla(r.ad);
    if(n && ilk.has(n)){
      const a = ilk.get(n);
      a.adet = (a.adet||1) + (r.adet||1);
      if(r.okudum) a.okudum = true;
      if(!a.yazar && r.yazar) a.yazar = r.yazar;
      return false;
    }
    if(n) ilk.set(n, r);
    if(raftaki.has(n)){ r.cift = true; r.ekle = false; }
    else r.cift = false;
    return true;
  });
  _rt.gorunen = Math.min(Math.max(_rt.gorunen, RAF_TOPLU_ILK), Math.max(_rt.satirlar.length, RAF_TOPLU_ILK));
}

// Kitaplarım'da bitmiş olarak kayıtlı olanlar "okudum" işaretli gelir (Gökşin, 07.10) —
// yalnız arama bitince BİR KEZ; kullanıcı sonra kaldırabilir. Bitmiş ölçüsü Lucien'inkiyle aynı.
function rafTopluOkunanlariIsaretle(){
  const kitaplar = (typeof db!=='undefined' && db.books && db.books[me]) || [];
  const bitmis = b => b && (b.readingStatus==='new' || b.readingStatus==='past' || !!(b.endDate||b.yearOnly)) && b.readingStatus!=='reading';
  // Katla: "İmkânsız Kale" (raf) = "İmkansız Kale" (kitaplık) — şapka farkı eşleşmeyi kaçırıyordu (07.10)
  const okunan = new Set(kitaplar.filter(bitmis).map(b => rafTopluKatla(b.title)));
  _rt.satirlar.forEach(r => {
    r.kitaplikta = okunan.has(rafTopluKatla(r.ad));
    if(r.kitaplikta) r.okudum = true;
  });
}

function rafTopluDegis(i, alan, deger){
  const r = _rt.satirlar[i]; if(!r) return;
  r[alan] = deger;
  rafTopluTaslakKaydet();
  if(alan==='ekle' || alan==='okudum') rafTopluSayaciGuncelle();
}
function rafTopluKaynagiKullan(i){
  const r = _rt.satirlar[i]; if(!r) return;
  r.ad = r.kaynakAd; if(r.kaynakYazar) r.yazar = r.kaynakYazar; r.durum = 'bulundu';
  rafTopluCiftleriIsaretle(); rafTopluTaslakKaydet(); rafTopluCiz();
}
function rafTopluSil(i){ _rt.satirlar.splice(i, 1); rafTopluTaslakKaydet(); rafTopluCiz(); }
function rafTopluSatirEkle(){
  _rt.satirlar.push({ ham:'', ad:'', yazar:'', kaynakAd:'', kaynakYazar:'', durum:'elle', supheli:false, ekle:true, okudum:false });
  _rt.gorunen = Math.max(_rt.gorunen, _rt.satirlar.length);
  rafTopluTaslakKaydet(); rafTopluCiz();
  setTimeout(() => document.getElementById('rtAd_'+(_rt.satirlar.length-1))?.focus(), 50);
}
function rafTopluDahaFazla(){ _rt.gorunen += RAF_TOPLU_ADIM; rafTopluCiz(); }
function rafTopluVazgec(){
  if(!_rt.vazgecOnay){ _rt.vazgecOnay = true; rafTopluCiz(); return; }   // yıkıcı: iki adım
  _rt = { satirlar: [], rafId: '', gorunen: RAF_TOPLU_ILK, araniyor: false, bitti: 0, vazgecOnay: false };
  rafTopluTaslakKaydet(); rafTopluCiz();
}
function rafTopluSecilenler(){ return _rt.satirlar.filter(r => r.ekle && String(r.ad).trim()); }
function rafTopluSayaciGuncelle(){
  const b = document.getElementById('rafTopluKaydetBtn');
  if(b){ const n = rafTopluSecilenler().length; b.textContent = `💾 Kaydet (${n} kitap)`; b.disabled = !n; }
}

async function rafTopluKaydet(){
  if(_rt.araniyor) return;
  const secilen = rafTopluSecilenler();
  if(!secilen.length) return;
  const s = myShelf(); if(!s.books) s.books = [];
  const t = Date.now(), simdi = new Date().toISOString();
  const yeniler = secilen.map((r,i) => {
    const k = { id:'sb_'+t+'_'+i, title:String(r.ad).trim(), author:String(r.yazar||'').trim(), publisher:'',
                qty:(r.adet>1 ? r.adet : null), shelfId:_rt.rafId||null, isbn:null, addedAt:simdi, lent:null };
    if(r.okudum) k.okundu = true;
    return k;
  });
  s.books.push(...yeniler);
  const btn = document.getElementById('rafTopluKaydetBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
  if(typeof renderShelf==='function') renderShelf();
  await saveDb();

  // Doğrula: bayat sekme yakalandıysa db.shelf sunucudakiyle değişti, bizimkiler yok
  const raftaMi = ((db.shelf && db.shelf[me] && db.shelf[me].books) || []).some(b => b.id===yeniler[0].id);
  if(!raftaMi){
    if(typeof mesajGoster==='function') mesajGoster('Kaydedilemedi — liste duruyor. Uyarıyı okuyup 💾 Kaydet\'e tekrar bas.', 'uyari');
    rafTopluCiz();
    return;
  }
  // Bellekte ve yazıldı (ya da ağ hatasıysa kırmızı şerit zaten "tekrar dene" diyor) → liste temizlenir,
  // yeniden Kaydet aynı kitapları İKİ KEZ eklemesin.
  _rt = { satirlar: [], rafId: _rt.rafId, gorunen: RAF_TOPLU_ILK, araniyor: false, bitti: 0, vazgecOnay: false };
  rafTopluTaslakKaydet();
  rafTopluCiz();
  if(typeof mesajGoster==='function') mesajGoster(`✓ ${yeniler.length} kitap rafa eklendi.`);
}

/* ── ÇİZİM (zemin KOYU: .add-section → parşömen/altın yazı) ─────────────── */
const RAF_TOPLU_DURUM = {
  bekliyor:{ simge:'⏳', yazi:'aranıyor…',            renk:'var(--parchment)' },
  bulundu: { simge:'✓',  yazi:'bulundu',              renk:'#8fc68a' },
  farkli:  { simge:'⚠️', yazi:'kaynak başka kitap buldu', renk:'#e0b65a' },
  yok:     { simge:'⚠️', yazi:'bulunamadı — elle düzelt', renk:'#e0b65a' },
  elle:    { simge:'✏️', yazi:'elle eklendi',          renk:'var(--parchment)' },
};
function rafTopluCiz(){
  const kutu = document.getElementById('rafTopluKutu');
  if(!kutu) return;
  // .book-input width:100% + dolgu → kutu sağdan taşıyordu (telefon genişliğinde sınandı)
  if(!document.getElementById('rafTopluStil')){
    const st = document.createElement('style'); st.id = 'rafTopluStil';
    st.textContent = '#rafTopluKutu,#rafTopluKutu *{box-sizing:border-box;max-width:100%}';
    document.head.appendChild(st);
  }
  const e = v => (typeof escapeHtml==='function' ? escapeHtml(String(v??'')) : String(v??''));
  const kucuk = 'font-family:\'Space Mono\',monospace;font-size:.62rem';
  const rafSecenek = (typeof myShelf==='function' ? Object.values(myShelf().shelves||{}) : [])
    .map(sh => `<option value="${e(sh.id)}"${_rt.rafId===sh.id?' selected':''}>${e(sh.name)}</option>`).join('');

  // 1. aşama: komut + yapıştırma
  if(!_rt.satirlar.length){
    kutu.innerHTML = `
      <div style="margin-top:.6rem;padding:.7rem;border:1px solid rgba(201,162,39,.3);border-radius:4px;background:rgba(201,162,39,.05)">
        <div style="font-family:'Crimson Pro',serif;font-size:.88rem;color:var(--parchment);line-height:1.5">
          1. Rafının fotoğrafını çek.<br>
          2. Gemini, ChatGPT gibi bir yapay zekâ uygulamasına fotoğrafı ve aşağıdaki komutu gönder.<br>
          3. Gelen listeyi kopyalayıp aşağıya yapıştır.
        </div>
        <textarea id="rafTopluKomut" readonly class="book-input" style="margin-top:.5rem;min-height:84px;font-size:.72rem;line-height:1.4;opacity:.85;resize:vertical">${e(RAF_TOPLU_KOMUT)}</textarea>
        <button type="button" class="btn btn-sm" onclick="rafTopluKomutKopyala(this)" style="margin-top:.35rem;background:rgba(201,162,39,.15);color:var(--gold);border:1px solid rgba(201,162,39,.35)">📋 Komutu kopyala</button>
        <div class="field-label" style="margin:.8rem 0 .3rem">Yapay zekâdan gelen liste</div>
        <textarea id="rafTopluMetin" class="book-input" placeholder="Kürk Mantolu Madonna — Sabahattin Ali&#10;Tutunamayanlar — Oğuz Atay&#10;? Saatleri Ayarlama…" style="min-height:110px;font-size:.85rem;line-height:1.5;resize:vertical"></textarea>
        <select id="rafTopluRaf" class="book-input" style="margin-top:.4rem;font-size:.85rem">
          <option value="">📦 Rafsız</option>${rafSecenek}
        </select>
        <button type="button" class="btn btn-primary btn-sm" onclick="rafTopluAra()" style="margin-top:.5rem">🔍 Kitapları ara</button>
      </div>`;
    return;
  }

  // 2. aşama: düzeltme ekranı
  const toplam = _rt.satirlar.length;
  const ilerleme = _rt.araniyor
    ? `<div style="${kucuk};color:var(--gold);margin-bottom:.5rem">🔍 Aranıyor… ${_rt.bitti} / ${toplam}</div>`
    : `<div style="font-family:'Crimson Pro',serif;font-size:.84rem;color:var(--parchment);opacity:.85;margin-bottom:.5rem">
         ${toplam} satır. Kontrol et, düzelt, eklenmeyecekleri işaretten çıkar.
         <span style="${kucuk};opacity:.8;display:block;margin-top:.15rem">❓ emin olunamayanlar ve ⧉ rafta zaten olanlar işaretsiz gelir.</span>
       </div>`;
  const satirHtml = (r, i) => {
    const d = RAF_TOPLU_DURUM[r.durum] || RAF_TOPLU_DURUM.yok;
    const etiketler = [
      `<span style="${kucuk};color:${d.renk}">${d.simge} ${d.yazi}</span>`,
      r.supheli ? `<span style="${kucuk};color:#e0b65a">❓ yapay zekâ emin değil</span>` : '',
      r.cift ? `<span style="${kucuk};color:#e0b65a">⧉ zaten rafta</span>` : '',
      r.adet>1 ? `<span style="${kucuk};color:#e0b65a">×${r.adet} — listede ${r.adet} kez geçiyor. Gerçekten ${r.adet} tane mi? Değilse adedi düzelt.</span>` : '',
      r.kitaplikta ? `<span style="${kucuk};color:#8fc68a">📗 kitaplığında okunmuş</span>` : '',
    ].filter(Boolean).join(' · ');
    const okunan = r.ham && rafTopluNorm(r.ham)!==rafTopluNorm(r.ad + (r.yazar?' '+r.yazar:''))
      ? `<div style="${kucuk};color:var(--parchment);opacity:.55;margin-top:.2rem">Okunan: ${e(r.ham)}</div>` : '';
    const oneri = r.durum==='farkli'
      ? `<div style="${kucuk};color:#e0b65a;margin-top:.25rem">Kaynakta: ${e(r.kaynakAd)}${r.kaynakYazar?' — '+e(r.kaynakYazar):''}
           <button type="button" onclick="rafTopluKaynagiKullan(${i})" style="margin-left:.3rem;background:rgba(201,162,39,.15);color:var(--gold);border:1px solid rgba(201,162,39,.35);border-radius:3px;font-size:.62rem;padding:.05rem .4rem;cursor:pointer">bunu kullan</button></div>` : '';
    return `
      <div data-rt style="padding:.55rem 0;border-bottom:1px solid rgba(201,162,39,.15);opacity:${r.ekle?1:.6}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.3rem">
          <div>${etiketler}</div>
          <div style="display:flex;gap:.6rem;align-items:center">
            <label style="${kucuk};color:var(--parchment);display:flex;align-items:center;gap:.2rem;cursor:pointer">
              <input type="checkbox" ${r.okudum?'checked':''} onchange="rafTopluDegis(${i},'okudum',this.checked)"> okudum</label>
            <label style="${kucuk};color:var(--gold);display:flex;align-items:center;gap:.2rem;cursor:pointer">
              <input type="checkbox" ${r.ekle?'checked':''} onchange="rafTopluDegis(${i},'ekle',this.checked);this.closest('[data-rt]').style.opacity=this.checked?1:.6"> ekle</label>
            <button type="button" onclick="rafTopluSil(${i})" title="Satırı sil" style="background:transparent;border:none;color:#d08770;cursor:pointer;font-size:.85rem">✕</button>
          </div>
        </div>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap">
          <input id="rtAd_${i}" class="book-input" value="${e(r.ad)}" placeholder="Kitap adı" style="flex:2;min-width:150px;font-size:.85rem;padding:.35rem .6rem" oninput="rafTopluDegis(${i},'ad',this.value)">
          <input class="book-input" value="${e(r.yazar)}" placeholder="Yazar" style="flex:1;min-width:110px;font-size:.85rem;padding:.35rem .6rem" oninput="rafTopluDegis(${i},'yazar',this.value)">
          ${r.adet>1 ? `<label style="${kucuk};color:var(--parchment);display:flex;align-items:center;gap:.25rem">adet
            <input class="book-input" type="number" min="1" max="99" value="${r.adet}" style="width:58px;font-size:.85rem;padding:.35rem .4rem" oninput="rafTopluDegis(${i},'adet',Math.max(1,parseInt(this.value)||1))"></label>` : ''}
        </div>
        ${oneri}${okunan}
      </div>`;
  };
  const gorunur = _rt.satirlar.slice(0, _rt.gorunen).map(satirHtml).join('');
  const kalan = toplam - Math.min(toplam, _rt.gorunen);
  const n = rafTopluSecilenler().length;
  kutu.innerHTML = `
    <div style="margin-top:.6rem;padding:.7rem;border:1px solid rgba(201,162,39,.3);border-radius:4px;background:rgba(201,162,39,.05)">
      ${ilerleme}
      <div style="${kucuk};color:var(--parchment);opacity:.8;margin-bottom:.3rem">Raf:
        <select class="book-input" onchange="_rt.rafId=this.value;rafTopluTaslakKaydet()" style="display:inline-block;width:auto;font-size:.75rem;padding:.2rem .4rem;margin-left:.3rem">
          <option value="">📦 Rafsız</option>${rafSecenek}</select></div>
      ${gorunur}
      ${kalan>0?`<button type="button" onclick="rafTopluDahaFazla()" style="margin-top:.5rem;background:transparent;border:none;color:var(--gold);cursor:pointer;${kucuk}">↓ Daha fazla (${kalan})</button>`:''}
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.7rem;align-items:center">
        <button type="button" class="btn btn-sm" onclick="rafTopluSatirEkle()" style="background:rgba(201,162,39,.12);color:var(--gold);border:1px solid rgba(201,162,39,.3)">+ Satır ekle</button>
        <button type="button" id="rafTopluKaydetBtn" class="btn btn-primary btn-sm" onclick="rafTopluKaydet()" ${(_rt.araniyor||!n)?'disabled':''}>${_rt.araniyor?'Arama bitince kaydedebilirsin':`💾 Kaydet (${n} kitap)`}</button>
        <button type="button" class="btn btn-sm" onclick="rafTopluVazgec()" style="background:rgba(138,69,19,.15);color:#e8a87c;border:1px solid rgba(201,162,39,.3)">${_rt.vazgecOnay?'Emin misin? Liste silinir — evet, vazgeç':'Vazgeç'}</button>
      </div>
    </div>`;
}
