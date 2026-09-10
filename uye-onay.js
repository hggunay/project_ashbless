// ══════════════════════════════════════════════════════════════════════
// ÜYE ONAY KAPISI
// ══════════════════════════════════════════════════════════════════════
// Kayıt herkese açık (register()'da davet kodu yok) ve kurallarda `aa-v4`
// okuması "giriş yapmış herkes" idi — yani kayıt olan bir yabancı, Gökşin'in
// bütün kitaplarını okuyabiliyordu. G9'da kapattığımız şey giriş YAPMAMIŞ
// kişilerdi; bu ondan farklı bir açık.
//
// Çözüm: yeni kayıtlar ONAY BEKLER. Onaylanmayan hesap giriş yapabilir ama
// hiçbir veri okuyamaz — bu KURAL düzeyinde, arayüzde gizleme değil.
// Arayüzde gizlemek kozmetik olurdu: veri yine tarayıcıya iner, meraklı biri
// doğrudan veritabanından okur.
//
// Onayı geri almak erişimi anında keser — yani ÇIKARMA ARACI da budur.
// Veri silinmez, yalnızca `onayli/<kisi>` kaydı kalkar; kişi geri alınabilir.
//
// ⚠️ İKİ AŞAMALI YAYIN ZORUNLU (bkz. raporlar/ ve firebase-kurallari-3*.json):
//   1. `firebase-kurallari-3a-ara.json` yayınlanır — yalnızca `onayli` yazma
//      izni gelir, okuma DEĞİŞMEZ, kimse etkilenmez.
//   2. Gökşin "Mevcut üyeleri onayla" düğmesine basar.
//   3. `firebase-kurallari-3b-onay.json` yayınlanır — okuma kapısı devreye girer.
// Sıra bozulursa (önce 3b) GÖKŞİN DAHİL HERKES KİLİTLENİR: onaylı listesi boş
// olduğu için kimse okuyamaz, düğmeye basmak için de okuma gerekir.
// ══════════════════════════════════════════════════════════════════════

const ONAY_YOLU = 'aa-v4/onayli';

// Son okunan onay listesi. Panel bunu gösteriyor; her açılışta tazeleniyor.
let _onayListesi = null;

async function onaylariOku(){
  try{ _onayListesi = (await fbGet(ONAY_YOLU)) || {}; }
  catch(e){ _onayListesi = {}; }
  return _onayListesi;
}

function onayliMi(kisi){
  return !!(_onayListesi && _onayListesi[kisi] === true);
}

/* Onay ver / geri al. `sessiz` KULLANILMIYOR — bunlar kullanıcının bilerek
   yaptığı işlemler, başarısız olursa kırmızı şerit doğru davranış. */
async function onayVer(kisi){
  const ok = await fbSet(ONAY_YOLU + '/' + kisi, true);
  if(ok !== false) { if(!_onayListesi) _onayListesi = {}; _onayListesi[kisi] = true; }
  return ok;
}
async function onayKaldir(kisi){
  const ok = await fbSet(ONAY_YOLU + '/' + kisi, null);
  if(ok !== false && _onayListesi) delete _onayListesi[kisi];
  return ok;
}

/* ── TEK SEFERLİK: mevcut üyeleri onayla ────────────────────────────────
   Kural yayınlanmadan ÖNCE çalıştırılmalı. `db.users`ı kaynak alıyor —
   kullanıcı adları tahmin EDİLMİYOR, okunuyor. */
async function mevcutUyeleriOnayla(){
  const kisiler = Object.keys((typeof db !== 'undefined' && db.users) || {});
  if(!kisiler.length){ mesajGoster('⚠️ Üye listesi okunamadı, işlem yapılmadı.', 'uyari'); return; }
  let basarili = 0, hatali = [];
  for(const k of kisiler){
    const ok = await onayVer(k);
    if(ok === false) hatali.push(k); else basarili++;
  }
  await onayPaneliCiz();
  if(hatali.length){
    mesajGoster('⚠️ ' + basarili + ' üye onaylandı, ' + hatali.length +
                ' tanesi olmadı: ' + hatali.join(', ') + '. Kuralı YAYINLAMA, önce bunu çöz.', 'uyari');
  } else {
    mesajGoster('✅ ' + basarili + ' üye onaylandı. Artık son kuralı yayınlayabilirsin.', 'basari');
  }
}

/* ── PANEL ─────────────────────────────────────────────────────────────
   Yalnızca sahibe görünüyor; görünürlüğü renderSettings ayarlıyor. */
