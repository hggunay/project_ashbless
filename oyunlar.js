/* ══════════════════════════════════════════════════════════════════════
   OYUNLAR — kitap temalı mini oyunlar ve simülasyonlar (2026-09-19)
   ══════════════════════════════════════════════════════════════════════
   MODEL: Hayali Diyarlar'ın aynısı. Oyunlar önceden kurulur, listede
   KİLİTLİ durur; ilgili kitap okununca açılır. Gökşin'in kararı (2026-09-06,
   gelecek-planlar.md): "Eğlence sekmesi, diyar modeli, kilitliler görünür."

   KİLİT ÖLÇÜTÜ — diyar eşleştirmesinin AYNISI, yeniden yazılmadı:
   `diyarBul(kitap, katalog)` herhangi bir "tetikleyicili" listeyi katalog
   kabul ediyor; oyun listesini de öyle veriyoruz. Kaynak olarak
   `diyarKaynaklari(kisi)` kullanılıyor — bitmiş kitaplar + okunmuş hikâyeler,
   "geçmişte okundu" işaretinden BAĞIMSIZ. Gökşin'in kitaplarının çoğu
   retroaktif; bu kural olmasa oyunların çoğu onda bile kilitli kalırdı.

   OYUNLAR GÖMÜLÜ DEĞİL: her oyun kendi HTML dosyası, `<iframe>` içinde
   açılıyor. Hatası uygulamaya bulaşmaz, kapanınca zamanlayıcıları ölür.
   ══════════════════════════════════════════════════════════════════════ */

/* ✅ KAPI AÇILDI — 2026-09-21. Oyunlar sekmesi artık HERKESTE görünüyor.
   Gökşin'in kararı: "biz herkese açalım, o kitaplarını eklediği zaman
   oyunlar açılır zaten." Koşul tutmuştu: plan 4-5 oyun diyordu, 5 oyun var
   (Kumda Ritim · Tür Dönüşümü · Uyanış · Çift Düşün · Algernon).

   ⚠️ GERİ KAPATMAK İÇİN: listeye hesap adı yaz, ör. ['hggunay','deneme'].
   `oyunModu()` liste BOŞSA herkese true döner.

   📌 Kapı iki şeyi birden yönetiyor: Oyunlar sekmesi ve `oyunAc()`.
   Akış kartları (oyun_rekor) zaten kapının DIŞINDAYDI — 2026-09-20'de
   Gökşin "önden spoiler gösterimi" diye öyle istemişti. Kapı açıldığı için
   artık ikisi de görünür; kartın "oyna" bağlantısı da çalışıyor.

   📌 Yeni üye için oyunların çoğu KİLİTLİ görünecek — kusur değil, model bu:
   kitabı okuyan oyunu açar. Kartın altında hangi kitabın açacağı yazıyor. */
const OYUN_TEST_HESAPLARI = [];
function oyunModu(){
  return !OYUN_TEST_HESAPLARI.length || OYUN_TEST_HESAPLARI.includes(me);
}

/* Oyun listesini katalog olarak veriyoruz; diyarBul aynı alanlara bakıyor. */
function oyunKatalogu(){ return (typeof OYUN_LISTESI !== 'undefined') ? OYUN_LISTESI : []; }

/* Oyun dosyaları iframe ile çekiliyor; index.html'deki `?s=` damgası onları
   kapsamıyor, dolayısıyla tarayıcı eski oyunu gösterebiliyor. Bir oyun
   dosyasını (oyunlar/*.html) her değiştirdiğinde bu tarihi de güncelle. */
const OYUN_SURUM = '20260924d';

/* Hangi oyunlar açık? → id kümesi. Ziyarette ziyaret edilen kişiye bakar. */
function acikOyunlar(kisi){
  const hedef = kisi || (typeof viewing !== 'undefined' && viewing) || me;
  const acik = new Set();
  if (typeof diyarKaynaklari !== 'function' || typeof diyarBul !== 'function') return acik;
  const katalog = oyunKatalogu();
  /* `kilitsiz` oyunlar hiçbir kitaba bağlı değil, herkese baştan açık
     (Buluntu Metinler — Gökşin: "keşfedilen bir oyun değil, keşif oyunun kendisi"). */
  for (const o of katalog) if (o.kilitsiz) acik.add(o.id);
  for (const kaynak of diyarKaynaklari(hedef)) {
    const b = diyarBul(kaynak, katalog);
    if (b && b.diyar) acik.add(b.diyar.id);
  }
  return acik;
}

/* Oyunu açan kitabın adı — kilit yazısında "şunu oku" derken kullanılıyor.
   Tetikleyiciden okunabilir bir metin üretiyor. */
function oyunKilitMetni(oyun){
  const t = oyun.tetikleyiciler || {};
  if (t.seriler && t.seriler.length) return t.seriler[0] + ' serisinden bir kitap';
  if (t.kitaplar && t.kitaplar.length) return t.kitaplar[0].baslik;
  if (t.yazarlar && t.yazarlar.length) return t.yazarlar[0] + ' kitabı';
  if (t.baslikIcerir && t.baslikIcerir.length) return t.baslikIcerir[0].baslikIcerir;
  return oyun.kitap || 'ilgili kitap';
}

/* Skorlar üye kaydının içinde: users/<kişi>/oyunlar = {kesif:{}, skor:{}}
   ⚠️ Yeni bir aa-v4 düğümü AÇILMADI — bilinçli. Yeni düğüm dört ayrı yeri
   ve Firebase kurallarını değiştirmeyi gerektiriyor (2026-09-10'da bu
   atlandığında canlıda iki hata çıkmıştı). Üye kaydı zaten yazılıp okunuyor. */
