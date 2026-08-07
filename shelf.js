// shelf.js — Kitap Rafı (genel raf + dergi rafı) modülü (Ö40, 2026-08-06)
// index.html'teki ana <script> bloğundan ÖNCE yükleniyor,
// bu yüzden buradaki fonksiyonlar ana bloktan çağrılabilir.
// NOT: showSimpleModal ve triggerShadowEffect BİLEREK burada DEĞİL, index.html'de
// kaldı — ikisi de bu modüle özgü değil (shelves.js/badges.js tarafından da kullanılıyor).
// renderShelf() burada shelves.js'teki renderSpecialShelves()'i çağırıyor — bu yüzden
// shelves.js'in bu dosyadan önce veya en azından index.html'in ana scriptinden önce
// yüklenmiş olması yeterli (aynı global scope'u paylaşıyorlar).

function addToShelfFromLibrary(bookId){
  const book=(db.books[me]||[]).find(b=>b.id===bookId);
  if(!book) return;
  const s=myShelf();
  const shelves=Object.values(s.shelves||{});
  // Raf seçim dropdown'u — modal footer'ın altına ekle
  const footer=document.getElementById('modalFooter');
  const existingPicker=document.getElementById('shelfPickerBar');
  if(existingPicker){existingPicker.remove();return;}
  const opts=shelves.map(sh=>`<option value="${sh.id}">${sh.name}</option>`).join('');
  const bar=document.createElement('div');
  bar.id='shelfPickerBar';
  bar.style.cssText='display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-top:.5rem;padding:.5rem;background:rgba(201,162,39,.05);border:1px solid rgba(201,162,39,.2);border-radius:4px';
  bar.innerHTML=`<select class="book-input" id="shelfPickerSel" style="flex:1;font-size:.8rem;padding:.3rem .5rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)">
    <option value="">📦 Rafsız</option>${opts}
  </select>
  <button class="btn btn-sm btn-primary" style="font-size:.7rem" onclick="confirmAddToShelf(${bookId})">✓ Ekle</button>
  <button class="btn btn-sm" style="font-size:.7rem;background:rgba(138,69,19,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="document.getElementById('shelfPickerBar').remove()">İptal</button>`;
  footer.parentNode.insertBefore(bar,footer.nextSibling);
}

function confirmAddToShelf(bookId){
  const book=(db.books[me]||[]).find(b=>b.id===bookId);
  if(!book) return;
  const shelfId=document.getElementById('shelfPickerSel')?.value||'';
  const s=myShelf();
  if(!s.books) s.books=[];
  const norm=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const dup=s.books.find(b=>norm(b.title)===norm(book.title)&&b.shelfId===(shelfId||null));
  if(dup){
    dup.qty=(dup.qty||1)+1;
    saveDb();
    document.getElementById('shelfPickerBar')?.remove();
    notify('🗄️ Adet Güncellendi',`"${book.title}" rafta ${dup.qty} adet oldu.`);
    return;
  }
  const shelfBook={id:'sb_'+Date.now(),title:book.title||'',author:book.author||'',publisher:book.publisher||'',shelfId:shelfId||null,isbn:book.isbn||null,addedAt:new Date().toISOString(),lent:null};
  s.books.push(shelfBook);
  saveDb();
  document.getElementById('shelfPickerBar')?.remove();
  notify('🗄️ Rafa Eklendi',`"${book.title}" kitap rafına eklendi.`);
}

function myShelf(){if(!db.shelf)db.shelf={};if(!db.shelf[me])db.shelf[me]={shelves:{},books:[]};return db.shelf[me];}

function switchShelfTab(tab){
  try{localStorage.setItem('aa-shelftab',tab);}catch(e){}
  document.getElementById('sst-books')?.classList.toggle('active',tab==='books');
  document.getElementById('sst-mags')?.classList.toggle('active',tab==='mags');
  document.getElementById('ssp-books').style.display=tab==='books'?'':'none';
  document.getElementById('ssp-mags').style.display=tab==='mags'?'':'none';
}

function myMags(){if(!db.shelf)db.shelf={};if(!db.shelf[me])db.shelf[me]={shelves:{},books:[]};if(!db.shelf[me].magShelves)db.shelf[me].magShelves={};if(!db.shelf[me].mags)db.shelf[me].mags=[];return db.shelf[me];}

function renderMagSelect(){
  const sel=document.getElementById('magSelect');
  if(!sel) return;
  const s=myMags();
  const shelves=Object.values(s.magShelves||{});
  sel.innerHTML='<option value="">— Raf seç —</option>'+shelves.map(sh=>`<option value="${sh.id}">${sh.name}</option>`).join('');
}

function addMagShelf(){
  const inp=document.getElementById('magNewName');
  const name=(inp?.value||'').trim();
  if(!name) return;
  const s=myMags();
  const id='ms_'+Date.now();
  s.magShelves[id]={id,name,createdAt:new Date().toISOString()};
  saveDb();inp.value='';renderMagSelect();renderMags();
  notify('📰 Raf Oluşturuldu',name);
}

function deleteMagShelf(shelfId){
  const btn=document.getElementById('del-mag-shelf-btn-'+shelfId);
  if(!btn) return;
  if(btn.dataset.confirming==='1'){
    const s=myMags();
    if(s.magShelves) delete s.magShelves[shelfId];
    saveDb();renderMagSelect();renderMags();return;
  }
  btn.dataset.confirming='1';btn.textContent='Evet, Sil';btn.style.background='rgba(160,82,45,.5)';
  setTimeout(()=>{if(btn){btn.dataset.confirming='';btn.textContent='🗑';btn.style.background='';}},3000);
}

