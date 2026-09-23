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
const OYUN_SURUM = '20260923a';

/* Hangi oyunlar açık? → id kümesi. Ziyarette ziyaret edilen kişiye bakar. */
function acikOyunlar(kisi){
  const hedef = kisi || (typeof viewing !== 'undefined' && viewing) || me;
  const acik = new Set();
  if (typeof diyarKaynaklari !== 'function' || typeof diyarBul !== 'function') return acik;
  const katalog = oyunKatalogu();
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
    }).join('') + '</div>';
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
      <iframe class="oyun-cerceve" src="${oyun.dosya}?s=${OYUN_SURUM}" title="${escapeHtml(oyun.ad)}"
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