function oyunVerisi(kisi){
  const k = kisi || (typeof viewing !== 'undefined' && viewing) || me;
  const u = (db.users && db.users[k]) || {};
  return { kesif: (u.oyunlar && u.oyunlar.kesif) || {}, skor: (u.oyunlar && u.oyunlar.skor) || {} };
}
function enIyiSkor(oyunId, kisi){
  const s = oyunVerisi(kisi).skor[oyunId];
  return s && typeof s.enIyi === 'number' ? s.enIyi : null;
}
function oyunSkorAdi(oyun){ return (oyun && oyun.skorAdi) || 'puan'; }

/* ── SKOR KAYDI ───────────────────────────────────────────────────────
   Oyun bir iframe içinde çalışıyor ve veritabanını hiç bilmiyor; bitince
   yalnızca postMessage ile puanını söylüyor. Kaydı burası yapıyor.

   SÖZLEŞME (OYUN-EKLEME.md'ye girecek):
     { ashbless:'oyun-skor', oyun:'<id>', skor:<tam sayı> }

   ⚠️ Gelen mesaja GÜVENİLMİYOR: başka bir sekme veya oyunun içindeki bir
   reklam/çerçeve de postMessage atabilir. Üç şart aranıyor: mesaj AÇIK OLAN
   oyunun penceresinden gelmeli, oyunun kimliği tutmalı, puan makul bir
   tam sayı olmalı. Ayrıca ZİYARETTE hiçbir şey yazılmıyor — başkasının
   sayfasını gezerken oynanan oyun onun skorunu bozmasın. */
const OYUN_SKOR_UST = 1000000;
function _oyunSkorMesaji(e){
  const d = e && e.data;
  if (!d || d.ashbless !== 'oyun-skor') return;
  if (!_acikOyun || d.oyun !== _acikOyun.id) return;
  const p = document.getElementById('oyunPencere');
  const cerceve = p && p.querySelector('.oyun-cerceve');
  if (!cerceve || e.source !== cerceve.contentWindow) return;      // başka pencere
  if (typeof viewing !== 'undefined' && viewing) return;           // ziyarette yazma yok
  const skor = d.skor;
  if (typeof skor !== 'number' || !isFinite(skor) || skor < 0 || skor > OYUN_SKOR_UST) return;
  if (_acikOyun.tur === 'kesif') { kesifSkoruIsle(_acikOyun, Math.round(skor)); return; }
  oyunSkoruIsle(_acikOyun, Math.round(skor));
}
window.addEventListener('message', _oyunSkorMesaji);

async function oyunSkoruIsle(oyun, skor){
  if (oyun.tur !== 'oyun') return;                  // simülasyonda skor yok
  const eski = oyunVerisi(me).skor[oyun.id] || {};
  const oncekiEnIyi = typeof eski.enIyi === 'number' ? eski.enIyi : null;
  const rekor = oncekiEnIyi === null ? false : skor > oncekiEnIyi;

  const kayit = {
    enIyi: oncekiEnIyi === null ? skor : Math.max(oncekiEnIyi, skor),
    oynama: (typeof eski.oynama === 'number' ? eski.oynama : 0) + 1,
    sonTs: Date.now()
  };
  /* Akış kartı YALNIZCA rekor kırıldığında çıkıyor; ilk skor bir rekor değil,
     yalnızca ölçünün kendisi. Kart, kaydın içindeki bu iki alandan üretiliyor —
     ayrı bir olay listesi tutulmuyor ki akış aynı oyunla dolup taşmasın. */
  if (rekor){ kayit.onceki = oncekiEnIyi; kayit.rekorTs = Date.now(); }
  else if (typeof eski.onceki === 'number'){ kayit.onceki = eski.onceki; kayit.rekorTs = eski.rekorTs || 0; }

  // Bellekte güncelle (kart listesi ve akış hemen doğru görünsün)
  if (!db.users[me]) db.users[me] = {};
  if (!db.users[me].oyunlar) db.users[me].oyunlar = {};
  if (!db.users[me].oyunlar.skor) db.users[me].oyunlar.skor = {};
  db.users[me].oyunlar.skor[oyun.id] = kayit;

  const birim = oyunSkorAdi(oyun);
  if (rekor) mesajGoster('🏆 Yeni rekor: ' + skor + ' ' + birim + ' (önceki ' + oncekiEnIyi + ')');
  else if (oncekiEnIyi === null) mesajGoster('İlk skorun kaydedildi: ' + skor + ' ' + birim + '.');

  /* Granüler yazma: users/<kişi>/oyunlar/skor/<oyun> — tek yaprak.
     Üye kaydının tamamını geri yazmıyoruz; başka bir cihazın araya girmesi
     hâlinde (102 kitap olayının kalıbı) burada kaybolacak bir şey olmasın. */
  const ok = await fbSet('aa-v4/users/' + me + '/oyunlar/skor/' + oyun.id, kayit);
  if (!ok) return;                                  // fbSet kendi uyarısını gösterdi
  if (typeof renderOyunlar === 'function') renderOyunlar();
  if (rekor){
    if (typeof renderFeed === 'function' && document.getElementById('feedContainer')) renderFeed();
    if (typeof updateFeedBadge === 'function') updateFeedBadge();
  }
}

