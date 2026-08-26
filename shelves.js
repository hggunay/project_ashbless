// shelves.js — Özel Raflar (Başucu & Yasaklı) modülü (Ö40, 2026-08-06)
// index.html'teki ana <script> bloğundan ÖNCE yükleniyor,
// bu yüzden buradaki fonksiyonlar ana bloktan çağrılabilir.
// NOT: showSimpleModal (jenerik modal yardımcısı) ve triggerShadowEffect (rozet
// aura efekti, badges.js tarafından kullanılıyor) BİLEREK burada DEĞİL, index.html'de
// kaldı — ikisi de bu modüle özgü değil, başka kodlar da kullanabiliyor/kullanacak.

function triggerGlitch(titleEl){
  if(!titleEl) return;
  const bg=titleEl.closest('.special-shelf')?.querySelector('.special-shelf-bg');
  if(!bg) return;
  bg.classList.remove('glitch-bg-active');
  void bg.offsetWidth;
  bg.classList.add('glitch-bg-active');
  setTimeout(()=>bg.classList.remove('glitch-bg-active'),420);
}

function triggerBedside(){
  const shelf=document.querySelector('#specialShelvesContainer .special-shelf');
  if(!shelf) return;

  // Önce rafı görünür alana getir, sonra animasyon başlat
  shelf.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>_startBedsideAnim(shelf), 600);
}

function _startBedsideAnim(shelf){
  const overlay=document.getElementById('bedsideOverlay');
  const lamp=document.getElementById('bedsideLamp');
  const cornerText=shelf.querySelector('.bedside-corner-text');
  const spines=[...shelf.querySelectorAll('.book-spine')];

  // Raf'ın sayfadaki pozisyonunu hesapla
  const rect=shelf.getBoundingClientRect();
  const lampXpct=((( rect.left+rect.width*0.28)/window.innerWidth)*100).toFixed(1);
  const lampYpct=(((rect.top+rect.height*0.45)/window.innerHeight)*100).toFixed(1);

  if(lamp){
    lamp.style.background=`radial-gradient(ellipse at ${lampXpct}% ${lampYpct}%,rgba(255,200,80,.5) 0%,rgba(255,160,20,.2) 20%,transparent 45%)`;
    lamp.style.transition='opacity 700ms ease';
  }

  document.body.style.overflow='hidden';

  // 1. Yavaşça kararır
  if(overlay) overlay.style.opacity='1';
  setTimeout(()=>{if(lamp) lamp.style.opacity='1';},200);

  // 2. 1200ms: kitaplar sırayla
  spines.forEach((sp,i)=>{
    sp.style.opacity='0';sp.style.transform='translateY(10px)';sp.style.transition='none';
    setTimeout(()=>{
      sp.style.transition='opacity 350ms ease, transform 350ms ease';
      sp.style.opacity='1';sp.style.transform='translateY(0)';
    },1200+i*120);
  });

  // 3. 2400ms: yazı
  setTimeout(()=>{
    if(cornerText){cornerText.style.opacity='1';cornerText.style.transform='translateY(0)';}
  },2400);

  // 4. 5000ms: yazı solar
  setTimeout(()=>{
    if(cornerText){cornerText.style.transition='opacity 800ms ease';cornerText.style.opacity='0';}
  },5000);

  // 5. 5500ms: yavaşça aydınlanır
  setTimeout(()=>{
    if(overlay) overlay.style.opacity='0';
    if(lamp){lamp.style.transition='opacity 1200ms ease';lamp.style.opacity='0';}
    setTimeout(()=>{document.body.style.overflow='';},1300);
  },5500);
}

function goToShelf(type){
  showPanel('shelf',document.querySelector('[onclick*=shelf]'));
  openBadgeId=null;
  renderBadges();
  setTimeout(()=>{
    if(type==='forbidden'){
      const el=document.querySelector('.glitch-target');
      triggerGlitch(el);
    } else if(type==='bedside'){
      triggerBedside();
    }
  },350);
}

// ── ÖZEL RAFLAR (Başucu & Yasaklı) ───────────────────────────
const SPINE_COLORS_BEDSIDE=['#5c3a1e','#2d5a3d','#1e3a5c','#5c2d3a','#4a3d1e','#3d1e5c','#1e4a3d','#5c4a1e','#3a1e4a','#2d3a5c','#5c1e2d','#3d5c1e'];
const SPINE_COLORS_FORBIDDEN=['#2a0a3a','#0a1a2a','#2a0a0a','#1a0a2a','#0a2a1a','#2a1a0a','#1a2a0a','#0a0a2a','#2a0a1a','#1a0a0a','#0a2a2a','#2a2a0a'];
const SP_MAX={bedside:7,forbidden:20};
const SP_VISIBLE=10;