async function onayPaneliCiz(){
  const kap = document.getElementById('onayPaneli');
  if(!kap) return;
  if(typeof me === 'undefined' || me !== SAHIP){ kap.innerHTML=''; return; }

  await onaylariOku();
  const uyeler = Object.keys((typeof db !== 'undefined' && db.users) || {}).sort();
  const onayli  = uyeler.filter(u => onayliMi(u));
  const bekleyen = uyeler.filter(u => !onayliMi(u));

  const satir = (u, dugmeler) => {
    const k = (db.users[u] || {});
    const av = k.avatar || '📚';
    const avD = (av.startsWith('data:') || av.startsWith('avatar_')) ? '👤' : av;
    return `<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;flex-wrap:wrap">
      <span style="font-size:1.15rem">${avD}</span>
      <span style="font-family:'Playfair Display',serif;font-size:.92rem;color:var(--ink);flex:1;min-width:120px">
        ${escapeHtml(k.displayName || u)} <span style="opacity:.5;font-size:.75rem">@${escapeHtml(u)}</span>
      </span>
      <div style="display:flex;gap:.35rem">${dugmeler}</div>
    </div>`;
  };

  let html = '';

  if(bekleyen.length){
    html += `<div style="font-family:'Space Mono',monospace;font-size:.62rem;text-transform:uppercase;
                letter-spacing:.08em;color:var(--rust);margin:.2rem 0 .5rem">⏳ Onay bekleyen (${bekleyen.length})</div>`;
    html += bekleyen.map(u => satir(u,
      `<button class="btn btn-sm btn-primary" onclick="onayEt('${u}')">✓ Onayla</button>`)).join('');
  }

  /* YETİM ONAYLAR: `onayli` içinde adı geçen ama artık üye listesinde olmayan
     kişiler. Hesabını silen bir üyenin onay kaydı sunucuda kalabiliyor —
     silme sırasındaki temizlik yalnızca sahibin elinde başarılı oluyor
     (kurala göre `onayli`ye başka kimse yazamıyor, bkz. deleteAllUserData).
     Kalırsa delik açılıyor: kullanıcı adı yeniden serbest kalıyor ve o adı
     alan bir yabancı kendiliğinden onaylı üye oluyor. Burada görünür
     olmasalardı kimse fark etmezdi — panel yalnızca db.users'ı listeliyor. */
  const yetimler = Object.keys(_onayListesi || {}).filter(k => !uyeler.includes(k));

  html += `<div style="font-family:'Space Mono',monospace;font-size:.62rem;text-transform:uppercase;
              letter-spacing:.08em;color:var(--gold);margin:${bekleyen.length?'1rem':'.2rem'} 0 .5rem">
              ✓ Onaylı üye (${onayli.length})</div>`;
  html += onayli.length
    ? onayli.map(u => satir(u, u === me
        ? '<span style="font-size:.72rem;opacity:.5;font-style:italic">sen</span>'
        : `<button class="btn btn-sm" style="background:transparent;border:1px solid rgba(176,90,52,.5);color:var(--rust)" onclick="onayCikar('${u}', this)">Çıkar</button>`)).join('')
    : '<div style="font-size:.85rem;opacity:.5;font-style:italic">Henüz onaylı üye yok.</div>';

  if(yetimler.length){
    html += `<div style="font-family:'Space Mono',monospace;font-size:.62rem;text-transform:uppercase;
                letter-spacing:.08em;color:var(--rust);margin:1rem 0 .5rem">
                ⚠️ Yetim onay (${yetimler.length})</div>
             <div style="font-size:.78rem;opacity:.7;font-style:italic;margin-bottom:.5rem">
               Bu adlar onaylı listesinde duruyor ama artık üye değiller — hesap
               silinmiş olabilir. Kullanıcı adı yeniden serbest olduğu için, o adı
               alan biri kendiliğinden onaylı olur. Çıkarman iyi olur.</div>`;
    html += yetimler.map(u => `<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;flex-wrap:wrap">
        <span style="font-size:1.15rem">👻</span>
        <span style="font-family:'Playfair Display',serif;font-size:.92rem;color:var(--ink);flex:1;min-width:120px">
          <span style="opacity:.5;font-size:.75rem">@${escapeHtml(u)}</span></span>
        <div style="display:flex;gap:.35rem">
          <button class="btn btn-sm" style="background:transparent;border:1px solid rgba(176,90,52,.5);color:var(--rust)"
            onclick="onayCikar('${u}', this)">Çıkar</button></div>
      </div>`).join('');
  }

  /* Tek seferlik kurulum düğmesi. Onaysız üye varken görünmesi kasıtlı:
     kuralı yayınlamadan önceki adım bu. */
  if(bekleyen.length){
    html += `<div style="margin-top:1rem;padding-top:.75rem;border-top:1px dashed rgba(201,162,39,.25)">
      <div style="font-size:.78rem;opacity:.7;font-style:italic;margin-bottom:.5rem">
        Kuralı yayınlamadan önce mevcut üyelerin hepsini onaylaman gerekiyor —
        yoksa sen dahil herkes kilitlenir.</div>
      <button class="btn btn-sm btn-primary" onclick="tumUyeleriOnaylaSor(this)">
        ✓ Mevcut üyelerin hepsini onayla</button></div>`;
  }

  kap.innerHTML = html;
}