/* ── KART LİSTESİ ─────────────────────────────────────────────────────── */
function renderOyunlar(){
  const kap = document.getElementById('oyunContainer');
  if (!kap) return;
  const liste = oyunKatalogu();
  const isMe = !(typeof viewing !== 'undefined' && viewing);
  if (!liste.length){
    kap.innerHTML = '<div class="oyun-bos">Henüz oyun eklenmedi.</div>';
    return;
  }
  const acik = acikOyunlar();
  const acikSayi = liste.filter(o => acik.has(o.id)).length;

  /* ⚠️ ZİYARET (2026-09-20, Gökşin sordu: "ziyaretçi olarak gittiğimde de
     oyun sekmesi görüyorum"). Sekmenin görünmesi DOĞRU — kapı `me`'ye bakıyor,
     yani sekmeyi gören kişi sensin, ziyaret ettiğin üye değil. Ama kartların
     yazıları ziyarette yanlış konuşuyordu: başkasının skoru için "En iyin",
     onun kilidi için "Oynamak için sen şunu oku" diyordu. Ayrıca ziyarette
     oynamak boşa gidiyor — skor yalnız kendi sayfanda kaydediliyor
     (bkz. _oyunSkorMesaji). Bu yüzden ziyarette kartlar BİLGİ amaçlı ve
     tıklanamaz. */
  const kimlik = isMe ? '' : escapeHtml(((db.users && db.users[viewing] && db.users[viewing].displayName) || 'Bu üye'));

  kap.innerHTML =
    `<div class="oyun-ustyazi">` +
      (isMe
        ? `Kitaplardan açılan oyunlar. Bir kitabı okuduğunda ona ait oyun kendiliğinden açılır.
           <b>${acikSayi} / ${liste.length}</b> açık.`
        : `${kimlik} için <b>${acikSayi} / ${liste.length}</b> oyun açık.
           Kilitler bu üyenin okuduklarına göre gösteriliyor.`) +
    `</div>` +
    '<div class="oyun-izgara">' + liste.map(o => {
      const aciktir = acik.has(o.id);
      const skor = o.tur === 'oyun' ? enIyiSkor(o.id) : null;
      let alt;
      if (!aciktir)                 alt = isMe ? '🔒 Oynamak için: ' + escapeHtml(oyunKilitMetni(o)) : '🔒 Kilitli';
      else if (o.tur === 'kesif')   alt = kesifKartDurumu(o, isMe);
      else if (o.tur === 'simulasyon') alt = isMe ? '▶ İzle' : '✓ Açık';
      else if (skor !== null)       alt = (isMe ? '🏆 En iyin: ' : '🏆 En iyisi: ') + skor + ' ' + oyunSkorAdi(o);
      else                          alt = isMe ? '▶ Oyna' : '✓ Açık — henüz oynamamış';
      const tiklanabilir = aciktir && isMe;
      return `<button class="oyun-kart${aciktir ? '' : ' kilitli'}"
            ${tiklanabilir ? `onclick="oyunAc('${o.id}')"` : 'disabled'}
            title="${escapeHtml(o.kitap || '')}">
          <span class="oyun-ikon">${o.ikon || '🎮'}</span>
          <span class="oyun-ad">${escapeHtml(o.ad)}</span>
          <span class="oyun-kitap">${escapeHtml(o.kitap || '')}</span>
          <span class="oyun-aciklama">${escapeHtml(o.aciklama || '')}</span>
          <span class="oyun-durum">${alt}</span>
        </button>`;
    }).join('') + '</div>' +
    kesifListesiHtml(isMe ? me : viewing) + oykuYukleHtml();
}

/* ── OYUN PENCERESİ ───────────────────────────────────────────────────── */
let _acikOyun = null;
function oyunAc(id){
  /* Kapı burada da duruyor: akış kartları herkese açık, sekme değil.
     Bir bağlantı yanlışlıkla görünse bile oyun açılmasın. */
  if (typeof oyunModu === 'function' && !oyunModu()) return;
  const oyun = oyunKatalogu().find(o => o.id === id);
  if (!oyun) return;
  if (!acikOyunlar().has(id)){
    mesajGoster('Bu oyun henüz kilitli: ' + oyunKilitMetni(oyun), 'uyari');
    return;
  }
  oyunKapat();                       // açık kalmış bir pencere varsa
  _acikOyun = oyun;
  if (oyun.tur === 'kesif') { kesifAc(oyun); return; }   // önce öykü atanıyor
  _oyunPenceresiKur(oyun, `${oyun.dosya}?s=${OYUN_SURUM}`);
}
/* Pencereyi kurar. Keşif oyunu adrese kendi sayılarını ekleyip buradan geçiyor. */
function _oyunPenceresiKur(oyun, adres){
  const pencere = document.createElement('div');
  pencere.id = 'oyunPencere';
  pencere.innerHTML = `
    <div class="oyun-baslik">
      <span class="oyun-baslik-ad">${oyun.ikon || '🎮'} ${escapeHtml(oyun.ad)}</span>
      <button class="oyun-dugme" onclick="oyunTamEkran()" aria-label="Tam ekran" title="Tam ekran">⛶</button>
      <button class="oyun-dugme" onclick="oyunKapat()" aria-label="Kapat" title="Kapat">✕</button>
    </div>
    <div class="oyun-govde">
      <div class="oyun-yukleniyor">Yükleniyor…</div>
      <iframe class="oyun-cerceve" src="${adres}" title="${escapeHtml(oyun.ad)}"
              allow="fullscreen" referrerpolicy="no-referrer"></iframe>
    </div>`;
  document.body.appendChild(pencere);
  const cerceve = pencere.querySelector('.oyun-cerceve');
  cerceve.addEventListener('load', () => {
    const y = pencere.querySelector('.oyun-yukleniyor'); if (y) y.remove();
  });
  /* Dosya yoksa 'load' yine tetiklenir (404 sayfası yüklenir); kullanıcı boş
     ekranla kalmasın diye kısa bir süre sonra hâlâ yazı duruyorsa uyarıyoruz. */
  setTimeout(() => {
    const y = pencere.querySelector('.oyun-yukleniyor');
    if (y) { y.textContent = 'Oyun açılamadı. Dosya eksik olabilir: ' + oyun.dosya; }
  }, 8000);
  requestAnimationFrame(() => pencere.classList.add('acik'));   // kayarak açılsın
  document.addEventListener('keydown', _oyunEsc);
}
function _oyunEsc(e){ if (e.key === 'Escape') oyunKapat(); }
function oyunKapat(){
  const p = document.getElementById('oyunPencere');
  document.removeEventListener('keydown', _oyunEsc);
  if (!p) { _acikOyun = null; return; }
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch(e){}
  p.classList.remove('acik');
  // Çerçeveyi hemen boşalt: oyun kapanır kapanmaz sesi ve zamanlayıcıları dursun
  const c = p.querySelector('.oyun-cerceve'); if (c) c.src = 'about:blank';
  setTimeout(() => p.remove(), 260);
  _acikOyun = null;
  renderOyunlar();
}
function oyunTamEkran(){
  const p = document.getElementById('oyunPencere');
  if (!p) return;
  try{
    if (document.fullscreenElement) document.exitFullscreen();
    else if (p.requestFullscreen) p.requestFullscreen();
    else mesajGoster('Bu tarayıcı tam ekranı desteklemiyor.', 'uyari');
  }catch(e){ mesajGoster('Tam ekran açılamadı.', 'uyari'); }
}