function getSpecialShelf(type){
  if(!db.shelf) db.shelf={};
  const target=viewing||me;
  if(!db.shelf[target]) db.shelf[target]={shelves:{},books:[]};
  if(!db.shelf[target].special) db.shelf[target].special={};
  if(!db.shelf[target].special[type]) db.shelf[target].special[type]={books:[]};
  return db.shelf[target].special[type];
}

function saveSpecialShelf(type,data){
  if(!db.shelf) db.shelf={};
  if(!db.shelf[me]) db.shelf[me]={shelves:{},books:[]};
  if(!db.shelf[me].special) db.shelf[me].special={};
  db.shelf[me].special[type]=data;
  saveDb();
}

function spReadBooks(){
  return readBooksOf(me);
}

function renderSpecialShelves(){
  const container=document.getElementById('specialShelvesContainer');
  if(!container) return;
  const target=viewing||me;
  const allBadges=BADGE_CATS.flatMap(c=>c.chains?c.chains.flatMap(ch=>ch.badges):c.badges||[]);
  const bedsideBadge=allBadges.find(b=>b.id==='secret_bedside');
  const forbiddenBadge=allBadges.find(b=>b.id==='secret_forbidden');
  const targetBooks2=(db.books[target]||[]).filter(b=>b.title&&!b.title.startsWith('ISBN:')&&b.readingStatus!=='wishlist'&&((b.readingStatus!=='reading'&&b.readingStatus!=='paused')||!!(b.endDate||b.yearOnly)));
  const showBedside=bedsideBadge?bstat(bedsideBadge,targetBooks2).earned:false;
  const showForbidden=forbiddenBadge?bstat(forbiddenBadge,targetBooks2).earned:false;
  let html='';
  if(showBedside) html+=renderSpecialShelfHtml('bedside');
  if(showForbidden) html+=renderSpecialShelfHtml('forbidden');
  container.innerHTML=html;
}

