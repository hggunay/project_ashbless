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
      sp.style.opacity='1';sp.style.transform='';   // '' → CSS'teki duruş geri gelir (son kitap yaslı kalsın)
    },1200+i*120);
    setTimeout(()=>{sp.style.transition='';},1700+i*120);
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
// 15 Ekim (Gökşin): Başucu yumuşak pastel (yazılar koyu kahve — CSS .special-shelf.basucu)
const SPINE_COLORS_BEDSIDE=['#d9b3ad','#adc4a5','#a9bfd6','#c2b3d9','#e3d1a4','#e6bea3','#a8cfc3','#cba8bb','#d6c6a8','#b6cbdf','#cfbadf','#e2c39f'];
const SPINE_COLORS_FORBIDDEN=['#2a0a3a','#0a1a2a','#2a0a0a','#1a0a2a','#0a2a1a','#2a1a0a','#1a2a0a','#0a0a2a','#2a0a1a','#1a0a0a','#0a2a2a','#2a2a0a'];
const SP_MAX={bedside:7,forbidden:20};
/* ?rafonizle sayfa YÜKLENİRKEN okunur: uygulama sekme değiştirirken adresi temizliyor (replaceState →
   yalnız #panel), sonradan bakınca bulunamıyordu → kitap eklenince raflar kayboldu (Gökşin, 15 Ekim). */
const _RAF_ONIZLEME=/[?&]rafonizle\b/.test(location.search);
let _spYeni=null;                  // {type, ids}: addSpecialBook'un az önce eklediği kitaplar (animasyon için)
function _spOzet(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
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
  const kazandiB=bedsideBadge?bstat(bedsideBadge,targetBooks2).earned:false;
  const kazandiY=forbiddenBadge?bstat(forbiddenBadge,targetBooks2).earned:false;
  /* YÖNETİCİ ÖNİZLEMESİ (15 Ekim, Gökşin: "bende gizli raflar keşfedilmiş değil, açıp bakamıyorum"):
     yalnız hggunay, kendi sayfasında ve YALNIZ adres ?rafonizle ile açılınca, rozet kazanılmamış olsa
     da iki rafı görür; başlıkta "önizleme" etiketi. Gökşin rafları kendisi de keşfetmek istiyor →
     normal açılışta onun için de gizli. Diğer üyeler için HİÇBİR ŞEY değişmez. */
  const onizleme=me==='hggunay'&&!viewing&&_RAF_ONIZLEME;
  const showBedside=kazandiB||onizleme, showForbidden=kazandiY||onizleme;
  let html='';
  if(showBedside) html+=renderSpecialShelfHtml('bedside',onizleme&&!kazandiB);
  if(showForbidden) html+=renderSpecialShelfHtml('forbidden',onizleme&&!kazandiY);
  container.innerHTML=html;
}