/* ══════════════════════════════════════════════════════════════════════
   BULUNTU METİNLER — keşif oyunu (tur:'kesif', 2026-09-23)
   ══════════════════════════════════════════════════════════════════════
   Oyun oynanarak bir öykünün sayfaları toplanıyor; hedefe ulaşınca öykünün
   adı açıklanıyor, okuma/indirme bağlantısı veriliyor. Tasarımın tamamı ve
   reddedilen yollar: gelecek-planlar.md ("SAYFA KURTARMA", 21-23 Eylül).

   İŞ BÖLÜMÜ — değiştirmeden önce oku:
   · Öyküyü UYGULAMA atar, oyun değil. Oyun hangi öykü olduğunu hiç bilmez;
     adresine yalnızca iki sayı gider: `bulunan` ve `toplam`.
   · Oyun her zaman TOPLAMI gönderir ("şu an 12 sayfadayım"), oturumda
     bulduğunu değil. Aynı sayı iki kez gelirse bir şey bozulmaz.
   · Oyun HER SAYFADA haber verir. Pencere kapanınca oyun son mesajını
     gönderemiyor; seyrek gönderseydi son sayfalar kaybolurdu.
   · `oyunSkoruIsle`'ye DOKUNULMADI: rekor şeridi ve akış kartı bu oyunda
     yok (kaydında `onceki`/`rekorTs` olmadığı için feed.js onu atlıyor).

   VERİ:
   · Öykü havuzu  → `aa-oykuler/liste/<id>` = {baslik,yazar,kitap,sayfa,kelime,oku,indir}
     aa-v4'ün İÇİNDE DEĞİL, yanında (aa-avatars gibi). Okuma: onaylı üye.
     Yazma: yalnız hggunay. Kaynağı Masaüstü\kısa hikayeler\_liste.json →
     firebase-oykuler-uret.py → Firebase panelinde "Import JSON".
   · İlerleme     → users/<kişi>/oyunlar/skor/<oyun> = {bulunan,hedef,hikaye,deste[],puan,oynama,sonTs,tamamlanan}
     (hedef = PDF sayfaları toplamı, puan = bir sayfanın puanı — bkz. kesifPlani)
   · Keşfedilenler → users/<kişi>/oyunlar/kesif/<öykü> = {baslik,yazar,kitap,oku,indir,ts,deste?}
     (deste = ana öykünün kimliği; aynı destedekiler akışta TEK kart)
   ══════════════════════════════════════════════════════════════════════ */

/* ── BAĞLANTI GİZLEME (Gökşin, 2026-09-23) ──────────────────────────────
   "Başlıklar saklanmasın ama linkler mutlaka gizli olsun." Havuzdaki bütün
   PDF'ler Gökşin'in OneDrive'ında → hesap kimliği her bağlantıda geçiyor.
   Kural: bağlantı O HESABA gidiyorsa (kim girmiş olursa olsun, oyundan mı
   elle mi — yanlış öyküye yapıştırılmış olsa bile) bağlantı yerine 📜 görünür.
   Sahibi 📜'ye dokununca açar; ziyaretçi yalnız 📜 görür.
   ⚠️ Bu EKRANDA gizleme, kilit değil: onaylı üyeler aa-oykuler'i zaten okuyabiliyor.
   Amaç sürprizi korumak ve bağlantıların ortalıkta dolaşmaması. */
