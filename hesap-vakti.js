// ══════════════════════════════════════════════════════════════════════
// HESAP VAKTİ — 😈 Şeytan & 😇 Melek
// ══════════════════════════════════════════════════════════════════════
// Tasarımın tamamı `gelecek-planlar.md` → "GELECEK PLANI — Şeytan & Melek".
// Cümle bankası da orada: 11 senaryo, Şeytan 40 cümle, Melek 59 cümle.
//
// BU DOSYA 1. AŞAMA: iskelet + karar mantığı.
//   • Geçen ayın özeti
//   • 11 senaryodan hangisinin geçerli olduğu (öncelik sırasıyla)
//   • Sınama kutusu (senaryoyu elle seçme)
// Sohbet balonları, yazıyor animasyonu ve düğmeler 2-3. aşamada gelecek.
//
// ⚠️ YALNIZCA `deneme` HESABINDA. Hayali Diyarlar'da işe yarayan desen:
// kapı ardında geliştir, hazır olunca aç. Kapıyı açmadan Gökşin'e sor.
//
// 📅 DEĞERLENDİRİLEN AY = GEÇEN AY. Gökşin'in kararı (2026-09-04): "ayın 5'inde
// 'bu ay hiç okumadın' demek haksız olur; geçen ay kapanmış bir defter."
// Aynı ilke `badges.js:_monthStreakStats` içinde de uygulandı.

/* Özelliğin açık olduğu hesaplar. `null` = HERKESTE AÇIK.
   2026-09-06: kapı açıldı. Geliştirme boyunca ['deneme'] idi — Hayali
   Diyarlar'daki desen: kapı ardında geliştir, hazır olunca aç.
   Yeniden kısıtlamak gerekirse listeye çevirmek yeterli. */
const HESAP_VAKTI_HESAPLARI = null;
function hesapVaktiAktif(){ return !HESAP_VAKTI_HESAPLARI || HESAP_VAKTI_HESAPLARI.includes(me); }

/* Sınama kutusu (senaryo seçici + "ertesi gün") AYRI kilitli. Özellik herkese
   açıldı ama test menüsü yalnızca `deneme` hesabında görünmeli — normal
   kullanıcı senaryoyu elle seçmemeli, günü ileri atmamalı. */
const HESAP_VAKTI_SINAMA = ['deneme'];
function hesapVaktiSinamaAktif(){ return HESAP_VAKTI_SINAMA.includes(me); }

// Kısa okuma eşiği ROZETLERLE AYNI olmalı — `badges.js:556` `pages<=150`
// kullanıyor. Gökşin: "rozetlerle tutarlı davranış olsun."
const HV_KISA_SAYFA = 150;
// Art arda kaç kısa okuma senaryoyu tetikler
const HV_KISA_DIZI  = 5;
// Tsundoku "kritik" sayılır
const HV_TSUNDOKU_KRITIK = 10;
// Bir kitabı bu kadar gündür bitirememek
const HV_GUN_1 = 30, HV_GUN_2 = 60;
// T2 için: en eski tsundoku kaydı bu kadar aydır bekliyorsa "dokunulmuyor"
const HV_TSUNDOKU_BAYAT_AY = 6;

/* ── Geçen ayın anahtarı: "2026-08" ─────────────────────────────────────── */
function hvGecenAy(simdi){
  const d = simdi || new Date();
  const g = new Date(d.getFullYear(), d.getMonth()-1, 1);
  return g.getFullYear()+'-'+String(g.getMonth()+1).padStart(2,'0');
}

/* ── Hikâyenin okuma ayı. Kitaplardaki bookMonth'un karşılığı.
      readYearOnly (yalnızca yılı bilinen, geçmişten aktarılmış) kayıtlar aya
      dayalı hiçbir sayıma giremez — kitaplarda da kural aynı. ─────────────── */
function hvHikayeAy(h){
  if(!h || !h.readDate) return null;
  const d = (typeof normalizeDate==='function') ? normalizeDate(h.readDate) : null;
  return d ? d.substring(0,7) : null;
}

/* ── VERİ ────────────────────────────────────────────────────────────────
   Tek yerde toplanıyor ki senaryo seçici ve özet kutusu AYNI sayılara baksın.
   Ayrı ayrı hesaplanırsa ikisi birbirini tutmaz ve hangisinin doğru olduğu
   anlaşılmaz — bu uygulamada daha önce yaşanmış bir hata sınıfı. */
function hesapVaktiVerisi(kisi){
  const ay = hvGecenAy();
  const tumKitaplar = (db.books && db.books[kisi]) || [];
  const okunanlar   = (typeof readBooksOf==='function')
                        ? readBooksOf(kisi, {includePaused:true}) : [];
  const hikayeler   = ((db.stories && db.stories[kisi]) || []).filter(Boolean);

  const gecenAyKitap = okunanlar.filter(b => typeof bookMonth==='function' && bookMonth(b)===ay);
  const gecenAyHikaye = hikayeler.filter(h => hvHikayeAy(h)===ay);

  const tsundoku = tumKitaplar.filter(b => b && b.readingStatus==='wishlist');
  const simdi = Date.now();
  const gunFarki = t => { const z=Date.parse(t); return isFinite(z) ? Math.floor((simdi-z)/86400000) : null; };

  // Tsundokunun en eski kaydı kaç gündür bekliyor
  const tsundokuBeklemeGun = tsundoku.reduce((enEski,b)=>{
    const g = gunFarki(b.addedAt); return (g!==null && g>enEski) ? g : enEski;
  }, 0);
  // Geçen ay tsundokuya eklenenler
  const gecenAyEklenen = tsundoku.filter(b=>{
    const d = b.addedAt ? String(b.addedAt).substring(0,7) : null; return d===ay;
  }).length;

  // Hâlâ okunmakta olan ve uzun süredir bitmeyen kitaplar
  const acikKitaplar = tumKitaplar.filter(b => b && b.readingStatus==='reading' && b.startDate);
  const takilanlar = acikKitaplar
    .map(b => ({ kitap:b, gun:gunFarki(b.startDate) }))
    .filter(x => x.gun!==null)
    .sort((a,b)=>b.gun-a.gun);
  const enUzunTakilan = takilanlar[0] || null;

  /* Son okumalar — kitap ve hikâye BİRLİKTE, tarih sırasına göre.
     Hikâyelerde sayfa sayısı alanı YOK (ölçüldü, 2026-09-04) ve pratikte
     150 sayfadan uzun hikâye olmaz; bu yüzden her hikâye kısa sayılıyor.
     Gökşin'in isteği: "hikayelerime eklenen kısa hikayeleri de hesaba katalım." */
  const sonOkumalar = []
    .concat(okunanlar
      .filter(b => typeof bookMonth==='function' && bookMonth(b))
      .map(b => ({ ay:bookMonth(b), ad:b.title, kisa: !!(b.pages && b.pages<=HV_KISA_SAYFA), tur:'kitap' })))
    .concat(gecenAyHikayeHaric(hikayeler)
      .map(h => ({ ay:hvHikayeAy(h), ad:h.title, kisa:true, tur:'hikaye' })))
    .sort((a,b)=> a.ay.localeCompare(b.ay));

  return {
    ay,
    bitirilen: gecenAyKitap.length,
    hikaye: gecenAyHikaye.length,
    sayfa: gecenAyKitap.reduce((s,b)=>s+(b.pages||0),0),
    tsundoku: tsundoku.length,
    tsundokuBeklemeGun,
    gecenAyEklenen,
    seri: (typeof currentReadingStreak==='function')
            ? currentReadingStreak(okunanlar, new Date().getFullYear()) : 0,
    enIyiSeri: hvEnIyiSeri(okunanlar),
    enUzunTakilan,
    sonOkumalar
  };
}
// Tarihi bilinen hikâyeler (yalnızca yılı bilinenler sıralamaya giremez)
function gecenAyHikayeHaric(hikayeler){ return hikayeler.filter(h => hvHikayeAy(h)); }

// Geçmişteki en uzun aylık seri — "hiç seri yapmamış" ile "serisi kırılmış"
// ayrımı buna dayanıyor.
function hvEnIyiSeri(kitaplar){
  if(typeof bookMonth!=='function') return 0;
  const aylar = new Set(kitaplar.map(bookMonth).filter(Boolean));
  if(!aylar.size) return 0;
  const sirali = [...aylar].sort();
  let enIyi=1, cur=1;
  for(let i=1;i<sirali.length;i++){
    const [y1,a1]=sirali[i-1].split('-').map(Number);
    const [y2,a2]=sirali[i].split('-').map(Number);
    const ardisik = (y2===y1 && a2===a1+1) || (y2===y1+1 && a1===12 && a2===1);
    cur = ardisik ? cur+1 : 1;
    if(cur>enIyi) enIyi=cur;
  }
  return enIyi;
}

/* ── SENARYOLAR ──────────────────────────────────────────────────────────
   Sıra Gökşin'in kararı (2026-09-04): en ağır ve en güncel olan kazanır.
   İlk tutan kazanır — dizinin sırası önceliğin ta kendisidir.
   `melekBaslar`: yumuşak durumlarda Melek önce konuşur, Şeytan araya dalar.
   Plandaki "genel iyi ama tek eksik var" satırı ayrı bir senaryo değil, bu mod.

   `baglamlar`: AÇILIŞ HAVUZU. Eskiden senaryo başına TEK bağlam cümlesi vardı;
   veri ay boyunca değişmediği için o cümle de her gün aynı çıkıyordu. Gökşin'in
   tespiti (2026-09-04): "ilk cümlenin hep aynı olması rahatsız etti." Artık
   günlük tohumla dönüyor — alttaki cümlelerle aynı ritimde.
   Cümleler Gökşin'in kendi yazdıkları; havuz genişletmek serbest, tek koşul
   Şeytan'ın ağzından olması (T2'nin Eco açılışı hariç, aşağıya bak).

   Bir havuz elemanı iki türden biri olabilir:
     • metin           → Şeytan'ın açılış balonu
     • {melek,seytan}  → sahnelenmiş açılış: Melek bir şey söyler, Şeytan yanıtlar */
