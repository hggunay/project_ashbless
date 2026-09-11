// ══════════════════════════════════════════════════════════════════════
// SEZONLUK ROZETLER
// ══════════════════════════════════════════════════════════════════════
// Fikir Gökşin'in (2026-09-10). Diğer rozetlerden farkı KALICI OLMAMASI:
// sezon bitince rozet rozet ızgarasından kaybolur, ertesi yıl sezon gelince
// yeniden belirir ve sayaç sıfırdan başlar. Kalıcı kayıt İstatistikler'de.
//
// ⚠️ YENİ DÜĞÜM YOK. İki şey sayesinde Firebase'e hiç dokunmuyoruz:
//   1. İşaret kitabın/öykünün kendi alanında (`sezon`), tıpkı `challenging`
//      ya da `hundredPages` gibi — kitaplar zaten kişi başına kaydediliyor.
//   2. Kazanma geçmişi `badgeEvents/<kişi>` içinde, o da zaten var.
// Yani "aa-v4 altına düğüm eklerken DÖRT yer" kuralı devreye girmiyor.
//
// ⚠️ KİTABIN UYGUN OLDUĞUNA OKUYAN KARAR VERİYOR — tür eşleştirme YOK.
// Sebep: tür eşleştirmesi bu projede bir rozeti yıllarca kazanılamaz yaptı
// (bkz. Başucu Seçkisi, denetim raporu 10.09). İşaret kutusu sezon açıkken
// görünüyor, kapanınca kayboluyor; yani geçmişe dönük işaretlenemiyor.
// ══════════════════════════════════════════════════════════════════════

/* Sezonlar. Yeni sezon eklemek için bu listeye bir satır yetiyor — kodun
   geri kalanı listeyi geziyor.
   ⚠️ `kis` YIL AŞIYOR (Aralık → Şubat). Aşağıdaki tüm hesaplar sezonun
   BAŞLADIĞI yılı esas alıyor: Aralık 2026 + Ocak/Şubat 2027 = "kis-2026",
   ekranda "2026/27" diye görünüyor. */
const SEZONLAR = [
  {
    id:'cadilar', ad:'Cadılar Bayramı', emoji:'🎃',
    basAy:9, bitAy:10,                       // 1 Eylül – 31 Ekim
    gumus:{ ad:'Cadılar Gecesi Okuru',  gorsel:'badges/badge_sezon_cadilar_gumus.png' },
    altin:{ ad:'Cadılar Gecesi Ustası', gorsel:'badges/badge_sezon_cadilar_altin.png' },
    duyuru:'Karanlık bir mevsim başladı. Bu sezona uygun okuduğun kitap ya da öyküyü işaretle.'
  },
  {
    id:'kis', ad:'Kış', emoji:'❄️',
    basAy:12, bitAy:2,                       // 1 Aralık – 28/29 Şubat (yıl aşar)
    gumus:{ ad:'Kış Okumaları',     gorsel:'badges/badge_sezon_kis_gumus.png' },
    altin:{ ad:'Kış Gecesi Ustası', gorsel:'badges/badge_sezon_kis_altin.png' },
    duyuru:'Kış geldi. Bu mevsime yakışan bir kitap ya da öykü okuduğunda işaretle.'
  }
];

/* Kaç kitap hangi kademeyi veriyor. Gökşin'in kararı: sezonluk rozet zorlayıcı
   olmasın — okuyanın hazır bir listesi olabilir, araya kitap sıkıştırmak zor.
   Bronz YOK; sezonluk rozet gümüşten başlıyor (bronz ile altın 120 pikselde
   birbirine fazla yakın duruyordu). */
const SEZON_GUMUS_ESIK = 1;
const SEZON_ALTIN_ESIK = 2;

/* Verilen tarihte açık olan sezon (yoksa null). Ay aralığı yıl aşıyorsa
   (`basAy > bitAy`) karşılaştırma "ya sonda ya başta" biçimine dönüyor. */