function renderSpecialShelfHtml(type){
  const isBedside=type==='bedside';
  const shelf=getSpecialShelf(type);
  const books=shelf.books||[];
  const isMe=!viewing;
  const maxBooks=SP_MAX[type];
  const canAdd=isMe&&books.length<maxBooks;
  const bgImg=isBedside?'images/bedside_bg.png':'images/forbidden_bg.png';
  const bgCss=isBedside?'background-color:#1a0f00;':'background-color:#0d0010;';
  const titleColor=isBedside?'var(--gold)':'#c084fc';
  const accentColor=isBedside?'rgba(201,162,39,.3)':'rgba(192,132,252,.3)';
  const title=isBedside?'🌙 Başucu Kitaplığı':'⛓️ Yasaklı Raf';
  const sub=isBedside?'Yastığının altındaki kitaplar':'Yasak bilginin saklandığı yer';
  const spineColors=isBedside?SPINE_COLORS_BEDSIDE:SPINE_COLORS_FORBIDDEN;
  const bandColors=['rgba(201,162,39,.8)','rgba(255,255,255,.5)','rgba(180,140,60,.9)','rgba(220,180,80,.7)','rgba(255,220,100,.6)','rgba(160,120,40,.9)','rgba(240,200,100,.7)'];
  const textures=[
    'linear-gradient(180deg,rgba(255,255,255,.12) 0%,transparent 40%,rgba(0,0,0,.15) 100%)',
    'linear-gradient(180deg,rgba(255,255,255,.08) 0%,rgba(255,255,255,.04) 50%,rgba(0,0,0,.2) 100%)',
    'linear-gradient(180deg,rgba(255,255,255,.15) 0%,transparent 30%,rgba(0,0,0,.1) 100%)',
    'linear-gradient(180deg,rgba(255,255,255,.06) 0%,transparent 60%,rgba(0,0,0,.25) 100%)',
  ];

  const spinesHtml=books.map((b,i)=>{
    const col=spineColors[i%spineColors.length];
    const band=bandColors[i%bandColors.length];
    const tex=textures[i%textures.length];
    const safeTitle=(b.title||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
    return`<div class="book-spine" style="background:${col}" onclick="openSpecialBook('${type}','${b.id}')" title="${safeTitle}" data-band="${band}" data-tex="${tex}">
      <div style="position:absolute;inset:0;background:${tex};border-radius:inherit;pointer-events:none;z-index:0"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(180deg,${band},transparent);border-radius:3px 6px 0 0;z-index:2"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:linear-gradient(0deg,${band},transparent);border-radius:0 0 6px 6px;z-index:2"></div>
      <span class="book-spine-title">${b.title||'?'}</span>
    </div>`;
  }).join('');

  const addBtn=canAdd?`<button class="spine-add-btn" onclick="openAddSpecialBook('${type}')" title="Kitap ekle">+</button>`:'';

  const titleEl=isBedside
    ?`<div class="special-shelf-title" style="color:${titleColor};cursor:pointer" onclick="triggerBedside()">${title}</div>`
    :`<div class="special-shelf-title glitch-target" data-glitch="⛓️ Yasaklı Raf" onclick="triggerGlitch(this)" style="color:${titleColor};cursor:pointer;border-bottom:1px solid #4c1d95;display:inline-block;padding-bottom:1px" title="Glitch">${title}</div>`;
  const extraOverlay=isBedside
    ?`<div class="bedside-lamp-overlay"></div><div class="bedside-corner-text">Burası senin köşen.</div>`
    :'';

  return`<div class="special-shelf">
    <div class="special-shelf-bg" style="${bgCss}background-image:url('${bgImg}');background-size:100% 100%;background-position:center;background-repeat:no-repeat;width:100%;">
      ${extraOverlay}
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;min-height:180px;width:100%;">
        <div style="padding:.75rem 1.25rem .3rem;background:linear-gradient(180deg,rgba(0,0,0,.6) 0%,transparent 100%)">
          ${titleEl}
          <div class="special-shelf-sub" style="color:${isBedside?'#d4a96a':'#c084fc'}">${sub}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;padding:.5rem 0;min-height:110px;">
          <div class="special-shelf-scroll" style="display:flex;gap:6px;align-items:center;width:min(420px,75%);padding:.2rem .4rem;flex-shrink:0;">            ${spinesHtml}${addBtn}
          </div>
        </div>
      </div>
    </div>
    <div class="special-shelf-footer" style="background:${isBedside?'rgba(26,15,0,.95)':'rgba(13,0,16,.95)'}">
      <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:${titleColor};opacity:.7">${books.length}/${maxBooks} kitap</span>
      ${isMe?`<div style="display:flex;gap:.4rem">
        ${canAdd?`<button class="btn btn-sm" style="font-size:.6rem;background:rgba(201,162,39,.1);color:${titleColor};border:1px solid ${accentColor}" onclick="openAddSpecialBook('${type}')">+ Ekle</button>`:''}
        ${books.length?`<button class="btn btn-sm" style="font-size:.6rem;background:rgba(138,69,19,.1);color:var(--rust);border:1px solid rgba(138,69,19,.2)" onclick="openManageSpecialShelf('${type}')">⚙️ Düzenle</button>`:''}
      </div>`:''}
    </div>
  </div>`;
}

function openSpecialBook(type,bookId){
  const shelf=getSpecialShelf(type);
  const book=(shelf.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  const isBedside=type==='bedside';
  const col=isBedside?'var(--gold)':'#c084fc';
  const isMe=!viewing;
  // Kitaplığımda eşleşen kitabı bul
  const libBook=book.libId?(db.books[viewing||me]||[]).find(b=>b.id==book.libId):null;
  const libLink=libBook?`<button class="btn btn-sm" style="font-size:.7rem;background:rgba(201,162,39,.1);color:var(--leather);border:1px solid rgba(201,162,39,.3)" onclick="closeModal();showPanel('myBooks',document.querySelector('[onclick*=myBooks]'));setTimeout(()=>openBook(${libBook.id},true),150)">📖 Kitaplığımda Aç</button>`:'';
  showSimpleModal(
    `<span style="cursor:${libBook?'pointer':'default'};color:${col}" ${libBook?`onclick="closeModal();showPanel('myBooks',document.querySelector('[onclick*=myBooks]'));setTimeout(()=>openBook(${libBook.id},true),150)"`:''}>${book.title||'Kitap'}</span>`,
    book.author?`<span style="font-style:italic;color:var(--rust)">${book.author}</span>`:'',
    `<div style="padding:.25rem 0">
      ${book.why?`<div style="background:rgba(201,162,39,.06);border-left:3px solid ${col};padding:.5rem .75rem;border-radius:0 4px 4px 0;font-style:italic;font-size:.9rem;line-height:1.6;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow-y:auto;margin-bottom:.75rem">"${book.why}"</div>`:''}
      ${book.author?`<div style="font-size:.82rem;color:var(--rust);margin-bottom:.2rem">✍️ ${book.author}</div>`:''}
      ${isMe?`<div style="margin-top:.75rem;display:flex;gap:.4rem;flex-wrap:wrap">
        ${libLink}
        <button class="btn btn-sm" style="font-size:.7rem;background:rgba(201,162,39,.1);color:var(--rust);border:1px solid rgba(201,162,39,.3)" onclick="openEditSpecialBook('${type}','${bookId}')">✏️ Düzenle</button>
      </div>`:''}
    </div>`
  );
}

function openEditSpecialBook(type,bookId){
  const shelf=getSpecialShelf(type);
  const book=(shelf.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  const isBedside=type==='bedside';
  const whyLabel=isBedside?'"Neden bu kitap?"':'Neden yasaklı?';
  const hasLib=!!book.libId;
  showSimpleModal(
    '✏️ Düzenle','',
    `<div style="display:flex;flex-direction:column;gap:.6rem">
      ${hasLib?`
        <div style="font-size:.85rem;font-weight:600;color:var(--ink)">${book.title}</div>
        ${book.author?`<div style="font-size:.78rem;color:var(--rust)">${book.author}</div>`:''}
      `:`
        <div><div style="font-family:'Space Mono',monospace;font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:var(--rust);margin-bottom:.2rem">Kitap Adı</div>
        <input id="spETitle" class="detail-input" type="text" value="${(book.title||'').replace(/"/g,'&quot;')}" style="width:100%"/></div>
        <div><div style="font-family:'Space Mono',monospace;font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:var(--rust);margin-bottom:.2rem">Yazar</div>
        <input id="spEAuthor" class="detail-input" type="text" value="${(book.author||'').replace(/"/g,'&quot;')}" style="width:100%"/></div>
      `}
      <div><div style="font-family:'Space Mono',monospace;font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:var(--rust);margin-bottom:.2rem">${whyLabel}</div>
      <textarea id="spEWhy" class="detail-input" rows="3" style="width:100%;resize:vertical">${book.why||''}</textarea></div>
      <button class="btn btn-primary" onclick="saveEditSpecialBook('${type}','${bookId}',${hasLib})">💾 Kaydet</button>
    </div>`
  );
}