const HESAP_VAKTI_SENARYOLARI = [
  { id:'hic-okumama',   ad:'Hiç okumama',
    baglamlar:[
      'Geçen ay hiç kitap bitirememişsin.',
      'Geçen ayın kitap sayısı: sıfır.',
      'Geçen ay hangi kitapları bitirmişsin diye bakayım dedim, bir de ne göreyim? Ya da görmeyeyim. Çünkü göremedim.. Sıfır kitap.'
    ],
    kosul:v => v.bitirilen===0 },
  { id:'gun-60',        ad:'60 gündür bitmiyor',
    baglamlar:[
      '60 gündür aynı kitabı okuyorsun, bitireceğin yok. Sen de biliyorsun.',
      'İki aydır aynı kitaptasın.',
      /* Bu açılış Şeytan'ın cümlesinden SONRA oynuyor (Gökşin, 2026-09-05):
         "Psst! …yarım bıraktım yap!" fısıltısı açılışa daha uygun, bu cümle de
         arkadan gelince gerekçe gibi duruyor. */
      { sonra:'60 gün oldu. Kitap hâlâ yarım.' }
    ],
    kosul:v => v.enUzunTakilan && v.enUzunTakilan.gun>=HV_GUN_2 },
  { id:'tsundoku-t3',   ad:'T3 — tsundoku kritik',
    baglamlar:[
      'Tsundoku listen şişmiş.',
      'Okumayı düşünüyor musun? Tsundokundan bahsediyorum..',
      'Listeye eklemeyi seviyorsun, okumayı pek değil.'
    ],
    kosul:v => v.tsundoku>=HV_TSUNDOKU_KRITIK && v.bitirilen<=1 },
  { id:'seri-s2',       ad:'S2 — seri kırıldı',
    /* Açılışı yok: cümlelerinin hepsi serinin kırıldığını kendisi söylüyor.
       Şeytanca olan iki açılış cümle bankasına taşındı (2026-09-05).
       "Duyduğum ses kırılan serin miydi?" ÇAT! + 😴😯🤨😏 animasyonuyla
       oynuyor — bkz. `hvCatSahnesi`, planda `[çat]` damgası. */
    baglamlar:[],
    kosul:v => v.seri===0 && v.enIyiSeri>=2 },
  { id:'gun-30',        ad:'30 gündür bitmiyor',
    baglamlar:[
      '30 gündür aynı kitabı okuyorsun.',
      'Bir aydır aynı kitaptasın.',
      '30 gün, tek kitap, hâlâ bitmedi.'
    ],
    kosul:v => v.enUzunTakilan && v.enUzunTakilan.gun>=HV_GUN_1 },
  { id:'kisa-kitap',    ad:'5 kısa okuma üst üste',
    baglamlar:[
      'Art arda 5 kısa kitap/hikaye okudun.',
      'Bu işin cheat kodunu bulmuşsun, art arda kısa kitaplar okuyorsun.',
      'Hep kısa kitaplar okuyorsun. Ne yapmaya çalıştığını melek anlamaz ama ben anlarım..'
    ],
    kosul:v => v.sonOkumalar.length>=HV_KISA_DIZI &&
               v.sonOkumalar.slice(-HV_KISA_DIZI).every(x=>x.kisa) },
  { id:'tsundoku-t4',   ad:'T4 — tsundoku büyüyor',
    /* Açılışı yok — cümleleri kendini açıklıyor. İki şeytanca açılış bankaya
       taşındı; "Tsundoku listen boyunu aştı." düz tarif olduğu için silindi. */
    baglamlar:[],
    kosul:v => v.tsundoku>0 && v.gecenAyEklenen>=Math.max(1,v.bitirilen) },
  { id:'tsundoku-t2',   ad:'T2 — dokunulmayan liste',
    /* 4. açılış Gökşin'in isteği: bu senaryoda Melek başlasın, Şeytan cevap
       versin. Aynı Eco sözü T1'in 3. açılışında da var — ikisi hiç aynı gün
       çıkamaz (biri tsundoku boşken, diğeri doluyken tetikleniyor). */
    /* Üç düz açılış silindi (kendi cümleleri zaten açıklıyordu). Geriye yalnızca
       Eco sahnesi kaldı; o bir açıklama değil, sahne — kendi kuralıyla oynuyor. */
    baglamlar:[
      { melek:'"Bir kitaplık, okunmamış kitaplarla dolu olduğunda daha güzeldir." — Umberto Eco',
        seytan:'Eco bile BU KADAR ÇOK okunmamış kitabı kastetmemiştir bence.' }
    ],
    /* Plandaki kural "tsundokudan hiç okumamış" — ama kitap okununca durumu
       değişiyor ve eskiden tsundokuda olduğu bilgisi KAYBOLUYOR (ölçüldü).
       Gökşin'in onayıyla vekil ölçüt: liste dolu ve en eski kaydı 6+ aydır
       bekliyor — "liste var, kimse dokunmuyor" aynı yere çıkıyor. */
    kosul:v => v.tsundoku>0 && v.tsundokuBeklemeGun >= HV_TSUNDOKU_BAYAT_AY*30 },
  { id:'seri-s1',       ad:'S1 — hiç seri yok',
    /* "en az 1 kitap" doğru sayı — aylık seri, arka arkaya her ay en az bir
       kitap bitirmek (`hvEnIyiSeri`). Şeytan çıtayı parça parça tekrarlıyor. */
    baglamlar:[
      'Senin neden hiç aylık serin yok? Düzen karşıtı anarşist misin?',
      'Aylık seri: her ay en az 1 kitap bitirmek demek... 1 kitap... en az.. her ay.. bir..',
      'Aylık serin boş.. döktüğüm diller boş..'
    ],
    melekBaslar:true, kosul:v => v.enIyiSeri<2 },
  { id:'tsundoku-t1',   ad:'T1 — tsundoku boş',
    /* Açılışı yok — üç açılışın üçü de cümle bankasına taşındı. Bankadaki
       "Tsundokun boş. Gelecekten ümidini kesmiş olmalısın..." cümlesi silindi;
       taşınan açılışla neredeyse aynıydı, Gökşin açılışı seçti (2026-09-05). */
    baglamlar:[],
    melekBaslar:true, kosul:v => v.tsundoku===0 },
  { id:'mukemmel',      ad:'Her şey mükemmel',
    /* Utanma düğmeleri yerine captcha — burada suçlama yok, şaşkınlık var. */
    dugmeler:'captcha',
    baglamlar:[
      'Her şey yolunda görünüyor... Şüpheliyim.',
      'Gözüm üstünde. Elbet bir eksiğini bulacağım!',
      'Her şey yerli yerinde. Bu normal değil.'
    ],
    kosul:() => true }   // hiçbiri tutmazsa buraya düşer
];

/* O ayın verisine UYAN bütün senaryolar, öncelik sırasında.
   ⚠️ "Her şey mükemmel" listenin sonunda ve koşulu her zaman doğru — hiçbiri
   tutmazsa düşülen yedek. Döndürmeye katılırsa her gün sıraya girip yer kapar,
   o yüzden ayrı tutuluyor: yalnızca başka hiçbir şey tutmazsa çıkıyor. */
function hesapVaktiUyanlar(v){
  const yedek=HESAP_VAKTI_SENARYOLARI[HESAP_VAKTI_SENARYOLARI.length-1];
  const uyan=HESAP_VAKTI_SENARYOLARI.filter(s=>s!==yedek && s.kosul(v));
  return uyan.length ? uyan : [yedek];
}

/* Uyan senaryolar GÜNLÜK DÖNÜYOR (Gökşin, 2026-09-06). Eskiden hep en
   öncelikli olan çıkıyordu; veri ay boyunca değişmediği için aynı senaryo bir
   ay takılı kalıyordu. Artık aynı ay içinde farklı senaryolar da geliyor —
   cümleler zaten kendi içinde dönüyordu, bu ikinci bir çeşitlilik katmanı.
   Dizinin sırası korunuyor, yalnızca başlangıç kayıyor: ayın ilk gününde yine
   en ağır durum çıkıyor. */
function hesapVaktiSenaryo(v){
  const uyan=hesapVaktiUyanlar(v);
  return hvDondur(uyan,1,0)[0] || uyan[0];
}

/* ── GÜNLÜK TOHUM ────────────────────────────────────────────────────────
   Ay boyunca veri değişmediği için senaryo da sabit kalıyor; her girişte AYNI
   cümleleri görmek tekrara düşürürdü (Gökşin'in tespiti). Okuyucu Falı'ndaki
   desenin aynısı (index.html ~8327): tohum GÜNLÜK. Aynı gün içinde yenileyince
   değişmiyor — falın kodundaki gerekçe burada da geçerli: "'donmuş fal'ı
   çözerken 'sebepsiz değişen fal' üretmeyelim." Ertesi gün başka cümleler.
   Hem açılış hem sohbet aynı tohumu kullanıyor; ayrı olsalar özet kutusundaki
   cümle ile balondaki cümle birbirini tutmazdı. */
let _hvGunKaydir = 0;   // yalnızca sınama kutusu kullanıyor (bkz. hesapVaktiSinamaKutusu)
function hvTohum(){
  const d=new Date();
  return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate() + _hvGunKaydir;
}
/* Diziyi günün tohumuna göre kaydırarak `kac` eleman verir. Sıra korunuyor,
   yalnızca BAŞLANGIÇ noktası kayıyor — Şeytan cümleleri "Arsızım" kademesi
   olduğu için sıraları bozulmamalı (3. aşama). */
function hvDondur(dizi,kac,kaydir){
  const n=dizi.length; if(!n) return [];
  const bas=(hvTohum()+(kaydir||0))%n, c=[];
  for(let i=0;i<Math.min(kac,n);i++) c.push(dizi[(bas+i)%n]);
  return c;
}
/* Günün açılışı. Metin ya da {melek,seytan} sahnesi dönebilir.

   ⚠️ AÇILIŞ HAVUZU CÜMLE BANKASIYLA BİRLEŞTİRİLMEZ. Bir kez denendi
   (2026-09-04) ve geri alındı: açılış cümleleri durumu TARİF eder, banka
   cümleleri laf SOKAR. Açılış cümlesi diyalogun ortasına bir Şeytan sırası
   olarak düşünce düz kalıyor ve birkaçı yan yana gelince aynı şeyi tekrar
   söylüyor. Gökşin: "hep aynı cümleler arka arkaya."
   Açılış tek ve en başta; sonrası bankadan. */
/* Açılış her gün çıkmaz — yalnızca o günkü Şeytan cümlesi bunu istiyorsa.
   Kural Gökşin'in (2026-09-05): "c1 ve c3 zaten kendi açıklamasına sahip,
   ekstra bir açıklama cümlesine gerek yok."
   Hangi cümlenin istediği `gelecek-planlar.md`'de cümlenin yanındaki
   [bağlam] işaretiyle belirtiliyor → bankada `baglamGerek`.

   ⛔ BUNU OTOMATİĞE BAĞLAMAYA ÇALIŞMA. 2026-09-04'te kelime benzerliğine bakan
   bir filtre yazıldı ve işe yaramadı: bir senaryodaki BÜTÜN cümleler zaten aynı
   konuyu anlatıyor ("kısa", "kitap" her cümlede geçiyor), o yüzden filtre ya
   hepsini çakışmış sayıyor ya hiçbirini. "Aynı konu" ile "aynı cümle" ayrımını
   yalnızca insan yapabiliyor; liste elle işaretlendi. */

/* T2'nin Eco sahnesi bir açıklama değil, sahne — cümle kendini açıklasa da
   oynayabilir. Ama tek varyant olduğu için her gün çıkarsa yine "hep aynı
   cümle" olur; 3 günde bir çıkıyor. */
const hvSahneGunuMu = () => hvTohum()%3===0;

function hvAcilisSec(senaryo){
  const havuz=(senaryo && senaryo.baglamlar) || [];
  if(!havuz.length) return null;
  /* +1 kaydırma: açılış ile bankadaki cümle aynı adımda ilerlemesin. Aynı
     tohumla dönerlerse her gün aynı ikili eşleşir ve havuzun genişliği boşa
     gider — 3 açılış × 4 cümle 12 değil 3 kombinasyon verirdi. */
  return hvDondur(havuz,1,1)[0];
}

/* O günkü Şeytan cümlesi. Hem özet kutusu hem sohbet buradan alıyor ki
   kutuda yazan ile balonda çıkan aynı olsun. */
function hvIlkCumle(senaryo){
  const banka=(typeof HV_CUMLELER!=='undefined' && senaryo && HV_CUMLELER[senaryo.id]) || null;
  return (banka && hvDondur(banka.seytan,1,0)[0]) || null;
}
/* O gün açılış oynayacak mı, oynayacaksa hangisi? null = açılış yok, Şeytan
   doğrudan cümlesiyle başlar. */