function sezonBul(tarih){
  const t = tarih || new Date();
  const ay = t.getMonth() + 1;
  for(const s of SEZONLAR){
    const icinde = (s.basAy <= s.bitAy)
      ? (ay >= s.basAy && ay <= s.bitAy)
      : (ay >= s.basAy || ay <= s.bitAy);
    if(icinde) return s;
  }
  return null;
}

/* Sezonun BAŞLADIĞI yıl. Ocak/Şubat'ta kış sezonu bir önceki yıl başlamıştır. */
function sezonYili(sezon, tarih){
  const t = tarih || new Date();
  const yil = t.getFullYear(), ay = t.getMonth() + 1;
  if(sezon.basAy > sezon.bitAy && ay <= sezon.bitAy) return yil - 1;
  return yil;
}

/* Kitaba/öyküye yazılan değer: 'cadilar-2026' gibi. Sezon kapalıysa null. */
function sezonAnahtari(tarih){
  const s = sezonBul(tarih);
  return s ? (s.id + '-' + sezonYili(s, tarih)) : null;
}

/* Ekranda görünecek yıl etiketi. Kış için "2026/27". */
function sezonYilEtiketi(sezon, yil){
  if(sezon.basAy > sezon.bitAy) return yil + '/' + String((yil + 1) % 100).padStart(2,'0');
  return String(yil);
}

/* Bir anahtarı ('kis-2026') sezon + yıl olarak çöz. Geçmiş kayıtlar için. */
function sezonCoz(anahtar){
  if(!anahtar) return null;
  const i = anahtar.lastIndexOf('-');
  if(i < 0) return null;
  const sezon = SEZONLAR.find(s => s.id === anahtar.slice(0, i));
  const yil = parseInt(anahtar.slice(i + 1), 10);
  if(!sezon || isNaN(yil)) return null;
  return { sezon, yil };
}

/* Açık sezonda işaretlenmiş kitap + öykü sayısı.
   ⚠️ Öyküler `ctx.stories` üzerinden geliyor, `db.stories[me]` ile DEĞİL:
   başkasının profiline bakarken kendi öykülerimiz sayılırdı. Bağlam zaten
   doğru kullanıcıyı taşıyor (badges.js → badgeCtxFor).
   ⚠️ Geçmişte okunanlar `bstat` tarafından zaten eleniyor (retroaktif). */
function sezonSayisi(kitaplar, ctx){
  const anahtar = sezonAnahtari();
  if(!anahtar) return 0;
  const k = (kitaplar || []).filter(b => b && b.sezon === anahtar).length;
  const o = ((ctx && ctx.stories) || []).filter(s => s && s.sezon === anahtar && !s.retroactive).length;
  return k + o;
}

/* ── ROZETLERİ LİSTEYE KAT ────────────────────────────────────────────
   Yalnızca sezon AÇIKKEN ekleniyor; kapanınca rozet ızgarada hiç görünmüyor.
   Kazanılmış olanların kaydı `badgeEvents`te duruyor, İstatistikler oradan
   okuyor — yani rozet kaybolsa da geçmiş kaybolmuyor.
   ⚠️ `unshift`: sezonluk rozet süreli olduğu için listenin BAŞINDA duruyor,
   fark edilsin diye. Sıraya bağlı başka bir kod yok (kontrol edildi).
   ⚠️ badges.js'den SONRA yüklenmeli — BADGE_CATS orada tanımlı. */