function saveEditSpecialBook(type,bookId,hasLib){
  const shelf=getSpecialShelf(type);
  const book=(shelf.books||[]).find(b=>b.id===bookId);
  if(!book) return;
  if(!hasLib){
    book.title=(document.getElementById('spETitle')?.value||'').trim()||book.title;
    book.author=(document.getElementById('spEAuthor')?.value||'').trim();
  }
  book.why=(document.getElementById('spEWhy')?.value||'').trim();
  saveSpecialShelf(type,shelf);
  closeModal();
  renderSpecialShelves();
}

function openAddSpecialBook(type){
  const isBedside=type==='bedside';
  const readBooks=spReadBooks();
  const shelf=getSpecialShelf(type);
  const existing=new Set((shelf.books||[]).map(b=>b.libId).filter(Boolean));
  const available=readBooks.filter(b=>!existing.has(String(b.id)));
  const max=SP_MAX[type];
  const remaining=max-((shelf.books||[]).length);
  const whyLabel=isBedside?'"Neden bu kitap?"':'Neden yasaklı?';
  const whyPh=isBedside?'Bu kitabı neden başucuma koydum...':'Bu kitabın sırrı...';

  const checkboxList=available.map(b=>`
    <label style="display:flex;align-items:center;gap:.5rem;padding:.3rem .4rem;border-radius:4px;cursor:pointer;transition:background .12s" onmouseover="this.style.background='rgba(201,162,39,.08)'" onmouseout="this.style.background=''">
      <input type="checkbox" value="${b.id}" style="cursor:pointer;accent-color:var(--gold)"/>
      <span style="font-size:.85rem;color:var(--ink)">${b.title}${b.author?`<span style="color:var(--rust);font-size:.75rem"> — ${b.author}</span>`:''}</span>
    </label>`).join('');

  showSimpleModal(
    isBedside?'🌙 Başucu Kitabı Ekle':'⛓️ Yasaklı Kitap Ekle','',
    `<div style="display:flex;flex-direction:column;gap:.6rem">
      <div>
        <div style="font-family:'Space Mono',monospace;font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:var(--rust);margin-bottom:.2rem">Kitap Seç <span style="opacity:.5;text-transform:none;letter-spacing:0">(${remaining} yer kaldı)</span></div>
        <input id="spSearch" class="detail-input" type="text" placeholder="🔍 Ara..." style="width:100%;margin-bottom:.3rem" oninput="filterSpBooks('${type}')"/>
        <div id="spBookList" style="max-height:200px;overflow-y:auto;border:1px solid rgba(201,162,39,.2);border-radius:4px;padding:.2rem .3rem;background:var(--cream)">
          ${checkboxList||'<div style="padding:.5rem;font-size:.82rem;opacity:.5;font-style:italic">Eklenecek kitap yok</div>'}
        </div>
      </div>
      <div><div style="font-family:'Space Mono',monospace;font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:var(--rust);margin-bottom:.2rem">${whyLabel} <span style="opacity:.5;font-weight:400;text-transform:none;letter-spacing:0">(tek kitap seçilince)</span></div>
      <textarea id="spWhy" class="detail-input" rows="2" placeholder="${whyPh}" style="width:100%;resize:vertical"></textarea></div>
      <button class="btn btn-primary" onclick="addSpecialBook('${type}')">+ Ekle</button>
    </div>`
  );
}