const OYKU_ONEDRIVE_KIMLIGI = '53a096445bb57f15';
function oykuBaglantisiMi(link){
  return !!link && String(link).toLowerCase().includes(OYKU_ONEDRIVE_KIMLIGI);
}
/* `stil`: çağıranın 🔗 link için kullandığı satır içi stil (görünüm değişmesin). */
function oykuLinkHtml(link, sahipMi, stil){
  if (!link) return '';
  const st = stil || "font-size:.65rem;color:var(--gold);font-family:'Space Mono',monospace";
  if (!oykuBaglantisiMi(link))
    return `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="${st}">🔗 link</a>`;
  return sahipMi
    ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="${st}" title="Buluntu Metinler — oku">📜 buluntu</a>`
    : `<span style="${st}" title="Buluntu Metinler oyununda bulundu">📜 buluntu</span>`;
}

/* ── HEDEF VE SÜRE (24 Eylül, Gökşin'le üç adımda) ────────────────────────
   1) TOPLANAN SAYFA = PDF'İN SAYFASI. Gökşin: "oyunda topladığı sayfa ve pdf'in
      sayfa sayısı aynı olmazsa gerçekten o kitabın sayfalarını toplamış gibi
      hissettirmez." Oyuncu 94 sayfalık PDF için "0 / 94" görür.
   2) SÜRE = ÖYKÜNÜN UZUNLUĞU. "90 sayfalık öykü 15-20 dk sürsün." Süre birimi
      kitap sayfası = kelime ÷ 250 (telefon boyu PDF'lerle kitap sayfaları
      karşılaştırılamadığı için KELİME), en az 15. Ölçüm (Gökşin, deneme sayfası):
      20 puan ≈ 11 sn → 15 birim ≈ 3 dk, en uzun (92) ≈ 17 dk.
      → Sayfanın puanı = süre birimi × 20 ÷ PDF sayfası (Mutfak 16, "Kazık" 300).
   3) DESTE: 5 sayfadan kısa öykü aynı yazarın başka kısa öyküleriyle birlikte
      atanır, toplam ~10 sayfa (22 Eylül'de Gökşin'in önerdiği, o gün gerek
      kalmayıp kodlanmayan çözüm). Her öykü AYRI keşif kaydı, AYRI Tsundoku
      kaydı — birleştirilmiş PDF YOK (uydurma kitap olurdu, REDDEDİLDİ).
      Eşi bulunmayan kısa öykü tek kalır; en az 8 birim (~1,5 dk) sürer.
   Eski kayıtlar (`puan` alanı yok) eski hedefiyle ve 20 puanla biter. */
const KESIF_BIRIM_PUAN = 20;
const DESTE_ESIK = 5, DESTE_HEDEF = 10, DESTE_EN_COK = 6;
function kesifSureBirimi(oykuler, enAz){
  const kelime = oykuler.reduce((t, o) => t + (Number(o.kelime) || 0), 0);
  if (kelime > 0) return Math.max(enAz, Math.round(kelime / 250));
  const s = oykuler.reduce((t, o) => t + (Number(o.sayfa) || 0), 0);   // kelimesiz eski liste
  return 15 + Math.round(10 * Math.min(1, s / 60));
}
/* Seçilen öyküden oyunun planı: {hikaye, deste[], hedef, puan}. */
function kesifPlani(havuz, id, haric){
  if (!id || !havuz[id]) return { hikaye: null, deste: [], hedef: 0, puan: KESIF_BIRIM_PUAN };
  const ana = havuz[id], sayfa = o => Math.max(1, Number(o.sayfa) || 1);
  const deste = [];
  let toplam = sayfa(ana);
  if (toplam < DESTE_ESIK) {
    const adaylar = Object.keys(havuz).filter(x => x !== id && !haric[x] &&
      havuz[x].yazar === ana.yazar && sayfa(havuz[x]) < DESTE_ESIK);
    for (let i = adaylar.length - 1; i > 0; i--) {             // karıştır
      const j = Math.floor(Math.random() * (i + 1)); [adaylar[i], adaylar[j]] = [adaylar[j], adaylar[i]];
    }
    for (const x of adaylar) {
      if (toplam >= DESTE_HEDEF - 1 || deste.length + 1 >= DESTE_EN_COK) break;
      if (toplam + sayfa(havuz[x]) > DESTE_HEDEF + 2) continue;
      deste.push(x); toplam += sayfa(havuz[x]);
    }
  }
  const tek = !deste.length && sayfa(ana) < DESTE_ESIK;
  const birim = kesifSureBirimi([ana, ...deste.map(x => havuz[x])], tek ? 8 : 15);
  const puan = Math.max(5, Math.min(400, Math.round(birim * KESIF_BIRIM_PUAN / toplam)));
  return { hikaye: id, deste, hedef: toplam, puan };
}
/* Atanmış öykü + destesi (havuzdan kalkanlar atlanır). */
function kesifOykuleri(k){
  return [k.hikaye, ...(Array.isArray(k.deste) ? k.deste : [])].filter(Boolean);
}

function kesifKaydi(oyunId, kisi){
  return oyunVerisi(kisi).skor[oyunId] || {};
}
function kesifListesi(kisi){ return oyunVerisi(kisi || me).kesif || {}; }

function kesifKartDurumu(oyun, isMe){
  const kisi = isMe ? me : viewing;
  const k = kesifKaydi(oyun.id, kisi);
  const n = Object.keys(kesifListesi(kisi)).length;
  if (k.hikaye && typeof k.hedef === 'number')
    return `📜 ${k.bulunan || 0} / ${k.hedef} sayfa` + (n ? ` · ${n} öykü` : '');
  if (n) return (isMe ? '▶ Yeni öykü · ' : '') + n + ' öykü keşfedildi';
  return isMe ? '▶ Oyna' : '✓ Açık';
}

/* Havuz bir oturumda bir kez okunuyor. Okunamazsa null: çağıran kullanıcıya söyler. */
let _oykuHavuzu = null;
async function oykuHavuzu(){
  if (_oykuHavuzu) return _oykuHavuzu;
  const { ok, veri } = await fbGetDurum('aa-oykuler/liste');
  if (!ok || !veri || typeof veri !== 'object') return null;
  _oykuHavuzu = veri;
  return veri;
}

/* Keşfedilmemiş öykülerden rastgele biri. Hepsi keşfedildiyse null.
   MEVSİM AĞIRLIĞI (21-22 Eylül kararı, 24 Eylül'de kodlandı): açık bir sezon varsa
   (sezonluk.js → sezonBul) %70 ihtimalle o sezonun öykülerinden seçilir, %30 bütün
   havuzdan. %100 DEĞİL: sezon havuzu tükenince sert bir geçiş olmasın, "artık Poe
   çıkmıyor" diye fark edilmesin. Sezonun keşfedilmemiş öyküsü kalmadıysa genel havuz.
   Öykünün sezonu listede (`sezon` alanı; firebase-oykuler-uret.py yazar/kitaba göre verir). */
const SEZON_AGIRLIK = 0.7;
function oykuSec(havuz, haric, tarih){
  const adaylar = Object.keys(havuz).filter(id => !haric[id]);
  if (!adaylar.length) return null;
  const sezon = (typeof sezonBul === 'function') ? sezonBul(tarih) : null;
  if (sezon && Math.random() < SEZON_AGIRLIK) {
    const mevsimlik = adaylar.filter(id => havuz[id].sezon === sezon.id);
    if (mevsimlik.length) return mevsimlik[Math.floor(Math.random() * mevsimlik.length)];
  }
  return adaylar[Math.floor(Math.random() * adaylar.length)];
}

async function kesifAc(oyun){
  if (typeof viewing !== 'undefined' && viewing) return;   // ziyarette oynanmıyor
  let k = kesifKaydi(oyun.id);
  const havuz = await oykuHavuzu();
  if (_acikOyun !== oyun) return;                           // beklerken başka şeye geçildi
  if (!havuz){
    _acikOyun = null;
    mesajGoster('Öykü listesi okunamadı. İnternetini kontrol edip tekrar dene.', 'uyari');
    return;
  }
  // Atanmış öykü havuzdan kalkmışsa (liste güncellendi) yenisi seçilir; toplanan sayfa sıfırlanır.
  if (!k.hikaye || !havuz[k.hikaye]) {
    const haric = kesifListesi();
    const plan = kesifPlani(havuz, oykuSec(havuz, haric), haric);
    const id = plan.hikaye;
    k = await kesifKaydiYaz(oyun, {
      bulunan: 0, ...plan, oynama: k.oynama || 0, tamamlanan: k.tamamlanan || 0
    });
    if (!k) { _acikOyun = null; return; }                    // yazılamadı, fbSet uyardı
    if (!id) mesajGoster('Tüm öyküler keşfedildi 🎉 Oyun yine oynanır, yenileri eklenince haber verir.');
  }
  _oyunPenceresiKur(oyun, kesifAdres(oyun, k));
}
function kesifAdres(oyun, k){
  return `${oyun.dosya}?s=${OYUN_SURUM}&bulunan=${k.hikaye ? (k.bulunan || 0) : 0}&toplam=${k.hikaye ? k.hedef : 0}` +
         `&puan=${k.hikaye && k.puan ? k.puan : KESIF_BIRIM_PUAN}`;
}

/* Bellek + tek yaprak yazma (oyunSkoruIsle'deki kalıbın aynısı). */
async function kesifKaydiYaz(oyun, kayit){
  kayit.sonTs = Date.now();
  if (!db.users[me]) db.users[me] = {};
  if (!db.users[me].oyunlar) db.users[me].oyunlar = {};
  if (!db.users[me].oyunlar.skor) db.users[me].oyunlar.skor = {};
  db.users[me].oyunlar.skor[oyun.id] = kayit;
  const ok = await fbSet('aa-v4/users/' + me + '/oyunlar/skor/' + oyun.id, kayit);
  return ok ? kayit : null;
}

async function kesifSkoruIsle(oyun, skor){
  const k = kesifKaydi(oyun.id);
  if (!k.hikaye || typeof k.hedef !== 'number' || !k.hedef) return;   // atanmış öykü yok
  // Toplam geriye gidemez ve hedefi aşamaz (oyundaki bir hata ilerlemeyi silemesin).
  const yeni = Math.min(k.hedef, Math.max(k.bulunan || 0, skor));
  if (yeni === (k.bulunan || 0) && yeni < k.hedef) return;             // değişiklik yok
  if (yeni < k.hedef){
    await kesifKaydiYaz(oyun, { ...k, bulunan: yeni });
    return;
  }
  await kesifTamamla(oyun, k);
}

let _kesifTamamlaniyor = false;
async function kesifTamamla(oyun, k){
  if (_kesifTamamlaniyor) return;          // oyun "hedef"i iki kez gönderirse
  _kesifTamamlaniyor = true;
  try {
    const havuz = await oykuHavuzu();
    const idler = havuz ? kesifOykuleri(k).filter(id => havuz[id]) : [];
    if (!idler.length){ mesajGoster('Öykü tamamlandı ama bilgisi okunamadı. Tekrar açınca görünecek.', 'uyari'); return; }
    // DESTE: her öykü ayrı kayıt; `deste` = ana öykünün kimliği (akış tek kart yapsın diye).
    const ts = Date.now(), bulunanlar = [];
    for (const id of idler) {
      const o = havuz[id];
      const kayit = { baslik: o.baslik, yazar: o.yazar, kitap: o.kitap || '', oku: o.oku, indir: o.indir, ts };
      if (idler.length > 1) kayit.deste = k.hikaye;
      // Önce keşif listesine yaz; yazılamazsa ilerleme sıfırlanmasın (öykü kaybolmasın).
      // Yarıda kesilirse sorun yok: tekrar tamamlanınca aynı kayıtlar üzerine yazılır.
      const ok = await fbSet('aa-v4/users/' + me + '/oyunlar/kesif/' + id, kayit);
      if (!ok) return;
      // Bellek YALNIZ yazma başarılıysa: yoksa öykü burada "keşfedildi" görünür, sunucuda olmazdı.
      if (!db.users[me]) db.users[me] = {};
      if (!db.users[me].oyunlar) db.users[me].oyunlar = {};
      if (!db.users[me].oyunlar.kesif) db.users[me].oyunlar.kesif = {};
      db.users[me].oyunlar.kesif[id] = kayit;
      bulunanlar.push([id, kayit]);
    }
    await kesifKaydiYaz(oyun, { bulunan: 0, hedef: 0, hikaye: null,
      oynama: (k.oynama || 0) + 1, tamamlanan: (k.tamamlanan || 0) + 1 });
    kesifAcilisGoster(oyun, bulunanlar);
    renderOyunlar();
  } finally { _kesifTamamlaniyor = false; }
}

/* Öykünün adı oyun penceresinin ÜSTÜNDE açıklanıyor (oyunun içinde değil:
   bağlantı uygulamada kalıcı dursun, tekrar ulaşmak için oyunu oynamak gerekmesin). */
/* `bulunanlar` = [[id, kayit], ...] — tek öykü ya da deste. */
function kesifAcilisGoster(oyun, bulunanlar){
  const [id, o] = bulunanlar[0];
  const govde = document.querySelector('#oyunPencere .oyun-govde');
  if (!govde) { mesajGoster(`📜 ${bulunanlar.length > 1 ? bulunanlar.length + ' öykü' : 'Öykü'} bulundu: ${o.baslik} — ${o.yazar}`); return; }
  const eski = govde.querySelector('.kesif-acilis'); if (eski) eski.remove();
  const kutu = document.createElement('div');
  kutu.className = 'kesif-acilis';
  const deste = bulunanlar.length > 1;
  const idler = bulunanlar.map(([x]) => x).join(',');
  const govdeHtml = !deste ? `
      <div class="kesif-ust">📜 Buluntu metin</div>
      <div class="kesif-baslik">${escapeHtml(o.baslik)}</div>
      <div class="kesif-yazar">${escapeHtml(o.yazar)}</div>
      ${o.kitap ? `<div class="kesif-kitap">${escapeHtml(o.kitap)}</div>` : ''}
      <div class="kesif-dugmeler">
        <a class="kesif-dugme ana" href="${escapeHtml(o.oku)}" target="_blank" rel="noopener">📖 Oku</a>
        <a class="kesif-dugme" href="${escapeHtml(o.indir)}" target="_blank" rel="noopener">⬇ İndir</a>
      </div>
      <button class="kesif-dugme tsundoku" onclick="kesifTsundokuEkle('${id}', this)">📥 Tsundoku'ya ekle</button>` : `
      <div class="kesif-ust">📜 ${bulunanlar.length} buluntu metin</div>
      <div class="kesif-yazar">${escapeHtml(o.yazar)}</div>
      <ul class="kesif-deste">${bulunanlar.map(([, b]) => `
        <li class="kesif-satir">
          <span class="kesif-satir-ad"><b>${escapeHtml(b.baslik)}</b></span>
          <span class="kesif-satir-dugmeler">
            <a href="${escapeHtml(b.oku)}" target="_blank" rel="noopener">Oku</a>
            <a href="${escapeHtml(b.indir)}" target="_blank" rel="noopener">İndir</a>
          </span>
        </li>`).join('')}
      </ul>
      <button class="kesif-dugme tsundoku" onclick="kesifTsundokuEkle('${idler}', this)">📥 Hepsini Tsundoku'ya ekle</button>`;
  kutu.innerHTML = `
    <div class="kesif-kart">
      ${''/* Gökşin'in fikri (24 Eylül): kartın kenarına oturup kitap okuyan hayalet —
            kendi tablosundan (tablo-hayalet-oturan.jpg). Görsel gelmezse gizlenir. */}
      <img class="kesif-okuyan" src="oyunlar/gorseller/hayalet-okuyan.png" alt="" onerror="this.remove()">
      ${govdeHtml}
      <button class="kesif-devam" onclick="kesifDevam('${oyun.id}')">Yeni öyküyle devam et →</button>
      <div class="kesif-not">${deste ? 'Bu öyküler' : 'Bu öykü'} "Keşfettiğin öyküler" listesinde kalıcı olarak duruyor.</div>
    </div>`;
  govde.appendChild(kutu);
}