function hvAcilisiBelirle(senaryo, ilkCumle){
  const a=hvAcilisSec(senaryo);
  if(!a) return null;
  // Sahne = {melek, seytan}. `{sonra}` sahne DEĞİL, sadece geç oynayan açılış.
  if(a && typeof a==='object' && a.melek) return hvSahneGunuMu() ? a : null;
  return (ilkCumle && ilkCumle.baglamGerek) ? a : null;
}
/* Cümlelerdeki `[Kitap adı]` yer tutucusunu gerçek kitapla doldurur.
   Bankada üç cümlede var, hepsi Şeytan'da (gun-30#2, gun-60#1, gun-60#2).

   ⚠️ TÜRKÇE EK TUZAĞI: cümleler önce `[Kitap adı]'nı` biçimindeydi; kitap adı
   yerine konunca "Dune'nı", "11/22/63'nı" gibi bozuk çıkıyordu (ölçüldü,
   2026-09-04). Ek, sesli/sessiz uyumuna ve sayıların okunuşuna bağlı olduğu
   için kitap adına ek EKLENMİYOR — cümleler `[Kitap adı] kitabını` biçimine
   çevrildi, ek artık değişmeyen "kitabını" sözcüğünde. Yeni cümle yazarken
   aynı kurala uy: kitap adının hemen ardına kesme işareti + ek KOYMA. */
function hvKitapDoldur(metin,veri){
  const ad=(veri && veri.enUzunTakilan && veri.enUzunTakilan.kitap &&
            veri.enUzunTakilan.kitap.title) || null;
  return String(metin).split('[Kitap adı]').join(ad ? '“'+ad+'”' : 'o');
}

/* ── ÇİZİM ───────────────────────────────────────────────────────────────
   Eğlence panelinde, Okuyucu Falı'nın altına ekleniyor. */
let _hesapVaktiZorla = null;   // sınama kutusundan seçilen senaryo

function hesapVaktiCiz(){
  const kap = document.getElementById('funContainer');
  if(!kap) return;
  const eski = document.getElementById('hesapVaktiBolum');
  if(eski) eski.remove();
  if(!hesapVaktiAktif()) return;

  const v = hesapVaktiVerisi(viewing||me);
  const secilen = _hesapVaktiZorla
    ? HESAP_VAKTI_SENARYOLARI.find(s=>s.id===_hesapVaktiZorla) || hesapVaktiSenaryo(v)
    : hesapVaktiSenaryo(v);
  /* Önizleme, sohbetin gerçekten oynatacağı ilk repliği göstermeli. Açılış o
     gün çıkmıyorsa Şeytan'ın cümlesi yazılıyor — kutuda "açılış yok" gibi bir
     boşluk görünmesin. */
  const ilkCumle = hvIlkCumle(secilen);
  const acilis = hvAcilisiBelirle(secilen, ilkCumle);
  /* Kutuda ilk duyulan replik yazıyor. `{sonra}` açılışı ikinci sırada
     oynadığı için ilk sırada yine Şeytan'ın cümlesi görünüyor. */
  const baglam = (acilis && acilis.melek) ? '😇 '+acilis.melek+'  →  😈 '+acilis.seytan
    : (acilis && !acilis.sonra) ? hvKitapDoldur(acilis, v)
    : (ilkCumle ? hvKitapDoldur(ilkCumle.metin, v) : '');

  const kutu = (etiket,deger,alt) =>
    `<div style="flex:1;min-width:82px;text-align:center;padding:.5rem .3rem;background:rgba(201,162,39,.08);border:1px solid rgba(201,162,39,.2);border-radius:6px">
       <div style="font-family:'Space Mono',monospace;font-size:1.25rem;color:var(--gold-light)">${deger}</div>
       <div style="font-size:.6rem;letter-spacing:.05em;text-transform:uppercase;color:var(--parchment);opacity:.75">${etiket}</div>
       ${alt?`<div style="font-size:.58rem;opacity:.5;color:var(--parchment)">${alt}</div>`:''}
     </div>`;

  const bolum = document.createElement('div');
  bolum.className = 'stats-section';
  bolum.id = 'hesapVaktiBolum';
  bolum.innerHTML = `
    <div class="stats-acc-header" onclick="hesapVaktiAcKapa()">
      <div class="stats-section-title" style="margin-bottom:0">⚖️ Hesap Vakti</div>
      <span class="acc-arrow open" id="arr-hesap-vakti">▶</span>
    </div>
    <div class="stats-acc-body open" id="body-hesap-vakti" style="padding-top:.5rem">
      <div style="font-family:'Space Mono',monospace;font-size:.62rem;color:var(--gold);opacity:.85;margin-bottom:.6rem;letter-spacing:.03em">
        ${v.ay} ayının hesabı
      </div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.8rem">
        ${kutu('Kitap', v.bitirilen, v.hikaye?('+'+v.hikaye+' hikâye'):'')}
        ${kutu('Sayfa', v.sayfa)}
        ${kutu('Tsundoku', v.tsundoku)}
        ${kutu('Seri', v.seri+' ay', 'en iyi '+v.enIyiSeri)}
      </div>
      <div style="border-left:2px solid var(--gold);padding:.5rem .7rem;background:rgba(0,0,0,.15);border-radius:0 6px 6px 0">
        <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);opacity:.8">Seçilen senaryo</div>
        <div style="font-family:'Playfair Display',serif;font-size:1rem;color:var(--parchment);margin:.2rem 0">
          ${secilen.melekBaslar?'😇':'😈'} ${secilen.ad}
        </div>
        <div style="font-style:italic;font-size:.85rem;color:var(--parchment);opacity:.8">"${baglam}"</div>
      </div>
      <div style="margin-top:.7rem;display:flex;align-items:center;gap:.5rem">
        <button onclick="hesapVaktiTekrar()"
                style="background:transparent;color:var(--gold);border:1px solid rgba(201,162,39,.5);
                       border-radius:6px;padding:.3rem .8rem;font-family:'Space Mono',monospace;
                       font-size:.65rem;cursor:pointer">↻ Tekrar oynat</button>
      </div>
      <div id="hvSohbet"></div>
      ${hesapVaktiSinamaAktif()?hesapVaktiSinamaKutusu(secilen.id):''}
    </div>`;
  kap.appendChild(bolum);
  // Sohbet çizimden hemen sonra kendiliğinden oynuyor.
  hesapVaktiSohbetOynat(secilen.id, v);
}
/* Akordeon açılınca bölümü görünür yap. Sohbet aşağıda başlıyor; kaydırana
   kadar ilk balonlar kaçıyordu (Gökşin, 2026-09-06). Kapatırken kaydırma yok —
   kapatan kişi zaten oradan uzaklaşmak istiyor.
   Küçük gecikme akordeonun açılma animasyonunun bitmesini bekliyor, yoksa
   yükseklik daha değişirken ölçüp yanlış yere kaydırıyor. */
function hesapVaktiAcKapa(){
  toggleSection('hesap-vakti');
  setTimeout(()=>{
    const govde=document.getElementById('body-hesap-vakti');
    const bolum=document.getElementById('hesapVaktiBolum');
    if(!govde || !bolum || !govde.classList || !govde.classList.contains('open')) return;
    if(typeof bolum.scrollIntoView==='function'){
      try{ bolum.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){}
    }
  }, 260);
}

function hesapVaktiTekrar(){
  const v = hesapVaktiVerisi(viewing||me);
  const secilen = _hesapVaktiZorla
    ? HESAP_VAKTI_SENARYOLARI.find(s=>s.id===_hesapVaktiZorla) || hesapVaktiSenaryo(v)
    : hesapVaktiSenaryo(v);
  hesapVaktiSohbetOynat(secilen.id, v);
}

/* Sınama kutusu — 11 senaryonun hepsini elle görebilmek için. `deneme`'nin
   geçen ayı tek bir senaryoya denk geliyor; diğer onu böyle sınanacak.
   Harita ayar şeridinin muadili: iş bitince silinecek. */
function hesapVaktiSinamaKutusu(aktifId){
  const secenekler = HESAP_VAKTI_SENARYOLARI.map((s,i)=>
    `<option value="${s.id}"${s.id===aktifId&&_hesapVaktiZorla?' selected':''}>${i+1}. ${s.ad}</option>`).join('');
  return `
    <div style="margin-top:.8rem;padding-top:.6rem;border-top:1px dashed rgba(201,162,39,.25)">
      <div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--rust);opacity:.9;margin-bottom:.3rem">
        🔧 Sınama — yalnızca test hesabında
      </div>
      <select onchange="hesapVaktiSinamaSec(this.value)"
              style="width:100%;padding:.35rem;background:rgba(0,0,0,.25);color:var(--parchment);border:1px solid rgba(201,162,39,.3);border-radius:4px;font-size:.8rem">
        <option value="">— gerçek veriye göre seç —</option>
        ${secenekler}
      </select>
      <div style="margin-top:.4rem;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <button onclick="hesapVaktiGunAtla(1)"
                style="background:transparent;color:var(--rust);border:1px solid rgba(176,90,52,.5);
                       border-radius:6px;padding:.25rem .7rem;font-family:'Space Mono',monospace;
                       font-size:.62rem;cursor:pointer">📅 ertesi gün</button>
        <button onclick="hesapVaktiGunAtla(0)"
                style="background:transparent;color:var(--parchment);opacity:.7;border:1px solid rgba(201,162,39,.25);
                       border-radius:6px;padding:.25rem .7rem;font-family:'Space Mono',monospace;
                       font-size:.62rem;cursor:pointer">bugüne dön</button>
        <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--parchment);opacity:.6">
          ${_hvGunKaydir?('+'+_hvGunKaydir+' gün'):'bugün'}
        </span>
      </div>
    </div>`;
}
function hesapVaktiSinamaSec(id){ _hesapVaktiZorla = id || null; hesapVaktiCiz(); }
/* Cümle havuzları GÜNLÜK tohumla dönüyor; havuzun tamamını görmek için günlerce
   beklemek gerekirdi. Bu düğme tohumu bir gün ileri atıyor — sınama kutusuyla
   birlikte, iş bitince silinecek. */
function hesapVaktiGunAtla(adim){ _hvGunKaydir = adim ? _hvGunKaydir+adim : 0; hesapVaktiCiz(); }

/* ══════════════════════════════════════════════════════════════════════
   2. AŞAMA — SOHBET MOTORU
   ══════════════════════════════════════════════════════════════════════
   Balonlar, "yazıyor…" animasyonu, kararsız varyant (yazıp silen), sıralama.
   Düğmeler (Utandım/Arsızım) ve trençkot 3. aşamada.

   Stil kendi içinde üretiliyor (bulut geçişindeki `dhBulutStil` deseni) —
   özellik tek dosyada kalsın, index.html'in CSS'i şişmesin.
   Renkler plandan: Şeytan #FCEBEB/#F09595, Melek #E1F5EE/#5DCAA5.
   (Bağlam balonunun kesik çizgili soluk görünümü kaldırıldı — Gökşin
   2026-09-04'te açılışın Şeytan'ın normal cümlesi gibi durmasını istedi.) */

const HV_MELEK_ADET = 2;   // kaç melek cümlesi gösterilsin (plan sayı vermiyor)
// "Arsızım" düğmesinin sırayla açacağı Şeytan cümleleri
let _hvSeytanKalan = [];

/* ── 3. AŞAMA METİNLERİ ───────────────────────────────────────────────────
   Sabit replikler — dönmüyorlar, akışın parçası. Kaynak: gelecek-planlar.md
   → "Buton Sistemi". Cümle bankasına konmadılar çünkü senaryoya bağlı değil,
   her senaryoda aynı. */
