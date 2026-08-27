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
async function linkCoreadingBook(sessionId, bookId){
  if(!me) return;
  const book=(db.books[me]||[]).find(b=>b.id==bookId);
  if(!book) return;
  book.coreadingSession=sessionId;
  book.readingStatus='reading';
  if(db.notifications&&db.notifications[me]){
    const n=db.notifications[me].find(n=>n.sessionId===sessionId&&n.type==='coreading_start');
    if(n){ n.responded=true; fbSet('aa-v4/notifications/'+me, db.notifications[me]); }
  }
  birlikteOkumaSeciciKapat();   // fon perdesi de kalksın
  await saveDb();
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
  notify('⏹ Oturum sonlandırıldı', session.bookTitle+' birlikte okuma oturumu kapatıldı.');
  renderSafe();
}
async function leaveCoreading(sessionId){
  if(!me) return;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
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
  // Ayrılma sonrası allDone kontrolü — kalan herkes bitirdiyse oturumu kapat
  if(session.status==='active'){
    const updatedSession=db.readingSessions[sessionId];
    const accepted=Object.keys(updatedSession.participants||{}).filter(u=>updatedSession.participants[u].status==='accepted');
    const allDone=accepted.length>0&&accepted.every(u=>
      (updatedSession.progress&&updatedSession.progress[u]&&updatedSession.progress[u].lastMilestone===100)
    );
    if(allDone){
      updatedSession.status='completed';
      updatedSession.completedAt=Date.now();
      await fbSet('aa-v4/readingSessions/'+sessionId+'/status','completed');
      await fbSet('aa-v4/readingSessions/'+sessionId+'/completedAt',updatedSession.completedAt);
      await gecmiseEkle(sessionId,{type:'completed',ts:updatedSession.completedAt});
      const allAccepted=Object.keys(updatedSession.participants||{}).filter(u=>updatedSession.participants[u].status==='accepted');
      for(const u of allAccepted){
        await pushNotification(u, {id:'crc_'+sessionId+'_'+Date.now(),type:'coreading_completed',sessionId,bookTitle:updatedSession.bookTitle,fromName:(db.users[me]||{}).displayName||me,ts:new Date().toISOString(),seen:false,reaction:'🎉',context:updatedSession.bookTitle});
      }
      launchCoreadingConfetti(true);
      updateNotifDot();
    }
  }
  renderSafe();
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
// ── İLERLEME MİLESTONE ──
async function checkCoreadingMilestone(book){
  if(!book.coreadingSession){ return;}
  const sessionId=book.coreadingSession;
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session||session.status!=='active'){ console.warn('checkCoreadingMilestone: sessiz çıkış — session yok veya aktif değil',{sessionId,status:session&&session.status}); return;}
  if(!book.currentPage||!book.pages){ console.warn('checkCoreadingMilestone: sessiz çıkış — currentPage veya pages eksik',{bookId:book.id,currentPage:book.currentPage,pages:book.pages}); return;}
  const pct=Math.min(100,Math.round(book.currentPage/book.pages*100));
  const milestones=[25,50,75,100];
  const reached=milestones.filter(m=>pct>=m);
  if(!reached.length){ console.warn('checkCoreadingMilestone: sessiz çıkış — %25 eşiğine ulaşılmadı',{pct}); return;}
  const lastMilestone=reached[reached.length-1];
  if(!session.progress) session.progress={};
  if(!session.progress[me]) session.progress[me]={};
  const prevMilestone=session.progress[me].lastMilestone||0;
  if(pct<prevMilestone){
    // Milestone'u güncelle, önceki milestone'ları temizle
    console.warn('checkCoreadingMilestone: sessiz çıkış — pct önceki milestone altına düştü, bildirim yok',{pct,prevMilestone});
    session.progress[me].lastMilestone=lastMilestone||0;
    session.progress[me].pct=pct;
    await fbSet('aa-v4/readingSessions/'+sessionId+'/progress/'+me, session.progress[me]);
    return;
  }
  if(lastMilestone<=prevMilestone){ console.warn('checkCoreadingMilestone: sessiz çıkış — bu milestone zaten bildirilmiş',{lastMilestone,prevMilestone}); return;}
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
    const accepted=Object.keys(freshSession.participants||{}).filter(u=>freshSession.participants[u].status==='accepted');
    const allDone=accepted.length>0&&accepted.every(u=>
      (freshSession.progress&&freshSession.progress[u]&&freshSession.progress[u].lastMilestone===100)
    );
    if(allDone){
      freshSession.status='completed';
      freshSession.completedAt=Date.now();
      await fbSet('aa-v4/readingSessions/'+sessionId+'/status','completed');
      await fbSet('aa-v4/readingSessions/'+sessionId+'/completedAt',freshSession.completedAt);
      await gecmiseEkle(sessionId,{type:'completed',ts:freshSession.completedAt});
      // Local kopyayı güncelle — renderSafe doğru göstersin
      if(db.readingSessions&&db.readingSessions[sessionId]) db.readingSessions[sessionId].status='completed';
      const allAccepted=Object.keys(freshSession.participants||{}).filter(u=>freshSession.participants[u].status==='accepted');
      for(const u of allAccepted){
        const notif={id:'crc_'+sessionId+'_'+u+'_'+Date.now(),type:'coreading_completed',sessionId,bookTitle:freshSession.bookTitle,fromName:myName,ts:new Date().toISOString(),seen:u===me,reaction:'🎉',context:freshSession.bookTitle};
        await pushNotification(u, notif);
      }
      notify('🎉 Herkesle birlikte!', freshSession.bookTitle+' birlikte tamamlandı!');
      launchCoreadingConfetti(true);
      updateNotifDot();
    }
    renderSafe();
  } else {
    // Katılımcılara milestone bildirimi zaten yukarıda (lastMilestone<100 bloğunda) gönderildi —
    // burada tekrar göndermiyoruz (eskiden aynı işi ikinci kez yapmaya çalışan, kapsam dışı
    // `accepted` değişkenine erişip ReferenceError ile çöken kopya kod vardı).
    notify('👥 '+session.bookTitle, myName+' — '+msg);
    updateNotifDot();
    renderSafe();
  }
}