function filterSpBooks(type){
  const q=(document.getElementById('spSearch')?.value||'').toLowerCase();
  const readBooks=spReadBooks();
  const shelf=getSpecialShelf(type);
  const existing=new Set((shelf.books||[]).map(b=>b.libId).filter(Boolean));
  const filtered=readBooks.filter(b=>!existing.has(String(b.id))&&(
    !q||(b.title||'').toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q)
  ));
  const list=document.getElementById('spBookList');
  if(!list) return;
  list.innerHTML=filtered.map(b=>`
    <label style="display:flex;align-items:center;gap:.5rem;padding:.3rem .4rem;border-radius:4px;cursor:pointer" onmouseover="this.style.background='rgba(201,162,39,.08)'" onmouseout="this.style.background=''">
      <input type="checkbox" value="${b.id}" style="cursor:pointer;accent-color:var(--gold)"/>
      <span style="font-size:.85rem;color:var(--ink)">${b.title}${b.author?`<span style="color:var(--rust);font-size:.75rem"> — ${b.author}</span>`:''}</span>
    </label>`).join('')||'<div style="padding:.5rem;font-size:.82rem;opacity:.5;font-style:italic">Sonuç yok</div>';
}

function addSpecialBook(type){
  const checked=[...document.querySelectorAll('#spBookList input[type=checkbox]:checked')].map(c=>c.value);
  const why=(document.getElementById('spWhy')?.value||'').trim();
  if(!checked.length){mesajGoster('En az bir kitap seç.','uyari');return;}
  const shelf=getSpecialShelf(type);
  if(!shelf.books) shelf.books=[];
  const max=SP_MAX[type];
  const remaining=max-shelf.books.length;
  if(checked.length>remaining){mesajGoster(`Sadece ${remaining} kitap daha eklenebilir.`,'uyari');return;}
  const readBooks=spReadBooks();
  const existing=new Set((shelf.books||[]).map(b=>b.libId).filter(Boolean));
  let added=0;
  checked.forEach((id,i)=>{
    const lb=readBooks.find(b=>String(b.id)===id);
    if(!lb||existing.has(String(lb.id))) return;
    shelf.books.push({id:'sp_'+Date.now()+'_'+i,title:lb.title,author:lb.author||'',why:checked.length===1?why:'',libId:String(lb.id),addedAt:new Date().toISOString()});
    added++;
  });
  saveSpecialShelf(type,shelf);
  closeModal();
  renderSpecialShelves();
  notify(type==='bedside'?'🌙 Başucu Kitaplığı':'⛓️ Yasaklı Raf',`${added} kitap eklendi`);
}

function openManageSpecialShelf(type){
  const isBedside=type==='bedside';
  _renderManageModal(type);
}