const HV_UTANDIM_CEVAP = 'O zaman yapacağını biliyorsun...';
const HV_SOZ_BITTI     = '... Tamam. Bundan sonra diyecek söz bulamadım. Bu bile nadir olur.';
/* [Arsızım] her seferinde trençkota gitmiyor — trençkot beş satırlık SABİT bir
   sahne, her basışta aynısını izlemek tekrara düşürüyordu (Gökşin, 2026-09-05).
   Trençkot günün yarısında açılıyor; diğer günler Şeytan kısa bir laf sokup
   kapatıyor. Gün bazlı, basış bazlı değil — o günkü sohbet kendi içinde
   tutarlı kalsın diye (uygulamanın her yerindeki günlük tohum ilkesi). */
const hvTrenckotGunuMu = () => hvTohum()%2===0;
/* "Her şey mükemmel" senaryosunda [Utandım]/[Arsızım] anlamsız kalıyor —
   Şeytan suçlamıyor, şaşırıyor ("Sen... normalsin. Bu beni rahatsız ediyor.").
   Gökşin fark etti (2026-09-05). Planda bu senaryo için zaten Captcha varmış
   (gelecek-planlar.md → "Captcha Twist"), üreteç onu senaryoya eşleyemediği
   için atlıyordu. Trençkot da buraya uymuyor: "berbat istatistiklerini
   düzeltebilirim" mükemmel istatistikte saçma. */
/* Captcha'nın giriş cümlesi. Planda tek satırdı ve "Her şey mükemmel gidiyor.
   Bir eksiğin olmalı. Cevap ver:" diyordu — o metin captcha'nın İLK replik
   olacağı varsayımıyla yazılmıştı. Akışta üçüncü sıraya düşünce baştan
   söyleneni tekrar eder oldu; açılışın çıkmadığı günlerde bile bankadaki
   "Bir eksiğin olmalı" ile birebir çakışıyordu (Gökşin fark etti, 2026-09-05).
   Yerine kısa ve ilerleten cümleler — üstelik havuz, çünkü bu senaryodaki tek
   sabit satır buydu. */
const HV_CAPTCHA_SORULARI = [
  'Son bir testim var. Cevap ver:',
  'Bir ihtimal kaldı. Cevap ver:'
];
const HV_CAPTCHA_INSAN = [
  'Bu gerçek olamaz. Ne işler çevirdiğini bulacağım.',
  'Ben olsam ben de bu cevabı seçerdim.',
  'İlginç… sistem bunu zaten bekliyordu.',
  'İnandırıcılık testi başarıyla geçildi (şüpheli şekilde).'
];
/* Plandaki tek cümle ikiye bölündü: "Virüs tespit edildi." kendi satırında
   çıkıyor, noktalar ondan sonra tek tek düşüyor, sekans mesajı üçüncü satırda. */
const HV_CAPTCHA_VIRUS = 'Virüs tespit edildi.';
const HV_CAPTCHA_ROBOT = 'Kendi kendini yok etme sekansı başlatıldı.';

const HV_ARSIZ_CEVAP = [
  'Arsızsın demek. En sevdiğim tip.',
  'Hiç utanmıyorsun. Bu bir yetenek. Kötü bir yetenek ama yetenek.',
  'Peki. Ben de arsızım. Anlaşabiliriz.',
  'Utanmayan insana laf yetiştiremem. Pes ediyorum. Bu sefer.',
  'Arsızlık da bir duruştur. Yanlış bir duruş ama duruş.'
];
const HV_TRENCKOT_TEKLIF = 'Psst. 🕵🏻‍♂️ Biliyorsun... istersen berbat istatistiklerini birazcık düzeltebilirim. Hemen şimdi elimin ucunda duruyorlar...';
/* Plandaki tek uzun cümle üçe bölündü: giriş → çalışma animasyonu → HAHAHA.
   Gökşin: "şeytan çalışıyormuş gibi emojiler tek tek görünür, bir şey
   yapıyormuş hissi verir." */
const HV_TRENCKOT_CALISMA = 'Şu devrenin yerini değiştirelim, biraz şuraya kod yazalım...';
const HV_TRENCKOT_EVET  = 'HAHAHA. 😈 Yapacağımı mı sandın? Yapabilirim. Ama istersem.';
const HV_TRENCKOT_HAYIR = 'Utanç verici istatistiklerinle mutluluklar. 🙂';
/* Reddettikten sonra fikir değiştirme şansı (Gökşin, 2026-09-05). İsteğe bağlı
   bir tur: basmazsan diyalog uzamıyor. "Bir kerelikti tatlım" esprisi onun. */
const HV_TRENCKOT_GEC = [
  'O teklif bir kerelikti tatlım. Kaçtı.',
  'Geç kaldın. O tren gitti.',
  'Olmaz. Bir kere reddedildim, şeytanım ama benim de gururum var.'
];
const HV_TRENCKOT_KARARLI = [
  'Hmf. Sağlam duruyorsun. Şimdilik.',
  'Peki. Ama ben buradayım.',
  'Not aldım.'
];
/* Çalışma sahnesi: birkaç emoji arka arkaya, sonra noktalar TEK TEK, sonra bir
   kod satırı... Araların süresi kasten eşit değil — düzenli olursa makine gibi
   duruyor, düzensiz olunca gerçekten uğraşıyormuş gibi.
   `nokta: n` → n tane nokta, biri diğerinin ardından (Gökşin, 2026-09-05).
   `kod: true` → havuzdan bir kod satırı. Toplam ~4,8 saniye. */
const HV_CALISMA_ADIMLARI = [
  { emoji:['🔌','🪚','⚙️'], sure:210 },
  { nokta:3,                sure:170 },
  { kod:true,               sure:260 },   // parçalar kendi beklemesini yapıyor
  { emoji:['⚒️','🪛'],      sure:260 },
  { nokta:3,                sure:170 },
  { kod:true,               sure:300 },
  { emoji:['🖥️','💾'],      sure:210 },
  { nokta:3,                sure:190 }
];
/* Şeytan'ın "tamir" ederken yazdığı satırlar. Kod okuyan biri bakarsa espriyi
   görsün diye seçildi: hepsi vicdanı susturmakla ya da veriyi kayırmakla ilgili
   (Gökşin'in isteği, 2026-09-05). Her oynatışta havuzdan ikisi çıkıyor. */
/* Her satır PARÇALARA bölünmüş: harf harf değil, anlamlı öbekler halinde
   sırayla beliriyor (Gökşin, 2026-09-05). Bölme yeri rastgele değil — ilk
   parça kurulum, son parça espri. Yeni satır eklerken aynı mantığı koru. */
const HV_KOD_PARCA_SURE = 360;
const HV_KOD_SATIRLARI = [
  ['if (utanç > 0)',        ' utanç = 0;'],
  ['catch (vicdan)',        ' { /* yok say */ }'],
  ['kitaplar.forEach(k =>', ' k.bitti = true);'],
  ['rozetler.push(',        '"hak edilmedi"', ');'],
  ['seri.uzunluk =',        ' Number.MAX_SAFE_INTEGER;'],
  ['DELETE FROM tsundoku',  ' WHERE utanç > 0;'],
  ['git commit -m',         ' "hiçbir şey yapmadım"'],
  ['okuma.hızı *= 10;',     ' // kimse bakmaz']
];

/* Melek'in kapanış düğmeleri. İki düğme AYNI şeyi söylemesin diye ikisinin
   sonucu farklı: ilki Melek'le kapanıyor, ikincisinde Şeytan'ın adı geçtiği
   için Şeytan homurdanarak çekip gidiyor (Gökşin'in fikri, 2026-09-05). */
const HV_MELEK_TESEKKUR = [
  'Rica ederim.',
  'Ne demek. Ben buradayım.',
  'Sen kendine teşekkür et, okuyan sensin.',
  'Bir şey yapmadım ki, sadece doğruyu söyledim.'
];
const HV_MELEK_SOZ = [
  'Doğru karar. O zaten kendi sözüne bile inanmıyor.',
  'Sana inanıyorum. Bunu unutma.',
  'Kendine güven. Ben zaten güveniyorum.',
  'Birinin senin tarafında olması gerekiyordu. Ben oldum.'
];
const hvRastgele = d => d[Math.floor(Math.random()*d.length)];

/* ── PSST SERİSİ ──────────────────────────────────────────────────────────
   Veriden BAĞIMSIZ. Sohbet bitince belirli bir ihtimalle Şeytan köşeden çıkıp
   teklif sunuyor. Oran Gökşin'in kararı (2026-09-05): ~10 girişte 1 —
   "yeterince nadir ki karşına çıkınca gülersin, ama ayda birkaç kez görürsün."
   Cümleler plandan (gelecek-planlar.md → "Psst Serisi"). */
const HV_PSST_ORAN = 0.1;
const HV_PSST = [
  'Psst. 🕵🏻‍♂️ Sana bir rozet verebilirim. Kimse görmez. Yemin ederim. Şeytan sözü. 😈🤚🏻',
  'Psst. 🕵🏻‍♂️ Okuma geçmişine birkaç kitap ekleyebilirim. Hizmet bedava. İlk seferlik. Maksat ayağın alışsın.',
  'Psst. 🕵🏻‍♂️ Aylık ortalamanı yükseltmemi ister misin? Fiyatlarım uygun. İlk müşterime indirim yapıyorum. Sen ilksin. Bu uygulamada başka dolandırıcı yok. 😈',
  'Psst. 🕵🏻‍♂️ Hiç okumadığın kitapları "okudum" olarak işaretleyebilirim. Referanslarım mevcut. İsim vermiyorum. Onlar da vermemi istemiyor.'
];
/* Şeytan "ben gidiyorum" deyip çekildikten SONRA Psst çıkarsa, önce döndüğünü
   kabul etsin — yoksa kendi çıkışını bozuyor ve iki balonu arka arkaya geliyor
   (Gökşin yakaladı, 2026-09-05). Araya uzun bir sessizlik ve tereddütlü yazma
   animasyonu giriyor: gitti → duraksadı → geri geldi. */
const HV_PSST_DONUS = [
  '...Gitmiştim. Döndüm.',
  '...Bir şey unutmuşum.',
  '...Aslında dur bir dakika.'
];
/* ⚠️ TASLAK — planda Psst tekliflerine verilecek cevaplar yazılı değildi,
   bunları ben yazdım. Gökşin beğenmezse değişecek. */
const HV_PSST_EVET  = 'Ooo, demek öyle. 😈 Not aldım. Bunu unutmayacağım. Bu arada hiçbir şey yapmadım — sadece ne biçim bir insan olduğunu öğrenmek istedim.';
const HV_PSST_HAYIR = 'Peki peki. Teklifim masada duruyor. Acele etme, ben sabırlıyım.';

