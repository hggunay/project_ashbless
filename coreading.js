// ── BİRLİKTE OKUMA ───────────────────────────────────────────

// ── G15: OTURUM GEÇMİŞİ ARTIK KOMPLE YAZILMIYOR (2026-08-27) ─────────────────
// Eskiden her geçmiş kaydı şöyle ekleniyordu:
//     session.history.push(kayit);
//     fbSet('aa-v4/readingSessions/<id>/history', session.history);
// Yani DİZİNİN TAMAMI bellekteki kopyadan geri yazılıyordu. İki kişi aynı sıralarda
// bir şey yaparsa (biri katılır, öteki milestone geçer) ikinci yazma, birincinin
// satırını hiç görmediği için siliyordu. 2026-08-22'de 102 kitabı yok eden
// "bayat kopya üste yazıyor" hatasının oturum sürümü — K7'nin kapanmamış kardeşi.
//
// Çözüm: her satır KENDİ ANAHTARINA yazılıyor. Bir yazma yalnızca kendi satırına
// dokunabiliyor; başkasının satırını silmesi artık mümkün değil.
// "Sunucudan çek → değiştir → geri yaz" bilerek SEÇİLMEDİ: çekmeyle yazma
// arasındaki boşlukta eklenen satır yine silinirdi (bkz. birlikteOkumaBaginiTemizle).
function gecmisAnahtari(kayit){
  // Zamana göre sıralanabilir olmalı ve Firebase'in yasakladığı karakterleri
  // (. # $ / [ ]) içermemeli.
  const kisi=String(kayit.user||'-').replace(/[.#$/\[\]]/g,'_');
  return 'h'+String(kayit.ts||Date.now())+'_'+kisi;
}
// Geçmiş iki biçimde gelebilir: eski oturumlarda DİZİ, yeni eklemelerde NESNE —
// eski bir oturuma yeni satır eklendiğinde ikisi bir arada da olabilir. Geçmişi
// OKUYAN her yer bu fonksiyondan geçmeli; her zaman zamana göre sıralı düz bir
// dizi döndürür. (Karışık biçimde anahtarları sıralamak yetmez: "10" metin olarak
// "2"den önce gelir — o yüzden sıralama ts'ye göre.)
function gecmisDizi(oturum){
  const h=oturum&&oturum.history;
  if(!h) return [];
  const arr=Array.isArray(h)?h.slice():Object.keys(h).map(k=>h[k]);
  return arr.filter(Boolean).sort((a,b)=>(a.ts||0)-(b.ts||0));
}
// Geçmişe TEK SATIR ekler — hem sunucuya hem yerel kopyaya.
async function gecmiseEkle(sessionId, kayit){
  if(!kayit.ts) kayit.ts=Date.now();
  const anahtar=gecmisAnahtari(kayit);
  const ok=await fbSet('aa-v4/readingSessions/'+sessionId+'/history/'+anahtar, kayit);
  // Yerel kopya da güncellensin ki ekran hemen doğru görünsün.
  const s=db.readingSessions&&db.readingSessions[sessionId];
  if(s){
    if(!s.history) s.history={};
    if(Array.isArray(s.history)) s.history.push(kayit);
    else s.history[anahtar]=kayit;
  }
  return ok;
}

// ── KATILAN / OKUYAN / BİTİREN — ÜÇ AYRI ŞEY (2026-08-30) ────────────────────
// Oturumun en eski kırık noktası, bu üçünün tek şey sanılmasıydı.
//
//   KATILAN  — davete "evet" demiş. Tek başına hiçbir şey ifade etmiyor.
//   OKUYAN   — kitabı oturuma BAĞLAMIŞ. "Ben de bunu sizinle okuyorum" demek.
//   BİTİREN  — okuyup %100'e ulaşmış.
//
// Eski kural "kabul eden HERKES %100" diyordu; katılıp kitabı hiç bağlamayan
// bir kişi oturumu sonsuza kilitliyordu — Algernon'da canlıda yaşandı.
// Yeni kural: tamamlanma OKUYANLARA bakar. Katılıp kitap bağlamamış kişi
// oturuma hiç girmemiş sayılır (Gökşin: "yok gibi kabul edilsin"), sonradan
// bağlarsa o andan itibaren normal kurallara tabi olur.
//
// Ölçüt bilerek "ilerleme girdi mi" DEĞİL, "kitabı bağladı mı": ilerlemeyi şart
// koşarsak kitabı bağlayıp 0. sayfada takılan kişi sonsuza görünmez kalır ve
// 90 gün kuralı — tam da onun için var olan kural — ona hiç işlemez.
function ilerlemeOku(kayit){
  if(!kayit) return {duyurulan:0, suAnki:0};
  // enYuksekDuyurulan/suAnkiIlerleme yeni alanlar; eski oturumlarda yalnızca
  // lastMilestone/pct var. İkisini de anlıyoruz.
  const duyurulan=(kayit.enYuksekDuyurulan!=null)?kayit.enYuksekDuyurulan:(kayit.lastMilestone||0);
  const suAnki=(kayit.suAnkiIlerleme!=null)?kayit.suAnkiIlerleme:((kayit.pct!=null)?kayit.pct:duyurulan);
  return {duyurulan, suAnki};
}
function oturumOkuyanlari(oturum){
  if(!oturum) return [];
  const kat=oturum.participants||{};
  const prog=oturum.progress||{};
  return Object.keys(kat).filter(u=>{
    if(kat[u].status!=='accepted') return false;
    if(kat[u].reading===true) return true;    // kitabını bağlamış
    if(kat[u].reading===false) return false;  // bağlayıp sonra kaldırmış
    return !!prog[u];                         // eski oturum: işaret yok, ilerlemesine bak
  });
}
function oturumdaBitirdiMi(oturum,u){
  const p=oturum&&oturum.progress&&oturum.progress[u];
  return !!p && ilerlemeOku(p).suAnki>=100;
}
function oturumBitirenleri(oturum){
  return oturumOkuyanlari(oturum).filter(u=>oturumdaBitirdiMi(oturum,u));
}
// Oturum tamamlandı mı? En az bir OKUYAN olmalı ve okuyanların hepsi bitirmiş
// olmalı. Kutlama ayrı bir soru: Gökşin'in kuralı "en az 2 kişi tamamladıysa".
function oturumTamamlandiMi(oturum){
  const okuyanlar=oturumOkuyanlari(oturum);
  if(!okuyanlar.length) return false;
  return okuyanlar.every(u=>oturumdaBitirdiMi(oturum,u));
}
// Kişinin oturumda "okuyan" olduğunu işaretler. Tek alana yazıyor.
async function okuyanOlarakIsaretle(sessionId, okuyor){
  if(!me) return;
  const yol='aa-v4/readingSessions/'+sessionId+'/participants/'+me+'/reading';
  await fbSet(yol, !!okuyor);
  const s=db.readingSessions&&db.readingSessions[sessionId];
  if(s&&s.participants&&s.participants[me]) s.participants[me].reading=!!okuyor;
}

// ── 90 GÜN SAATİ (2026-08-30, Gökşin'in tasarımı) ────────────────────────────
// Başlamış bir oturum da sonsuza kadar açık kalmamalı. Saat iki şekilde başlar:
//   • oturumda BİRİ kitabı bitirdiği an (asıl kural — "artık seni bekliyoruz"),
//   • kimse bitirmezse okumanın başladığı andan itibaren (Gökşin'in 1. seçeneği:
//     "hiç kimse bitirmezse de aynı akış çalışsın").
// Her iki durumda da 90 gün, aynı uyarı basamaklarıyla.
//
//   30. gün → "kitap hâlâ bitmedi" + [Devam ediyorum] [Ayrılmak istiyorum]
//   60. gün → aynısı
//   75. gün → "son 2 hafta" (hatırlatma, düğmesiz)
//   90. gün → "kitabınız hâlâ bitmedi, oturumdan ayrıldınız" + ÇIKARILIR
//
// Çıkarılan kişinin OKUMASINA karışılmıyor (Gökşin: "ona biz karışmayız"):
// kitabındaki 👥 bağı kalkar, sayfa ilerlemesi ve durumu aynı kalır — ister
// devam eder, ister yarım bırakır, ister siler.
const SAAT_BASAMAKLARI=[
  {gun:30, tur:'coreading_slow',     dugmeli:true },
  {gun:60, tur:'coreading_slow',     dugmeli:true },
  {gun:75, tur:'coreading_lastcall', dugmeli:false},
  {gun:90, tur:'coreading_removed',  dugmeli:false},
];
const OTURUM_SURESI_MS=90*24*60*60*1000;

// Saatin başladığı an. Öncelik ilk bitirende; yoksa okumanın başlangıcı.
function oturumSaatBaslangici(oturum){
  if(!oturum) return 0;
  const bitisler=gecmisDizi(oturum).filter(h=>h.type==='user_finished').map(h=>h.ts||0).filter(Boolean);
  if(bitisler.length) return Math.min(...bitisler);
  return oturum.startedAt||oturum.createdAt||0;
}
function oturumGecenGun(oturum, simdi){
  const bas=oturumSaatBaslangici(oturum);
  if(!bas) return 0;
  return Math.floor(((simdi||Date.now())-bas)/86400000);
}
function oturumKalanGun(oturum, simdi){
  return Math.max(0, 90-oturumGecenGun(oturum, simdi));
}
// Hâlâ beklenenler: okuyan ama bitirmemiş olanlar.
function oturumBeklenenler(oturum){
  return oturumOkuyanlari(oturum).filter(u=>!oturumdaBitirdiMi(oturum,u));
}

// ── SÜRESİ DOLAN DAVETLER (2026-08-29) ───────────────────────────────────────
// Gökşin'in kararı: 7 gün içinde BAŞLAMAMIŞ bir davet tamamen SİLİNİR.
// "Görünmez ama arkada duruyor" seçeneği bilerek reddedildi — kendi ifadesiyle:
// "görünmezken kimse zaten kullanamıyor, ama silinmiyor da; yine çöp olarak
// birikiyor." Silmeden önce başlatana ve kabul edenlere haber gidiyor, başlatan
// tek tıkla yeniden davet edebiliyor.
//
// ⚠️ YALNIZCA `pending`. Başlamış oturumlara (active / ended / completed) ASLA
// dokunulmaz: "okuyan okumuş, okumayan kalmış", o kayıt tarihtir.
//
// YARIŞ SORUNU VE ÇÖZÜMÜ: süreyi kontrol edecek bir sunucu yok, işi uygulamayı
// açan istemci yapıyor. İki kişi aynı anda açarsa ikisi de silmeye kalkar ve
// bildirim İKİ KEZ gider. "Önce bir kilit alanı yaz, sonra oku" yöntemi bunu
// çözmüyor (ikisi de yazıp ikisi de kendi yazdığını okuyabilir). Onun yerine
// SİLMENİN KENDİSİ yarış oluyor: Firebase REST'in ETag desteğiyle koşullu
// DELETE atılıyor — "bu düğüm ben okuduğumdan beri değişmediyse sil". Yalnızca
// bir istemcinin isteği geçer, ötekine 412 döner ve o çekilir. Bildirimleri
// sadece kazanan gönderir.
// Ayrı bir "kilit" alanı BİLEREK açılmadı: Firebase kuralları tanımadığı yollara
// yazmayı reddediyor (G9b), yeni bir yol icat etmek gereksiz risk olurdu.
const DAVET_SURESI_MS = 7*24*60*60*1000;

function davetSuresiDoldu(oturum, simdi){
  if(!oturum||oturum.status!=='pending') return false;
  const biter=oturum.expiresAt||((oturum.createdAt||0)+DAVET_SURESI_MS);
  return !!biter && biter<=(simdi||Date.now());
}

// Oturumu koşullu siler. Dönen değer:
//   • oturum nesnesi → silme BİZİM üzerimizden geçti, devamı (bağ temizliği +
//     bildirimler) bize ait
//   • null → başkası önce davrandı, oturum başlamış ya da süresi dolmamış;
//     hiçbir şey yapma
async function davetiKapKaldir(sid){
  let etag=null, oturum=null;
  try{
    const g=await fetch(FB_URL+'/aa-v4/readingSessions/'+sid+'.json',{headers:{'X-Firebase-ETag':'true'}});
    if(!g.ok) return null;
    etag=g.headers.get('ETag');
    oturum=await g.json();
  }catch(e){ return null; }
  // ETag alamadıysak koşullu silme kuramayız. O zaman HİÇ silmiyoruz: çift
  // bildirim göndermektense hiç göndermemek yeğ.
  if(!oturum||!etag) return null;
  if(!davetSuresiDoldu(oturum, Date.now())) return null;
  try{
    const d=await fetch(FB_URL+'/aa-v4/readingSessions/'+sid+'.json',{
      method:'DELETE', headers:{'if-match':etag}
    });
    if(!d.ok) return null;   // 412 → başkası araya girdi
  }catch(e){ return null; }
  if(!oturum.id) oturum.id=sid;
  return oturum;
}

async function davetKapandiBildir(oturum){
  const sid=oturum.id;
  const kitap=oturum.bookTitle||'Kitap';
  const baslatan=oturum.initiator;
  const kat=oturum.participants||{};
  const ts=new Date().toISOString();
  if(baslatan){
    // Eylemli bildirim: "Yeniden davet et" / "İptal" düğmeleriyle geliyor.
    // Kitabın bilgisi bildirimin İÇİNDE taşınıyor — oturum silindiği için
    // sonradan bakılabilecek bir yer kalmıyor.
    await pushNotification(baslatan,{
      id:'crx_'+sid,
      type:'coreading_expired',
      sessionId:sid,
      bookTitle:kitap,
      author:oturum.author||'',
      pages:oturum.pages||0,
      ts, seen:false, reaction:'⌛', context:kitap,
    });
  }
  // Kabul edip bir hafta bekleyenler: kart sessizce yok olursa "ben katılmıştım,
  // ne oldu?" diye düşünürler. Reddedenlere ve hiç cevap vermeyenlere gitmiyor.
  const baslatanAdi=(db.users[baslatan]||{}).displayName||baslatan;
  for(const u of Object.keys(kat)){
    if(u===baslatan||kat[u].status!=='accepted') continue;
    await pushNotification(u,{
      id:'crxp_'+sid+'_'+u,
      type:'coreading_expired_participant',
      sessionId:sid,
      bookTitle:kitap,
      fromUser:baslatan,
      fromName:baslatanAdi,
      ts, seen:false, reaction:'⌛', context:kitap,
    });
  }
}

// ── 90 GÜN SAATİNİ İŞLET ─────────────────────────────────────────────────────
// Davet süresiyle aynı sorun burada da var: sunucu yok, işi uygulamayı açan
// istemci yapıyor ve iki kişi aynı anda açarsa aynı hatırlatma iki kez gider.
// Çözüm yine ETag'li koşullu yazma, ama bu sefer silme değil bir DAMGA üzerinde:
// `saatDamgasi` alanına "kaçıncı basamağa kadar işlendi" yazılıyor. Damgayı
// yazabilen tek istemci o basamağın bildirimlerini gönderir; ötekinin isteği
// 412 ile döner ve çekilir.
// Damga oturumun İÇİNDE, tek alanda (`saatAsamasi`) — G9b kurallarının tanıdığı
// bir yol, yeni üst düğüm icat edilmiyor.
async function saatAsamasiniKap(sid, yeniAsama){
  let etag=null, mevcut=null;
  try{
    const g=await fetch(FB_URL+'/aa-v4/readingSessions/'+sid+'/saatAsamasi.json',{headers:{'X-Firebase-ETag':'true'}});
    if(!g.ok) return false;
    etag=g.headers.get('ETag');
    mevcut=await g.json();
  }catch(e){ return false; }
  if(!etag) return false;                       // koşullu yazamıyorsak hiç yazma
  if((mevcut||0)>=yeniAsama) return false;      // başkası çoktan işlemiş
  try{
    const p=await fetch(FB_URL+'/aa-v4/readingSessions/'+sid+'/saatAsamasi.json',{
      method:'PUT', headers:{'Content-Type':'application/json','if-match':etag},
      body:JSON.stringify(yeniAsama)
    });
    if(!p.ok) return false;                     // 412 → başkası önce davrandı
  }catch(e){ return false; }
  const s=db.readingSessions&&db.readingSessions[sid];
  if(s) s.saatAsamasi=yeniAsama;
  return true;
}

// Bir kişiyi oturumdan çıkarır. Kitabındaki bağ kalkar; OKUMASINA dokunulmaz.
async function oturumdanCikar(sid, kisi){
  await fbSet('aa-v4/readingSessions/'+sid+'/participants/'+kisi,{status:'removed', removedAt:Date.now()});
  const s=db.readingSessions&&db.readingSessions[sid];
  if(s){ if(!s.participants) s.participants={}; s.participants[kisi]={status:'removed', removedAt:Date.now()}; }
  if(kisi===me){
    (db.books[me]||[]).forEach(b=>{ if(b.coreadingSession===sid) delete b.coreadingSession; });
    await saveDb();
  }else{
    await birlikteOkumaBaginiTemizle(kisi, sid);
  }
  await gecmiseEkle(sid,{type:'removed',user:kisi,userName:(db.users[kisi]||{}).displayName||kisi,ts:Date.now()});
}

async function oturumSaatiniIslet(){
  if(!me||!db.readingSessions) return 0;
  const simdi=Date.now();
  const idler=Object.keys(db.readingSessions)
    .filter(sid=>(db.readingSessions[sid]||{}).status==='active');
  let islenen=0;
  for(const sid of idler){
    let oturum;
    try{ oturum=await fbGet('aa-v4/readingSessions/'+sid); }catch(e){ continue; }
    if(!oturum||oturum.status!=='active') continue;
    const gun=oturumGecenGun(oturum, simdi);
    // Hangi basamakları geçtik? En yükseğini işliyoruz — uygulama uzun süre
    // açılmadıysa aradaki basamaklar toplu geçilmiş olabilir, üst üste dört
    // bildirim göndermenin anlamı yok.
    const gecilen=SAAT_BASAMAKLARI.filter(b=>gun>=b.gun);
    if(!gecilen.length) continue;
    const basamak=gecilen[gecilen.length-1];
    const asamaNo=SAAT_BASAMAKLARI.indexOf(basamak)+1;
    if((oturum.saatAsamasi||0)>=asamaNo) continue;
    const beklenenler=oturumBeklenenler(oturum);
    if(!beklenenler.length){
      // Kimse beklenmiyorsa bu oturum zaten tamamlanmalıydı; saati boşuna
      // ilerletmiyoruz, tamamlanma kontrolüne bırakıyoruz.
      await oturumTamamlanmaKontrolu(sid, oturum);
      continue;
    }
    if(!await saatAsamasiniKap(sid, asamaNo)) continue;   // yarışı başkası kazandı
    islenen++;
    if(basamak.tur!=='coreading_removed'){
      for(const u of beklenenler){
        await pushNotification(u,{
          id:'crs_'+sid+'_'+u+'_'+basamak.gun,
          type:basamak.tur,
          sessionId:sid, bookTitle:oturum.bookTitle,
          kalanGun:Math.max(0,90-basamak.gun),
          ts:new Date().toISOString(), seen:false, reaction:'⏳', context:oturum.bookTitle,
        });
      }
    }else{
      // 90. gün — hâlâ bitirmemiş olanlar çıkarılıyor.
      for(const u of beklenenler){
        await oturumdanCikar(sid,u);
        await pushNotification(u,{
          id:'crr_out_'+sid+'_'+u,
          type:'coreading_removed',
          sessionId:sid, bookTitle:oturum.bookTitle,
          ts:new Date().toISOString(), seen:false, reaction:'⌛', context:oturum.bookTitle,
        });
      }
      // Çıkarma sonrası oturumu yeniden oku ve kapanışa karar ver.
      let sonrasi;
      try{ sonrasi=await fbGet('aa-v4/readingSessions/'+sid); }catch(e){ sonrasi=null; }
      if(sonrasi) await oturumKapanisKarari(sid, sonrasi);
    }
  }
  if(islenen){ updateNotifDot(); renderSafe(); }
  return islenen;
}

// Çıkarmalardan sonra oturum ne olacak?
//   • kalan okuyanların hepsi bitirmişse → tamamlandı (2+ ise kutlama)
//   • geriye tek kişi kaldıysa → "yalnızca siz kaldınız", oturum sonlanır
async function oturumKapanisKarari(sid, oturum){
  const okuyanlar=oturumOkuyanlari(oturum);
  if(okuyanlar.length&&okuyanlar.every(u=>oturumdaBitirdiMi(oturum,u))){
    await oturumTamamlanmaKontrolu(sid, oturum);
    return;
  }
  const kalanlar=Object.keys(oturum.participants||{})
    .filter(u=>oturum.participants[u].status==='accepted');
  if(kalanlar.length<=1){
    const simdi=Date.now();
    await fbSet('aa-v4/readingSessions/'+sid+'/status','ended');
    await fbSet('aa-v4/readingSessions/'+sid+'/endedAt',simdi);
    await gecmiseEkle(sid,{type:'ended_alone',ts:simdi});
    if(db.readingSessions&&db.readingSessions[sid]) db.readingSessions[sid].status='ended';
    for(const u of kalanlar){
      await pushNotification(u,{
        id:'cra_'+sid+'_'+u,
        type:'coreading_alone',
        sessionId:sid, bookTitle:oturum.bookTitle,
        ts:new Date().toISOString(), seen:false, reaction:'⏹', context:oturum.bookTitle,
      });
    }
    // Kitap durumlarına DOKUNULMUYOR (Gökşin: "ona da biz karışmayalım"),
    // yalnızca ölü bağ temizleniyor.
    for(const u of kalanlar){
      if(u===me){
        (db.books[me]||[]).forEach(b=>{ if(b.coreadingSession===sid) delete b.coreadingSession; });
        await saveDb();
      }else{
        await birlikteOkumaBaginiTemizle(u, sid);
      }
    }
  }
}

// "Devam ediyorum" — süreyi UZATMIYOR (90 gün toplam hak), yalnızca kişinin
// haberi olduğunu kaydediyor. Kart bunu "(devam ediyor)" diye gösteriyor.
async function oturumaDevamEdiyorum(sid, bildirimId){
  if(!me) return;
  await fbSet('aa-v4/readingSessions/'+sid+'/participants/'+me+'/devamEdiyor',Date.now());
  const s=db.readingSessions&&db.readingSessions[sid];
  if(s&&s.participants&&s.participants[me]) s.participants[me].devamEdiyor=Date.now();
  if(bildirimId) await davetBildirimiKaldir(bildirimId);
  mesajGoster('Devam ettiğini bildirdin.');
  renderSafe();
}

async function suresiDolanDavetleriKapat(){
  if(!me||!db.readingSessions) return 0;
  const simdi=Date.now();
  const adaylar=Object.keys(db.readingSessions)
    .filter(sid=>davetSuresiDoldu(db.readingSessions[sid], simdi));
  if(!adaylar.length) return 0;
  let kapanan=0;
  for(const sid of adaylar){
    const oturum=await davetiKapKaldir(sid);
    if(!oturum) continue;               // kazanan başkası — yerel kopyaya dokunma
    delete db.readingSessions[sid];
    kapanan++;
    // Bağ temizliği. `pending` bir oturuma normalde kitap bağlanamıyor (seçici
    // yalnızca `active`'te açılıyor), ama veri her zaman beklendiği gibi olmuyor
    // ve öksüz bağ bırakmaktansa boşuna bakmak yeğ.
    for(const u of Object.keys(oturum.participants||{})){
      if(u===me){
        (db.books[me]||[]).forEach(b=>{ if(b.coreadingSession===sid) delete b.coreadingSession; });
      } else {
        await birlikteOkumaBaginiTemizle(u, sid);
      }
    }
    await davetKapandiBildir(oturum);
  }
  if(kapanan){ saveDb(); updateNotifDot(); renderSafe(); }
  return kapanan;
}

// Süresi dolduğu için kapanmış bir daveti yeniden açar. Eski oturum silinmiş
// durumda; bildirimde taşınan kitap bilgisiyle SIFIRDAN yeni bir oturum kuruluyor.
async function davetiYenidenBaslat(bildirimId){
  const n=((db.notifications&&db.notifications[me])||[]).find(x=>String(x.id)===String(bildirimId));
  if(!n){ mesajGoster('Bu bildirim artık yok.','uyari'); return; }
  const sessions=Object.values(db.readingSessions||{});
  const ayni=sessions.find(s=>s.initiator===me&&(s.status==='pending'||s.status==='active')&&
    String(s.bookTitle||'').toLowerCase()===String(n.bookTitle||'').toLowerCase());
  if(ayni){ mesajGoster('Bu kitap için zaten açık bir oturumun var.','uyari'); return; }
  const sessionId='cs_'+Date.now();
  const simdi=Date.now();
  const session={
    id: sessionId, initiator: me,
    bookTitle: n.bookTitle||'', author: n.author||'', pages: n.pages||0,
    status:'pending', createdAt: simdi, expiresAt: simdi+DAVET_SURESI_MS,
    participants: { [me]:{status:'accepted', joinedAt:simdi} },
  };
  const baslangic={type:'started',user:me,ts:simdi};
  session.history={[gecmisAnahtari(baslangic)]:baslangic};
  if(!db.readingSessions) db.readingSessions={};
  db.readingSessions[sessionId]=session;
  const ok=await fbSet('aa-v4/readingSessions/'+sessionId, session);
  if(!ok){ delete db.readingSessions[sessionId]; mesajGoster('Davet gönderilemedi, tekrar dene.','uyari'); return; }
  await davetBildirimiKaldir(bildirimId);
  mesajGoster('“'+session.bookTitle+'” için yeni davet akışa düştü.');
  renderSafe();
}
// Bildirimi listeden çıkarır — "İptal" ve "Yeniden davet et" ikisi de bunu
// kullanıyor: iş bitti, bildirim orada asılı kalmasın.
async function davetBildirimiKaldir(bildirimId){
  if(!db.notifications||!db.notifications[me]) return;
  db.notifications[me]=db.notifications[me].filter(x=>String(x.id)!==String(bildirimId));
  await fbSet('aa-v4/notifications/'+me, db.notifications[me]);
  updateNotifDot();
  renderNotifPanel();
}

async function startCoreadingSession(titleRaw, author){
  if(!me){ mesajGoster('Giriş yapman gerekiyor.','uyari'); return; }
  const sessions=Object.values(db.readingSessions||{});
  const duplicate=sessions.find(s=>
    s.initiator===me &&
    (s.status==='pending'||s.status==='active') &&
    s.bookTitle.toLowerCase()===titleRaw.toLowerCase()
  );
  if(duplicate){ notify('⚠️ Uyarı','Bu kitap için zaten aktif bir oturumun var.'); return; }
  const pages=parseInt(document.getElementById('coreadingPages').value)||0;
  // Sayfa sayısı olmadan oturum açılamaz (2026-08-30). Oturumun sayfa sayısı
  // katılanların kitabına kopyalanıyor; 0 olursa HİÇ KİMSENİN ilerlemesi
  // hesaplanamaz ve oturum 90 gün boyunca kilitli kalır. Bağlama kuralındaki
  // sayfa şartının kaynaktaki karşılığı.
  if(!pages){
    mesajGoster('Birlikte okuma başlatmak için sayfa sayısı gerekiyor — ilerleme onunla hesaplanıyor.','uyari');
    return;
  }
  const sessionId='cs_'+Date.now();
  const session={
    id: sessionId,
    initiator: me,
    bookTitle: titleRaw,
    author: author||'',
    pages: pages,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now()+(7*24*60*60*1000),
    participants: {},
  };
  session.participants[me]={status:'accepted', joinedAt: Date.now()};
  const baslangic={type:'started',user:me,ts:session.createdAt};
  session.history={[gecmisAnahtari(baslangic)]:baslangic};
  try{
    if(!db.readingSessions) db.readingSessions={};
    db.readingSessions[sessionId]=session;
    await fbSet('aa-v4/readingSessions/'+sessionId, session);
    notify('👥 Davet gönderildi!', titleRaw+' için birlikte okuma daveti akışa düştü.');
    // Formu sıfırla
    document.getElementById('bookTitle').value='';
    document.getElementById('bookAuthor').value='';
    document.getElementById('coreadingPages').value='';
    document.querySelectorAll('#readingTimeChips .chip').forEach(c=>c.classList.remove('active'));
    document.querySelector('#readingTimeChips .chip').classList.add('active');
    updateAddFormFields();
    renderSafe();
  }catch(e){
    mesajGoster('Oturum başlatılamadı, tekrar dene.','uyari');
  }
}
async function respondCoreading(sessionId, response){
  if(!me) return;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
  // Tamamlanmış veya sonlandırılmış oturuma katılım engeli
  if(session.status==='completed'||session.status==='ended'||session.status==='cancelled'){
    notify('⚠️ Oturum kapandı', 'Bu birlikte okuma oturumu artık aktif değil.');
    renderSafe();
    return;
  }
  const path='aa-v4/readingSessions/'+sessionId+'/participants/'+me;
  await fbSet(path,{status:response, joinedAt:Date.now()});
  if(!db.readingSessions) db.readingSessions={};
  if(!db.readingSessions[sessionId]) db.readingSessions[sessionId]=session;
  if(!db.readingSessions[sessionId].participants) db.readingSessions[sessionId].participants={};
  db.readingSessions[sessionId].participants[me]={status:response, joinedAt:Date.now()};
  // history ekle (G15: tek satır — dizinin tamamı değil)
  await gecmiseEkle(sessionId,{type:response==='accepted'?'joined':'rejected',user:me,ts:Date.now()});
  if(response==='accepted'){
    notify('👥 Katıldın!', session.bookTitle+' için birlikte okuma oturumuna katıldın.');
    if(session.status==='active') showCoreadingBookPicker(sessionId);
  }
  // Initiator'a bildirim gönder
  const initiator=session.initiator;
  if(initiator&&initiator!==me){
    const myName=(db.users[me]||{}).displayName||me;
    await pushNotification(initiator, {id:'crr_'+sessionId+'_'+me+'_'+Date.now(),type:'coreading_response',sessionId,bookTitle:session.bookTitle,fromUser:me,fromName:myName,response,ts:new Date().toISOString(),seen:false,reaction:response==='accepted'?'✓':'✗',context:session.bookTitle});
  }
  renderSafe();
}
// ── G1: BAŞKASININ KİTAP LİSTESİNE GÜVENLİ DOKUNMA ───────────────────────────
// Bir kullanıcının kitaplarındaki `coreadingSession` bağını temizler.
//
// KURAL: başkasının kitap listesi ASLA komple yazılmaz. Ne bellekten, ne de
// "sunucudan çek → değiştir → geri yaz" ile. İkincisi masum görünüyor ama
// çekmeyle yazma arasında o kişi kitap eklerse yazma onu siler — düzeltmeye
// çalıştığımız hatanın küçük penceresi.
//
// Onun yerine PATCH: tek kitabın tek alanına dokunuyor. En kötü ihtimalle
// (arada dizi kaydıysa) yanlış kitabın kozmetik bir alanını temizler;
// HİÇBİR KOŞULDA kitap silemez.
//
// Bilerek YAPILMAYAN: o kişinin K7 damgasını (`aa-books-ts/<kişi>`) güncellemek.
// Güncelleseydik onun açık sekmesi kendini bayat sayar, bir sonraki kaydı
// reddedilir ve değişikliği hiç okunmayan localStorage yedeğine düşerdi (G10).
// Bizim değişikliğimiz kozmetik, onun kitapları değil. Karşılığında onun sekmesi
// eski etiketi geri yazabilir — o da bir sonraki sayfa açılışında düzelir.
async function birlikteOkumaBaginiTemizle(kisi, sessionId){
  let taze;
  try{ taze=await fbGet('aa-v4/books/'+kisi); }catch(e){ return 0; }
  if(!taze) return 0;
  // Firebase seyrek diziyi nesne olarak döndürebilir; iki biçimi de karşıla.
  const anahtarlar=Array.isArray(taze)?taze.map((_,i)=>i):Object.keys(taze);
  let temizlenen=0;
  for(const k of anahtarlar){
    const kitap=taze[k];
    if(!kitap||kitap.coreadingSession!==sessionId) continue;
    const ok=await fbPatch('aa-v4/books/'+kisi+'/'+k, {coreadingSession:null});
    if(ok) temizlenen++;
  }
  return temizlenen;
}
async function cancelCoreading(sessionId){
  if(!me) return;
  if(!db.readingSessions||!db.readingSessions[sessionId]) return;
  if(db.readingSessions[sessionId].initiator!==me) return;
  db.readingSessions[sessionId].status='cancelled';
  // G15: eskiden burada oturumun TAMAMI bellekten yazılıyordu. Oturum nesnesinin
  // içinde herkesin ilerlemesi ve geçmişi var — bayat bir sekme iptale bastığında
  // diğerlerinin kaydını geri alıyordu. Artık yalnızca değişen alan yazılıyor.
  await fbSet('aa-v4/readingSessions/'+sessionId+'/status','cancelled');
  // NOT: kaydı yerelden SİLMİYORUZ artık — 'cancelled' durumuyla kalsın. Eskiden burada
  // `delete db.readingSessions[sessionId]` yapılıyordu; sonraki herhangi bir saveDb() tüm
  // veritabanını bellekten yazdığı için (K3) oturum Firebase'den de tümüyle siliniyordu,
  // ama katılımcıların kitaplarındaki `coreadingSession` referansı öksüz kalıp
  // "Birlikte Okunuyor" sekmesinde tıklanamayan bir kitap olarak asılı kalıyordu.
  // Bunun yerine, bağlı olan tüm kitaplardaki referansı temizliyoruz.
  //
  // ── G1 (2026-08-24) ────────────────────────────────────────────────────────
  // Burada eskiden şu satır vardı:
  //     if(changed && u!==me) await fbSet('aa-v4/books/'+u, list);
  // `list` sayfa AÇILDIĞINDA yüklenmiş kopyaydı. Oturumu iptal eden kişi,
  // diğer katılımcının TÜM kitap listesini kendi bayat kopyasından yazıyordu —
  // arkadaş o sırada kitap eklediyse siliniyordu. Hata mesajı yok, iptal eden
  // fark etmiyor. 2026-08-22'de 102 kitabı yok eden mekanizmanın aynısı, ama
  // zarar BAŞKASINA gidiyordu.
  // Artık başkasının listesi HİÇBİR KOŞULDA komple yazılmıyor; bkz.
  // birlikteOkumaBaginiTemizle().
  // Yerel kopyayı da güncelle ki ekran hemen doğru görünsün.
  const yereldeBagli=new Set();
  for(const u of Object.keys(db.books||{})){
    (db.books[u]||[]).forEach(b=>{
      if(b.coreadingSession===sessionId){ delete b.coreadingSession; yereldeBagli.add(u); }
    });
  }
  // Kimleri sunucuda temizleyeceğiz: oturumun katılımcıları + yerel kopyada bağlı
  // görünenler. Katılımcı listesi tek başına yetmez sanılabilir ama tersi de doğru:
  // yerel kopya bayat olabileceği için, biz açtıktan SONRA kitap bağlayan bir
  // katılımcı `yereldeBagli` içinde görünmez. İkisinin birleşimi ikisini de kapsıyor.
  const temizlenecek=new Set([
    ...Object.keys(db.readingSessions[sessionId].participants||{}),
    ...yereldeBagli
  ]);
  temizlenecek.delete(me);   // kendi listemiz saveDb() + K7 üzerinden yazılıyor
  for(const u of temizlenecek) await birlikteOkumaBaginiTemizle(u, sessionId);
  saveDb();
  document.getElementById('cancelConfirm')?.remove();
  renderSafe();
}
async function startCoreadingRead(sessionId){
  if(!me) return;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
  if(session.initiator!==me) return;
  const accepted=Object.keys(session.participants||{}).filter(u=>session.participants[u].status==='accepted');
  if(!accepted.length){ notify('⚠️ Uyarı','Henüz kimse katılmadı.'); return; }
  // Oturumu active yap
  // G15: eskiden oturumun TAMAMI bellekten yazılıyordu — Algernon oturumunun
  // açıklanamayan durumunda baş şüpheli buydu. Artık yalnızca değişen alanlar.
  const simdi=Date.now();
  db.readingSessions[sessionId].status='active';
  db.readingSessions[sessionId].startedAt=simdi;
  await fbSet('aa-v4/readingSessions/'+sessionId+'/status','active');
  await fbSet('aa-v4/readingSessions/'+sessionId+'/startedAt',simdi);
  await gecmiseEkle(sessionId,{type:'reading_started',user:me,ts:simdi});
  // Her katılımcıya bildirim gönder
  const others=accepted.filter(u=>u!==me);
  for(const u of others){
    const notifId='cr_'+sessionId+'_'+u+'_'+Date.now();
    const notif={
      id: notifId,
      type: 'coreading_start',
      sessionId: sessionId,
      bookTitle: session.bookTitle,
      author: session.author||'',
      pages: session.pages||0,
      fromUser: me,
      fromName: (db.users[me]||{}).displayName||me,
      ts: new Date().toISOString(),
      seen: false,
	  reaction: '📖',
      context: session.bookTitle,
    };
    await pushNotification(u, notif);
  }
  notify('📖 Okuma başladı!', session.bookTitle+' için birlikte okuma oturumu başladı.');
  renderSafe();
  // Initiator için kitap bağlama
  showCoreadingBookPicker(sessionId);
}
async function acceptCoreadingBook(sessionId, mode){
  if(!me) return;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
  if(mode==='new'){
    // Duplicate kontrolü
    if(!db.books[me]) db.books[me]=[];
    const existing=db.books[me].find(b=>b.coreadingSession===sessionId);
    if(existing){ notify('📖 Zaten eklendi', session.bookTitle+' zaten listenizde.'); return; }
    const newBook={
      id: Date.now()+Math.random(),
      title: session.bookTitle,
      author: session.author||'',
      pages: session.pages||0,
      readingStatus:'reading',
      addedAt: Date.now(),
      coreadingSession: sessionId,
    };
    db.books[me].push(newBook);
    await saveDb();
    await okuyanOlarakIsaretle(sessionId, true);
    notify('📖 Kitap eklendi!', session.bookTitle+' okuyorum listene eklendi.');
    // Bildirim panelini kapat
    const np=document.getElementById('notifPanel');
    if(np) np.style.display='none';
  } else {
    // Mevcut kitap seçimi — modal aç
    showCoreadingBookPicker(sessionId);
    return;
  }
  // Bildirimi güncelle
  if(db.notifications&&db.notifications[me]){
    const n=db.notifications[me].find(n=>n.sessionId===sessionId&&n.type==='coreading_start');
    if(n){ n.responded=true; fbSet('aa-v4/notifications/'+me, db.notifications[me]); }
  }
  await saveDb();
  renderSafe();
}
// Kitap seçiciyi kapatan TEK yol. Fon perdesini ve Escape dinleyicisini de
// temizliyor — biri kalırsa ekranda görünmez bir katman asılı kalır.
function birlikteOkumaSeciciKapat(){
  document.getElementById('coreadingPicker')?.remove();
  document.getElementById('coreadingPickerFon')?.remove();
  document.removeEventListener('keydown',_seciciEscDinle);
}
function _seciciEscDinle(e){ if(e.key==='Escape') birlikteOkumaSeciciKapat(); }

function showCoreadingBookPicker(sessionId){
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
  // Panel kapatılamıyordu (2026-08-27, Gökşin buldu): "İptal" düğmesi kaydırılan
  // alanın en dibinde, ~130 kitabın ALTINDA kalıyordu; dışarı tıklama ve Escape
  // ise hiç yoktu. Oturum sonlandırılsa bile panel ekranda kalıyordu.
  // Artık: fon perdesine tıklama, Escape, başlıktaki ✕ ve alttaki İptal —
  // dördü de kapatıyor. Ayrıca yalnızca LİSTE kayıyor, düğmeler hep görünür.
  birlikteOkumaSeciciKapat();   // açık kalmış bir kopya varsa temizle
  const fon=document.createElement('div');
  fon.id='coreadingPickerFon';
  fon.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:9998';
  fon.onclick=birlikteOkumaSeciciKapat;
  document.body.appendChild(fon);
  document.addEventListener('keydown',_seciciEscDinle);
  const myBooks=(db.books[me]||[]).filter(b=>b.title&&b.readingStatus!=='wishlist');
  const options=myBooks.map(b=>`
    <div style="padding:.5rem .75rem;border:1px solid rgba(201,162,39,.2);border-radius:2px;margin-bottom:.4rem;cursor:pointer;font-family:'Crimson Pro',serif;font-size:.95rem;color:var(--ink)"
      onclick="linkCoreadingBook('${sessionId}',${b.id})">
      ${b.title}${b.author?' — <em>'+b.author+'</em>':''}
    </div>`).join('');
  const panel=document.createElement('div');
  panel.id='coreadingPicker';
  // overflow BİLEREK panelde değil, aşağıdaki liste kutusunda: eskiden panelin
  // tamamı kayıyordu ve İptal düğmesi bütün kitapların altında kalıyordu.
  panel.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--cream);border:1px solid var(--gold);border-radius:4px;padding:1.25rem;z-index:9999;max-height:80vh;display:flex;flex-direction:column;min-width:300px;max-width:90vw';
  panel.dataset.sessionId=sessionId;
  panel.innerHTML=`
    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem">
      <div style="flex:1;font-family:'Playfair Display',serif;font-size:1rem;color:var(--gold)">Hangi kitabı bağlamak istersin?</div>
      <button onclick="birlikteOkumaSeciciKapat()" title="Kapat" style="background:none;border:none;font-size:1.1rem;line-height:1;color:var(--rust);cursor:pointer;padding:.1rem .3rem">✕</button>
    </div>
    <div style="display:flex;gap:.5rem;margin-bottom:.75rem">
      <button class="btn btn-sm" style="background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" onclick="acceptCoreadingBook('${sessionId}','new');birlikteOkumaSeciciKapat()">📖 Yeni kitap olarak ekle</button>
    </div>
    <div style="font-family:'Space Mono',monospace;font-size:.6rem;color:rgba(26,18,8,.4);margin-bottom:.5rem">— ya da listedeki bir kitabı bağla —</div>
    <input type="text" placeholder="Kitap ara..." oninput="filterCoreadingPicker(this.value)" style="width:100%;padding:.5rem .75rem;background:rgba(201,162,39,.08);border:1px solid rgba(201,162,39,.3);border-radius:2px;color:var(--ink);font-family:'Crimson Pro',serif;font-size:.95rem;margin-bottom:.5rem;box-sizing:border-box"/>
    <div id="coreadingPickerList" style="overflow-y:auto;flex:1;min-height:0">${options||'<div style="color:#888;font-size:.85rem">Listende başka kitap yok.</div>'}</div>
    <button class="btn btn-sm" style="margin-top:.75rem;flex:0 0 auto" onclick="birlikteOkumaSeciciKapat()">İptal</button>
  `;
  document.body.appendChild(panel);
}
// ── KİTAP BAĞLAMA KURALI (2026-08-30, 3. tur) ────────────────────────────────
// Gökşin'in kararı, tartışma kapandı: farklı kitap adını ENGELLEME. Gerekçesi
// sağlam — aynı kitap farklı yayınevinde farklı adla çıkabiliyor (Çıplak Güneş /
// Güneşin Tanrıları). Onun yerine iki kural:
//   (1) ad tutmuyorsa ENGELLEME, SOR,
//   (2) sayfa sayısı boşsa BAĞLAMA — sayfa sayısı olmayan kitapta ilerleme
//       hesaplanamıyor (checkCoreadingMilestone sessizce çıkıyor), o yüzden kişi
//       oturumda hiç görünmüyor. Özgür'ün "Ince Memed"i tam olarak buydu:
//       oturuma bağlıydı ama ilerlemesi asla oluşamazdı.
function _adNormal(s){
  return String(s||'').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'');
}
async function linkCoreadingBook(sessionId, bookId, onaylandi){
  if(!me) return;
  const book=(db.books[me]||[]).find(b=>b.id==bookId);
  if(!book) return;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  // (2) Sayfa sayısı şartı — bu KESİN, sorulmuyor. Sayfa sayısı olmadan kişi
  // oturumda görünmez; sessizce kaybolmasındansa baştan engellemek daha iyi.
  if(!book.pages){
    mesajGoster('“'+book.title+'” için sayfa sayısı girilmemiş. Sayfa sayısı olmadan ilerlemen oturumda görünmez — önce kitap bilgisinden sayfa sayısını ekle.','uyari');
    return;
  }
  // (1) Ad tutmuyorsa SOR — engelleme.
  if(!onaylandi && session && _adNormal(book.title)!==_adNormal(session.bookTitle)){
    const liste=document.getElementById('coreadingPickerList');
    if(liste){
      liste.insertAdjacentHTML('afterbegin',
        '<div id="coreadingAdSoru" style="background:rgba(122,90,31,.12);border:1px solid rgba(122,90,31,.4);border-radius:3px;padding:.55rem .7rem;margin-bottom:.5rem;color:var(--ink)">'+
          '<div style="font-family:\'Crimson Pro\',serif;font-size:.9rem;margin-bottom:.45rem">'+
            'Oturumun kitabı <b>'+escapeHtml(session.bookTitle)+'</b>, seçtiğin ise <b>'+escapeHtml(book.title)+'</b>. '+
            'Aynı kitabın başka bir baskısı mı?</div>'+
          '<div style="display:flex;gap:.4rem;flex-wrap:wrap">'+
            '<button class="btn btn-sm" style="background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.4)" onclick="linkCoreadingBook(\''+sessionId+'\','+bookId+',true)">Evet, aynı kitap</button>'+
            '<button class="btn btn-sm" onclick="document.getElementById(\'coreadingAdSoru\')?.remove()">Vazgeç</button>'+
          '</div>'+
        '</div>');
      liste.scrollTop=0;
    }
    return;
  }
  book.coreadingSession=sessionId;
  book.readingStatus='reading';
  if(db.notifications&&db.notifications[me]){
    const n=db.notifications[me].find(n=>n.sessionId===sessionId&&n.type==='coreading_start');
    if(n){ n.responded=true; fbSet('aa-v4/notifications/'+me, db.notifications[me]); }
  }
  birlikteOkumaSeciciKapat();   // fon perdesi de kalksın
  await saveDb();
  // Kitabı bağlamak = oturumda "okuyan" olmak. Tamamlanma ölçütü ve 90 gün
  // kuralı bu işarete bakıyor.
  await okuyanOlarakIsaretle(sessionId, true);
  notify('📖 Kitap bağlandı!', book.title+' birlikte okuma oturumuna bağlandı.');
  renderSafe();
}
function filterCoreadingPicker(query){
  const list=document.getElementById('coreadingPickerList');
  if(!list) return;
  const q=query.toLowerCase().trim();
  const myBooks=(db.books[me]||[]).filter(b=>b.title&&b.readingStatus!=='wishlist');
  const filtered=q?myBooks.filter(b=>b.title.toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q)):myBooks;
  const sessionId=list.closest('#coreadingPicker').dataset.sessionId;
  list.innerHTML=filtered.map(b=>`
    <div style="padding:.5rem .75rem;border:1px solid rgba(201,162,39,.2);border-radius:2px;margin-bottom:.4rem;cursor:pointer;font-family:'Crimson Pro',serif;font-size:.95rem;color:var(--ink)"
      onclick="linkCoreadingBook('${sessionId}',${b.id})">
      ${b.title}${b.author?' — <em>'+b.author+'</em>':''}
    </div>`).join('')||'<div style="color:#888;font-size:.85rem">Sonuç bulunamadı.</div>';
}