function _renderManageModal(type){
  const shelf=getSpecialShelf(type);
  const books=shelf.books||[];
  const isBedside=type==='bedside';
  const rows=books.length?books.map(b=>`
    <div id="mrow-${b.id}" style="display:flex;align-items:flex-start;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(201,162,39,.1)">
      <div style="flex:1;min-width:0">
        <div style="font-size:.85rem;font-weight:600;color:var(--ink);word-break:break-word">${b.title}</div>
        ${b.author?`<div style="font-size:.72rem;color:var(--rust)">${b.author}</div>`:''}
        ${b.why?`<div style="font-size:.7rem;font-style:italic;color:#555;margin-top:.1rem;word-break:break-word">"${b.why}"</div>`:''}
      </div>
      <button class="btn btn-sm btn-danger" style="font-size:.6rem;flex-shrink:0" onclick="removeSpecialBookInline('${type}','${b.id}')">🗑</button>
    </div>`).join('')
    :'<div style="font-style:italic;opacity:.5;padding:.5rem 0">Henüz kitap yok.</div>';

  showSimpleModal(
    isBedside?'🌙 Başucu Kitaplığını Düzenle':'⛓️ Yasaklı Rafı Düzenle','',
    `<div id="manageBookList" style="max-height:50vh;overflow-y:auto">${rows}</div>
    <div id="manageFooter-${type}" style="margin-top:.75rem;border-top:1px solid rgba(201,162,39,.15);padding-top:.75rem;display:flex;gap:.4rem;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="closeModal();openAddSpecialBook('${type}')">+ Kitap Ekle</button>
      ${books.length?`<button class="btn btn-sm btn-danger" onclick="clearAllSpecialBooks('${type}')">🗑 Tümünü Sil</button>`:''}
    </div>`
  );
}

function removeSpecialBookInline(type,bookId){
  const row=document.getElementById('mrow-'+bookId);
  if(!row) return;
  // Zaten onay bekliyorsa sil
  if(row.dataset.confirming==='1'){
    const shelf=getSpecialShelf(type);
    shelf.books=(shelf.books||[]).filter(b=>b.id!==bookId);
    saveSpecialShelf(type,shelf);
    renderSpecialShelves();
    row.remove();
    const list=document.getElementById('manageBookList');
    if(list&&!list.querySelector('[id^=mrow-]')) _renderManageModal(type);
    return;
  }
  // İlk tıkta onay iste
  row.dataset.confirming='1';
  const btn=row.querySelector('button');
  if(btn){btn.textContent='Evet, sil';btn.style.background='rgba(160,82,45,.4)';}
  setTimeout(()=>{if(row&&row.dataset.confirming==='1'){row.dataset.confirming='';if(btn){btn.textContent='🗑';btn.style.background='';};}},3000);
}

function clearAllSpecialBooks(type){
  const confirmDiv=document.getElementById('clearAllConfirm-'+type);
  if(confirmDiv){
    const shelf=getSpecialShelf(type);
    shelf.books=[];
    saveSpecialShelf(type,shelf);
    renderSpecialShelves();
    _renderManageModal(type);
    return;
  }
  // Inline onay göster
  const footer=document.getElementById('manageFooter-'+type);
  if(!footer) return;
  footer.innerHTML=`<div id="clearAllConfirm-${type}" style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
    <span style="font-size:.82rem;color:var(--rust)">Tüm kitaplar silinecek, emin misin?</span>
    <button class="btn btn-sm btn-danger" onclick="clearAllSpecialBooks('${type}')">Evet, tümünü sil</button>
    <button class="btn btn-sm" style="font-size:.6rem" onclick="renderManageFooter('${type}')">İptal</button>
  </div>`;
}

function renderManageFooter(type){
  const footer=document.getElementById('manageFooter-'+type);
  if(!footer) return;
  const shelf=getSpecialShelf(type);
  footer.innerHTML=`<button class="btn btn-primary btn-sm" onclick="closeModal();openAddSpecialBook('${type}')">+ Kitap Ekle</button>
    ${(shelf.books||[]).length?`<button class="btn btn-sm btn-danger" onclick="clearAllSpecialBooks('${type}')">🗑 Tümünü Sil</button>`:''}`;
}

function removeSpecialBook(type,bookId){
  const shelf=getSpecialShelf(type);
  shelf.books=(shelf.books||[]).filter(b=>b.id!==bookId);
  saveSpecialShelf(type,shelf);
  closeModal();
  renderSpecialShelves();
}