/* Onaylama yıkıcı değil, doğrudan yapılıyor. ÇIKARMA erişim kesiyor —
   satır içi onay isteniyor. Tarayıcı kutusu YOK (proje kuralı).
   ⚠️ showInlineConfirm(dugme, kisaMetin, islev) — İLK argüman düğmenin kendisi,
   onay kutusunu onun yanına koyuyor (feed.js:1189). Metin kısa olmalı, kutu
   satır içinde duruyor; uzun cümle satırı bozuyor. */
async function onayEt(kisi){
  await onayVer(kisi);
  await onayPaneliCiz();
  mesajGoster('✅ @' + kisi + ' onaylandı.', 'basari');
}
function onayCikar(kisi, btn){
  showInlineConfirm(btn, '@' + kisi + ' çıkarılsın mı?', async () => {
    await onayKaldir(kisi);
    await onayPaneliCiz();
    mesajGoster('@' + kisi + ' çıkarıldı — verisi silinmedi, geri alabilirsin.', 'uyari');
  });
}
function tumUyeleriOnaylaSor(btn){
  const sayi = Object.keys((typeof db !== 'undefined' && db.users) || {}).length;
  showInlineConfirm(btn, sayi + ' üye onaylansın mı?', mevcutUyeleriOnayla);
}

/* ── ONAY BEKLİYOR EKRANI ───────────────────────────────────────────────
   loadDb, `aa-v4` okumasında 401 alınca burayı çağırıyor. Kırmızı hata
   şeridi yerine ne olduğunu açıklayan bir ekran gösteriyor — kişi hatalı
   bir şey yapmadı, sadece sırası gelmedi. */
function onayBekliyorEkrani(){
  if(document.getElementById('onayBekliyorKat')) return;
  const kat = document.createElement('div');
  kat.id = 'onayBekliyorKat';
  kat.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
    'justify-content:center;padding:1.5rem;background:var(--leather,#2b2118)';
  kat.innerHTML =
    `<div style="max-width:420px;text-align:center;font-family:'Crimson Pro',serif;color:var(--parchment,#f0e6d2)">
       <div style="font-size:2.6rem;margin-bottom:.8rem">🔖</div>
       <div style="font-family:'Playfair Display',serif;font-size:1.25rem;margin-bottom:.7rem">
         Hesabın oluşturuldu</div>
       <p style="font-size:.95rem;line-height:1.6;opacity:.85;margin:0 0 1.2rem">
         Kütüphaneye katılman için onay bekleniyor. Onaylandığında bu ekran
         kendiliğinden kalkacak — tekrar giriş yapman yeterli.</p>
       <button class="btn btn-sm" style="background:transparent;border:1px solid rgba(201,162,39,.5);
         color:var(--gold,#c9a227)" onclick="onayEkranindanCik()">Çıkış yap</button>
     </div>`;
  document.body.appendChild(kat);
}

/* ⚠️ Düğme `logout()` çağırıyordu ve logout GERÇEKTEN çalışıyordu — ama bu katman
   `position:fixed; inset:0; z-index:9999` olduğu için altındaki giriş ekranını
   kapatıyordu. Kullanıcıya "düğme çalışmıyor, aynı sayfada sıkıştım" gibi
   görünüyor (Gökşin 10.09'da iki cihazda birden yaşadı). Katman AÇIKÇA
   kaldırılmalı; kendiliğinden kalkmıyor. */
function onayEkranindanCik(){
  try{ logout(); }catch(e){}
  const kat = document.getElementById('onayBekliyorKat');
  if(kat) kat.remove();
}