function confirmCancelCoreading(btn, sessionId){
  btn.outerHTML=`<span id="cancelConfirm" style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--rust)">Emin misin?
    <button class="btn btn-sm" style="background:rgba(160,82,45,.3);color:var(--rust);border:1px solid rgba(160,82,45,.5)" onclick="cancelCoreading('${sessionId}')">Evet</button>
    <button class="btn btn-sm" onclick="renderSafe()">Hayır</button>
  </span>`;
  setTimeout(()=>{
    const el=document.getElementById('cancelConfirm');
    if(el) renderSafe();
  },5000);
}
function scrollToCoreadingCard(sessionId){
  if(viewing){
    viewing=null;
    notify('👤 Kendi profilin','Kendi profiline döndün.');
  }
  showPanel('feed');
  setTimeout(()=>{
    const el=document.getElementById('coreading_'+sessionId);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
  },300);
}
function confirmLeaveCoreading(btn, sessionId){
  btn.outerHTML=`<span id="leaveConfirm" style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--rust)">Ayrılmak istediğine emin misin?
    <button class="btn btn-sm" style="background:rgba(160,82,45,.3);color:var(--rust);border:1px solid rgba(160,82,45,.5)" onclick="leaveCoreading('${sessionId}')">Evet</button>
    <button class="btn btn-sm" onclick="renderSafe()">Hayır</button>
  </span>`;
  setTimeout(()=>{
    const el=document.getElementById('leaveConfirm');
    if(el) renderSafe();
  },5000);
}