function hvStil(){
  if(document.getElementById('hvStil')) return;
  const s=document.createElement('style');
  s.id='hvStil';
  s.textContent=`
    #hvSohbet{display:flex;flex-direction:column;gap:.45rem;margin-top:.2rem}
    /* Yeni balon ekranın ALT KENARINA yapışmasın, biraz yukarıda dursun.
       İki parça birlikte çalışıyor (Gökşin, 2026-09-06):
       • scroll-margin-bottom → kaydırma balonun altında boşluk bırakarak duruyor
       • .oynuyor padding → Hesap Vakti sayfanın SON bölümü, altında kaydırılacak
         yer yok; o boşluğu sohbet sürerken biz açıyoruz, bitince kapatıyoruz. */
    #hvSohbet.oynuyor{padding-bottom:32vh}
    .hv-satir,.hv-dugmeler{scroll-margin-bottom:26vh}
    .hv-satir{display:flex;gap:.5rem;align-items:flex-end;max-width:100%}
    .hv-satir.sag{justify-content:flex-end}
    .hv-yuz{font-size:1.1rem;line-height:1;flex:none;padding-bottom:.25rem}
    .hv-balon{padding:.5rem .7rem;border-radius:12px;font-family:'Crimson Pro',serif;
      font-size:.92rem;line-height:1.45;max-width:82%;
      opacity:0;transform:translateY(8px);animation:hvGel .35s ease forwards}
    @keyframes hvGel{to{opacity:1;transform:none}}
    .hv-seytan{background:#FCEBEB;border:1px solid #F09595;color:#4a1d1d;border-bottom-left-radius:3px}
    .hv-melek {background:#E1F5EE;border:1px solid #5DCAA5;color:#14402f;border-bottom-left-radius:3px}
    .hv-ayrac{display:flex;align-items:center;gap:.5rem;margin:.35rem 0;
      font-family:'Space Mono',monospace;font-size:.62rem;letter-spacing:.05em;
      color:var(--parchment);opacity:.55}
    .hv-ayrac::before,.hv-ayrac::after{content:'';flex:1;height:1px;background:rgba(201,162,39,.25)}
    .hv-yaziyor{display:inline-flex;gap:3px;padding:.55rem .7rem;border-radius:12px;
      transition:opacity .18s ease}
    /* "Yazıp siliyor" halinde YALNIZCA baloncuk sönüyor; avatar sabit kalıyor.
       Eskiden satırın tamamı soluyordu, Şeytan'ın yüzü de yanıp sönüyordu —
       WhatsApp/Telegram'da avatar hiç kıpırdamaz (Gökşin, 2026-09-05). */
    .hv-satir.hv-sil .hv-yaziyor{opacity:0}
    /* Kullanıcının seçtiği düğme, sağa yaslı kendi balonuna dönüşüyor. */
    .hv-ben{background:rgba(201,162,39,.16);border:1px solid rgba(201,162,39,.42);
      color:var(--parchment);border-bottom-right-radius:3px}
    /* Trençkot çalışma sahnesi — emojiler tek tek birikiyor. */
    .hv-calisma{font-size:1.15rem;letter-spacing:.1em;min-height:1.5em;word-break:break-word}
    /* ── SESLİ MESAJ ── Şeytan kahkaha attığında sohbete sesli mesaj bırakıyor.
       WhatsApp'taki "ses kaydediyor…" göstergesinin karşılığı. */
    .hv-kaydediyor{font-family:'Space Mono',monospace;font-size:.7rem;
      animation:hvKayitYanip 1s ease-in-out infinite}
    @keyframes hvKayitYanip{0%,100%{opacity:.45}50%{opacity:1}}
    .hv-ses{display:flex;align-items:center;gap:.5rem;min-width:170px}
    .hv-ses-tus{flex:none;width:26px;height:26px;border-radius:50%;border:none;cursor:pointer;
      background:#c0392b;color:#fff;font-size:.75rem;line-height:26px;padding:0}
    .hv-ses-dalga{flex:1;display:flex;align-items:center;gap:2px;height:22px}
    .hv-ses-dalga i{flex:1;background:#c0392b;opacity:.55;border-radius:1px;min-width:2px}
    .hv-ses.calıyor .hv-ses-dalga i{animation:hvDalga .6s ease-in-out infinite}
    @keyframes hvDalga{0%,100%{transform:scaleY(.55);opacity:.5}50%{transform:scaleY(1);opacity:1}}
    .hv-ses-sure{flex:none;font-family:'Space Mono',monospace;font-size:.62rem;opacity:.7}
    /* Yok etme sekansının geri sayımı — iri ve tek aralıklı. */
    .hv-sayim{font-family:'Space Mono',monospace;font-size:1.2rem;letter-spacing:.12em;
      margin-top:.25rem}
    /* Şeytan'ın yazdığı kod satırları — daha küçük, tek aralıklı, soluk. */
    .hv-calisma .hv-kod{font-family:'Space Mono',monospace;font-size:.68rem;
      letter-spacing:0;opacity:.72;margin:.18rem 0;white-space:pre-wrap;
      word-break:break-all;animation:hvGel .2s ease forwards}
    /* ── GLITCH ── "Ben robotum" seçilince tüm ekran bozuluyor.
       Katman pointer-events:none — altındaki hiçbir şeye dokunulamıyor,
       yanlışlıkla tıklama olmuyor. Süre kısa, sonunda her şey normale dönüyor. */
    #hvGlitchKat{position:fixed;inset:0;z-index:99999;pointer-events:none;overflow:hidden;
      animation:hvgTitre .09s steps(2) infinite}
    #hvGlitchKat .hvg-serit{position:absolute;left:-6%;right:-6%;mix-blend-mode:screen}
    #hvGlitchKat .hvg-tarama{position:absolute;inset:0;opacity:.35;
      background:repeating-linear-gradient(to bottom,rgba(0,0,0,.55) 0 2px,transparent 2px 4px)}
    @keyframes hvgTitre{0%{opacity:1}50%{opacity:.82}100%{opacity:1}}
    @keyframes hvgKay{
      0%{transform:translateX(0)}   18%{transform:translateX(-9%)}
      36%{transform:translateX(7%)} 54%{transform:translateX(-4%)}
      72%{transform:translateX(6%)} 100%{transform:translateX(0)}}
    /* Gövde sarsılıyor + renk kayıyor. Kısa tutuldu: transform/filter, sabit
       konumlu öğelerin hizasını geçici olarak kaydırıyor. */
    .hv-glitch-govde{animation:hvgSars .16s steps(2) infinite, hvgRenk .5s steps(3) infinite}
    @keyframes hvgSars{
      0%{transform:translate(0,0)}    25%{transform:translate(-4px,2px)}
      50%{transform:translate(3px,-3px)} 75%{transform:translate(-2px,-1px)}
      100%{transform:translate(0,0)}}
    @keyframes hvgRenk{
      0%{filter:none} 33%{filter:hue-rotate(90deg) saturate(2.2)}
      66%{filter:invert(1) hue-rotate(180deg)} 100%{filter:none}}
    .hv-yaziyor span{width:5px;height:5px;border-radius:50%;animation:hvNokta 1s infinite}
    .hv-yaziyor span:nth-child(2){animation-delay:.15s}
    .hv-yaziyor span:nth-child(3){animation-delay:.3s}
    @keyframes hvNokta{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
    .hv-yz-seytan{background:#FCEBEB;border:1px solid #F09595}
    .hv-yz-seytan span{background:#c0392b}
    .hv-yz-melek{background:#E1F5EE;border:1px solid #5DCAA5}
    .hv-yz-melek span{background:#2e8b62}
    /* ÇAT! — kırılan serinin sesi. Balon sarsılıyor, yazı iri ve aralıklı. */
    .hv-cat{font-family:'Space Mono',monospace;font-weight:700;font-size:1.35rem;
      letter-spacing:.14em;text-align:center;padding:.45rem 1.1rem;
      animation:hvGel .35s ease forwards, hvSars .5s ease .3s}
    @keyframes hvSars{
      0%,100%{transform:translateX(0)}
      15%{transform:translateX(-5px) rotate(-2deg)}
      35%{transform:translateX(4px) rotate(2deg)}
      55%{transform:translateX(-3px) rotate(-1deg)}
      75%{transform:translateX(2px)}}
    /* Cevap düğmeleri — sohbet burada durup kullanıcıyı bekliyor. */
    .hv-dugmeler{display:flex;gap:.4rem;flex-wrap:wrap;margin:.15rem 0 .1rem 1.6rem;
      animation:hvGel .3s ease forwards;opacity:0}
    .hv-dugme{background:transparent;border-radius:14px;padding:.3rem .8rem;cursor:pointer;
      font-family:'Space Mono',monospace;font-size:.68rem;line-height:1.3;
      border:1px solid rgba(201,162,39,.45);color:var(--parchment)}
    .hv-dugme:hover{background:rgba(201,162,39,.14)}
    .hv-dugme.seytan{border-color:#F09595;color:#F0AFAF}
    .hv-dugme.seytan:hover{background:rgba(240,149,149,.14)}
    .hv-dugme.melek{border-color:#5DCAA5;color:#8FDCC0}
    .hv-dugme.melek:hover{background:rgba(93,202,165,.14)}
    /* Uyanan Şeytan'ın yüzü — balon yok, sadece yüz. Her emoji öncekinin
       yerine geçiyor: tek bir yüz değişiyormuş gibi görünsün. */
    .hv-cat-yuz{font-size:2.4rem;line-height:1.1;padding:.1rem .2rem;
      animation:hvYuzGel .22s ease}
    @keyframes hvYuzGel{
      0%{opacity:.35;transform:scale(.78)}
      60%{transform:scale(1.12)}
      100%{opacity:1;transform:scale(1)}}
  `;
  document.head.appendChild(s);
}

const hvBekle = ms => new Promise(r=>setTimeout(r,ms));

/* Sohbet aşağı doğru büyüdüğü için yeni balonlar ekranın altında kalıyordu ve
   Gökşin elle kaydırana kadar animasyonun bir kısmını kaçırıyordu (2026-09-06).
   `block:'nearest'` bilerek seçildi: balon ZATEN görünüyorsa sayfa hiç
   kıpırdamıyor, yalnızca dışarı taşınca en az kadarıyla kaydırıyor. */
function hvEkle(kap, dugum){
  kap.appendChild(dugum);
  if(dugum && typeof dugum.scrollIntoView==='function'){
    try{ dugum.scrollIntoView({behavior:'smooth', block:'nearest'}); }catch(e){}
  }
  return dugum;
}
/* Bekleme süresi cümle uzunluğuna göre — kısa cümleden sonra kısa, uzun
   cümleden sonra uzun. Plandaki "organik his" isteği bu. */
const hvSure = m => Math.min(2200, 550 + m.length*14);

function hvSatir(kap, kim, sinif, icerik){
  const d=document.createElement('div');
  d.className='hv-satir';
  d.innerHTML=`<span class="hv-yuz">${kim}</span><div class="${sinif}">${icerik}</div>`;
  hvEkle(kap, d);
  return d;
}

async function hvYaziyor(kap, kim, kararsiz){
  const yuz = kim==='melek'?'😇':'😈';
  const sinif = kim==='melek'?'hv-yz-melek':'hv-yz-seytan';
  const el = hvSatir(kap, yuz, 'hv-yaziyor '+sinif, '<span></span><span></span><span></span>');
  /* Kararsız: yazıyor → siliyor → yazıyor → siliyor → yazıyor. Üç tur
     görünür/görünmez yapılarak veriliyor; plandaki "dramatik" cümleler için. */
  if(kararsiz){
    // Sadece baloncuk sönüp yanıyor — avatar yerinde duruyor (bkz. .hv-sil)
    for(let i=0;i<2;i++){ await hvBekle(700); el.className='hv-satir hv-sil';
                          await hvBekle(350); el.className='hv-satir'; }
    await hvBekle(800);
  } else {
    await hvBekle(700);
  }
  el.remove();
}