/* Aynı pencerede yeni öykü: pencereyi kapatıp açmak yerine çerçevenin adresi
   değişiyor (kapanan pencere 260 ms DOM'da kalıyor, iki #oyunPencere olmasın). */
async function kesifDevam(oyunId){
  const oyun = oyunKatalogu().find(x => x.id === oyunId);
  const p = document.getElementById('oyunPencere');
  if (!oyun || !p || _acikOyun !== oyun) return;
  const havuz = await oykuHavuzu();
  if (!havuz) { mesajGoster('Öykü listesi okunamadı.', 'uyari'); return; }
  const k0 = kesifKaydi(oyun.id);
  const haric = kesifListesi();
  const plan = kesifPlani(havuz, oykuSec(havuz, haric), haric);
  const id = plan.hikaye;
  const k = await kesifKaydiYaz(oyun, { ...k0, bulunan: 0, ...plan });
  if (!k) return;
  if (!id) mesajGoster('Tüm öyküler keşfedildi 🎉');
  const a = p.querySelector('.kesif-acilis'); if (a) a.remove();
  const c = p.querySelector('.oyun-cerceve'); if (c) c.src = kesifAdres(oyun, k);
}

/* Tsundoku = "Okunacak" öykü. addStory() formdan okuduğu için doğrudan
   kayıt kuruluyor; alanlar addStory'deki nesneyle aynı. "Zaten var mı"
   sorusu burada SORULMUYOR, sadece söyleniyor (oyun akışında soru anlamsız). */