function confirmEndCoreading(sessionId){
  // Inline onay — kart içinde göster
  const btn=document.querySelector(`[onclick="confirmEndCoreading('${sessionId}')"]`);
  if(!btn) return;
  const existing=document.getElementById('endConfirm_'+sessionId);
  if(existing){existing.remove();return;}
  const div=document.createElement('div');
  div.id='endConfirm_'+sessionId;
  div.style.cssText='display:inline-flex;align-items:center;gap:.4rem;margin-left:.4rem';
  div.innerHTML=`<span style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--rust)">Emin misin?</span>
    <button class="btn btn-sm" style="background:rgba(160,82,45,.3);color:var(--rust);font-size:.6rem;padding:.1rem .4rem" onclick="doEndCoreading('${sessionId}')">Evet</button>
    <button class="btn btn-sm" style="font-size:.6rem;padding:.1rem .4rem" onclick="document.getElementById('endConfirm_${sessionId}').remove()">Hayır</button>`;
  btn.parentNode.insertBefore(div,btn.nextSibling);
}
async function doEndCoreading(sessionId){
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
  session.status='ended';
  session.endedAt=Date.now();
  await fbSet('aa-v4/readingSessions/'+sessionId+'/status','ended');
  await fbSet('aa-v4/readingSessions/'+sessionId+'/endedAt',session.endedAt);
  await gecmiseEkle(sessionId,{type:'ended',user:me,ts:session.endedAt});
  // Kitaplardaki `coreadingSession` bağı temizleniyor (2026-08-29).
  // İptal (cancelCoreading) bağları özenle siliyordu, ayrılma (leaveCoreading)
  // kendi kitabını siliyordu — SADECE bitirme bırakıyordu. Bağ ölü olduğu hâlde
  // kitapta asılı kalınca ekranın üç yeri onu üç farklı şekilde yorumluyordu:
  // liste "👥" gösteriyor, modal göstermiyor, sekme etiketi "⏸ Bekliyor" diyordu.
  // "Ben o değilim" kitabındaki tutarsızlığın kaynağı buydu.
  //
  // Oturumun KENDİSİ silinmiyor — okundu, bitti, kaydı kalsın. Silinen yalnızca
  // kitaptaki ölü işaret.
  const bagliKisiler=new Set(Object.keys(session.participants||{}));
  for(const u of Object.keys(db.books||{})){
    if((db.books[u]||[]).some(b=>b&&b.coreadingSession===sessionId)) bagliKisiler.add(u);
  }
  for(const u of bagliKisiler){
    if(u===me){
      (db.books[me]||[]).forEach(b=>{ if(b.coreadingSession===sessionId) delete b.coreadingSession; });
    } else {
      await birlikteOkumaBaginiTemizle(u, sessionId);
    }
  }
  await saveDb();
  notify('⏹ Oturum sonlandırıldı', session.bookTitle+' birlikte okuma oturumu kapatıldı.');
  renderSafe();
}
async function leaveCoreading(sessionId){
  if(!me) return;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
  // KABUK KAYIT ÖNLEME (2026-08-30). Aşağıdaki yazma `participants/<ben>` yoluna
  // DOĞRUDAN gidiyor; oturum bu arada silinmişse Firebase o düğümü YENİDEN
  // YARATIYOR ve geriye yalnızca bir katılımcı dalı kalıyor. 2026-08-22'de
  // akışta "👥 Birlikte Okuyalım / 20687 gün önce / undefined" diye görünen üç
  // kabuk kayıt tam olarak böyle oluşmuştu. Artık yazmadan önce oturumun
  // sunucuda hâlâ durduğu doğrulanıyor.
  let taze=null;
  try{ taze=await fbGet('aa-v4/readingSessions/'+sessionId+'/status'); }catch(e){ taze=null; }
  if(taze===null||taze===undefined){
    delete db.readingSessions[sessionId];
    (db.books[me]||[]).forEach(b=>{ if(b.coreadingSession===sessionId) delete b.coreadingSession; });
    await saveDb();
    mesajGoster('Bu oturum artık yok — kitabındaki bağ kaldırıldı.','uyari');
    renderSafe();
    return;
  }
  const path='aa-v4/readingSessions/'+sessionId+'/participants/'+me;
  await fbSet(path,{status:'left', leftAt:Date.now()});
  if(!db.readingSessions[sessionId].participants) db.readingSessions[sessionId].participants={};
  db.readingSessions[sessionId].participants[me]={status:'left', leftAt:Date.now()};
  // Admin devri — initiator ayrılıyorsa en eski accepted kişi admin olsun
  if(session.initiator===me){
    const others=Object.keys(db.readingSessions[sessionId].participants||{}).filter(u=>u!==me&&db.readingSessions[sessionId].participants[u].status!=='left');
    if(others.length>0){
      db.readingSessions[sessionId].initiator=others[0];
      await fbSet('aa-v4/readingSessions/'+sessionId+'/initiator',others[0]);
    }
  }
  // Kullanıcının kitabındaki coreadingSession bağını kaldır
  const myBook=(db.books[me]||[]).find(b=>b.coreadingSession===sessionId);
  if(myBook) delete myBook.coreadingSession;
  await saveDb();
  // Pending oturumda kimse kalmadıysa oturumu kapat
  if(db.readingSessions[sessionId].status==='pending'||db.readingSessions[sessionId].status==='active'){
    const updatedParticipants=db.readingSessions[sessionId].participants||{};
    const remaining=Object.keys(updatedParticipants).filter(u=>updatedParticipants[u].status!=='left');

    if(remaining.length===0){
      await fbSet('aa-v4/readingSessions/'+sessionId+'/status','ended');
      if(db.readingSessions[sessionId]) db.readingSessions[sessionId].status='ended';
    }
  }
  notify('👋 Ayrıldın', session.bookTitle+' birlikte okuma oturumundan ayrıldın.');
  // Ayrılma sonrası tamamlanma kontrolü — kalan okuyanların hepsi bitirdiyse
  // oturum kapanır. Eskiden buradaki kontrol checkCoreadingMilestone'daki
  // kopyasıydı ve ikisi de eski "kabul eden herkes" ölçütünü kullanıyordu;
  // artık tek yerden geçiyor (2026-08-30).
  if(session.status==='active') await oturumTamamlanmaKontrolu(sessionId);
  else renderSafe();
}

