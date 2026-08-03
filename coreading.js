// ── BİRLİKTE OKUMA ───────────────────────────────────────────
async function startCoreadingSession(titleRaw, author){
  if(!me){ alert('Giriş yapman gerekiyor.'); return; }
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
  session.history=[{type:'started',user:me,ts:Date.now()}];
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
    alert('Oturum başlatılamadı, tekrar dene.');
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
  // history ekle
  if(!db.readingSessions[sessionId].history) db.readingSessions[sessionId].history=[];
  db.readingSessions[sessionId].history.push({type:response==='accepted'?'joined':'rejected',user:me,ts:Date.now()});
  await fbSet('aa-v4/readingSessions/'+sessionId+'/history', db.readingSessions[sessionId].history);
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
async function cancelCoreading(sessionId){
  if(!me) return;
  if(!db.readingSessions||!db.readingSessions[sessionId]) return;
  if(db.readingSessions[sessionId].initiator!==me) return;
  db.readingSessions[sessionId].status='cancelled';
  await fbSet('aa-v4/readingSessions/'+sessionId, db.readingSessions[sessionId]);
  // NOT: kaydı yerelden SİLMİYORUZ artık — 'cancelled' durumuyla kalsın. Eskiden burada
  // `delete db.readingSessions[sessionId]` yapılıyordu; sonraki herhangi bir saveDb() tüm
  // veritabanını bellekten yazdığı için (K3) oturum Firebase'den de tümüyle siliniyordu,
  // ama katılımcıların kitaplarındaki `coreadingSession` referansı öksüz kalıp
  // "Birlikte Okunuyor" sekmesinde tıklanamayan bir kitap olarak asılı kalıyordu.
  // Bunun yerine, bağlı olan tüm kitaplardaki referansı temizliyoruz. books de (K3) genel
  // kayıttan hariç tutulduğundan, kendi kitabımız dışında değiştirdiğimiz her kullanıcının
  // listesini kendi granüler yoluna ayrıca yazmamız gerekiyor.
  for(const [u,list] of Object.entries(db.books||{})){
    let changed=false;
    (list||[]).forEach(b=>{
      if(b.coreadingSession===sessionId){ delete b.coreadingSession; changed=true; }
    });
    if(changed&&u!==me) await fbSet('aa-v4/books/'+u, list);
  }
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
  db.readingSessions[sessionId].status='active';
  db.readingSessions[sessionId].startedAt=Date.now();
  if(!db.readingSessions[sessionId].history) db.readingSessions[sessionId].history=[];
  db.readingSessions[sessionId].history.push({type:'reading_started',user:me,ts:Date.now()});
  await fbSet('aa-v4/readingSessions/'+sessionId, db.readingSessions[sessionId]);
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
function showCoreadingBookPicker(sessionId){
  const session=db.readingSessions&&db.readingSessions[sessionId];
  if(!session) return;
  const myBooks=(db.books[me]||[]).filter(b=>b.title&&b.readingStatus!=='wishlist');
  const options=myBooks.map(b=>`
    <div style="padding:.5rem .75rem;border:1px solid rgba(201,162,39,.2);border-radius:2px;margin-bottom:.4rem;cursor:pointer;font-family:'Crimson Pro',serif;font-size:.95rem;color:var(--ink)"
      onclick="linkCoreadingBook('${sessionId}',${b.id})">
      ${b.title}${b.author?' — <em>'+b.author+'</em>':''}
    </div>`).join('');
  const panel=document.createElement('div');
  panel.id='coreadingPicker';
  panel.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--cream);border:1px solid var(--gold);border-radius:4px;padding:1.25rem;z-index:9999;max-height:70vh;overflow-y:auto;min-width:300px;max-width:90vw';
  panel.dataset.sessionId=sessionId;
  panel.innerHTML=`
    <div style="font-family:'Playfair Display',serif;font-size:1rem;color:var(--gold);margin-bottom:.75rem">Hangi kitabı bağlamak istersin?</div>
    <div style="display:flex;gap:.5rem;margin-bottom:.75rem">
      <button class="btn btn-sm" style="background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" onclick="acceptCoreadingBook('${sessionId}','new');document.getElementById('coreadingPicker').remove()">📖 Yeni kitap olarak ekle</button>
    </div>
    <div style="font-family:'Space Mono',monospace;font-size:.6rem;color:rgba(26,18,8,.4);margin-bottom:.5rem">— ya da listedeki bir kitabı bağla —</div>
    <input type="text" placeholder="Kitap ara..." oninput="filterCoreadingPicker(this.value)" style="width:100%;padding:.5rem .75rem;background:rgba(201,162,39,.08);border:1px solid rgba(201,162,39,.3);border-radius:2px;color:var(--ink);font-family:'Crimson Pro',serif;font-size:.95rem;margin-bottom:.5rem;box-sizing:border-box"/>
    <div id="coreadingPickerList">${options||'<div style="color:#888;font-size:.85rem">Listende başka kitap yok.</div>'}</div>
    <button class="btn btn-sm" style="margin-top:.75rem" onclick="document.getElementById('coreadingPicker').remove()">İptal</button>
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
  document.getElementById('coreadingPicker')?.remove();
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
  if(!session.history) session.history=[];
  session.history.push({type:'ended',user:me,ts:Date.now()});
  await fbSet('aa-v4/readingSessions/'+sessionId+'/status','ended');
  await fbSet('aa-v4/readingSessions/'+sessionId+'/endedAt',session.endedAt);
  await fbSet('aa-v4/readingSessions/'+sessionId+'/history',session.history);
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
      if(!updatedSession.history) updatedSession.history=[];
      updatedSession.history.push({type:'completed',ts:Date.now()});
      await fbSet('aa-v4/readingSessions/'+sessionId+'/status','completed');
      await fbSet('aa-v4/readingSessions/'+sessionId+'/completedAt',updatedSession.completedAt);
      await fbSet('aa-v4/readingSessions/'+sessionId+'/history',updatedSession.history);
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
  if(!session.history) session.history=[];
  session.history.push({type:'milestone',user:me,ts:Date.now(),pct:pct,msg:milestoneMsg});
  session.lastActivityAt=Date.now();
  await fbSet('aa-v4/readingSessions/'+sessionId+'/progress/'+me, session.progress[me]);
  await fbSet('aa-v4/readingSessions/'+sessionId+'/history', session.history);
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
	// Kişi kitabı bitirdi — history'e yaz
const finishEntry = {type:'user_finished', user:me, userName:myName, ts:Date.now()};
if(!freshSession.history) freshSession.history=[];
const alreadyFinished = freshSession.history.some(h=>h.type==='user_finished'&&h.user===me);
if(!alreadyFinished){
  freshSession.history.push(finishEntry);
  await fbSet('aa-v4/readingSessions/'+sessionId+'/history', freshSession.history);
  if(db.readingSessions&&db.readingSessions[sessionId]) db.readingSessions[sessionId].history=freshSession.history;
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
      if(!freshSession.history) freshSession.history=[];
      freshSession.history.push({type:'completed',ts:Date.now()});
      await fbSet('aa-v4/readingSessions/'+sessionId+'/status','completed');
      await fbSet('aa-v4/readingSessions/'+sessionId+'/completedAt',freshSession.completedAt);
      await fbSet('aa-v4/readingSessions/'+sessionId+'/history',freshSession.history);
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
    notify('👥 '+session.bookTitle, myName+' — '+msg);
    // Diğer katılımcılara milestone bildirimi gönder
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
    updateNotifDot();
    renderSafe();
  }
}