function addMag(){
  const title=(document.getElementById('magTitle')?.value||'').trim();
  const issue=(document.getElementById('magIssue')?.value||'').trim();
  const publisher=(document.getElementById('magPublisher')?.value||'').trim();
  const qty=Math.max(1,parseInt(document.getElementById('magQty')?.value)||1);
  const shelfId=document.getElementById('magSelect')?.value||'';
  const st=document.getElementById('magStatus');
  if(!title){notify('⚠️','Dergi adı gerekli.');return;}
  const s=myMags();
  if(!s.mags) s.mags=[];
  const norm=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const sameShelfDup=s.mags.find(b=>norm(b.title)===norm(title)&&b.shelfId===(shelfId||null));
  const otherDups=s.mags.filter(b=>norm(b.title)===norm(title)&&b.shelfId!==(shelfId||null));
  if(sameShelfDup&&!window._skipMagDup){
    const bar=document.getElementById('magDupBar');
    const msg=document.getElementById('magDupMsg');
    if(msg) msg.textContent=`"${sameShelfDup.title}" zaten bu rafta var (${sameShelfDup.qty||1} adet). Adet artırılsın mı?`;
    if(bar) bar.classList.add('show');
    window._pendingMagDup=sameShelfDup;
    const btn=document.getElementById('magDupConfirmBtn');
    if(btn) btn.textContent='+ Adet Artır';
    if(st) st.textContent='';return;
  }
  if(otherDups.length&&!window._skipMagDup){
    const rafNames=otherDups.map(b=>{const sh=s.magShelves?.[b.shelfId];return sh?sh.name:'Rafsız';}).filter((v,i,a)=>a.indexOf(v)===i).join(', ');
    const bar=document.getElementById('magDupBar');
    const msg=document.getElementById('magDupMsg');
    if(msg) msg.textContent=`"${title}" ${rafNames} rafında zaten var. Yine de eklensin mi?`;
    if(bar) bar.classList.add('show');
    window._pendingMagDup=null;window._pendingMagCrossShelf=true;
    const btn=document.getElementById('magDupConfirmBtn');
    if(btn) btn.textContent='Yine de Ekle';
    if(st) st.textContent='';return;
  }
  window._skipMagDup=false;
  const mag={id:'mg_'+Date.now(),title,issue,publisher,qty:qty>1?qty:null,shelfId:shelfId||null,addedAt:new Date().toISOString(),lent:null};
  s.mags.push(mag);
  saveDb();
  document.getElementById('magTitle').value='';
  document.getElementById('magIssue').value='';
  document.getElementById('magPublisher').value='';
  document.getElementById('magQty').value='';
  if(st){st.textContent=`✓ "${title}" eklendi`;setTimeout(()=>{st.textContent='';},3000);}
  renderMags();
}

function closeMagDup(){
  document.getElementById('magDupBar')?.classList.remove('show');
  window._pendingMagDup=null;window._skipMagDup=false;window._pendingMagCrossShelf=false;
}
function magDupConfirmed(){
  closeMagDup();
  if(window._pendingMagCrossShelf){window._pendingMagCrossShelf=false;window._skipMagDup=true;addMag();return;}
  const s=myMags();
  const dup=window._pendingMagDup;
  if(dup){const ex=(s.mags||[]).find(b=>b.id===dup.id);if(ex){ex.qty=(ex.qty||1)+1;saveDb();renderMags();notify('📰 Adet Güncellendi',`"${ex.title}" adedi ${ex.qty} oldu.`);window._pendingMagDup=null;return;}}
  window._skipMagDup=true;addMag();
}

function deleteMag(magId){
  const btn=document.querySelector(`[onclick="deleteMag('${magId}')"]`);
  if(btn&&btn.dataset.confirming!=='1'){btn.dataset.confirming='1';btn.textContent='Evet?';setTimeout(()=>{if(btn){btn.dataset.confirming='';btn.textContent='🗑';}},2500);return;}
  const s=myMags();s.mags=(s.mags||[]).filter(b=>b.id!==magId);saveDb();renderMags();
}

function editMag(magId){
  const row=document.getElementById('mag-edit-row-'+magId);
  if(row) row.style.display=row.style.display==='none'?'block':'none';
}

function saveMagEdit(magId){
  const s=myMags();
  const mag=(s.mags||[]).find(b=>b.id===magId);
  if(!mag) return;
  const t=document.getElementById('mag-edit-title-'+magId)?.value.trim();
  const i=document.getElementById('mag-edit-issue-'+magId)?.value.trim();
  const p=document.getElementById('mag-edit-pub-'+magId)?.value.trim();
  const q=parseInt(document.getElementById('mag-edit-qty-'+magId)?.value)||1;
  const n=document.getElementById('mag-edit-note-'+magId)?.value.trim();
  if(t) mag.title=t;
  if(i!==undefined) mag.issue=i;
  if(p!==undefined) mag.publisher=p;
  mag.qty=q>1?q:null;
  if(n!==undefined) mag.note=n||null;
  saveDb();renderMags();
}

function moveMag(magId,shelfId){
  const s=myMags();
  const mag=(s.mags||[]).find(b=>b.id===magId);
  if(!mag) return;
  mag.shelfId=shelfId||null;saveDb();renderMags();
}