function launchCoreadingConfetti(big=false){
  const count=big?200:80;
  const colors=['#c9a227','#4a6741','#a0522d','#e8d5a3','#2d4a27'];
  const canvas=document.createElement('canvas');
  canvas.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999';
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const particles=Array.from({length:count},()=>({
    x:Math.random()*canvas.width,y:-10,
    w:Math.random()*10+4,h:Math.random()*6+3,
    color:colors[Math.floor(Math.random()*colors.length)],
    rot:Math.random()*360,
    vx:(Math.random()-0.5)*4,
    vy:Math.random()*3+2,
    vr:(Math.random()-0.5)*6
  }));
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.vy+=0.05;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
    });
    frame++;
    if(frame<(big?180:120)) requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();

}
// ── "GERİ AL" ARTIK OTURUMU DA GERİ ALIYOR (2026-08-30, Gökşin sordu) ────────
// Gökşin'in sorusu: "nimet o gün yanlışlıkla bitti yaptığı kitabı Geri Al tuşuyla
// geri alsaydı, birlikte kartındaki yanlış geri alınacak mıydı?"
// ÖLÇÜLDÜ: hayır. `markAsUnread` yalnızca kitabı 'okunuyor'a döndürüyordu;
// oturumdaki %100 kaydına HİÇ dokunmuyordu. Nimet'in kitabı silip yeniden
// kurmak zorunda kalmasının sebebi buydu — geri alma düğmesi vardı ama
// oturumu kapsamıyordu.
//
// Artık kapsıyor. Duyurulmuş kilometre taşı (enYuksekDuyurulan) geri ALINMIYOR —
// o bildirimler gerçekten gitti, insanlar gördü. Geri alınan şey "şu anda
// neredesin" (suAnkiIlerleme): sıfırlanıyor ve kişiden kaldığı sayfayı girmesi
// isteniyor. Geçmişe de bir satır düşüyor ki kart doğruyu anlatsın.
//
// Yalnızca `active` oturumlarda çalışıyor: tamamlanmış bir oturumu geri almak,
// gönderilmiş kutlama bildirimlerini ve konfetiyi geri almaya çalışmak olurdu.
async function birlikteOkumaBitirmeyiGeriAl(sessionId){
  if(!me||!sessionId) return false;
  let taze;
  try{ taze=await fbGet('aa-v4/readingSessions/'+sessionId); }catch(e){ return false; }
  if(!taze||taze.status!=='active') return false;
  const kayit=(taze.progress&&taze.progress[me])||null;
  if(!kayit||ilerlemeOku(kayit).suAnki<100) return false;
  const yeni={...kayit, suAnkiIlerleme:0, pct:0, updatedAt:Date.now()};
  // lastMilestone BİLEREK ellenmiyor: deploy öncesi açılmış bayat bir sekme onu
  // mandal olarak okuyor; sıfırlarsak o sekme geçilmiş eşikleri yeniden duyurur.
  await fbSet('aa-v4/readingSessions/'+sessionId+'/progress/'+me, yeni);
  if(db.readingSessions&&db.readingSessions[sessionId]){
    if(!db.readingSessions[sessionId].progress) db.readingSessions[sessionId].progress={};
    db.readingSessions[sessionId].progress[me]=yeni;
  }
  await gecmiseEkle(sessionId,{type:'user_unfinished',user:me,userName:(db.users[me]||{}).displayName||me,ts:Date.now()});
  mesajGoster('Birlikte okuma oturumundaki “bitirdi” kaydın da geri alındı. Kaldığın sayfayı girebilirsin.');
  renderSafe();
  return true;
}