async function hvBalon(kap, kim, metin, sinif){
  const yuz = kim==='melek'?'😇':'😈';
  hvSatir(kap, yuz, sinif||(kim==='melek'?'hv-balon hv-melek':'hv-balon hv-seytan'), escapeHtml(metin));
  await hvBekle(hvSure(metin));
}

/* ── CEVAP DÜĞMELERİ ──────────────────────────────────────────────────────
   Sohbet 3. aşamada kendi başına akıp bitmiyor; kullanıcının cevabını
   bekliyor. Söz verilen değeri döndüren bir promise — tıklanınca çözülüyor.
   Panel yeniden çizilirse düğmeler DOM'dan gidiyor ve promise askıda kalıyor;
   zararsız, çünkü o turun kabı da siliniyor. */
function hvSor(kap, secenekler){
  return new Promise(coz=>{
    const kutu=document.createElement('div');
    kutu.className='hv-dugmeler';
    secenekler.forEach(s=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='hv-dugme'+(s.renk?' '+s.renk:'');
      b.textContent=s.etiket;
      b.onclick=()=>{ kutu.remove(); hvBenimBalonum(kap,s.etiket); coz(s.deger); };
      kutu.appendChild(b);
    });
    hvEkle(kap, kutu);
  });
}

/* Seçilen düğme, sohbete kullanıcının kendi repliği olarak giriyor: sağa
   yaslı balon, yanında kullanıcının avatarı (Gökşin'in isteği, 2026-09-05).
   Avatar `avatarHtml` ile — fotoğraf yüklediyse fotoğraf, yoksa emoji. */
/* Kullanıcının avatarı 😈/😇 emojilerinden büyük: fotoğraf yüklenmişse
   1.15rem'de neredeyse seçilmiyordu (Gökşin, 2026-09-06). Emoji o boyutta
   okunuyor çünkü şekli basit, fotoğraf okunmuyor. */
const HV_BEN_AVATAR_BOY = '1.6rem';

function hvBenimBalonum(kap, metin){
  const kisi=(typeof db!=='undefined' && db.users && db.users[me]) || {};
  const av=(typeof avatarHtml==='function')
    ? avatarHtml(kisi.avatar||'📚',HV_BEN_AVATAR_BOY)
    : '<span style="font-size:1.15rem;line-height:1">'+(kisi.avatar||'📚')+'</span>';
  const d=document.createElement('div');
  d.className='hv-satir sag';
  // Avatar SAĞDA: balon önce, yüz sonra.
  d.innerHTML='<div class="hv-balon hv-ben">'+escapeHtml(metin)+'</div>'+
              '<span class="hv-yuz">'+av+'</span>';
  hvEkle(kap, d);
}

/* Şeytan çalışıyormuş gibi: emojiler tek tek birikiyor, aralara bekleyiş
   noktaları giriyor. Hepsi TEK balonun içinde büyüyor. */
async function hvCalismaSahnesi(kap){
  const azHareket = typeof window!=='undefined' && window.matchMedia &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const satir=document.createElement('div');
  satir.className='hv-satir';
  const yuz=document.createElement('span'); yuz.className='hv-yuz'; yuz.textContent='😈';
  const balon=document.createElement('div'); balon.className='hv-balon hv-seytan hv-calisma';
  satir.appendChild(yuz); satir.appendChild(balon);
  hvEkle(kap, satir);

  /* Kod satırları HER OYNATIŞTA rastgele — günlük tohum kullanılmıyor.
     Bunlar diyalog değil, animasyon süsü; günlük tohumla seçilince aynı gün
     her trençkotta aynı ikili çıkıyordu ve sekiz satırlık havuzun çoğu
     görünmeden kalıyordu (Gökşin fark etti, 2026-09-05).
     Günlük tutarlılık kuralı CÜMLELERDE geçerli, burada değil. */
  const karisik=HV_KOD_SATIRLARI.slice().sort(()=>Math.random()-0.5);
  const kodlar=karisik.slice(0,2);
  let kodSira=0, satirEl=null;
  const kodSatiri=async(tekSeferde)=>{
    const d=document.createElement('div');
    d.className='hv-kod';
    balon.appendChild(d);
    satirEl=null;              // sonraki emojiler yeni satırda başlasın
    const parcalar=kodlar[kodSira++ % kodlar.length];
    if(tekSeferde){ d.textContent='› '+parcalar.join(''); return; }
    d.textContent='› ';
    for(const p of parcalar){ d.textContent+=p; await hvBekle(HV_KOD_PARCA_SURE); }
  };
  const yaz=t=>{
    if(!satirEl){ satirEl=document.createElement('div'); balon.appendChild(satirEl); }
    satirEl.textContent+=t;
  };

  if(azHareket){
    for(const adim of HV_CALISMA_ADIMLARI){
      if(adim.kod) await kodSatiri(true);
      else if(adim.nokta) yaz('.'.repeat(adim.nokta));
      else yaz(adim.emoji.join(''));
    }
    await hvBekle(700);
    return;
  }

  for(const adim of HV_CALISMA_ADIMLARI){
    if(adim.kod){ await kodSatiri(); await hvBekle(adim.sure); continue; }
    if(adim.nokta){
      for(let i=0;i<adim.nokta;i++){ yaz('.'); await hvBekle(adim.sure); }
      continue;
    }
    for(const e of adim.emoji){ yaz(e); await hvBekle(adim.sure); }
  }
}

/* ── EKRAN GLITCH'İ ───────────────────────────────────────────────────────
   "Ben robotum" → "kendi kendini yok etme sekansı". Gökşin'in isteği: sadece
   balonda değil, TÜM EKRAN bozulsun (2026-09-05).
   Kurallar: kısa sürsün, hareket duyarlılığı açıksa hiç oynamasın, ve SONUNDA
   HER ŞEY NORMALE DÖNSÜN — gerçekten bir şey bozuldu izlenimi vermesin.
   Bu yüzden temizlik `finally` içinde: arada bir hata olsa bile ekran bozuk
   kalmıyor. */