/* `idler`: tek kimlik ya da virgüllü liste (deste → her öykü AYRI kayıt, Gökşin 22 Eylül). */
function kesifTsundokuEkle(idler, btn){
  const liste = kesifListesi();
  const oykuler = String(idler).split(',').map(id => liste[id]).filter(Boolean);
  if (!oykuler.length) return;
  if (!db.stories) db.stories = {};
  if (!db.stories[me]) db.stories[me] = [];
  const norm = (typeof oykuNormal === 'function') ? oykuNormal : (s => String(s || '').toLocaleLowerCase('tr').trim());
  const eklenen = [], vardi = [];
  let kimlik = Date.now();
  for (const o of oykuler) {
    if (db.stories[me].some(s => norm(s.title) === norm(o.baslik))) { vardi.push(o.baslik); continue; }
    db.stories[me].push({
      id: kimlik++, title: o.baslik, author: o.yazar, source: 'ekitap', status: 'toread',
      link: o.oku || null, sourceBook: o.kitap || null, readDate: null, readYearOnly: null,
      rating: 0, note: '🎮 Buluntu Metinler ödülü', retroactive: false, addedAt: new Date().toISOString()
    });
    eklenen.push(o.baslik);
  }
  if (eklenen.length) {
    saveDb();
    if (typeof renderStories === 'function') renderStories();
  }
  if (oykuler.length === 1)
    mesajGoster(eklenen.length ? `📥 "${eklenen[0]}" Tsundoku'ya eklendi.` : `"${vardi[0]}" zaten öykü listende.`);
  else if (!eklenen.length)
    mesajGoster('Bu öykülerin hepsi zaten öykü listende.');
  else
    mesajGoster(`📥 ${eklenen.length} öykü Tsundoku'ya eklendi` + (vardi.length ? ` (${vardi.length} tanesi zaten listendeydi).` : '.'));
  if (btn) { btn.disabled = true; btn.textContent = eklenen.length ? '✓ Eklendi' : '✓ Listende'; }
}