// ── TAMAMLANMA KONTROLÜ — TEK YER (2026-08-30) ───────────────────────────────
// Eskiden aynı kontrol İKİ yerde ayrı ayrı yazılıydı (checkCoreadingMilestone ve
// leaveCoreading) ve ikisi de "kabul eden herkes %100" diyordu. Tek yere toplandı;
// ölçüt de değişti: artık OKUYANLARA bakıyor (bkz. oturumOkuyanlari).
//
// Kutlama ayrı bir soru — Gökşin'in kuralı: "oturumu en az 2 kişi tamamladıysa
// birlikte okudunuz 🎉". Tek kişi bitirdiyse oturum kapanır ama kutlama olmaz;
// tek başına okumak birlikte okumak değil.
async function oturumTamamlanmaKontrolu(sessionId, hazirTaze){
  let taze=hazirTaze;
  if(!taze){
    try{ taze=await fbGet('aa-v4/readingSessions/'+sessionId); }catch(e){ taze=null; }
  }
  if(!taze) return false;
  if(taze.status!=='active'){ renderSafe(); return false; }
  if(!oturumTamamlandiMi(taze)){ renderSafe(); return false; }
  const bitirenler=oturumBitirenleri(taze);
  const simdi=Date.now();
  await fbSet('aa-v4/readingSessions/'+sessionId+'/status','completed');
  await fbSet('aa-v4/readingSessions/'+sessionId+'/completedAt',simdi);
  await gecmiseEkle(sessionId,{type:'completed',ts:simdi,count:bitirenler.length});
  if(db.readingSessions&&db.readingSessions[sessionId]){
    db.readingSessions[sessionId].status='completed';
    db.readingSessions[sessionId].completedAt=simdi;
  }
  const benimAdim=(db.users[me]||{}).displayName||me;
  const kutlama=bitirenler.length>=2;
  // Bildirim herkese değil, KATILANLARA gidiyor — okumayanlar da oturumun
  // kapandığını bilsin, ama metin bitirenlere göre kuruluyor.
  const katilanlar=Object.keys(taze.participants||{}).filter(u=>taze.participants[u].status==='accepted');
  for(const u of katilanlar){
    await pushNotification(u,{
      id:'crc_'+sessionId+'_'+u,
      type:'coreading_completed',
      sessionId, bookTitle:taze.bookTitle, fromName:benimAdim,
      birlikte:kutlama, kisiSayisi:bitirenler.length,
      ts:new Date().toISOString(), seen:u===me, reaction:kutlama?'🎉':'📖',
      context:taze.bookTitle,
    });
  }
  if(kutlama){
    notify('🎉 Birlikte okudunuz!', taze.bookTitle+' — '+bitirenler.length+' kişi tamamladı!');
    launchCoreadingConfetti(true);
  }else{
    notify('📖 Oturum tamamlandı', taze.bookTitle+' okundu.');
  }
  updateNotifDot();
  renderSafe();
  return true;
}