(function sezonRozetleriniKur(){
  if(typeof BADGE_CATS === 'undefined') return;
  const s = sezonBul();
  if(!s) return;
  BADGE_CATS.unshift({
    label: s.emoji + ' Sezonluk',
    chains: [{
      id: 'sezonluk',
      label: s.emoji + ' ' + s.ad,
      badges: [
        { id:'sezon_'+s.id+'_gumus', tier:'silver', icon:s.emoji, imgSrc:s.gumus.gorsel,
          name:s.gumus.ad,
          desc:'Bu sezona uygun '+SEZON_GUMUS_ESIK+' kitap ya da öykü oku ve işaretle.',
          check:(b,ctx)=>cap(sezonSayisi(b,ctx), SEZON_GUMUS_ESIK) },
        { id:'sezon_'+s.id+'_altin', tier:'gold', icon:s.emoji, imgSrc:s.altin.gorsel,
          name:s.altin.ad,
          desc:'Bu sezona uygun '+SEZON_ALTIN_ESIK+' kitap ya da öykü oku ve işaretle.',
          check:(b,ctx)=>cap(sezonSayisi(b,ctx), SEZON_ALTIN_ESIK) }
      ]
    }]
  });
})();

/* ── KİTAP / ÖYKÜ İŞARETİ ─────────────────────────────────────────────
   Mevcut `flagChip` kalıbının aynısı, tek farkı değerin boolean değil sezon
   anahtarı olması — böylece hangi yılın hangi sezonuna ait olduğu kayıtlı
   kalıyor ve ertesi yıl eski işaretler yeni rozeti kazandırmıyor. */
/* O sezonun rozeti kazanılmış mı? Kaynak `badgeEvents` — geçmiş sezonlar için
   tek bilgi kaynağı orası (rozetin kendisi ızgaradan kalkmış oluyor). */
function sezonKazanildiMi(anahtar, kullanici){
  const c = sezonCoz(anahtar);
  if(!c) return false;
  const olaylar = (typeof db !== 'undefined' && db.badgeEvents &&
                   db.badgeEvents[kullanici || (typeof me !== 'undefined' ? me : null)]) || [];
  return olaylar.some(e => {
    if(!e || !e.badgeId || e.badgeId.indexOf('sezon_' + c.sezon.id + '_') !== 0) return false;
    return sezonYili(c.sezon, new Date(e.ts || 0)) === c.yil;
  });
}

/* Kitap/öykü üzerindeki sezon işareti. İKİ ayrı şey basabiliyor:

   1. GEÇMİŞ İŞARET — kayıtta başka bir sezonun anahtarı varsa, salt okunur bir
      rozet olarak duruyor ("🎃 Cadılar Bayramı 2026"). Gökşin'in isteği:
      *"emoji kalabilir; kazanana kadar soluk, kazanınca renkli."* Rozet
      kazanıldıysa tam renkli, kazanılmadıysa soluk.
      ⚠️ Bu olmadan sezon kapanınca kitapta HİÇBİR iz kalmıyordu: hangi kitabı
      hangi sezon için okuduğun görünmez oluyordu ve gelecek yıl o kayıt sessizce
      üzerine yazılıyordu (Gökşin sordu, 2026-09-11).

   2. AÇIK SEZONUN İŞARETİ — yalnızca sezon açıkken ve kayıt "geçmişte okundu"
      değilken; tıklanabilir.

   Not: geçmiş işaret SİLİNEMİYOR. Sezon kapandıktan sonra o kayıt bir tarih;
   değiştirilebilseydi geçmiş rozet geçmişiyle tutarsız hale gelirdi. */
function sezonChip(kayit, duzenlenebilir, tiklama){
  const anahtar = sezonAnahtari();
  const s = sezonBul();
  let html = '';

  const eski = kayit && kayit.sezon && kayit.sezon !== anahtar ? sezonCoz(kayit.sezon) : null;
  if(eski){
    const kazanildi = sezonKazanildiMi(kayit.sezon);
    html += '<span class="check-chip readonly active" title="' +
            (kazanildi ? 'Bu sezonun rozeti kazanıldı' : 'Bu sezon için okundu ama rozet kazanılmadı') +
            '" style="' + (kazanildi ? '' : 'opacity:.45;') + '">' +
            eski.sezon.emoji + ' ' + eski.sezon.ad + ' ' +
            sezonYilEtiketi(eski.sezon, eski.yil) + '</span>';
  }

  if(s && !(kayit && kayit.retroactive)){
    const acik = kayit && kayit.sezon === anahtar;
    const cls = duzenlenebilir ? 'check-chip' : 'check-chip readonly';
    const tik = duzenlenebilir && tiklama ? 'onclick="' + tiklama + '"' : '';
    html += '<span class="' + cls + (acik ? ' active' : '') + '" ' + tik + '>' +
            s.emoji + ' ' + s.ad + '</span>';
  }
  return html;
}