/* Keşfettiğin öyküler — AÇILIR başlık (Gökşin'in fikri): açılınca son 5,
   altında "Daha fazla göster". Liste 50 öyküye çıksa da sayfayı kaplamasın. */
const KESIF_ILK_GOSTERIM = 5;
let _kesifTumu = false;
/* ZİYARETTE (Gökşin, 2026-09-23): başlık ve yazar görünür, bağlantılar ve
   düğmeler GÖRÜNMEZ. Aynı öykü ziyaretçiye de çıkabilir — atama herkese ayrı
   ve rastgele; başlığı önceden görmek sürprizi değil, merakı artırıyor. */
function kesifListesiHtml(kisi){
  const oyun = oyunKatalogu().find(o => o.tur === 'kesif');
  if (!oyun) return '';
  const sahip = !kisi || kisi === me;
  const liste = Object.entries(kesifListesi(kisi || me)).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));
  if (!liste.length) return '';
  const gorunen = _kesifTumu ? liste : liste.slice(0, KESIF_ILK_GOSTERIM);
  const satir = ([id, o]) => `
    <li class="kesif-satir">
      <span class="kesif-satir-ad"><b>${escapeHtml(o.baslik)}</b> <span>${escapeHtml(o.yazar)}</span></span>
      ${sahip ? `<span class="kesif-satir-dugmeler">
        <a href="${escapeHtml(o.oku)}" target="_blank" rel="noopener">Oku</a>
        <a href="${escapeHtml(o.indir)}" target="_blank" rel="noopener">İndir</a>
        <button onclick="kesifTsundokuEkle('${id}', this)" title="Tsundoku'ya ekle">📥</button>
      </span>` : ''}
    </li>`;
  return `
    <details class="kesif-liste"${_kesifAcik ? ' open' : ''} ontoggle="_kesifAcik=this.open">
      <summary>📜 ${sahip ? 'Keşfettiğin' : 'Keşfettiği'} öyküler (${liste.length})</summary>
      <ul>${gorunen.map(satir).join('')}</ul>
      ${liste.length > KESIF_ILK_GOSTERIM
        ? `<button class="kesif-daha" onclick="_kesifTumu=!_kesifTumu;renderOyunlar()">${_kesifTumu ? 'Daha az göster' : 'Daha fazla göster (' + (liste.length - KESIF_ILK_GOSTERIM) + ')'}</button>`
        : ''}
    </details>`;
}
let _kesifAcik = false;

/* ── ÖYKÜ LİSTESİNİ YÜKLE (yalnız hggunay) ──────────────────────────────
   ⚠️ NEDEN PANEL DEĞİL: Firebase panelindeki "JSON içe aktar" KÖKTE
   yapılırsa BÜTÜN veritabanını siler, yerine dosyayı yazar. Bu düğme
   yalnız `aa-oykuler`'e yazar — başka bir yere dokunamaz; kural da
   buraya yalnız hggunay'ın yazmasına izin veriyor.
   Dosya: Masaüstü\kısa hikayeler\firebase-aa-oykuler.json
   (firebase-oykuler-uret.py üretiyor). Yeni öykü eklenince aynı düğme. */
function oykuYukleHtml(){
  if (me !== 'hggunay' || (typeof viewing !== 'undefined' && viewing)) return '';
  return `<div class="kesif-yonetim">
      <input type="file" id="oykuDosya" accept=".json,application/json" style="display:none" onchange="oykuDosyasiSecildi(this)">
      <button class="kesif-daha" onclick="document.getElementById('oykuDosya').click()">📜 Öykü listesini yükle (yönetici)</button>
      <span id="oykuYukleDurum" class="kesif-yonetim-durum"></span>
    </div>`;
}
async function oykuDosyasiSecildi(inp){
  const durum = document.getElementById('oykuYukleDurum');
  const yaz = (t) => { if (durum) durum.textContent = t; };
  const f = inp.files && inp.files[0]; inp.value = '';
  if (!f) return;
  let paket;
  try { paket = JSON.parse(await f.text()); } catch(e){ yaz('⚠️ Dosya okunamadı (JSON değil).'); return; }
  // Doğrula: yanlış dosya seçilirse (ör. tam yedek) yazılmasın
  const liste = paket && paket.liste;
  const ids = liste && typeof liste === 'object' ? Object.keys(liste) : [];
  const bozuk = ids.filter(id => { const o = liste[id];
    return !o || !o.baslik || !o.yazar || !/^https:\/\//.test(o.oku || '') || !/^https:\/\//.test(o.indir || '') || /[.#$\[\]\/]/.test(id); });
  if (!ids.length || bozuk.length || paket['aa-v4'] || paket.users) {
    yaz(`⚠️ Bu bir öykü listesi dosyası değil${bozuk.length ? ' (' + bozuk.length + ' bozuk satır)' : ''}. Hiçbir şey yazılmadı.`);
    return;
  }
  const eski = await oykuHavuzu();
  const eskiSayi = eski ? Object.keys(eski).length : 0;
  yaz(`${ids.length} öykü bulundu (şu an yüklü: ${eskiSayi}).`);
  const btn = document.querySelector('.kesif-yonetim .kesif-daha');
  showInlineConfirm(btn, `${ids.length} öyküyü yükle?`, async () => {
    const ok = await fbSet('aa-oykuler', { liste, surum: paket.surum || 1, yuklendi: Date.now() });
    if (!ok) { yaz('⚠️ Yazılamadı. Firebase kuralı yayında mı?'); return; }
    _oykuHavuzu = null;                    // bir sonraki açılış yenisini okusun
    yaz(`✅ ${ids.length} öykü yüklendi.`);
    mesajGoster(`📜 Öykü listesi güncellendi: ${ids.length} öykü.`);
  });
}
