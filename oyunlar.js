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

/* ⚠️ GEÇİCİ KAPI (2026-09-19). Özellik yarım: akış kartları, skor kaydı ve
   oyun ekleme kılavuzu henüz yok. O yüzden sekme yalnızca aşağıdaki hesaplarda
   görünüyor — diğer üyeler yarım bir özellik görmesin. Hayali Diyarlar'da da
   aynı yöntem kullanılmıştı (bkz. diyarTestModu).
   BİTİNCE: listeyi boşaltmak yeterli, `oyunModu()` herkese true döner. */
const OYUN_TEST_HESAPLARI = ['hggunay', 'deneme'];
function oyunModu(){
  return !OYUN_TEST_HESAPLARI.length || OYUN_TEST_HESAPLARI.includes(me);
}

/* Oyun listesini katalog olarak veriyoruz; diyarBul aynı alanlara bakıyor. */
function oyunKatalogu(){ return (typeof OYUN_LISTESI !== 'undefined') ? OYUN_LISTESI : []; }

/* Oyun dosyaları iframe ile çekiliyor; index.html'deki `?s=` damgası onları
   kapsamıyor, dolayısıyla tarayıcı eski oyunu gösterebiliyor. Bir oyun
   dosyasını (oyunlar/*.html) her değiştirdiğinde bu tarihi de güncelle. */
const OYUN_SURUM = '20260920d';

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

  kap.innerHTML =
    `<div class="oyun-ustyazi">
       Kitaplardan açılan oyunlar. Bir kitabı okuduğunda ona ait oyun kendiliğinden açılır.
       <b>${acikSayi} / ${liste.length}</b> açık.
     </div>` +
    '<div class="oyun-izgara">' + liste.map(o => {
      const aciktir = acik.has(o.id);
      const skor = o.tur === 'oyun' ? enIyiSkor(o.id) : null;
      const alt = aciktir
        ? (o.tur === 'simulasyon' ? '▶ İzle'
           : (skor !== null ? '🏆 En iyin: ' + skor : '▶ Oyna'))
        : '🔒 Oynamak için: ' + escapeHtml(oyunKilitMetni(o));
      return `<button class="oyun-kart${aciktir ? '' : ' kilitli'}"
            ${aciktir ? `onclick="oyunAc('${o.id}')"` : 'disabled'}
            title="${escapeHtml(o.kitap || '')}">
          <span class="oyun-ikon">${o.ikon || '🎮'}</span>
          <span class="oyun-ad">${escapeHtml(o.ad)}</span>
          <span class="oyun-kitap">${escapeHtml(o.kitap || '')}</span>
          <span class="oyun-aciklama">${escapeHtml(o.aciklama || '')}</span>
          <span class="oyun-durum">${alt}</span>
        </button>`;
    }).join('') + '</div>' +
    (isMe ? '' : '<div class="oyun-bos">Kilitler bu üyenin okuduklarına göre gösteriliyor.</div>');
}

/* ── OYUN PENCERESİ ───────────────────────────────────────────────────── */
let _acikOyun = null;
function oyunAc(id){
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