/* Kitaptaki işaret. `toggleFlag`'in aynısı; tek farkı değerin boolean değil
   sezon anahtarı olması. Rozet kontrolü aynı şekilde tetikleniyor.
   ⚠️ Alan TEK değer tutuyor: aynı kitap iki farklı yılın sezonunda
   işaretlenirse eskisi yenisiyle değişir. Bilerek böyle — aynı kitabı iki
   sezonda okumak nadir, dizi tutmak veri şeklini gereksiz karmaşıklaştırırdı.
   Kullanıcı körlemesine yapmıyor: eski işaret ekranda ayrı bir rozet olarak
   duruyor, yenisine bastığında kaybolduğunu görüyor. Rozet GEÇMİŞİ bundan
   etkilenmiyor — o `badgeEvents`te, kitapta değil. */
function toggleSezonKitap(bookId, el){
  const kitap = (db.books[me] || []).find(b => b.id === bookId);
  if(!kitap) return;
  const anahtar = sezonAnahtari();
  if(!anahtar) return;
  const oncekiGecerli = snapshotValidBooks();
  el.classList.toggle('active');
  kitap.sezon = el.classList.contains('active') ? anahtar : null;
  saveDb();
  renderSafe();
  checkAndAwardBadges(oncekiGecerli);
}

/* ── SEZON AÇILIŞ DUYURUSU ────────────────────────────────────────────
   Karşılama şeritleriyle aynı kalıp (karsilama.js): ✕ ile kapatılıyor,
   tercih cihazda saklanıyor. Anahtara sezon+yıl giriyor, yani ertesi yıl
   duyuru yeniden çıkıyor. */
const SEZON_DUYURU_DEPO = 'aa-sezon-duyuru';

function sezonDuyuruGorulduMu(anahtar){
  try{ return (JSON.parse(localStorage.getItem(SEZON_DUYURU_DEPO) || '{}'))[anahtar] === true; }
  catch(e){ return false; }
}
function sezonDuyuruKapat(anahtar){
  try{
    const g = JSON.parse(localStorage.getItem(SEZON_DUYURU_DEPO) || '{}');
    g[anahtar] = true;
    localStorage.setItem(SEZON_DUYURU_DEPO, JSON.stringify(g));
  }catch(e){}
  const el = document.getElementById('sezonDuyuru');
  if(el) el.remove();
}

/* Kaç gün kaldığını söylüyor — "n ayın var" yerine gerçek sayı, çünkü
   sezonun ortasında katılan biri için "2 ay" yanlış olurdu. */
function sezonKalanGun(sezon){
  const bugun = new Date();
  const yil = sezonYili(sezon, bugun);
  const bitisYili = (sezon.basAy > sezon.bitAy) ? yil + 1 : yil;
  // Ayın son gününü tarih nesnesine hesaplattır (Şubat 28/29 derdi kalmasın).
  const son = new Date(bitisYili, sezon.bitAy, 0, 23, 59, 59);
  return Math.max(0, Math.ceil((son - bugun) / 86400000));
}