function renderSpecialShelfHtml(type,onizlemeMi){
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
  const title=(isBedside?'🌙 Başucu Kitaplığı':'⛓️ Yasaklı Raf')
    +(onizlemeMi?'<span style="font-family:\'Space Mono\',monospace;font-size:.55rem;font-weight:400;opacity:.7;margin-left:.5rem;padding:.1rem .35rem;border:1px solid currentColor;border-radius:3px">önizleme · yalnız sen</span>':'');
  const sub=isBedside?'Yastığının altındaki kitaplar':'Yasak bilginin saklandığı yer';
  /* 15 Ekim (Gökşin onayladı, raf-deneme sayfasında denendi): gerçekçi kitap sırtları. Boy ve kalınlık
     kitap adından hesaplanır (aynı kitap hep aynı boyda); uzun adlara kalın sırt; yuvarlak sırt
     ışığı + kumaş dokusu (CSS ::before); çift altın çizgi; altta küçük süs; Yasaklı'da bazılarında
     kilit; rafın son kitabı yanındakine yaslanır. Başucu renkleri yumuşak pastel. Yeni eklenen kitap
     (_spYeni) animasyonla gelir: Başucu'nda süzülüp oturur + lamba ışığı, Yasaklı'da glitch. */
  const spineColors=isBedside?SPINE_COLORS_BEDSIDE:SPINE_COLORS_FORBIDDEN;
  const bantlar=isBedside?['#8a6420','#9a7428','#7a5a1c','#a07830']:['#a77bd6','#c084fc','#8f6bc4','#b48ae8'];
  const SUSLER=['✦','❦','✧','◆','❧','·'];
  const yeniler=(_spYeni&&_spYeni.type===type)?_spYeni.ids:[];
  const spinesHtml=books.map((b,i)=>{
    const ad=b.title||'?', h=_spOzet(ad);
    // ×0,88: kitaplar raf görselinin ortasındaki boş alana sığsın (Gökşin: "görselin önünü kapatıyor")
    const uzun=ad.length, boy=Math.round((84+h%22)*.88), en=Math.round(Math.max(26+(h>>>5)%14, uzun>24?50:uzun>15?42:0)*.88);
    const col=spineColors[(h>>>9)%spineColors.length], band=bantlar[(h>>>13)%bantlar.length];
    const kilit=!isBedside&&(h>>>17)%3===0;
    // yazı boyu: en uzun KELİME sırtın boyuna sığsın (kelime ortadan bölünmesin — "Fahrenhei t" oluyordu)
    const enUzunKelime=Math.max(...ad.split(/\s+/).map(k=>k.length)), yer=boy-(kilit?40:26);
    const fs=Math.max(7,Math.min(13,en*.38,yer/(enUzunKelime*.56)));
    const safeTitle=ad.replace(/'/g,'&#39;').replace(/"/g,'&quot;');
    const kls=['book-spine',i===books.length-1&&books.length>1?'yasli':'',yeniler.includes(b.id)?'yeni-'+type:''].join(' ');
    return`<div class="${kls}" style="--w:${en}px;--b:${band};width:${en}px;min-width:${en}px;height:${boy}px;background:${col}" onclick="openSpecialBook('${type}','${b.id}')" title="${safeTitle}">
      <div class="sp-bant ust"></div><div class="sp-bant alt"></div>
      ${kilit?`<svg class="sp-kilit" viewBox="0 0 10 12"><path d="M2.5 5V3.5a2.5 2.5 0 015 0V5" fill="none" stroke="${band}" stroke-width="1.3"/><rect x="1" y="5" width="8" height="6.5" rx="1" fill="${band}"/></svg>`:''}
      <span class="book-spine-title" style="font-size:${fs}px;${kilit?'top:34px':''}">${ad}</span>
      <div class="sp-sus">${SUSLER[(h>>>21)%SUSLER.length]}</div>
    </div>`;
  }).join('');
  _spYeni=null;                    // animasyon yalnız bu çizimde: sonraki yeniden çizimlerde tekrar oynamasın

  const addBtn=canAdd?`<button class="spine-add-btn" onclick="openAddSpecialBook('${type}')" title="Kitap ekle">+</button>`:'';

  const titleEl=isBedside
    ?`<div class="special-shelf-title" style="color:${titleColor};cursor:pointer" onclick="triggerBedside()">${title}</div>`
    :`<div class="special-shelf-title glitch-target" data-glitch="⛓️ Yasaklı Raf" onclick="triggerGlitch(this)" style="color:${titleColor};cursor:pointer;border-bottom:1px solid #4c1d95;display:inline-block;padding-bottom:1px" title="Glitch">${title}</div>`;
  const extraOverlay=isBedside
    ?`<div class="bedside-lamp-overlay"></div><div class="bedside-corner-text">Burası senin köşen.</div>`
    :'';

  return`<div class="special-shelf ${isBedside?'basucu':'yasakli'}">
    <div class="special-shelf-bg" style="${bgCss}background-image:url('${bgImg}');background-size:100% 100%;background-position:center;background-repeat:no-repeat;width:100%;">
      ${extraOverlay}
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;min-height:180px;width:100%;">
        <div style="padding:.75rem 1.25rem .3rem;background:linear-gradient(180deg,rgba(0,0,0,.6) 0%,transparent 100%)">
          ${titleEl}
          <div class="special-shelf-sub" style="color:${isBedside?'#d4a96a':'#c084fc'}">${sub}</div>
        </div>
        <!-- kitaplar raf görselinin ORTASINDAKİ boş alanda: Başucu lamba ile masal kitapları arası (%31–63),
             Yasaklı kitap yığını ile mum arası (%33–69); fazlası yatay kaydırılır (Gökşin, 15 Ekim) -->
        <div style="display:flex;justify-content:flex-start;padding:.3rem 0 .5rem ${isBedside?31:33}%;min-height:110px;">
          <div class="special-shelf-scroll" style="display:flex;gap:4px;align-items:flex-end;width:${isBedside?32:36}%;padding:30px .2rem 0;flex-shrink:0;">            ${spinesHtml}${addBtn}
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
  const yeniIdler=[];
  checked.forEach((id,i)=>{
    const lb=readBooks.find(b=>String(b.id)===id);
    if(!lb||existing.has(String(lb.id))) return;
    const yid='sp_'+Date.now()+'_'+i;
    shelf.books.push({id:yid,title:lb.title,author:lb.author||'',why:checked.length===1?why:'',libId:String(lb.id),addedAt:new Date().toISOString()});
    yeniIdler.push(yid);
    added++;
  });
  saveSpecialShelf(type,shelf);
  closeModal();
  _spYeni={type,ids:yeniIdler};
  renderSpecialShelves();
  // yeni kitap görünsün (Gökşin: dolu rafta her eklemede liste başa dönüyordu): raf sona kayar, sayfa rafı gösterir
  const yeniEl=document.querySelector('#specialShelvesContainer .book-spine.yeni-'+type);
  if(yeniEl){
    const sc=yeniEl.closest('.special-shelf-scroll'); if(sc) sc.scrollLeft=sc.scrollWidth;
    yeniEl.closest('.special-shelf')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
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