function renderMags(){
  renderMagSelect();
  const target=viewing||me;
  const user=db.users[target];
  if(viewing&&!user?.shelfPublic){
    const c=document.getElementById('magContainer');
    if(c) c.innerHTML='<div class="empty-state">🔒 Bu üye dergi rafını gizli tutmaktadır.</div>';
    document.getElementById('magAddSection').style.display='none';return;
  }
  document.getElementById('magAddSection').style.display=viewing?'none':'';
  if(!db.shelf) db.shelf={};
  if(!db.shelf[target]) db.shelf[target]={shelves:{},books:[]};
  if(!db.shelf[target].magShelves) db.shelf[target].magShelves={};
  if(!db.shelf[target].mags) db.shelf[target].mags=[];
  const s=db.shelf[target];
  const shelves=Object.values(s.magShelves||{});
  const allMags=s.mags||[];
  const search=(document.getElementById('magSearch')?.value||'').toLowerCase().trim();
  const sortMode=document.getElementById('magSort')?.value||'title';
  const container=document.getElementById('magContainer');
  if(!container) return;
  let mags=[...allMags];
  if(search) mags=mags.filter(b=>(b.title||'').toLowerCase().includes(search)||(b.issue||'').toLowerCase().includes(search)||(b.publisher||'').toLowerCase().includes(search));
  mags.sort((a,b_)=>{
    if(sortMode==='issue') return (a.issue||'').localeCompare(b_.issue||'','tr');
    if(sortMode==='publisher') return (a.publisher||'').localeCompare(b_.publisher||'','tr');
    if(sortMode==='added') return (b_.addedAt||'').localeCompare(a.addedAt||'');
    return (a.title||'').localeCompare(b_.title||'','tr');
  });

  function magCard(b,isMe=true){
    const countBadge=b.qty&&b.qty>1?`<span style="font-family:'Space Mono',monospace;font-size:.6rem;background:rgba(201,162,39,.15);color:var(--leather);border:1px solid rgba(201,162,39,.3);border-radius:20px;padding:.1rem .4rem">×${b.qty}</span>`:'';
    const shelfOptions=shelves.map(sh=>`<option value="${sh.id}"${b.shelfId===sh.id?' selected':''}>${sh.name}</option>`).join('');
    const moveSelect=isMe&&shelves.length?`<select class="book-input" style="font-size:.6rem;padding:.2rem .4rem;max-width:100px;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.3)" onchange="moveMag('${b.id}',this.value)"><option value="">📦 Rafsız</option>${shelfOptions}</select>`:'';
    return`<div style="padding:.6rem 0;border-bottom:1px solid rgba(201,162,39,.08)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.4rem;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Crimson Pro',serif;font-size:.92rem;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:.3rem;flex-wrap:wrap">${b.title||'İsimsiz'} ${countBadge}</div>
          ${b.issue?`<div style="font-size:.78rem;color:var(--rust)">${b.issue}${b.publisher?' · '+b.publisher:''}</div>`:''}
          ${b.note?`<div style="font-size:.75rem;color:#555;font-style:italic;margin-top:.15rem">${b.note}</div>`:''}
        </div>
        ${isMe?`<div style="display:flex;gap:.25rem;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;align-items:center">
          ${moveSelect}
          <button class="btn btn-sm" style="font-size:.58rem;padding:.2rem .4rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="editMag('${b.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" style="font-size:.58rem;padding:.2rem .4rem" onclick="deleteMag('${b.id}')">🗑</button>
        </div>`:''}
      </div>
      ${isMe?`<div id="mag-edit-row-${b.id}" style="display:none;margin-top:.4rem;padding:.5rem;background:rgba(201,162,39,.05);border-radius:4px;border:1px solid rgba(201,162,39,.15)">
        <div style="display:flex;flex-direction:column;gap:.3rem">
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase">Dergi Adı</div>
          <input id="mag-edit-title-${b.id}" class="book-input" type="text" value="${(b.title||'').replace(/"/g,'&quot;')}" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase">Sayı/Cilt</div>
          <input id="mag-edit-issue-${b.id}" class="book-input" type="text" value="${(b.issue||'').replace(/"/g,'&quot;')}" placeholder="örn: Mart 2024" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase">Yayınevi</div>
          <input id="mag-edit-pub-${b.id}" class="book-input" type="text" value="${(b.publisher||'').replace(/"/g,'&quot;')}" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase">Adet</div>
          <input id="mag-edit-qty-${b.id}" class="book-input" type="number" min="1" max="99" value="${b.qty||1}" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35);max-width:80px"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase">Not</div>
          <input id="mag-edit-note-${b.id}" class="book-input" type="text" value="${(b.note||'').replace(/"/g,'&quot;')}" placeholder="isteğe bağlı" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="display:flex;gap:.3rem">
            <button class="btn btn-sm btn-primary" style="font-size:.65rem" onclick="saveMagEdit('${b.id}')">💾 Kaydet</button>
            <button class="btn btn-sm" style="font-size:.65rem;background:rgba(138,69,19,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="editMag('${b.id}')">İptal</button>
          </div>
        </div>
      </div>`:''}
    </div>`;
  }

  if(!shelves.length&&!allMags.length){
    container.innerHTML='<div class="empty-state">Henüz raf oluşturulmamış. Yukarıdan bir raf ekle!</div>';return;
  }
  const SHELF_PAGE=5;
  let html='';
  let magPrefs={};try{magPrefs=JSON.parse(localStorage.getItem('aa-acc')||'{}');}catch(e){}
  shelves.forEach(sh=>{
    const shMags=mags.filter(b=>b.shelfId===sh.id);
    const totalQty=shMags.reduce((s,b)=>s+(b.qty||1),0);
    const uniqueTitles=new Set(shMags.map(b=>(b.title||'').toLowerCase().trim())).size;
    const countLabel=totalQty===uniqueTitles?`${totalQty} dergi`:`${totalQty} adet / ${uniqueTitles} başlık`;
    const accKey='mag-acc-'+sh.id;
    const isOpen=magPrefs[accKey]===true;
    const shownCount=magPrefs['mag-count-'+sh.id]||SHELF_PAGE;
    const visible=shMags.slice(0,shownCount);
    const hasMore=shMags.length>shownCount;
    const hasLess=shownCount>SHELF_PAGE;
    html+=`<div class="card" style="margin-bottom:.75rem">
      <div class="card-header acc-header" onclick="toggleSection('${accKey}')" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:.5rem">
        <span style="flex:1">📰 ${sh.name} <span style="font-family:'Space Mono',monospace;font-size:.65rem;opacity:.6">${countLabel}</span></span>
        <span class="acc-arrow ${isOpen?'open':''}" id="arr-${accKey}" onclick="event.stopPropagation()">▶</span>
        ${!viewing?`<button id="del-mag-shelf-btn-${sh.id}" class="btn btn-sm btn-danger" style="font-size:.6rem;min-width:28px;margin-left:.25rem" onclick="event.stopPropagation();deleteMagShelf('${sh.id}')">🗑</button>`:''}
      </div>
      <div class="acc-body ${isOpen?'open':''}" id="body-${accKey}">
        <div class="card-body" style="padding:.5rem 1rem">
          ${shMags.length?`
            ${visible.map(b=>magCard(b,!viewing)).join('')}
            <div style="display:flex;gap:.5rem;margin-top:.4rem;flex-wrap:wrap">
              ${hasMore?`<button class="btn btn-sm" style="font-size:.65rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="magShowMore('${sh.id}',${shownCount+SHELF_PAGE})">↓ Daha fazla</button>`:''}
              ${hasLess?`<button class="btn btn-sm" style="font-size:.65rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="magShowMore('${sh.id}',${SHELF_PAGE})">↑ Daha az</button>`:''}
            </div>
          `:'<div style="font-size:.8rem;color:#888;font-style:italic;padding:.3rem 0">Bu rafta dergi yok.</div>'}
        </div>
      </div>
    </div>`;
  });
  const unsorted=mags.filter(b=>!b.shelfId||(b.shelfId&&!s.magShelves?.[b.shelfId]));
  if(unsorted.length){
    const isOpenU=magPrefs['mag-acc-unsorted']===true;
    const shownU=magPrefs['mag-count-unsorted']||SHELF_PAGE;
    const visU=unsorted.slice(0,shownU);
    html+=`<div class="card" style="margin-bottom:.75rem">
      <div class="card-header acc-header" onclick="toggleSection('mag-acc-unsorted')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
        <span>📦 Rafsız Dergiler <span style="font-family:'Space Mono',monospace;font-size:.65rem;opacity:.6">${unsorted.length} dergi</span></span>
        <span class="acc-arrow ${isOpenU?'open':''}" id="arr-mag-acc-unsorted">▶</span>
      </div>
      <div class="acc-body ${isOpenU?'open':''}" id="body-mag-acc-unsorted">
        <div class="card-body" style="padding:.5rem 1rem">
          ${visU.map(b=>magCard(b,!viewing)).join('')}
          ${unsorted.length>shownU?`<button class="btn btn-sm" style="font-size:.65rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2);margin-top:.4rem" onclick="magShowMore('unsorted',${shownU+SHELF_PAGE})">↓ Daha fazla</button>`:''}
        </div>
      </div>
    </div>`;
  }
  if(!mags.length&&search) html='<div class="empty-state">Arama sonucu bulunamadı.</div>';
  container.innerHTML=html;
}