const HV_GLITCH_SURE = 1200;
async function hvEkranGlitch(){
  if(typeof document==='undefined' || !document.body) return;
  if(typeof window!=='undefined' && window.matchMedia &&
     window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const kat=document.createElement('div');
  kat.id='hvGlitchKat';
  const renkler=['rgba(255,0,80,.45)','rgba(0,255,200,.40)','rgba(255,220,0,.35)','rgba(120,0,255,.40)'];
  renkler.forEach((renk,i)=>{
    const s=document.createElement('div');
    s.className='hvg-serit';
    s.style.cssText='background:'+renk+';top:'+(8+i*23)+'%;height:'+(5+i*3)+'%;'+
                    'animation:hvgKay '+(0.28+i*0.09)+'s steps(3) infinite';
    kat.appendChild(s);
  });
  const tarama=document.createElement('div'); tarama.className='hvg-tarama';
  kat.appendChild(tarama);

  try{
    document.body.appendChild(kat);
    document.body.classList.add('hv-glitch-govde');
    await hvBekle(HV_GLITCH_SURE);
  } finally {
    document.body.classList.remove('hv-glitch-govde');
    kat.remove();
  }
}

/* Captcha — yalnızca "Her şey mükemmel" senaryosunda, utanma düğmelerinin
   yerine. Şeytan seni robot olmakla suçlayacak kadar çaresiz. */
async function hvCaptcha(kap){
  await hvYaziyor(kap,'seytan',false);
  await hvBalon(kap,'seytan',hvDondur(HV_CAPTCHA_SORULARI,1,0)[0]);
  const secim=await hvSor(kap,[
    {etiket:'⬛ Ben robot değilim', deger:'insan'},
    {etiket:'⬛ Ben robotum',       deger:'robot', renk:'seytan'}
  ]);
  await hvYaziyor(kap,'seytan',true);
  if(secim==='insan'){
    await hvBalon(kap,'seytan', hvRastgele(HV_CAPTCHA_INSAN));
    return 'insan';
  }
  await hvYokEtmeSekansi(kap);
  await hvEkranGlitch();
  return 'robot';
}

/* "Ben robotum" → yok etme sekansı. Tek balon içinde satır satır büyüyor:
   uyarı → noktalar tek tek → sekans mesajı → geri sayım → glitch.
   Gökşin'in tarifi (2026-09-05). */
async function hvYokEtmeSekansi(kap){
  const balon=hvBuyuyenBalon(kap,'seytan');
  const satir=sinif=>{ const d=document.createElement('div');
                       if(sinif) d.className=sinif;
                       balon.appendChild(d); return d; };
  if(hvAzHareket()){
    satir().textContent=HV_CAPTCHA_VIRUS+'..';
    satir().textContent=HV_CAPTCHA_ROBOT;
    satir('hv-sayim').textContent='3... 2... 1...';
    await hvBekle(800);
    return;
  }
  satir().textContent=HV_CAPTCHA_VIRUS;
  await hvBekle(650);
  const noktalar=satir();
  for(let i=0;i<3;i++){ noktalar.textContent+='.'; await hvBekle(300); }
  await hvBekle(250);
  satir().textContent=HV_CAPTCHA_ROBOT;
  await hvBekle(850);
  const sayim=satir('hv-sayim');
  for(const s of ['3','2','1']){
    sayim.textContent+=(sayim.textContent?' ':'')+s+'...';
    await hvBekle(680);
  }
  await hvBekle(300);
}

/* Trençkot — [Arsızım] deyince açılıyor. */
async function hvTrenckot(kap){
  await hvYaziyor(kap,'seytan',true);
  await hvBalon(kap,'seytan',HV_TRENCKOT_TEKLIF);
  const secim=await hvSor(kap,[
    {etiket:'Evet, düzelt',        deger:'evet',  renk:'seytan'},
    {etiket:'Hayır, böyle kalsın', deger:'hayir'}
  ]);
  if(secim!=='evet'){
    await hvYaziyor(kap,'seytan',false);
    await hvBalon(kap,'seytan',HV_TRENCKOT_HAYIR);
    // Fikir değiştirme şansı — ama Şeytan teklifi geri almış oluyor.
    const ikinci=await hvSor(kap,[
      {etiket:'Kararlıyım',          deger:'kararli'},
      {etiket:'Fikrimi değiştirdim', deger:'donus', renk:'seytan'}
    ]);
    await hvYaziyor(kap,'seytan', ikinci==='donus');
    await hvBalon(kap,'seytan', ikinci==='donus'
      ? hvRastgele(HV_TRENCKOT_GEC) : hvRastgele(HV_TRENCKOT_KARARLI));
    return;
  }
  await hvYaziyor(kap,'seytan',false);
  await hvBalon(kap,'seytan',HV_TRENCKOT_CALISMA);
  await hvCalismaSahnesi(kap);
  await hvBekle(400);
  await hvBalon(kap,'seytan',HV_TRENCKOT_EVET);
  await hvSesMesaji(kap);   // "HAHAHA" — kahkahanın sesli hali
}

/* Psst — sohbet bittikten sonra, nadiren. Trençkotun küçük kardeşi.
   ⚠️ Trençkot oynadıysa ÇIKMIYOR: ikisi aynı şakanın iki versiyonu ("kandırdım
   seni"), peş peşe gelince ikisi de zayıflıyor (Gökşin canlı denedi,
   2026-09-05). */
async function hvPsst(kap, trenckotOynadi, seytanCekildi){
  if(trenckotOynadi) return;
  if(Math.random()>=HV_PSST_ORAN) return;
  if(seytanCekildi){
    // Uzun sessizlik: gerçekten gitmiş gibi olsun.
    await hvBekle(2200);
    // Tereddüt — yazıp siliyor, sonra yine yazıyor.
    await hvYaziyor(kap,'seytan',true);
    await hvBalon(kap,'seytan',hvRastgele(HV_PSST_DONUS));
    await hvBekle(700);
  } else {
    await hvBekle(900);
  }
  await hvYaziyor(kap,'seytan',true);
  await hvBalon(kap,'seytan',hvRastgele(HV_PSST));
  const secim=await hvSor(kap,[
    {etiket:'Olur, dinliyorum', deger:'evet', renk:'seytan'},
    {etiket:'Yoluna git',       deger:'hayir'}
  ]);
  await hvYaziyor(kap,'seytan',secim==='evet');
  await hvBalon(kap,'seytan', secim==='evet' ? HV_PSST_EVET : HV_PSST_HAYIR);
}

/* ── ÇAT! SAHNESİ ─────────────────────────────────────────────────────────
   Gökşin'in fikri (2026-09-05): "gürültüyü duyunca korkarak uyanan ve ne
   olduğunu anlayan şeytanın yüzü."
   Sıra: ÇAT! balonu → yüz 😴 uyuyor → 😯 irkiliyor → 🤨 ne oldu → 😏 anladı
   → ardından cümle ("Duyduğum ses kırılan serin miydi?").
   Emojiler YAN YANA DİZİLMİYOR, aynı yerde birbirinin yerine geçiyor — tek bir
   yüzün değişmesi gerekiyor, dört ayrı yüz değil.
   Hangi cümlenin bu animasyonu aldığı planda `[çat]` damgasıyla yazılı. */
/* Süreler ms. Gökşin "çok az hızlandıralım" dedi (2026-09-05) — hepsi yaklaşık
   %20 kısaldı, oran korunarak: 😴 en uzun (uykuda), 😯 en kısa (irkilme ani),
   🤨 ve 😏 ortada. Oranı bozmadan tek tek değiştirmek serbest. */
const HV_CAT_YUZLER = [['😴',680],['😯',340],['🤨',500],['😏',640]];
/* Melek'in "kendi kendini yok etme" sonrası tepkisi: şaşırma → sarsılma →
   başı dönme (Gökşin, 2026-09-05). 🫨 yeni bir emoji, eski Windows'ta kutu
   görünebilir; Gökşin biliyor ve yine de istedi — zamanla düzelecek. */
const HV_MELEK_SOK_YUZLER = [['😯',520],['🫨',620],['😵‍💫',900]];

const hvAzHareket = () => typeof window!=='undefined' && window.matchMedia &&
                          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Aynı yerde birbirinin yerine geçen yüzler — dört ayrı yüz değil, değişen
   TEK yüz. Hem Şeytan'ın ÇAT sahnesi hem Melek'in şok tepkisi bunu kullanıyor. */
async function hvYuzDizisi(kap, kim, yuzler, avatarGoster){
  const satir=document.createElement('div');
  satir.className='hv-satir';
  const bosluk=document.createElement('span'); bosluk.className='hv-yuz';
  if(avatarGoster) bosluk.textContent = kim==='melek' ? '😇' : '😈';
  const yuz=document.createElement('div'); yuz.className='hv-cat-yuz';
  satir.appendChild(bosluk); satir.appendChild(yuz);
  hvEkle(kap, satir);

  for(const [emoji,sure] of yuzler){
    yuz.textContent=emoji;
    // Animasyonu yeniden tetikle: sınıf aynı kaldığı için tarayıcı kendiliğinden
    // tekrar oynatmıyor.
    yuz.style.animation='none';
    void yuz.offsetWidth;
    yuz.style.animation='';
    await hvBekle(sure);
  }
}

/* ── SESLİ MESAJ ──────────────────────────────────────────────────────────
   Şeytan kahkaha attıktan sonra sohbete sesli mesaj bırakıyor: önce
   "ses kaydediyor…" yanıp söner, sonra oynatma çubuğu gelir (Gökşin, 2026-09-05).

   Ses KENDİLİĞİNDEN ÇALMIYOR — kullanıcı play'e basıyor. Bu sadece nezaket
   değil: tarayıcılar kullanıcı dokunmadan ses çalmayı zaten engelliyor, bu
   tasarım o engeli baştan aşıyor.

   ⚠️ Ses dosyası henüz yok. Dosya gelene kadar çubuk görünüyor ama basınca bir
   şey olmuyor. Beklenen yer: `sesler/seytan-kahkaha.mp3` (deponun kökünde
   `sesler` klasörü). Lisans: CC0 ya da atıf istemeyen bir kaynak. */
/* ⚠️ BU LİSTEYE YALNIZCA GERÇEKTEN VAR OLAN DOSYALARI YAZ. Olmayan bir dosya
   seçilirse çubuk çıkıyor ama basınca hiçbir şey olmuyor — sessiz bir kusur,
   fark etmesi zor. Yeni ses ekleyince buraya bir satır ekle. */
const HV_SES_DOSYALARI = [
  'sesler/seytan-kahkaha-1.mp3',
  'sesler/seytan-kahkaha-2.mp3',
  'sesler/seytan-kahkaha-3.mp3'
];
/* Aynı sohbette aynı kahkaha iki kez çıkmasın (Gökşin, 2026-09-05): bir
   diyalogda hem S1'in "MUHAHAHAHAA!" cümlesi hem trençkotun "HAHAHA"sı
   çıkabiliyor. Kullanılanlar işaretleniyor, havuz tükenince baştan başlıyor. */
let _hvKullanilanSesler = [];
function hvSesSec(){
  const kalan=HV_SES_DOSYALARI.filter(s=>_hvKullanilanSesler.indexOf(s)<0);
  const havuz=kalan.length?kalan:HV_SES_DOSYALARI;
  const secilen=havuz[Math.floor(Math.random()*havuz.length)];
  _hvKullanilanSesler.push(secilen);
  return secilen;
}
/* Oynatma hızı. 1 = dosyanın kendi hızı, 1.15 = %15 hızlı (Gökşin: "çok az
   hızlandıralım", 2026-09-05). Tarayıcı hızlandırırken PERDEYİ KORUYOR, yani
   ses inceleşip sincap gibi olmuyor — kahkaha aynı kahkaha, sadece daha çevik.
   `preservesPitch` açıkça yazıldı, eski Safari'de varsayılan tersiydi. */
const HV_SES_HIZ = 1.15;
const HV_SES_CUBUKLARI = [40,70,55,95,60,85,45,100,50,75,35,65,90,55,70,45];

async function hvSesMesaji(kap){
  if(hvAzHareket()) return;   // hareket/efekt istemeyene sesli mesaj da açılmıyor
  const satir=hvSatir(kap,'😈','hv-balon hv-seytan hv-kaydediyor','ses kaydediyor…');
  await hvBekle(1500);
  satir.remove();

  /* Ses ÇUBUK KURULURKEN seçiliyor, tıklanınca değil — yoksa oynatılmayan bir
     çubuk havuzdan pay almıyor ve ikinci çubuk aynı sese düşebiliyor. */
  const dosya=hvSesSec();
  const balon=hvBuyuyenBalon(kap,'seytan','hv-ses');
  const tus=document.createElement('button');
  tus.type='button'; tus.className='hv-ses-tus'; tus.textContent='▶';
  const dalga=document.createElement('div'); dalga.className='hv-ses-dalga';
  HV_SES_CUBUKLARI.forEach(y=>{
    const c=document.createElement('i');
    c.style.height=y+'%';
    dalga.appendChild(c);
  });
  const sure=document.createElement('span'); sure.className='hv-ses-sure'; sure.textContent='0:03';
  balon.appendChild(tus); balon.appendChild(dalga); balon.appendChild(sure);

  let ses=null;
  tus.onclick=()=>{
    if(!ses){
      ses=new Audio(dosya);
      ses.playbackRate=HV_SES_HIZ;
      ses.preservesPitch=true; ses.mozPreservesPitch=true; ses.webkitPreservesPitch=true;
      ses.onended=()=>{ tus.textContent='▶'; balon.className=balon.className.replace(' calıyor',''); };
      // Dosya yoksa sessizce eski haline dönsün — kırmızı hata şeridi çıkmasın.
      ses.onerror=()=>{ tus.textContent='▶'; balon.className=balon.className.replace(' calıyor',''); };
    }
    if(ses.paused){
      ses.currentTime=0;
      const s=ses.play();
      if(s && s.catch) s.catch(()=>{});   // tarayıcı reddederse sessiz geç
      tus.textContent='⏸'; balon.className+=' calıyor';
    } else {
      ses.pause(); tus.textContent='▶';
      balon.className=balon.className.replace(' calıyor','');
    }
  };
  await hvBekle(500);
}

/* Büyüyen balon — içeriği adım adım eklenen balonlar için ortak iskelet.
   `hvSatir` innerHTML yazıyor; burada ise aynı düğüme sonradan satır eklemek
   gerekiyor. Çalışma sahnesi ve yok etme sekansı bunu kullanıyor. */
function hvBuyuyenBalon(kap, kim, ekSinif){
  const satir=document.createElement('div'); satir.className='hv-satir';
  const yuz=document.createElement('span'); yuz.className='hv-yuz';
  yuz.textContent = kim==='melek' ? '😇' : '😈';
  const balon=document.createElement('div');
  balon.className='hv-balon '+(kim==='melek'?'hv-melek':'hv-seytan')+(ekSinif?' '+ekSinif:'');
  satir.appendChild(yuz); satir.appendChild(balon);
  hvEkle(kap, satir);
  return balon;
}

async function hvCatSahnesi(kap){
  // Hareket duyarlılığı — alohomora animasyonundaki kuralın aynısı.
  if(hvAzHareket()) return;
  hvSatir(kap,'😈','hv-balon hv-seytan hv-cat','ÇAT!');
  await hvBekle(1100);
  await hvYuzDizisi(kap,'seytan',HV_CAT_YUZLER,false);
}

/* Bir cümle "kararsız" mı — planda ayrıca listelenmiş üç cümle. */
const hvKararsizMi = m => HV_KARARSIZ.some(k => m.indexOf(k.slice(0,18))>-1);
/* Melek cümlesi Şeytan'ı referans gösteriyor mu? Gösteriyorsa Şeytan
   kararsız bir yanıt veriyor: ya susuyor ya sinirli bir cümle. */
const hvSeytanaDeginiyorMu = m => /Şeytan/i.test(m);

async function hesapVaktiSohbetOynat(senaryoId, veri){
  hvStil();
  const kap=document.getElementById('hvSohbet');
  if(!kap) return;
  kap.innerHTML='';
  _hvKullanilanSesler=[];   // her sohbet kendi ses havuzuyla başlıyor
  /* Sohbet sürerken altta boşluk açılıyor ki yeni balonlar ekranın alt
     kenarına yapışmasın. Sonda kapanıyor; arada hata olursa da bir sonraki
     oynatış burada sıfırlıyor. */
  kap.className='oynuyor';
  const banka=(typeof HV_CUMLELER!=='undefined') && HV_CUMLELER[senaryoId];
  if(!banka){ kap.innerHTML='<div style="opacity:.6;font-size:.8rem">Bu senaryo için cümle bulunamadı.</div>'; return; }
  const senaryo=HESAP_VAKTI_SENARYOLARI.find(s=>s.id===senaryoId);
  const melekOnce=!!(senaryo && senaryo.melekBaslar);
  const dolu=m=>hvKitapDoldur(m,veri);
  /* Cümle bankasındaki kayıt {metin, ton}. `ton==='hesitant'` planın sahne
     yönergesi: Şeytan yazıp siliyor, sonra yine yazıyor. Metnin içinden
     ayıklanıyor (bkz. cumle-uret.js) — eskiden "(hesitant)" ekranda çıkıyordu. */
  const hazirla=c=>({ metin:dolu(c.metin), kararsiz:c.ton==='hesitant'||hvKararsizMi(c.metin),
                      baglamGerek:!!c.baglamGerek, efekt:c.efekt||null });
  /* Şeytan'ın bir cümlesini oynat. Cümlede efekt varsa önce o oynuyor. */
  /* `cat` efekti cümleden ÖNCE (sesi duyup uyanıyor), `kahkaha` SONRA
     (kahkahayı attıktan sonra sesli mesaj bırakıyor). */
  const seytanCumlesi=async(c,onek)=>{
    if(c.efekt==='cat') await hvCatSahnesi(kap);
    await hvYaziyor(kap,'seytan',c.kararsiz);
    await hvBalon(kap,'seytan',(onek||'')+c.metin);
    if(c.efekt==='kahkaha') await hvSesMesaji(kap);
  };

  const melekHavuz=banka.melek;

  const melekAdet=HV_MELEK_ADET+(hvTohum()%4===0?1:0);   // 2 ya da 3 — uzunluk her gün aynı olmasın
  const seytanSira=hvDondur(banka.seytan,banka.seytan.length,0).map(hazirla);
  const seytanIlk=seytanSira.length?seytanSira[0]:null;
  _hvSeytanKalan=seytanSira.slice(1);   // "Arsızım" bunları sırayla açacak (3. aşama)

  /* ── AÇILIŞ ──────────────────────────────────────────────────────────────
     Açılış Şeytan'ın NORMAL balonu ve melek-önce senaryolarda da oynuyor
     (Gökşin, 2026-09-04) — böylece Melek asla havadan konuşmaya başlamıyor.
     Ama HER GÜN çıkmıyor: yalnızca o günkü cümle kendini açıklamıyorsa.
     Sahne (T2 — Eco) bu kuralın dışında, kendi gününde oynuyor. */
  const acilis=hvAcilisiBelirle(senaryo, seytanIlk);
  /* `{sonra:'…'}` biçimindeki açılış, Şeytan'ın cümlesinden SONRA oynuyor.
     Gökşin'in isteği (2026-09-05): "Psst! …yarım bıraktım yap!" fısıltıyla
     açılışa daha uygun; "60 gün oldu. Kitap hâlâ yarım." arkadan gelince
     gerekçe gibi duruyor. Kurulum→espri sırası bazı cümlelerde ters çalışıyor. */
  const acilisSonra = !!(acilis && typeof acilis==='object' && acilis.sonra);

  let seytanKonustu=false;
  const acilisiOyna=async()=>{
    if(!acilis) return;
    if(acilis.sonra){
      await hvYaziyor(kap,'seytan',hvKararsizMi(acilis.sonra));
      await hvBalon(kap,'seytan',dolu(acilis.sonra));
    } else if(typeof acilis==='object'){
      // Sahnelenmiş açılış: Melek bir söz söyler, Şeytan yanıtlar (T2 — Eco)
      await hvYaziyor(kap,'melek',false);
      await hvBalon(kap,'melek',dolu(acilis.melek));
      await hvYaziyor(kap,'seytan',false);
      await hvBalon(kap,'seytan',dolu(acilis.seytan));
    } else {
      await hvYaziyor(kap,'seytan',hvKararsizMi(acilis));
      await hvBalon(kap,'seytan',dolu(acilis));
    }
    seytanKonustu=true;
  };
  if(!acilisSonra) await acilisiOyna();
  else seytanKonustu=true;   // Şeytan bu turda konuşacak, melek süzgeci gevşeyebilir

  /* Melek cümlelerinden Şeytan'a atıf yapanlar, Şeytan hiç konuşmadıysa elenir
     (plan incelemesi md.1). Açılış artık her gün çıkmadığı için bu süzgeç
     gerçekten iş görüyor: melek-önce senaryoda açılış yoksa Melek ilk konuşan
     olur ve "Şeytan şöyle dedi" diyemez. Havuz boşalırsa süzgeç uygulanmıyor. */
  const uygunMelek=seytanKonustu ? melekHavuz : melekHavuz.filter(c=>!hvSeytanaDeginiyorMu(c.metin));
  const melekler=hvDondur(uygunMelek.length?uygunMelek:melekHavuz,melekAdet,0).map(hazirla);

  /* `sonuncuSusturr`: son melek cümlesinden sonra Şeytan araya GİRMESİN.
     İki sebebi var (Gökşin, 2026-09-05):
     1) Kapanış düğmeleri hep Melek'in cümlesinin altında çıksın — Şeytan araya
        girince düğmeler onun altına kayıyor ve "Teşekkürler melek" havada kalıyor.
     2) Aynı homurtu havuzu diyalogun sonunda da kullanılıyor ([Şeytan'a kulak
        asmayacağım] cevabında). İki kez homurdanınca çıkış repliği gücünü
        kaybediyor, üstelik aynı cümle iki kez çıkabiliyor. */
  const melekleriOyna=async(sonuncuSustur)=>{
    for(let i=0;i<melekler.length;i++){
      const c=melekler[i], sonuncu=(i===melekler.length-1);
      await hvYaziyor(kap,'melek',c.kararsiz);
      await hvBalon(kap,'melek',c.metin);
      if(sonuncu && sonuncuSustur) continue;
      if(hvSeytanaDeginiyorMu(c.metin) && Math.random()<0.6){
        // Şeytan'ın kararsız yanıtı — rastgele sessiz de kalabilir
        await hvYaziyor(kap,'seytan',true);
        await hvBalon(kap,'seytan',hvRastgele(HV_SEYTAN_SINIRLI));
      }
    }
  };

  /* ── ŞEYTAN'IN SORUSU — TEK TUR ─────────────────────────────────────────
     [Utandım] → Şeytan tek cümleyle kapatır.
     [Arsızım] → "diyecek söz bulamadım" der ve trençkot açılır.

     ⚠️ Önce merdivenliydi: Arsızım'a bastıkça havuzdaki cümleler sırayla
     açılıyordu. Gökşin denedi ve kaldırttı (2026-09-05): "şeytanın 6 cümlesi
     arka arkaya geldi... daha fazla uzattıkça cümleler tekrarlıyor gibi
     oluyor. çok uzatmayalım." Bir senaryonun bütün cümleleri aynı durumu
     anlattığı için üst üste gelince tekrar hissi veriyor.
     Kalan cümleler ziyan olmuyor — ertesi gün sıra onlara geliyor. */
  let trenckotOynadi=false, melekSarsildi=false, seytanCekildi=false;
  const seytaninSorusu=async()=>{
    // Senaryonun kendi düğme takımı varsa o oynuyor (şimdilik yalnız captcha).
    if(senaryo && senaryo.dugmeler==='captcha'){
      melekSarsildi = (await hvCaptcha(kap))==='robot';
      return;
    }
    const secim=await hvSor(kap,[
      {etiket:'Utandım', deger:'utandim'},
      {etiket:'Arsızım', deger:'arsiz', renk:'seytan'}
    ]);
    if(secim==='utandim'){
      await hvYaziyor(kap,'seytan',false);
      await hvBalon(kap,'seytan',HV_UTANDIM_CEVAP);
      return;
    }
    if(!hvTrenckotGunuMu()){
      await hvYaziyor(kap,'seytan',false);
      await hvBalon(kap,'seytan',hvRastgele(HV_ARSIZ_CEVAP));
      return;
    }
    await hvYaziyor(kap,'seytan',true);
    await hvBalon(kap,'seytan',HV_SOZ_BITTI);
    await hvTrenckot(kap);
    trenckotOynadi=true;
  };

  /* ── MELEK'İN KAPANIŞI ──────────────────────────────────────────────────
     Tek tur, sonra sohbet biter — Melek'te tırmanacak bir pazarlık yok
     (Gökşin: "meleğin düğmesi sohbeti kapatsın, uzatmasın").
     İkinci düğmede Şeytan'ın adı geçtiği için Şeytan homurdanıp çekiliyor;
     burada GARANTİ, çünkü o düğmenin esprisi bu — başka yerlerde ihtimalli. */
  const melegiKapat=async()=>{
    const cevap=await hvSor(kap,[
      {etiket:'Teşekkürler melek 😇',        deger:'tesekkur',  renk:'melek'},
      {etiket:'Şeytan\'a kulak asmayacağım', deger:'kulakasma', renk:'melek'}
    ]);
    await hvYaziyor(kap,'melek',false);
    await hvBalon(kap,'melek', hvRastgele(cevap==='tesekkur'?HV_MELEK_TESEKKUR:HV_MELEK_SOZ));
    if(cevap==='kulakasma'){
      await hvYaziyor(kap,'seytan',true);
      await hvBalon(kap,'seytan', hvRastgele(HV_SEYTAN_SINIRLI));
      seytanCekildi=true;   // Psst çıkarsa önce döndüğünü kabul edecek
    }
  };

  /* ⚠️ KAPANIŞ DÜĞMELERİ HER ZAMAN MELEK'İN CÜMLESİNDEN HEMEN SONRA GELMELİ.
     Melek-önce senaryolarda Melek başta konuşup Şeytan sonda araya girdiği
     için düğmeler Şeytan'ın altında kalıyordu ve "Teşekkürler melek" havada
     duruyordu (Gökşin, 2026-09-05). Çözüm: o senaryolarda Melek'in SON cümlesi
     saklanıp Şeytan'dan sonraya bırakılıyor — son sözü hep Melek söylüyor. */
  if(melekOnce){
    // 😇 Melek savunmaya geçer → 😈 Şeytan araya dalar → 😇 Melek son sözü
    const sonSoz = melekler.length>1 ? melekler.pop() : null;
    // Burada son cümle Şeytan'dan önce geliyor, araya girmesi sorun değil.
    await melekleriOyna(false);
    if(seytanIlk){
      hvSatir(kap,'','hv-ayrac','😈 şeytan araya giriyor');
      await seytanCumlesi(seytanIlk,'Pabucumun gururu! ');
    }
    if(acilisSonra) await acilisiOyna();
    if(seytanIlk) await seytaninSorusu();
    if(sonSoz){
      await hvYaziyor(kap,'melek',sonSoz.kararsiz);
      await hvBalon(kap,'melek',sonSoz.metin);
    }
  } else {
    if(seytanIlk) await seytanCumlesi(seytanIlk);
    if(acilisSonra) await acilisiOyna();
    if(seytanIlk) await seytaninSorusu();
    /* Glitch'ten sonra ayraç yerine Melek'in şok tepkisi geliyor: 😯 🫨 😵‍💫.
       "Melek de eklemek istiyor" demek burada tuhaf olurdu — Melek eklemiyor,
       az önce ekranın bozulmasını izledi (Gökşin, 2026-09-05). */
    if(melekSarsildi) await hvYuzDizisi(kap,'melek',HV_MELEK_SOK_YUZLER,true);
    else hvSatir(kap,'','hv-ayrac','😇 melek de eklemek istiyor');
    await melekleriOyna(true);   // son cümleden sonra Şeytan susuyor
  }
  await melegiKapat();
  await hvPsst(kap, trenckotOynadi, seytanCekildi);
  kap.className='';   // sohbet bitti, alttaki boşluk kalksın
}