// ── İLERLEME MİLESTONE ──
async function checkCoreadingMilestone(book){
  if(!book.coreadingSession){ return;}
  const sessionId=book.coreadingSession;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session||session.status!=='active'){ console.warn('checkCoreadingMilestone: sessiz çıkış — session yok veya aktif değil',{sessionId,status:session&&session.status}); return;}
  if(!book.currentPage||!book.pages){ console.warn('checkCoreadingMilestone: sessiz çıkış — currentPage veya pages eksik',{bookId:book.id,currentPage:book.currentPage,pages:book.pages}); return;}
  // ── SAYFA SAYISI KORUMASI (2026-08-30) ───────────────────────────────────
  // Eskiden kitabın `pages` değerinden BÜYÜK bir sayfa girilince yüzde 100'e
  // yuvarlanıyor ve sistem kitabı sormadan bitmiş sayıyordu. Nimet'in Algernon'da
  // yaşadığı zincirin ilk halkası buydu: epub olduğu için sayfayı iki katı girmiş,
  // 208 sayfalık kitapta 200'ü aşınca oturum onu "bitirdi" saymış, geri alamayınca
  // kitabı silip yeniden kurmuş. Artık sayfa sayısını AŞAN bir giriş bitmiş
  // saymıyor: en fazla %99'a kadar sayılıyor ve kullanıcıya sayfa sayısını
  // kontrol etmesi söyleniyor. "Bitirdim" düğmesinden gelen kayıt (_fromFinish)
  // bilinçli bir hareket olduğu için bu korumanın dışında.
  const sayfaAsimi = !book._fromFinish && book.currentPage>book.pages;
  if(sayfaAsimi){
    try{
      mesajGoster(book.pages+' sayfalık kitapta '+book.currentPage+'. sayfa girdin — sayfa sayısı yanlış olabilir. Kitabı bitirdiysen “Bitirdim” düğmesini kullan.','uyari');
    }catch(e){}
  }
  const hamPct=Math.round(book.currentPage/book.pages*100);
  const pct=sayfaAsimi?Math.min(99,hamPct):Math.min(100,hamPct);
  const milestones=[25,50,75,100];
  const reached=milestones.filter(m=>pct>=m);
  if(!session.progress) session.progress={};
  if(!session.progress[me]) session.progress[me]={};
  // ── KİLOMETRE TAŞI İKİYE AYRILDI (2026-08-30) ────────────────────────────
  // Tek alan (`lastMilestone`) iki ayrı soruyu birden cevaplıyordu:
  //   "bunu daha önce DUYURDUK mu?"  → geri gitmemeli (bildirim geri alınamaz)
  //   "bu kişi ŞU ANDA nerede?"      → gerçeği yansıtmalı, inebilmeli
  // İkincisi birincinin kuralına mahkûm olduğu için yanlış girilen bir sayı
  // kalıcı gerçeğe dönüşüyordu. Artık iki alan var:
  //   enYuksekDuyurulan — mandal, asla geri gitmez, yalnızca bildirimleri yönetir
  //   suAnkiIlerleme    — gerçeği takip eder, inebilir; tamamlanma kontrolü bunu kullanır
  // Eski alanlar (lastMilestone/pct) yazılmaya DEVAM ediyor: deploy'dan önce
  // açılmış bayat bir sekme hâlâ onları okuyor olabilir (K7 dersi).
  const {duyurulan:oncekiDuyurulan}=ilerlemeOku(session.progress[me]);
  const yeniDuyurulan=Math.max(oncekiDuyurulan, reached.length?reached[reached.length-1]:0);
  session.progress[me].suAnkiIlerleme=pct;
  session.progress[me].enYuksekDuyurulan=yeniDuyurulan;
  session.progress[me].pct=pct;                       // eski istemciler için
  session.progress[me].lastMilestone=yeniDuyurulan;   // eski istemciler için
  const lastMilestone=yeniDuyurulan;
  const yeniEsikMi = reached.length>0 && reached[reached.length-1]>oncekiDuyurulan;
  if(!yeniEsikMi){
    // Duyurulacak yeni bir eşik yok — ama şu anki ilerleme değişmiş olabilir
    // (geri de gitmiş olabilir), o yüzden kaydı yine de yazıyoruz.
    session.progress[me].updatedAt=Date.now();
    await fbSet('aa-v4/readingSessions/'+sessionId+'/progress/'+me, session.progress[me]);
    // %100'e daha önce ulaşılmış olsa bile tamamlanma kontrolü çalışmalı:
    // son kişi bitirdiğinde oturumun kapanması buna bağlı.
    if(pct>=100) await oturumTamamlanmaKontrolu(sessionId);
    else renderSafe();
    return;
  }
  // Yeni milestone — kaydet ve bildirim gönder
  const msgPool={
    25:['hikâyeye adım attı','ilk çeyreği tamamladı','hikâyenin içine çekilmeye başladı'],
    50:['yolun yarısına ulaştı','kitabın tam ortasına geldi','artık hikâyenin merkezinde'],
    75:['finale yaklaşıyor','son bölümlere geçti','artık son sayfalara yakın'],
    100:['son sayfayı çevirdi','kitabı tamamladı','bu yolculuğun sonuna ulaştı']
  };
  const pool=msgPool[lastMilestone]||[];
  const milestoneMsg=pool[Math.floor(Math.random()*pool.length)]||'';
  session.progress[me].milestoneMsg=milestoneMsg;
  session.progress[me].lastMilestone=lastMilestone;
  session.progress[me].pct=pct;
  session.progress[me].updatedAt=Date.now();
  session.lastActivityAt=Date.now();
  await fbSet('aa-v4/readingSessions/'+sessionId+'/progress/'+me, session.progress[me]);
  await gecmiseEkle(sessionId,{type:'milestone',user:me,ts:session.lastActivityAt,pct:pct,msg:milestoneMsg});
  await fbSet('aa-v4/readingSessions/'+sessionId+'/lastActivityAt', session.lastActivityAt);
  // Tüm katılımcılara bildirim gönder — %100'de ayrıca özel bir "bitirdi" bildirimi
  // gönderileceği için (aşağıda), burada tekrar göndermeyip çift bildirimi önlüyoruz.
  const myName=(db.users[me]||{}).displayName||me;
  if(lastMilestone<100){
    const accepted=Object.keys(session.participants||{}).filter(u=>session.participants[u].status==='accepted'&&u!==me);
    for(const u of accepted){
      const notifId='crm_'+sessionId+'_'+me+'_'+lastMilestone+'_'+Date.now();
      const notif={
        id:notifId,
        type:'coreading_milestone',
        sessionId:sessionId,
        bookTitle:session.bookTitle,
        fromUser:me,
        fromName:myName,
        milestone:lastMilestone,
        milestoneMsg:milestoneMsg,
        pct:pct,
        ts:new Date().toISOString(),
        seen:false,
        reaction:'👥',
        context:session.bookTitle,
      };
      await pushNotification(u, notif);
    }
  }
 await fbSet('aa-v4/readingSessions/'+sessionId+'/progress/'+me, session.progress[me]);
  const msg=session.progress[me].milestoneMsg||'%'+lastMilestone+' ye ulaştı';
  if(lastMilestone===100){
    // Kişisel bildirim + küçük konfeti (finishReading'den gelmiyorsa)
    if(!book._fromFinish){
      notify('✅ Tebrikler!', session.bookTitle+' kitabını bitirdiniz!');
      launchCoreadingConfetti(false);
    }
    // Firebase'den güncel session çek — allDone için doğru veri
    let freshSession=session;
    try{
      const snap=await fetch(FB_URL+'/aa-v4/readingSessions/'+sessionId+'.json');
      const fetched=await snap.json();
      if(fetched) freshSession=fetched;
    }catch(e){}
    // Zaten completed ise tekrar tetiklenme
    if(freshSession.status==='completed'){ renderSafe(); return; }
	// Kişi kitabı bitirdi — geçmişe TEK SATIR ekle (G15)
const finishEntry = {type:'user_finished', user:me, userName:myName, ts:Date.now()};
const alreadyFinished = gecmisDizi(freshSession).some(h=>h.type==='user_finished'&&h.user===me);
if(!alreadyFinished){
  await gecmiseEkle(sessionId, finishEntry);
}
// Diğer katılımcılara bildirim gönder
if(!alreadyFinished){
  const otherParticipants = Object.keys(freshSession.participants||{}).filter(u=>u!==me&&freshSession.participants[u].status==='accepted');
  for(const u of otherParticipants){
    await pushNotification(u, {
      id:'crf_'+sessionId+'_'+me+'_'+Date.now(),
      type:'coreading_finished',
      sessionId,
      bookTitle:freshSession.bookTitle,
      fromName:myName,
      ts:new Date().toISOString(),
      seen:false,
      reaction:'📖',
      context:myName+' "'+freshSession.bookTitle+'" kitabını bitirdi!'
    });
  }
  updateNotifDot();
}
    await oturumTamamlanmaKontrolu(sessionId, freshSession);
  } else {
    // Katılımcılara milestone bildirimi zaten yukarıda (lastMilestone<100 bloğunda) gönderildi —
    // burada tekrar göndermiyoruz (eskiden aynı işi ikinci kez yapmaya çalışan, kapsam dışı
    // `accepted` değişkenine erişip ReferenceError ile çöken kopya kod vardı).
    notify('👥 '+session.bookTitle, myName+' — '+msg);
    updateNotifDot();
    renderSafe();
  }
}