function magShowMore(shelfId,count){
  try{const p=JSON.parse(localStorage.getItem('aa-acc')||'{}');p['mag-count-'+shelfId]=count;localStorage.setItem('aa-acc',JSON.stringify(p));}catch(e){}
  renderMags();
}

function shelfShowMore(shelfId,count){
  try{
    const prefs=JSON.parse(localStorage.getItem('aa-acc')||'{}');
    prefs['shelf-count-'+shelfId]=count;
    localStorage.setItem('aa-acc',JSON.stringify(prefs));
  }catch(e){}
  renderShelf();
}

function renderShelfSelect(){
  const sel=document.getElementById('shelfSelect');
  if(!sel) return;
  const s=myShelf();
  const shelves=Object.values(s.shelves||{});
  sel.innerHTML='<option value="">— Raf seç —</option>'+shelves.map(sh=>`<option value="${sh.id}">${sh.name}</option>`).join('');
}

function addShelf(){
  const inp=document.getElementById('shelfNewName');
  const name=(inp?.value||'').trim();
  if(!name) return;
  const s=myShelf();
  if(!s.shelves) s.shelves={};
  const id='sh_'+Date.now();
  s.shelves[id]={id,name,createdAt:new Date().toISOString()};
  saveDb();
  inp.value='';
  renderShelfSelect();
  renderShelf();
  notify('🗄️ Raf Oluşturuldu',name);
}

function deleteShelf(shelfId){
  const s=myShelf();
  const name=s.shelves?.[shelfId]?.name||'Raf';
  const btn=document.getElementById('del-shelf-btn-'+shelfId);
  if(!btn) return;
  if(btn.dataset.confirming==='1'){
    if(s.shelves) delete s.shelves[shelfId];
    saveDb();renderShelfSelect();renderShelf();
    return;
  }
  btn.dataset.confirming='1';
  btn.textContent='Evet, Sil';
  btn.style.background='rgba(160,82,45,.5)';
  setTimeout(()=>{if(btn){btn.dataset.confirming='';btn.textContent='🗑';btn.style.background='';}},3000);
}