function sezonDuyuruCiz(){
  const s = sezonBul();
  if(!s) return;
  const anahtar = sezonAnahtari();
  if(sezonDuyuruGorulduMu(anahtar)) return;
  if(document.getElementById('sezonDuyuru')) return;
  const kap = document.getElementById('feed');
  if(!kap) return;

  const gun = sezonKalanGun(s);
  const d = document.createElement('div');
  d.id = 'sezonDuyuru';
  /* ⚠️ Renkler satır içinde açıkça — panel zemini koyu (proje kalıbı). */
  d.style.cssText =
    'background:rgba(201,162,39,.12);border:1px solid rgba(201,162,39,.35);' +
    'border-radius:6px;padding:.85rem 1rem;margin-bottom:.85rem;' +
    'font-family:\'Crimson Pro\',serif;color:var(--parchment);line-height:1.6';
  d.innerHTML =
    '<div style="font-family:\'Playfair Display\',serif;font-size:1.02rem;color:var(--gold);' +
         'margin-bottom:.3rem">' + s.emoji + ' Sezonluk rozet ortaya çıktı — ' + s.ad + '</div>' +
    '<div style="font-size:.93rem">' + s.duyuru +
      ' Kazanmak için <b>' + gun + ' günün</b> var; sezon bitince rozet kaybolacak.</div>' +
    '<button onclick="sezonDuyuruKapat(\'' + anahtar + '\')" ' +
      'style="margin-top:.7rem;background:transparent;border:1px solid rgba(201,162,39,.45);' +
      'border-radius:4px;padding:.28rem .7rem;font-family:\'Space Mono\',monospace;' +
      'font-size:.62rem;color:var(--gold);cursor:pointer">✕ Tekrar gösterme</button>';
  kap.insertBefore(d, kap.firstChild);
}

/* ── İSTATİSTİK GEÇMİŞİ ───────────────────────────────────────────────
   Kaynak `badgeEvents` — rozet kazanıldığında zaten oraya yazılıyor, ayrıca
   bir yere kaydetmeye gerek yok. Aynı yıl hem gümüş hem altın kazanıldıysa
   ikisi de aynı satırda görünüyor; altın zaten gümüşü kapsıyor ama ikisini
   de göstermek "o yıl ne kadar ilerledim" sorusuna daha iyi cevap veriyor. */
function sezonGecmisiSatirlari(kullanici){
  const olaylar = (typeof db !== 'undefined' && db.badgeEvents && db.badgeEvents[kullanici]) || [];
  const yillar = {};   // "cadilar-2026" -> {sezon, yil, gumus, altin}
  for(const e of olaylar){
    if(!e || !e.badgeId || e.badgeId.indexOf('sezon_') !== 0) continue;
    const parca = e.badgeId.split('_');          // sezon_cadilar_gumus
    const sezon = SEZONLAR.find(s => s.id === parca[1]);
    if(!sezon) continue;
    const t = new Date(e.ts || 0);
    const yil = sezonYili(sezon, t);
    const anahtar = sezon.id + '-' + yil;
    if(!yillar[anahtar]) yillar[anahtar] = { sezon, yil, gumus:false, altin:false };
    if(parca[2] === 'gumus') yillar[anahtar].gumus = true;
    if(parca[2] === 'altin') yillar[anahtar].altin = true;
  }
  return Object.values(yillar)
    .sort((a,b) => (b.yil - a.yil) || a.sezon.id.localeCompare(b.sezon.id))
    .map(k =>
      '<div style="display:flex;align-items:center;gap:.6rem;padding:.3rem 0;' +
           'border-bottom:1px solid rgba(201,162,39,.08)">' +
        '<span style="font-family:\'Space Mono\',monospace;font-size:.78rem;color:var(--ink);' +
              'opacity:.85;min-width:3.6rem">' + sezonYilEtiketi(k.sezon, k.yil) + '</span>' +
        '<span style="font-size:1.05rem">' + k.sezon.emoji + '</span>' +
        '<div style="display:flex;gap:.3rem;font-size:1.05rem">' +
          (k.gumus ? '<span title="' + k.sezon.gumus.ad + '">🥈</span>' : '') +
          (k.altin ? '<span title="' + k.sezon.altin.ad + '">🥇</span>' : '') +
        '</div>' +
      '</div>');
}