async function addShelfBook(){
  const titleEl=document.getElementById('shelfBookTitle');
  const authorEl=document.getElementById('shelfBookAuthor');
  const pubEl=document.getElementById('shelfBookPublisher');
  const selEl=document.getElementById('shelfSelect');
  const st=document.getElementById('shelfStatus');
  const rawTitle=(titleEl?.value||'').trim();
  const author=(authorEl?.value||'').trim();
  const publisher=(pubEl?.value||'').trim();
  const shelfId=selEl?.value||'';
  if(!rawTitle){notify('⚠️','Kitap adı gerekli.');return;}
  const s=myShelf();
  if(!s.books) s.books=[];
  // ISBN mi?
  const isbnPat=/^[0-9]{9,13}[0-9X]?$/i;
  const looksIsbn=isbnPat.test(rawTitle.replace(/[-\s]/g,''));
  let title=rawTitle,isbn=looksIsbn?rawTitle.replace(/[^0-9X]/gi,''):'';
  if(st) st.textContent='Kitap aranıyor...';
  if(looksIsbn||(!author&&!publisher)){
    const info=await fetchBookInfo(looksIsbn?'':rawTitle,author,isbn);
    if(info?.title_clean) title=info.title_clean;
    if(info?.author_clean&&!author) authorEl.value=info.author_clean;
  }
  const qty=Math.max(1,parseInt(document.getElementById('shelfBookQty')?.value)||1);
  const book={id:'sb_'+Date.now(),title,author:authorEl?.value||author,publisher,qty:qty>1?qty:null,shelfId:shelfId||null,isbn:isbn||null,addedAt:new Date().toISOString(),lent:null};

  // Duplicate kontrol
  const norm=t=>(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const allDups=(s.books||[]).filter(b=>{
    if(isbn&&b.isbn&&b.isbn===isbn) return true;
    if(norm(title)&&norm(b.title)===norm(title)) return true;
    return false;
  });
  const sameShelfDup=allDups.find(b=>b.shelfId===(shelfId||null));
  const otherShelfDups=allDups.filter(b=>b.shelfId!==(shelfId||null));

  if(sameShelfDup&&!window._skipShelfDup){
    const bar=document.getElementById('shelfDupBar');
    const msg=document.getElementById('shelfDupMsg');
    if(msg) msg.textContent=`"${sameShelfDup.title}" zaten bu rafta var (${sameShelfDup.qty||1} adet). Adet artırılsın mı?`;
    if(bar) bar.classList.add('show');
    window._pendingDupBook=sameShelfDup;
    const btn=document.getElementById('shelfDupConfirmBtn');
    if(btn) btn.textContent='+ Adet Artır';
    if(st) st.textContent='';
    return;
  }
  if(otherShelfDups.length&&!window._skipShelfDup){
    const rafNames=otherShelfDups.map(b=>{
      const sh=s.shelves?.[b.shelfId];
      return sh?sh.name:'Rafsız';
    }).filter((v,i,a)=>a.indexOf(v)===i).join(', ');
    const bar=document.getElementById('shelfDupBar');
    const msg=document.getElementById('shelfDupMsg');
    if(msg) msg.textContent=`"${title}" ${rafNames} rafında zaten var. Yine de eklensin mi?`;
    if(bar) bar.classList.add('show');
    window._pendingDupBook=null;
    window._skipShelfDup=false;
    window._pendingCrossShelf=true;
    const btn=document.getElementById('shelfDupConfirmBtn');
    if(btn) btn.textContent='Yine de Ekle';
    if(st) st.textContent='';
    return;
  }
  window._skipShelfDup=false;

  s.books.push(book);
  saveDb();
  if(titleEl) titleEl.value='';
  if(authorEl) authorEl.value='';
  if(pubEl) pubEl.value='';
  const qtyEl=document.getElementById('shelfBookQty');
  if(qtyEl) qtyEl.value='';
  const preview=document.getElementById('shelfBookPreview');
  if(preview){preview.style.display='none';preview.textContent='';}
  if(st){st.textContent=`✓ "${title}" eklendi`;setTimeout(()=>{st.textContent='';},3000);}
  renderShelf();
}

function closeShelfDup(){
  document.getElementById('shelfDupBar')?.classList.remove('show');
  window._skipShelfDup=false;
}
function shelfDupConfirmed(){
  closeShelfDup();
  if(window._pendingCrossShelf){
    window._pendingCrossShelf=false;
    window._skipShelfDup=true;
    addShelfBook();
    return;
  }
  const s=myShelf();
  const dupBook=window._pendingDupBook;
  if(dupBook){
    const existing=(s.books||[]).find(b=>b.id===dupBook.id);
    if(existing){
      existing.qty=(existing.qty||1)+1;
      saveDb();renderShelf();
      notify('📚 Adet Güncellendi',`"${existing.title}" adedi ${existing.qty} oldu.`);
      window._pendingDupBook=null;
      return;
    }
  }
  window._skipShelfDup=true;
  addShelfBook();
}

function deleteShelfBook(bookId){
  const btn=document.querySelector(`[onclick="deleteShelfBook('${bookId}')"]`);
  if(btn&&btn.dataset.confirming!=='1'){
    btn.dataset.confirming='1';
    btn.textContent='Evet?';
    setTimeout(()=>{if(btn){btn.dataset.confirming='';btn.textContent='🗑';}},2500);
    return;
  }
  const s=myShelf();
  s.books=(s.books||[]).filter(b=>b.id!==bookId);
  saveDb();renderShelf();
}

function lendShelfBook(bookId){
  // Inline input göster
  const row=document.getElementById('lend-row-'+bookId);
  if(row){row.style.display=row.style.display==='none'?'flex':'none';return;}
}
function confirmLend(bookId){
  const inp=document.getElementById('lend-inp-'+bookId);
  const person=(inp?.value||'').trim();
  if(!person) return;
  const s=myShelf();
  const book=(s.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  book.lent={person,date:todayLocal()};
  saveDb();renderShelf();
  notify('📤 Ödünç Verildi',`"${book.title}" → ${person}`);
}

function returnShelfBook(bookId){
  const s=myShelf();
  const book=(s.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  book.lent=null;
  saveDb();renderShelf();
  notify('📚 Geri Alındı',`"${book.title}" iade edildi.`);
}

function editShelfBook(bookId){
  const row=document.getElementById('edit-row-'+bookId);
  if(row) row.style.display=row.style.display==='none'?'block':'none';
}
function saveShelfBookEdit(bookId){
  const s=myShelf();
  const book=(s.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  const t=document.getElementById('edit-title-'+bookId)?.value.trim();
  const a=document.getElementById('edit-author-'+bookId)?.value.trim();
  const p=document.getElementById('edit-pub-'+bookId)?.value.trim();
  const q=parseInt(document.getElementById('edit-qty-'+bookId)?.value)||1;
  const n=document.getElementById('edit-note-'+bookId)?.value.trim();
  if(t) book.title=t;
  if(a!==undefined) book.author=a;
  if(p!==undefined) book.publisher=p;
  book.qty=q>1?q:null;
  if(n!==undefined) book.note=n||null;
  saveDb();renderShelf();
}

function moveShelfBook(bookId, shelfId){
  const s=myShelf();
  const book=(s.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  book.shelfId=shelfId||null;
  saveDb();renderShelf();
}

function addShelfBookToLibrary(bookId){
  const s=myShelf();
  const book=(s.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  document.getElementById('bookTitle').value=book.title||'';
  document.getElementById('bookAuthor').value=book.author||'';
  document.getElementById('bookPublisher').value=book.publisher||'';
  showPanel('myBooks',document.querySelector('.nav-tab[onclick*="myBooks"]'));
  notify('📖 Kitaplığıma Ekle',`"${book.title}" bilgileri forma aktarıldı.`);
}

async function searchShelfBook(){
  const titleEl=document.getElementById('shelfBookTitle');
  const authorEl=document.getElementById('shelfBookAuthor');
  const preview=document.getElementById('shelfBookPreview');
  const raw=(titleEl?.value||'').trim();
  if(!raw) return;
  const isbnPat=/^[0-9]{9,13}[0-9X]?$/i;
  const looksIsbn=isbnPat.test(raw.replace(/[-\s]/g,''));
  const isbn=looksIsbn?raw.replace(/[^0-9X]/gi,''):'';
  if(preview){preview.style.display='block';preview.textContent='🔍 Aranıyor...';}
  const info=await fetchBookInfo(looksIsbn?'':raw,authorEl?.value||'',isbn);
  if(info?.title_clean&&info.title_clean!==raw){
    if(titleEl) titleEl.value=info.title_clean;
    if(authorEl&&info.author_clean) authorEl.value=info.author_clean;
    if(preview){
      preview.style.display='block';
      preview.textContent=`✓ ${info.title_clean}${info.author_clean?' — '+info.author_clean:''}`;
    }
  } else if(info?.title_clean){
    if(preview){preview.style.display='block';preview.textContent=`✓ ${info.title_clean}${info.author_clean?' — '+info.author_clean:''}`;}
  } else {
    if(preview){preview.style.display='block';preview.textContent='⚠️ Kitap bulunamadı — bilgileri elle girin.';}
  }
}

function openShelfBarcodeScanner(){
  // Barkod okuyunca shelfBookTitle'a yaz ve bilgi çek
  const modal=document.getElementById('barcodeModal');
  if(!modal) return;
  modal.style.display='flex';
  const status=document.getElementById('barcodeStatus');
  if(status) status.textContent='Kamera başlatılıyor...';
  if(typeof ZXing==='undefined'){if(status)status.textContent='⚠️ Tarayıcı yüklenemedi.';return;}
  try{
    _barcodeReader=new ZXing.BrowserMultiFormatReader();
    _barcodeReader.decodeFromVideoDevice(null,'barcodeVideo',(result,err)=>{
      if(result){
        const isbn=result.getText();
        closeBarcodeScanner();
        document.getElementById('shelfBookTitle').value=isbn;
        searchShelfBook();
      }
    });
    if(status) status.textContent='Barkodu kameraya göster';
  }catch(e){if(status)status.textContent='⚠️ Kamera açılamadı.';}
}

function renderShelf(){
  renderSpecialShelves();
  // Sekme durumunu yükle
  const savedTab=localStorage.getItem('aa-shelftab')||'books';
  switchShelfTab(savedTab);
  renderMags();
  const target=viewing||me;
  const user=db.users[target];
  // Gizlilik kontrolü
  if(viewing&&!user?.shelfPublic){
    const container=document.getElementById('shelfContainer');
    if(container) container.innerHTML='<div class="empty-state">🔒 Bu üye kitap rafını gizli tutmaktadır.</div>';
    const addSec=document.getElementById('shelfAddSection');
    if(addSec) addSec.style.display='none';
    return;
  }
  const addSec=document.getElementById('shelfAddSection');
  if(addSec) addSec.style.display=viewing?'none':'';

  if(!db.shelf) db.shelf={};
  if(!db.shelf[target]) db.shelf[target]={shelves:{},books:[]};
  const s=db.shelf[target];
  renderShelfSelect();
  const shelves=Object.values(s.shelves||{});
  const allBooks=s.books||[];
  const search=viewing?'':(document.getElementById('shelfSearch')?.value||'').toLowerCase().trim();
  const sortMode=document.getElementById('shelfSort')?.value||'title';
  const container=document.getElementById('shelfContainer');
  if(!container) return;

  let books=[...allBooks];
  if(search) books=books.filter(b=>
    (b.title||'').toLowerCase().includes(search)||
    (b.author||'').toLowerCase().includes(search)||
    (b.publisher||'').toLowerCase().includes(search)
  );
  books.sort((a,b_)=>{
    if(sortMode==='author') return (a.author||'').localeCompare(b_.author||'','tr');
    if(sortMode==='publisher') return (a.publisher||'').localeCompare(b_.publisher||'','tr');
    if(sortMode==='added') return (b_.addedAt||'').localeCompare(a.addedAt||'');
    return (a.title||'').localeCompare(b_.title||'','tr');
  });

  function prefs2(k){try{return JSON.parse(localStorage.getItem('aa-acc')||'{}')?.[k]||0;}catch(e){return 0;}}

  // Ziyaretçi banner
  const shelfBanner=document.getElementById('shelfViewingBanner');
  const shelfViewText=document.getElementById('shelfViewingText');
  if(shelfBanner){
    shelfBanner.style.display=viewing?'':'none';
    if(viewing&&shelfViewText){
      const av=db.users[target]?.avatar||'📚';
      const avD=av.startsWith('avatar_')||av.startsWith('data:')?'👤':av;
      shelfViewText.textContent=`${avD} ${db.users[target]?.displayName||target} adlı üyenin kitap rafı`;
    }
  }

  function bookCard(b,isMe=true){
    const countBadge=b.qty&&b.qty>1?`<span style="font-family:'Space Mono',monospace;font-size:.6rem;background:rgba(201,162,39,.15);color:var(--leather);border:1px solid rgba(201,162,39,.3);border-radius:20px;padding:.1rem .4rem">×${b.qty}</span>`:'';
    const lentBadge=b.lent?`<span style="font-family:'Space Mono',monospace;font-size:.6rem;background:rgba(160,82,45,.15);color:var(--rust);border:1px solid rgba(160,82,45,.3);border-radius:20px;padding:.1rem .5rem">📤 ${b.lent.person} · ${b.lent.date}</span>`:'';
    const shelfOptions=shelves.map(sh=>`<option value="${sh.id}"${b.shelfId===sh.id?' selected':''}>${sh.name}</option>`).join('');
    const moveSelect=isMe&&shelves.length?`<select class="book-input" style="font-size:.6rem;padding:.2rem .4rem;max-width:100px;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.3)" onchange="moveShelfBook('${b.id}',this.value)">
      <option value="">📦 Rafsız</option>${shelfOptions}</select>`:'';
    return`<div style="padding:.6rem 0;border-bottom:1px solid rgba(201,162,39,.08)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.4rem;flex-wrap:wrap">
        <div style="flex:1;min-width:0;margin-right:.2rem">
          <div style="font-family:'Crimson Pro',serif;font-size:.92rem;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:.3rem;flex-wrap:wrap">${b.title||'İsimsiz'} ${countBadge}</div>
          ${b.author?`<div style="font-size:.78rem;color:var(--rust)">${b.author}${b.publisher?' · '+b.publisher:''}</div>`:''}
          ${b.note?`<div style="font-size:.75rem;color:#555;font-style:italic;margin-top:.15rem">${b.note}</div>`:''}
          <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.2rem">${lentBadge}</div>
        </div>
        ${isMe?`<div style="display:flex;gap:.25rem;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;align-items:center">
          ${moveSelect}
          ${b.lent
            ?`<button class="btn btn-sm" style="font-size:.58rem;padding:.2rem .4rem;background:rgba(74,103,65,.15);color:var(--moss);border:1px solid rgba(74,103,65,.3)" onclick="returnShelfBook('${b.id}')">✓</button>`
            :`<button class="btn btn-sm" style="font-size:.58rem;padding:.2rem .4rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="lendShelfBook('${b.id}')">📤</button>`}
          <button class="btn btn-sm" style="font-size:.58rem;padding:.2rem .4rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="editShelfBook('${b.id}')">✏️</button>
          <button class="btn btn-sm" style="font-size:.58rem;padding:.2rem .4rem;background:rgba(74,103,65,.1);color:var(--moss);border:1px solid rgba(74,103,65,.2)" onclick="addShelfBookToLibrary('${b.id}')">📖</button>
          <button class="btn btn-sm btn-danger" style="font-size:.58rem;padding:.2rem .4rem" onclick="deleteShelfBook('${b.id}')">🗑</button>
        </div>`:''}
      </div>
      ${isMe?`<div id="edit-row-${b.id}" style="display:none;margin-top:.4rem;padding:.5rem;background:rgba(201,162,39,.05);border-radius:4px;border:1px solid rgba(201,162,39,.15)">
        <div style="display:flex;flex-direction:column;gap:.3rem">
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase;letter-spacing:.06em">Kitap Adı</div>
          <input id="edit-title-${b.id}" class="book-input" type="text" value="${(b.title||'').replace(/"/g,'&quot;')}" placeholder="Kitap adı" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase;letter-spacing:.06em">Yazar</div>
          <input id="edit-author-${b.id}" class="book-input" type="text" value="${(b.author||'').replace(/"/g,'&quot;')}" placeholder="Yazar" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase;letter-spacing:.06em">Yayınevi</div>
          <input id="edit-pub-${b.id}" class="book-input" type="text" value="${(b.publisher||'').replace(/"/g,'&quot;')}" placeholder="Yayınevi" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase;letter-spacing:.06em">Adet</div>
          <input id="edit-qty-${b.id}" class="book-input" type="number" min="1" max="99" value="${b.qty||1}" style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35);max-width:80px"/>
          <div style="font-family:'Space Mono',monospace;font-size:.58rem;color:var(--rust);text-transform:uppercase;letter-spacing:.06em">Not <span style="opacity:.6;text-transform:none;letter-spacing:0">(isteğe bağlı)</span></div>
          <input id="edit-note-${b.id}" class="book-input" type="text" value="${(b.note||'').replace(/"/g,'&quot;')}" placeholder="Hangi baskı, nereden aldım..." style="font-size:.82rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)"/>
          <div style="display:flex;gap:.3rem">
            <button class="btn btn-sm btn-primary" style="font-size:.65rem" onclick="saveShelfBookEdit('${b.id}')">💾 Kaydet</button>
            <button class="btn btn-sm" style="font-size:.65rem;background:rgba(138,69,19,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="editShelfBook('${b.id}')">İptal</button>
          </div>
        </div>
      </div>
      <div id="lend-row-${b.id}" style="display:none;gap:.4rem;align-items:center;margin-top:.4rem;flex-wrap:wrap">
        <input id="lend-inp-${b.id}" class="book-input" type="text" placeholder="Kişi adı..." style="flex:1;min-width:120px;font-size:.8rem;padding:.3rem .6rem;background:rgba(26,18,8,.07);color:var(--ink);border-color:rgba(201,162,39,.35)" onkeydown="if(event.key==='Enter')confirmLend('${b.id}')"/>
        <button class="btn btn-sm btn-primary" style="font-size:.65rem" onclick="confirmLend('${b.id}')">Onayla</button>
        <button class="btn btn-sm" style="font-size:.65rem;background:rgba(138,69,19,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="document.getElementById('lend-row-${b.id}').style.display='none'">İptal</button>
      </div>`:''}
    </div>`;
  }

  if(!shelves.length&&!allBooks.length){
    container.innerHTML='<div class="empty-state">Henüz raf oluşturulmamış. Yukarıdan bir raf ekle!</div>';
    return;
  }

  const SHELF_PAGE=5;
  let html='';
  let shelfPrefs={};try{shelfPrefs=JSON.parse(localStorage.getItem('aa-acc')||'{}');}catch(e){}
  shelves.forEach(sh=>{
    const shBooks=books.filter(b=>b.shelfId===sh.id);
    const totalQty=shBooks.reduce((s,b)=>s+(b.qty||1),0);
    const uniqueTitles=new Set(shBooks.map(b=>(b.title||'').toLowerCase().trim())).size;
    const countLabel=totalQty===uniqueTitles?`${totalQty} kitap`:`${totalQty} adet / ${uniqueTitles} başlık`;
    const accKey='shelf-acc-'+sh.id;
    const isOpen=shelfPrefs[accKey]===true;
    const shownCount=shelfPrefs['shelf-count-'+sh.id]||SHELF_PAGE;
    const visible=shBooks.slice(0,shownCount);
    const hasMore=shBooks.length>shownCount;
    const hasLess=shownCount>SHELF_PAGE;
    html+=`<div class="card" style="margin-bottom:.75rem">
      <div class="card-header acc-header" onclick="toggleSection('${accKey}')" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:.5rem">
        <span style="flex:1">🗄️ ${sh.name} <span style="font-family:'Space Mono',monospace;font-size:.65rem;opacity:.6">${countLabel}</span></span>
        <span class="acc-arrow ${isOpen?'open':''}" id="arr-${accKey}" onclick="event.stopPropagation()">▶</span>
        ${!viewing?`<button id="del-shelf-btn-${sh.id}" class="btn btn-sm btn-danger" style="font-size:.6rem;min-width:28px;margin-left:.25rem" onclick="event.stopPropagation();deleteShelf('${sh.id}')">🗑</button>`:''}
      </div>
      <div class="acc-body ${isOpen?'open':''}" id="body-${accKey}">
        <div class="card-body" style="padding:.5rem 1rem">
          ${shBooks.length?`
            ${visible.map(b=>bookCard(b,!viewing)).join('')}
            <div style="display:flex;gap:.5rem;margin-top:.4rem;flex-wrap:wrap">
              ${hasMore?`<button class="btn btn-sm" style="font-size:.65rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="shelfShowMore('${sh.id}',${shownCount+SHELF_PAGE})">↓ Daha fazla (${shBooks.length-shownCount} kaldı)</button>`:''}
              ${hasLess?`<button class="btn btn-sm" style="font-size:.65rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="shelfShowMore('${sh.id}',${SHELF_PAGE})">↑ Daha az</button>`:''}
            </div>
          `:'<div style="font-size:.8rem;color:#888;font-style:italic;padding:.3rem 0">Bu rafta kitap yok.</div>'}
        </div>
      </div>
    </div>`;
  });
  const unsorted=books.filter(b=>!b.shelfId||(b.shelfId&&!s.shelves?.[b.shelfId]));
  if(unsorted.length){
    const isOpenU=shelfPrefs['shelf-acc-unsorted']===true;
    const shownU=shelfPrefs['shelf-count-unsorted']||SHELF_PAGE;
    const visU=unsorted.slice(0,shownU);
    const hasMoreU=unsorted.length>shownU;
    const hasLessU=shownU>SHELF_PAGE;
    html+=`<div class="card" style="margin-bottom:.75rem">
      <div class="card-header acc-header" onclick="toggleSection('shelf-acc-unsorted')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
        <span>📦 Rafsız Kitaplar <span style="font-family:'Space Mono',monospace;font-size:.65rem;opacity:.6">${unsorted.length} kitap</span></span>
        <span class="acc-arrow ${isOpenU?'open':''}" id="arr-shelf-acc-unsorted">▶</span>
      </div>
      <div class="acc-body ${isOpenU?'open':''}" id="body-shelf-acc-unsorted">
        <div class="card-body" style="padding:.5rem 1rem">
          ${visU.map(b=>bookCard(b,!viewing)).join('')}
          <div style="display:flex;gap:.5rem;margin-top:.4rem;flex-wrap:wrap">
            ${hasMoreU?`<button class="btn btn-sm" style="font-size:.65rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="shelfShowMore('unsorted',${shownU+SHELF_PAGE})">↓ Daha fazla (${unsorted.length-shownU} kaldı)</button>`:''}
            ${hasLessU?`<button class="btn btn-sm" style="font-size:.65rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.2)" onclick="shelfShowMore('unsorted',${SHELF_PAGE})">↑ Daha az</button>`:''}
          </div>
        </div>
      </div>
    </div>`;
  }
  if(!books.length&&search){
    html='<div class="empty-state">Arama sonucu bulunamadı.</div>';
  }
  container.innerHTML=html;
}

