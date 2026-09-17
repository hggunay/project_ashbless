// series.js — Seri sistemi modülü (Ö40, 2026-08-04)
// index.html'teki ana <script> bloğundan ÖNCE yükleniyor,
// bu yüzden buradaki fonksiyonlar ana bloktan çağrılabilir.
// NOT: launchConfetti, shimmerNewBadges, currentEarnedBadgeIds,
// pushReadingEvent, readingEventIcon, readingEventText BİLEREK burada DEĞİL —
// bunlar rozet/okuma akışları tarafından da paylaşılan yardımcılar, ana dosyada kaldı.

let seriesPage=1;

// ── SERİ SİSTEMİ ─────────────────────────────────────────────

let seriesSubTab = 'series'; // 'series' | 'paths'

function switchSeriesTab(tab, el){
  renderSeriesList();
}


// ── KİTAPLARIM → SERİLER AKTARMA ──
// Kitaplarım'daki seri grubunu Seriler sekmesine aktarır.
// Seri zaten varsa eksik kitapları tamamlar, yoksa yeni oluşturur.
function exportToSeriesTab(serName){
  const normName = normalizeSeries(serName);
  const data = mySeriesData();

  // Kitaplarım'daki bu serinin kitaplarını bul, seri nosuna göre sırala
  const booksInLib = myBooks()
    .filter(b => normalizeSeries(b.series||'') === normName)
    .sort((a,b) => (a.seriesNum||999) - (b.seriesNum||999));

  if(!booksInLib.length){
    notify('⚠️','Bu seriye ait kitap bulunamadı.',true);
    return;
  }
// Seriler'de aynı isimli seri var mı?
const existingEntry = Object.entries(data.series)
    .find(([,s]) => normalizeSeries(s.name||'') === normName);
if(existingEntry){
    // Var — eksik kitapları ekle
    const [existId, existSer] = existingEntry;
    const existingBookIds = new Set((existSer.books||[]).map(b=>b.bookId).filter(Boolean));
    let added = 0;
    booksInLib.forEach(b => {
      if(!existingBookIds.has(b.id)){
        existSer.books = existSer.books||[];
        existSer.books.push({ bookId: b.id, num: b.seriesNum||null });
        added++;
      }
    });
    if(!existSer.total && booksInLib[0]?.seriesTotal) existSer.total = booksInLib[0].seriesTotal;
	if(!existSer.ongoing && booksInLib[0]?.seriesOngoing) existSer.ongoing = booksInLib[0].seriesOngoing;
    saveDb();
    notify('✅', added > 0 ? `${added} kitap eklendi: ${existSer.name}` : `Tüm kitaplar zaten mevcut: ${existSer.name}`,true);
  } else {
    // Yok — yeni seri oluştur
    const id = 'ser_' + Date.now();
    const books = booksInLib.map(b => ({ bookId: b.id, num: b.seriesNum||null }));
 data.series[id] = {
      id,
      name: serName,
      total: booksInLib[0]?.seriesTotal || null,
      ongoing: booksInLib[0]?.seriesOngoing || false,
      books,
      groupId: null,
      createdAt: new Date().toISOString()
    };
    saveDb();
    notify('✅', `Seri oluşturuldu: ${serName} · ${books.length} kitap`,true);
  }
  renderSeriesList();
}


function mySeriesData(){
  if(!db.seriesData) db.seriesData={};
  if(!db.seriesData[me]) db.seriesData[me]={series:{},paths:{}};
  return db.seriesData[me];
}
// Serinin "toplam kitap" değeri (2026-08-31).
// `ser.total` kullanıcının girdiği HEDEF: "Katilbot Günlükleri" 7 kitaplık bir
// seri ama elinde 4 var — o yüzden hedefi düşürmüyoruz. Ama tersi de oluyordu:
// kayıtlı kitap sayısı hedefi geçince ilerleme %100'ü aşıyordu (canlı veride
// Robot %125, Efsaneler Üçlemesi %300). İkisini birden karşılayan tek kural:
// hangisi büyükse o. Veriye dokunmadan ekranı düzeltir.
function seriToplam(ser, kitapSayisi){
  return Math.max((ser&&ser.total)||0, kitapSayisi||0);
}
function viewSeriesData(){
  const u = viewing||me;
  if(!db.seriesData) db.seriesData={};
  if(!db.seriesData[u]) db.seriesData[u]={series:{},paths:{}};
  return db.seriesData[u];
}

// Bir serinin adını değiştirir — hem seri kaydını hem de o seriye ait tüm kitapları günceller
function renameSeriesGlobally(oldName,newName){
  if(!oldName||!newName||oldName===newName) return 0;
  const normOld=normalizeSeries(oldName);
  let count=0;
  (db.books[me]||[]).forEach(b=>{
    if(b.series&&normalizeSeries(b.series)===normOld){ b.series=newName; count++; }
  });
  const data=mySeriesData();
  Object.values(data.series||{}).forEach(s=>{
    if(s.name&&normalizeSeries(s.name)===normOld) s.name=newName;
  });
  return count;
}

// Bir başlığı kalem butonuyla düzenleme moduna alır — tıklayınca değil, sadece butona basınca yazılabilir olur
function startInlineRename(displayElId, commitFn, styleCss){
  const el=document.getElementById(displayElId);
  if(!el) return;
  const currentValue=el.textContent;
  const originalTag=el.tagName.toLowerCase();
  const originalClass=el.className;
  const originalStyleAttr=el.getAttribute('style')||'';
  const input=document.createElement('input');
  input.type='text';
  input.value=currentValue;
  input.style.cssText=styleCss;
  input.onclick=e=>e.stopPropagation();
  input.onkeydown=e=>{
    if(e.key==='Enter') input.blur();
    if(e.key==='Escape'){ input.value=currentValue; input.blur(); }
  };
  input.onblur=()=>{
    const newVal=input.value.trim();
    if(!newVal||newVal===currentValue){
      // Değişiklik yok — sadece bu alanı hafifçe eski görünümüne döndür,
      // ağır bir tam-render tetikleme (aksi halde aynı kutudaki başka bir
      // kontrole — ör. "devam ediyor" checkbox'ına — tıklamayı yarıda keser)
      const revert=document.createElement(originalTag);
      revert.id=displayElId;
      if(originalClass) revert.className=originalClass;
      if(originalStyleAttr) revert.setAttribute('style',originalStyleAttr);
      revert.textContent=currentValue;
      input.replaceWith(revert);
    } else {
      commitFn(newVal);
    }
  };
  el.replaceWith(input);
  input.focus();
  input.select();
}

function renameSeriesFromEdit(seriesId,newVal){
  const data=mySeriesData();
  const ser=data.series[seriesId];
  if(!ser) return;
  const trimmed=(newVal||'').trim();
  if(!trimmed||trimmed===ser.name){ renderSeriesList(); return; }
  const count=renameSeriesGlobally(ser.name,trimmed);
  saveDb();
  renderSeriesList();
  notify('✅ Seri adı güncellendi', count>0?`${count} kitabın seri adı da güncellendi.`:'Seri adı güncellendi.',true);
}

function startSeriesNameEdit(seriesId){
  const data=mySeriesData();
  const ser=data.series[seriesId];
  if(!ser) return;
  startInlineRename('seriesNameDisp_'+seriesId, (newVal)=>renameSeriesFromEdit(seriesId,newVal),
    "font-family:'Playfair Display',serif;font-size:1.05rem;color:var(--gold);font-weight:700;padding:.1rem .3rem;max-width:280px;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.4);border-radius:4px");
}

function renamePathFromEdit(pathId,newVal){
  if(viewing) return;
  const data=mySeriesData();
  const path=data.paths[pathId];
  if(!path) return;
  const trimmed=(newVal||'').trim();
  if(!trimmed||trimmed===path.name){ renderSeriesList(); return; }
  path.name=trimmed;
  saveDb();
  renderSeriesList();
}

function startPathNameEdit(pathId){
  const data=mySeriesData();
  const path=data.paths[pathId];
  if(!path) return;
  startInlineRename('pathNameDisp_'+pathId, (newVal)=>renamePathFromEdit(pathId,newVal),
    "font-family:'Playfair Display',serif;font-size:1.05rem;color:var(--moss);font-weight:700;padding:.1rem .3rem;flex:1;background:rgba(74,103,65,.12);border:1px solid rgba(74,103,65,.4);border-radius:4px");
}

function startGroupedSeriesNameEdit(seriesId){
  const data=mySeriesData();
  const ser=data.series[seriesId];
  if(!ser) return;
  startInlineRename('grpSeriesNameDisp_'+seriesId, (newVal)=>renameSeriesFromEdit(seriesId,newVal),
    "font-size:.85rem;font-family:'Crimson Pro',serif;color:var(--parchment);flex:1;padding:.1rem .3rem;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.4);border-radius:4px");
}

function checkSeriesMatch(){
  const name = document.getElementById('newSeriesName').value.trim().toLowerCase();
  const banner = document.getElementById('seriesMatchBanner');
  if(!name||name.length<2){ banner.style.display='none'; return; }
  const myBooksList = myBooks().filter(b=>b.series&&b.title&&!b.title.startsWith('ISBN:'));
  const matches = myBooksList.filter(b=>(b.series||'').toLowerCase().includes(name)||name.includes((b.series||'').toLowerCase()));
  if(matches.length){
    const seriesGroups={};
    matches.forEach(b=>{ const s=b.series||'?'; if(!seriesGroups[s])seriesGroups[s]=[]; seriesGroups[s].push(b); });
    const parts = Object.entries(seriesGroups).map(([s,books])=>
      `<strong>${s}</strong> (${books.length} kitap)`
    ).join(', ');
    banner.style.display='block';
    banner.innerHTML=`📚 Kitaplarımda eşleşen seri bulundu: ${parts} — 
      <button class="btn btn-sm" style="font-size:.7rem;margin-left:.4rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" 
        onclick="autoImportSeries()">Otomatik aktar</button>`;
  } else {
    banner.style.display='none';
  }
}

function autoImportSeries(){
  const name = document.getElementById('newSeriesName').value.trim();
  const total = parseInt(document.getElementById('newSeriesTotal').value)||null;
  const st = document.getElementById('seriesCreateStatus');
  if(!name){ st.textContent='⚠️ Seri adı boş olamaz.'; return; }
  const myBooksList = myBooks().filter(b=>b.series&&b.title&&!b.title.startsWith('ISBN:'));
  const nameLow = name.toLowerCase();
  const matches = myBooksList.filter(b=>(b.series||'').toLowerCase().includes(nameLow)||nameLow.includes((b.series||'').toLowerCase()));
  if(!matches.length){ st.textContent='⚠️ Eşleşen kitap bulunamadı.'; return; }
  const data = mySeriesData();
  const id = 'ser_'+Date.now();
  const books = matches
    .sort((a,b)=>(a.seriesNum||999)-(b.seriesNum||999))
    .map((b,i)=>({ bookId:b.id, num:b.seriesNum||i+1 }));
  data.series[id] = { id, name, total:total||books.length, books, createdAt: new Date().toISOString() };
  saveDb();
  document.getElementById('newSeriesName').value='';
  document.getElementById('newSeriesTotal').value='';
  document.getElementById('newSeriesBulkBooks').value='';
  document.getElementById('seriesMatchBanner').style.display='none';
  st.textContent=`✓ ${matches.length} kitap otomatik aktarıldı!`;
  setTimeout(()=>{ st.textContent=''; }, 3000);
  renderSeriesList();
}

function checkAndOfferSeriesLink(book){
  if(!book||!book.series) return;
  const serName = book.series;
  const normName = normalizeSeries(serName);
  const data = mySeriesData();
  // Serilerim'de aynı isimde seri var mı?
  const existingSer = Object.values(data.series||{}).find(s=>normalizeSeries(s.name||'')===normName);
  if(existingSer){
    // Kitap zaten ekli mi?
    const alreadyIn = (existingSer.books||[]).some(b=>b.bookId===book.id);
    if(alreadyIn) return;
    // Otomatik ekle
    existingSer.books = existingSer.books||[];
    existingSer.books.push({ bookId:book.id, num:book.seriesNum||null, pages:book.pages||null });
    existingSer.books.sort((a,b)=>(a.num||999)-(b.num||999));
    saveDb();
    notify('📚', '"'+book.title+'" → "'+existingSer.name+'" serisine eklendi.');
  } else {
    // Seri yok — bildirimle sor
    const notifId = 'serlink_'+book.id;
    const existing = document.getElementById(notifId);
    if(existing) return;
    const bar = document.createElement('div');
    bar.id = notifId;
    bar.style.cssText = 'position:fixed;bottom:4.5rem;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(30,45,30,.97);border:1px solid rgba(201,162,39,.35);border-radius:8px;padding:.6rem 1rem;display:flex;align-items:center;gap:.75rem;font-size:.82rem;color:var(--parchment);box-shadow:0 4px 16px rgba(0,0,0,.4);max-width:90vw';
    bar.innerHTML = '<span>📚 <b style="color:var(--gold)">'+serName+'</b> için serilerim listesi oluşturulsun mu?</span>'
      + '<div style="display:flex;gap:.4rem;flex-shrink:0">'
      + '<button class="btn btn-sm btn-primary" style="font-size:.72rem" onclick="createSeriesFromBook(' + book.id + ',\'' + notifId + '\')">Oluştur</button>'
      + '<button class="btn btn-sm" style="font-size:.72rem;background:rgba(201,162,39,.1);color:var(--gold)" onclick="document.getElementById(\'' + notifId + '\')?.remove()">Hayır</button>'
      + '</div>';
    document.body.appendChild(bar);
    setTimeout(()=>bar.remove(), 12000);
  }
}

function createSeriesFromBook(bookId, notifId){
  document.getElementById(notifId)?.remove();
  const book = myBooks().find(b=>b.id===bookId);
  if(!book||!book.series) return;
  const data = mySeriesData();
  const id = 'ser_'+Date.now();
  const myBooksList = myBooks().filter(b=>b.series===book.series&&!b.title.startsWith('ISBN:'));
  const books = myBooksList.map(b=>({ bookId:b.id, num:b.seriesNum||null, pages:b.pages||null }))
    .sort((a,b)=>(a.num||999)-(b.num||999));
  data.series[id] = { id, name:book.series, total:book.seriesTotal||null, books, ongoing:false, createdAt:new Date().toISOString() };
  saveDb();
  notify('📚', '"'+book.series+'" serisi oluşturuldu ve '+books.length+' kitap eklendi.');
  renderSeriesList();
}

function createSeries(){
  const name = document.getElementById('newSeriesName').value.trim();
  const total = parseInt(document.getElementById('newSeriesTotal').value)||null;
  const ongoing = document.getElementById('newSeriesOngoing')?.checked||false;
  const bulkText = document.getElementById('newSeriesBulkBooks').value.trim();
  const bulkAuthor = document.getElementById('newSeriesBulkAuthor').value.trim();
  const groupId = (document.getElementById('newSeriesGroupId')||{}).value||'';
  const st = document.getElementById('seriesCreateStatus');
  if(!name){ st.textContent='⚠️ Seri adı boş olamaz.'; return; }
  const data = mySeriesData();
  const id = 'ser_'+Date.now();
  // Toplu kitapları parse et
  const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
  let books = [];
  if(bulkText){
    const lines = bulkText.split("\n").map(l=>l.trim()).filter(Boolean);
    lines.forEach((line,i)=>{
      // Kitaplarımda var mı?
      const linked = myBooksList.find(b=>b.title.toLowerCase()===line.toLowerCase());
      if(linked){
        books.push({ bookId:linked.id, num:i+1 });
      } else {
        books.push({ manualTitle:line, manualAuthor:bulkAuthor||'', num:i+1, planned:true });
      }
    });
  }
 data.series[id] = { id, name, total:total||books.length||null, books, groupId:groupId||null, ongoing, createdAt: new Date().toISOString() };
  if(groupId && data.paths[groupId]){
    data.paths[groupId].steps = data.paths[groupId].steps||[];
    data.paths[groupId].steps.push({seriesId:id});
  }
  saveDb();
  document.getElementById('newSeriesName').value='';
  document.getElementById('newSeriesTotal').value='';
  const ongoingEl=document.getElementById('newSeriesOngoing'); if(ongoingEl) ongoingEl.checked=false;
  document.getElementById('newSeriesBulkBooks').value='';
  document.getElementById('newSeriesBulkAuthor').value='';
  document.getElementById('seriesMatchBanner').style.display='none';
  const bookCount = books.length;
  st.textContent=`✓ Seri oluşturuldu${bookCount?` · ${bookCount} kitap eklendi`:''}!`;
  setTimeout(()=>{ st.textContent=''; }, 3000);
  renderSeriesList();
}

function confirmDeleteSeries(evt, id){
  const old = document.getElementById('seriesDeleteConfirm_'+id);
  if(old){ old.remove(); return; }
  const card = evt.target.closest('.series-card');
  if(!card) return;
  const box = document.createElement('div');
  box.id = 'seriesDeleteConfirm_'+id;
  box.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin:.3rem 0;padding:.4rem .6rem;background:rgba(139,0,0,.12);border:1px solid rgba(139,0,0,.3);border-radius:6px;font-family:Crimson Pro,serif;font-size:.82rem;color:var(--rust);flex-wrap:wrap';
  box.innerHTML = `⚠️ Bu seriyi silmek istediğine emin misin?
    <button class="btn btn-sm btn-danger" style="font-size:.72rem;padding:.15rem .5rem;margin-left:.25rem" onclick="deleteSeries('${id}')">Evet, sil</button>
    <button class="btn btn-sm" style="font-size:.72rem;padding:.15rem .5rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)" onclick="cancelDeleteSeries('${id}')">İptal</button>`;
  const header = card.querySelector('.series-card-header');
  if(header) header.after(box);
  else card.prepend(box);
}
function cancelDeleteSeries(id){
  const box = document.getElementById('seriesDeleteConfirm_'+id);
  if(box) box.remove();
}
function deleteSeries(id){
  const data = mySeriesData();
  const ser = data.series[id];
  // Akıştan ilgili seri eventlerini temizle
  if(ser && db.seriesEvents && db.seriesEvents[me]){
    db.seriesEvents[me] = db.seriesEvents[me].filter(ev=>ev.seriesId!==id&&ev.seriesName!==ser.name);
  }
  delete data.series[id];
  // Okuma yollarından da temizle
  Object.values(data.paths||{}).forEach(p=>{
    p.steps = (p.steps||[]).filter(s=>s.seriesId!==id);
  });
  saveDb();
  renderSeriesList();
}

function toggleSeriesAddMode(seriesId){
  const single = document.getElementById('seriesAddSingle_'+seriesId);
  const bulk = document.getElementById('seriesAddBulk_'+seriesId);
  const btn = document.getElementById('seriesAddModeBtn_'+seriesId);
  if(!single||!bulk||!btn) return;
  const isBulk = getComputedStyle(bulk).display!=='none';
  single.style.display = isBulk ? '' : 'none';
  bulk.style.display = isBulk ? 'none' : '';
  btn.textContent = isBulk ? '📋 Toplu giriş' : '✏️ Tek kitap';
}

function addBulkBooksToSeries(seriesId){
  const textEl = document.getElementById('seriesBulkText_'+seriesId);
  const authorEl = document.getElementById('seriesBulkAuthor_'+seriesId);
  if(!textEl) return;
  const raw = textEl.value;
  const lines = raw.split('\n').flatMap(l=>l.split(',')).map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return;
  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser) return;
  const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
  const commonAuthor = authorEl?authorEl.value.trim():'';
  // Math.floor: son satır ara öykü (ör. 7.5) olabilir — toplu eklenen
  // kitaplar 8.5, 9.5 diye değil 8, 9 diye devam etsin.
  const startNum = (ser.books||[]).reduce((m,b)=>Math.max(m,Math.floor(b.num||0)),0);
  let added = 0;
  lines.forEach((line,i)=>{
    const linked = myBooksList.find(b=>b.title.toLowerCase()===line.toLowerCase());
    if(linked){
      if(!(ser.books||[]).find(b=>b.bookId===linked.id)){
        ser.books = ser.books||[];
        ser.books.push({ bookId:linked.id, num:startNum+i+1 });
        added++;
      }
    } else {
      if(!(ser.books||[]).find(b=>b.manualTitle&&b.manualTitle.toLowerCase()===line.toLowerCase())){
        ser.books = ser.books||[];
        ser.books.push({ manualTitle:line, manualAuthor:commonAuthor, num:startNum+i+1, planned:true });
        added++;
      }
    }
  });
  ser.books.sort((a,b)=>(a.num||999)-(b.num||999));
  saveDb();
  textEl.value='';
  if(authorEl) authorEl.value='';
  renderSeriesList();
}

function addBookToSeries(seriesId){
  const titleEl = document.getElementById('seriesBookTitle_'+seriesId);
  const authorEl = document.getElementById('seriesBookAuthor_'+seriesId);
  const numEl = document.getElementById('seriesBookNum_'+seriesId);
  const pagesEl = document.getElementById('seriesBookPages_'+seriesId);
  const pubEl = document.getElementById('seriesBookPub_'+seriesId);
  const title = titleEl ? titleEl.value.trim() : '';
  if(!title){ notify('⚠️','Kitap adı boş olamaz.'); return; }
  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser) return;

  const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
  const linked = myBooksList.find(b=>b.title.toLowerCase()===title.toLowerCase());

  if(linked && (ser.books||[]).find(b=>b.bookId===linked.id)){
    notify('⚠️','Bu kitap zaten seriye ekli.'); return;
  }
  if(!linked && (ser.books||[]).find(b=>b.manualTitle&&b.manualTitle.toLowerCase()===title.toLowerCase())){
    notify('⚠️','Bu kitap zaten seriye ekli.'); return;
  }

  const num = parseInt(numEl?.value)||null;
  const pages = parseInt(pagesEl?.value)||null;
  const publisher = pubEl?pubEl.value.trim():'';

  // Yazar: önce elle girileni al, yoksa seride önceki kitaptan al
  let author = authorEl?authorEl.value.trim():'';
  if(!author && linked) author = linked.author||'';
  if(!author){
    // Serideki ilk kitaptan yazar al
    const firstWithAuthor = (ser.books||[]).find(b=>b.manualAuthor||b.bookId);
    if(firstWithAuthor){
      if(firstWithAuthor.manualAuthor) author = firstWithAuthor.manualAuthor;
      else {
        const lb = myBooksList.find(b=>b.id===firstWithAuthor.bookId);
        if(lb) author = lb.author||'';
      }
    }
  }

  ser.books = ser.books||[];

  // ── ARAYA EKLEME: sonraki numaralar kendiliğinden kaysın (2026-08-31) ──
  // Eskiden verilen numara zaten kullanılıyorsa iki kitap aynı numarayı alıyordu;
  // canlı veride üç seride bu olmuştu (Dune'da iki #6, Hanedanlar'da iki #2,
  // Efsaneler'de iki #1) ve Gökşin elle düzeltiyordu.
  // Kaydırma YALNIZCA o numara doluysa yapılıyor: 1,2,4 olan seriye #3 eklenirse
  // boş yer dolduruluyor, 4 gereksiz yere 5'e itilmiyor.
  if(num!=null && (ser.books||[]).some(b=>b.num===num)){
    ser.books.forEach(b=>{ if(b.num!=null && b.num>=num) b.num = b.num+1; });
  }

  if(linked){
    ser.books.push({ bookId: linked.id, num, pages: pages||linked.pages||null, publisher: publisher||linked.publisher||null });
  } else {
    ser.books.push({ manualTitle: title, manualAuthor: author, num, pages, publisher: publisher||null, planned: true });
  }
  ser.books.sort((a,b)=>(a.num||999)-(b.num||999));

  // ── TOPLAM: yalnızca YÜKSELT, asla düşürme (2026-08-31) ──
  // `total` çoğu zaman kullanıcının bilinçli girdiği hedef: "Katilbot Günlükleri"
  // 7 kitaplık bir seri ama elinde 4 var, "Before the Coffee Gets Cold" 5'lik ama
  // 2 var. Kitap sayısına EŞİTLEMEK bu hedefleri bozardı. Sadece kayıtlı kitap
  // sayısı hedefi geçtiğinde yükseltiyoruz (Robot'ta 5 kitap vardı, toplam 4'te
  // kalmıştı). Hiç girilmemişse (null) dokunmuyoruz — ekran zaten kitap sayısını
  // gösteriyor, oraya sayı yazmak "hedef belirlenmiş" gibi görünürdü.
  // ⚠️ Ara öyküler SAYILMIYOR (2026-09-17): yoksa Katilbot'a HOME'u bağlamak
  // 7'lik hedefi kendiliğinden 8'e çıkarabilirdi.
  const _kitapSayisi = ser.books.filter(b=>!b.storyId).length;
  if(ser.total!=null && _kitapSayisi>ser.total) ser.total = _kitapSayisi;

  saveDb();
  titleEl.value='';
  if(authorEl) authorEl.value='';
  if(numEl) numEl.value='';
  if(pagesEl) pagesEl.value='';
  if(pubEl) pubEl.value='';
  hideSeriesAc(seriesId);
  // Tüm listeyi render etmek yerine sadece bu kartın kitap listesini güncelle
  // böylece düzenleme formu açık kalır
  _refreshSeriesBookList(seriesId);
}

// Seri kartındaki tek bir kitap satırının HTML'i — renderSeriesList VE _refreshSeriesBookList
// tarafından ortak kullanılır (önceden iki ayrı kopya vardı, biri kaçış hatası taşıyordu — Ö22)
function renderSeriesBookItemHtml(seriesId, bk){
  if(bk.storyId) return oykuSatiriHtml(seriesId, bk);   // ara öykü (2026-09-17)
  const b = bk.book;
  const mapKey = seriesId+'_'+ensureBkEid(bk);
  seriesBkMap[mapKey] = bk;
  const isReading = b.readingStatus==='reading';
  const isRead = !isReading && !!b.readingStatus && b.readingStatus!=='paused' && b.readingStatus!=='wishlist' && b.readingStatus!=='planned' && b.readingStatus!=='want';
  const isPlanned = !isReading && !isRead && b.readingStatus!=='paused';
  const statusIcon = isReading ? '📖' : b.readingStatus==='paused' ? '🚧' : isRead ? '✅' : '⏳';
  const pageInfo = isReading && b.currentPage && b.pages
    ? `<span style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--moss)">${b.currentPage}/${b.pages}s</span>` : '';
  const removeKey = bk.planned ? `'${seriesId}',null,true,'${(bk.manualTitle||'').replace(/'/g,"\\'")}'` : `'${seriesId}',${b.id},false`;
  const canStart = !isReading && b.id && !viewing;
  const isOwn = !viewing;
  const plannedBtn = (!isReading&&bk.planned&&!viewing)?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .4rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" data-sid="${seriesId}" data-mt="${(bk.manualTitle||'').replace(/"/g,'&quot;')}" data-ma="${(bk.manualAuthor||'').replace(/"/g,'&quot;')}" onclick="startPlannedBook(this.dataset.sid,this.dataset.mt,this.dataset.ma)">📖 Başla</button>`:'';
  return `<div class="series-book-item ${isReading?'reading':isPlanned?'planned':isRead?'':'unread'}" data-eid="${ensureBkEid(bk)}" ${b.id&&!isPlanned?`onclick="openBook(${b.id})"`:''}>
    <span class="series-book-num">${bk.num?'#'+bk.num:''}</span>
    <span class="series-book-status">${statusIcon}</span>
    <span class="series-book-title">${escapeHtml(b.title)}${b.author?'<span style="opacity:.5;font-size:.75rem"> — '+escapeHtml(b.author)+'</span>':''}${(bk.pages||b.pages)?'<span style="opacity:.5;font-size:.7rem"> · '+(bk.pages||b.pages)+' sayfa</span>':''}</span>
    ${isPlanned?'<span style="font-family:var(--mono,monospace);font-size:.58rem;color:var(--gold-light);opacity:.92">planlanan</span>':''}
    ${pageInfo}
    <div style="display:flex;gap:.25rem;margin-left:auto" onclick="event.stopPropagation()">
      ${canStart&&b.id?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .4rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" onclick="startReadingSeriesBook(${b.id})">📖 ${isRead?'Tekrar':'Başla'}</button>`:plannedBtn}
      ${isOwn?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .35rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)" onclick="openEditSeriesBook(event,'${seriesId}','${ensureBkEid(bk)}')">✏️</button>
      <button class="btn btn-sm btn-danger" style="font-size:.55rem;padding:.1rem .35rem" onclick="confirmRemoveBookFromSeries(event,${removeKey})">✕</button>`:''}
    </div>
  </div>`;
}

function _refreshSeriesBookList(seriesId){
  // renderSeriesList çağırmak yerine sadece bu kartın kitap listesini güncelle
  const booksContainer = document.getElementById('seriesBooks_'+seriesId);
  if(!booksContainer){ renderSeriesList(); return; }

  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser){ renderSeriesList(); return; }

  // Başka kitapların açık düzenleme formları varsa (kaydedilmemiş girdileriyle) hatırla —
  // liste yeniden çizilince kaybolmasınlar (Ö40, çoklu-düzenleme kaydetme çakışması düzeltmesi).
  const openEditPrefix = 'seriesEditForm_'+seriesId+'_';
  const openEdits = [...booksContainer.querySelectorAll('[id^="'+openEditPrefix+'"]')].map(div=>{
    const eid = div.id.slice(openEditPrefix.length);
    return {
      eid,
      num: document.getElementById('edit_num_'+div.id)?.value,
      pages: document.getElementById('edit_pages_'+div.id)?.value,
      title: document.getElementById('edit_title_'+div.id)?.value,
      author: document.getElementById('edit_author_'+div.id)?.value
    };
  });

  const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
  // Global map'i güncelle — openEditSeriesBook buraya bakıyor
  Object.keys(seriesBkMap).forEach(k=>{ if(k.startsWith(seriesId+'_')) delete seriesBkMap[k]; });

  (ser.books||[]).forEach(ensureBkEid);
  const books = (ser.books||[]).map(bk=>{
    if(bk.storyId) return oykuSatiriniCoz(bk, me);   // ara öykü — bkz. ARA ÖYKÜLER
    if(bk.planned){
      const linked = myBooksList.find(b=>b.title.toLowerCase()===(bk.manualTitle||'').toLowerCase());
      if(linked) return {...bk, book:linked, planned:false};
      return {...bk, book:{id:null,title:bk.manualTitle,author:bk.manualAuthor||'',readingStatus:'planned'}};
    }
    const book = myBooksList.find(b=>b.id===bk.bookId);
    return book ? {...bk, book} : null;
  }).filter(Boolean);

  const booksReading = books.filter(bk=>bk.book.readingStatus==='reading');
  const booksRead = books.filter(bk=>{
    const s=bk.book.readingStatus;
    if(!s) return !!bk.bookId;
    return s!=='reading'&&s!=='paused'&&s!=='wishlist'&&s!=='planned';
  });
  const booksPaused = books.filter(bk=>bk.book.readingStatus==='paused');
  const booksPlanned = books.filter(bk=>{
    const s=bk.book.readingStatus;
    if(!s) return !bk.bookId;
    return s==='wishlist'||s==='planned';
  });

  const groupHtml = (label, icon, items) => items.length ? `
    <div style="font-family:'Space Mono',monospace;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--gold-light);opacity:.92;padding:.4rem .4rem .2rem">${icon} ${label} (${items.length})</div>
    ${items.map(bk=>renderSeriesBookItemHtml(seriesId,bk)).join('')}
  ` : '';

  const listHtml = groupHtml('Şu An Okunuyor','📖',booksReading) +
    groupHtml('Okundu','✅',booksRead) +
    groupHtml('Yarım Bırakıldı','🚧',booksPaused) +
    groupHtml('Okunacak / Planlanan','⏳',booksPlanned);

  // Sadece kitap listesi kısmını güncelle, form alanlarına dokunma
  const listContainer = booksContainer.querySelector('.series-book-list-inner');
  if(listContainer){
    listContainer.innerHTML = listHtml;
  } else {
    // Wrapper yoksa ekle
    const wrapper = document.createElement('div');
    wrapper.className = 'series-book-list-inner';
    wrapper.innerHTML = listHtml;
    booksContainer.insertBefore(wrapper, booksContainer.firstChild);
  }

  // Hatırlanan açık formları, girilen değerleriyle geri koy
  if(openEdits.length){
    const freshListContainer = booksContainer.querySelector('.series-book-list-inner');
    openEdits.forEach(({eid,num,pages,title,author})=>{
      const bk = books.find(b=>b._eid===eid);
      const item = freshListContainer && freshListContainer.querySelector('[data-eid="'+eid+'"]');
      if(!bk || !item) return;
      const div = _buildSeriesEditFormEl(seriesId, eid, bk, {num,pages,title,author});
      item.insertAdjacentElement('afterend', div);
    });
  }

  // Buton metnini güncelle
  const btn = document.getElementById('seriesToggleBtn_'+seriesId);
  if(btn) btn.textContent = '▲ Gizle';

  // Toplam/yüzde göstergesini de güncelle (önceden eksikti — Ö22)
  const statsEl = document.getElementById('seriesStats_'+seriesId);
  if(statsEl){
    // Ara öyküler sayaca girmez — toplam da okunan da yalnızca kitaplardan.
    const kitaplar = seriKitaplari(books);
    const readCount = kitaplar.filter(bk=>{
      const b=bk.book; if(!b||b.readingStatus==='planned'||b.readingStatus==='reading'||b.readingStatus==='paused'||b.readingStatus==='wishlist') return false; return true;
    }).length;
    const total = seriToplam(ser, kitaplar.length) || 1;
    const ongoing = ser.ongoing||false;
    const totalDisplay = ongoing ? (seriToplam(ser, kitaplar.length)||'?')+'+' : (seriToplam(ser, kitaplar.length)||'?');
    const pct = Math.round((readCount/total)*100);
    const isDone = readCount>=total && total>0;
    statsEl.textContent = readCount+' / '+totalDisplay+' kitap · %'+pct+(isDone?' · ✅ Tamamlandı':'');
  }
}

function seriesAcSearch(seriesId){
  const input = document.getElementById('seriesBookTitle_'+seriesId);
  const dropdown = document.getElementById('seriesAcList_'+seriesId);
  if(!input||!dropdown) return;
  const q = input.value.trim().toLowerCase();
  if(q.length < 2){ dropdown.style.display='none'; return; }

  // Tüm kitaplarda ara (seri filtresi yok)
  const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
  const matches = myBooksList.filter(b=>
    b.title.toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q)
  ).slice(0,6);

  if(!matches.length){ dropdown.style.display='none'; return; }


  dropdown.innerHTML = matches.map(b=>{
    const titleAttr = (b.title||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    const authorAttr = (b.author||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return `<div class="series-ac-item" data-sid="${seriesId}" data-title="${titleAttr}" data-author="${authorAttr}" onclick="var el=this;selectSeriesAc(el.dataset.sid,el.dataset.title,el.dataset.author)">
      <span style="font-size:.88rem;color:var(--parchment);font-weight:600">${b.title}</span>
      ${b.author?`<span style="font-size:.75rem;color:var(--gold-light);opacity:.92"> — ${b.author}</span>`:''}
      ${b.series?`<span style="font-size:.65rem;color:var(--moss);font-family:'Space Mono',monospace"> · ${b.series}</span>`:''}
    </div>`;
  }).join('');
  dropdown.style.display='block';
}

function selectSeriesAc(seriesId, title, author){
  const titleEl = document.getElementById('seriesBookTitle_'+seriesId);
  const authorEl = document.getElementById('seriesBookAuthor_'+seriesId);
  if(titleEl) titleEl.value = title;
  if(authorEl) authorEl.value = author;
  hideSeriesAc(seriesId);
}

function hideSeriesAc(seriesId){
  const dropdown = document.getElementById('seriesAcList_'+seriesId);
  if(dropdown) dropdown.style.display='none';
}

function confirmRemoveBookFromSeries(evt, seriesId, bookId, isPlanned, manualTitle){
  evt.stopPropagation();
  const data = mySeriesData();
  const ser = data.series[seriesId];
  const bookTitle = isPlanned ? manualTitle : (myBooks().find(b=>b.id===bookId)||{}).title || 'Bu kitap';
  const existId = 'rmConf_'+seriesId+'_'+(bookId||manualTitle||'').toString().replace(/[^a-z0-9]/gi,'_');
  const exist = document.getElementById(existId);
  if(exist){ exist.remove(); return; }
  const item = evt.target.closest('.series-book-item');
  if(!item) return;
  const args = isPlanned ? `'${seriesId}',null,true,'${(manualTitle||'').replace(/'/g,"\'")}'` : `'${seriesId}',${bookId},false`;
  const box = document.createElement('div');
  box.id = existId;
  box.style.cssText = 'display:flex;align-items:center;gap:.4rem;padding:.25rem .5rem;background:rgba(139,0,0,.12);border:1px solid rgba(139,0,0,.3);border-radius:4px;font-family:Crimson Pro,serif;font-size:.78rem;color:var(--gold-light);flex-wrap:wrap;margin-top:.2rem';
  box.innerHTML = `"${bookTitle}" seriden çıkar?
    <button class="btn btn-sm btn-danger" style="font-size:.68rem;padding:.1rem .4rem" onclick="removeBookFromSeries(${args})">Evet</button>
    <button class="btn btn-sm" style="font-size:.68rem;padding:.1rem .4rem;background:rgba(201,162,39,.1);color:var(--gold)" onclick="this.closest('div[id^=rmConf]').remove()">İptal</button>`;
  item.insertAdjacentElement('afterend', box);
}
function removeBookFromSeries(seriesId, bookId, isPlanned, manualTitle){
  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser) return;
  if(isPlanned){
    ser.books = (ser.books||[]).filter(b=>!(b.planned&&b.manualTitle===manualTitle));
  } else {
    ser.books = (ser.books||[]).filter(b=>b.bookId!==bookId);
  }
  saveDb();
  _refreshSeriesBookList(seriesId);
}

function updateSeriesTotal(seriesId, val){
  const data = mySeriesData();
  if(data.series[seriesId]) data.series[seriesId].total = parseInt(val)||null;
  saveDb();
  renderSeriesList();
}
function toggleSeriesTotalEdit(seriesId){
  const v=document.getElementById('seriesTotalView_'+seriesId);
  const e=document.getElementById('seriesTotalEdit_'+seriesId);
  if(!v||!e) return;
  const isEditing = e.style.display!=='none';
  e.style.display = isEditing?'none':'flex';
  v.style.display = isEditing?'flex':'none';
  // Aynı anda seri adını da yazılabilir hale getir (tek pencil, iki alan)
  if(!isEditing){
    const nameDisp=document.getElementById('seriesNameDisp_'+seriesId);
    if(nameDisp) startSeriesNameEdit(seriesId);
  }
}
function toggleSeriesOngoing(seriesName, val){
  const data = mySeriesData();
  const entry = Object.values(data.series||{}).find(s=>normalizeSeries(s.name||'')===normalizeSeries(seriesName||''));
  if(entry) entry.ongoing = val;
  (db.books[me]||[]).forEach(b=>{
    if(normalizeSeries(b.series||'')===normalizeSeries(seriesName||'')) b.seriesOngoing = val;
  });
  saveDb();
  renderSeriesList();
}

/* ── SERİ NO'YU KİTABA KOPYALA (2026-09-16, Gökşin bildirdi) ───────────────
   Aynı bilgi İKİ yerde duruyordu ve hiç eşitlenmiyordu:
     · seri kaydındaki `ser.books[i].num`  → Serilerim listesinde görünen sıra
     · kitabın kendi `book.seriesNum`      → kitap modalindeki "Seri No" kutusu
   Seriye toplu kitap eklerken numara YALNIZCA seri kaydına yazılıyor
   (`createSeries` → `num:i+1`, yani senin yazdığın sıra). Kitap kaydı ise
   "📖 Başla" ile o an oluşturuluyor ve numarasız doğuyordu — Sandman'in 3.
   kitabına başlayınca modalde "Seri No" boş çıkmasının sebebi buydu.

   ⚠️ TEK YÖNLÜ ve YALNIZCA BOŞSA. Kitapta bir numara varsa ona dokunulmuyor:
   elle yazılmış bir cilt numarası, seri kaydındaki sıradan daha güvenilirdir.
   Ters yöne (kitaptan seriye) yazmıyor; orayı `saveFieldCommit` zaten
   `recalcSeriesCompletion` ile kendi yoluyla güncelliyor.
   Rozetlerin hiçbiri `seriesNum`'a bakmıyor (tarandı) — bu alan yalnızca
   görüntüleme ve sıralama için, o yüzden doldurmanın yan etkisi yok. */
function seriNoDoldur(book, ser, bkEntry){
  if(!book || !ser || book.seriesNum) return false;
  const bk = bkEntry || (ser.books||[]).find(b=>b.bookId===book.id);
  if(!bk || !bk.num) return false;
  book.seriesNum = bk.num;
  return true;
}

function startReadingSeriesBook(bookId){
  const book = myBooks().find(b=>b.id===bookId);
  if(!book) return;
  const prevValid=snapshotValidBooks();
  book.previousStatus = book.readingStatus||'wishlist';
  book.readingStatus = 'reading';
  book.startDate = book.startDate || todayLocal();
  // Hangi seriye ait — seri event'i kaydet
  const data = mySeriesData();
  Object.values(data.series||{}).forEach(ser=>{
    const bk = (ser.books||[]).find(b=>b.bookId===bookId);
    if(!bk) return;
    seriNoDoldur(book, ser, bk);
    const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
    const readCount = (ser.books||[]).filter(b=>{
      if(!b.bookId) return false;
      const lb = myBooksList.find(mb=>mb.id===b.bookId);
      return lb && ((lb.readingStatus!=='reading'&&lb.readingStatus!=='paused')||!!(lb.endDate||lb.yearOnly))&&lb.readingStatus!=='wishlist'&&lb.readingStatus!=='planned';
    }).length;
    const eventType = readCount===0 ? 'series_start' : 'series_continue';
    addSeriesEvent(ser.id, ser.name, book.title, eventType);
  });
  saveDb();
  checkAndAwardBadges(prevValid);
  renderSeriesList();
  notify('📖 Okumaya Başlandı', book.title+' şu an okunanlar listesine eklendi.');
  var _t=[...document.querySelectorAll('.nav-tab')].find(function(t){return (t.getAttribute('onclick')||'').includes("'myBooks'");});
  showPanel('myBooks',_t||null);
}


function addSeriesEvent(seriesId, seriesName, bookTitle, type){
  if(!db.seriesEvents) db.seriesEvents={};
  if(!db.seriesEvents[me]) db.seriesEvents[me]=[];
  db.seriesEvents[me].push({
    id: Date.now(),
    seriesId, seriesName, bookTitle, type,
    ts: new Date().toISOString(),
    reactions: {}
  });
}

function startPlannedBook(seriesId, manualTitle, manualAuthor){
  // Planned kitabı kitaplığa 'reading' olarak ekle
  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser) return;
  const title = manualTitle.trim();
  if(!title){ notify('⚠️ Hata','Kitap adı bulunamadı.'); return; }
  // Kitaplıkta zaten var mı?
  const existing = myBooks().find(b=>b.title.toLowerCase()===title.toLowerCase());
  if(existing){
    existing.readingStatus='reading';
    // Seri kaydındaki planned girişini bookId ile güncelle
    const bkEntry = (ser.books||[]).find(b=>b.planned&&(b.manualTitle||'').toLowerCase()===title.toLowerCase());
    if(bkEntry){ delete bkEntry.planned; delete bkEntry.manualTitle; delete bkEntry.manualAuthor; bkEntry.bookId=existing.id; }
    seriNoDoldur(existing, ser, bkEntry);
    saveDb(); render();
    notify('📖 Okumaya Başlandı', title+' şu an okunanlar listesine eklendi.');
    return;
  }
  // Yeni kitap olarak ekle
  const now = new Date();
  const book = {
    id: Date.now(),
    title, author: manualAuthor||'',
    readingStatus: 'reading',
    genres:[], formats:['kitap'],
    series: ser.name||null,
    month: todayLocal().substring(0,7),
    addedAt: now.toISOString(),
    startDate: todayLocal(),
    endDate: null, currentPage: null,
    retroactive:false, nightReading:false, reread:false, challenging:false,
    funniest:false, saddest:false, indie:false, hundredPages:false,
    sameUniverse:false, comment:null,
  };
  if(!db.books[me]) db.books[me]=[];
  db.books[me].push(book);
  // Seri kaydındaki planned girişini bookId ile güncelle
  const bkEntry = (ser.books||[]).find(b=>b.planned&&(b.manualTitle||'').toLowerCase()===title.toLowerCase());
  if(bkEntry){ delete bkEntry.planned; delete bkEntry.manualTitle; delete bkEntry.manualAuthor; bkEntry.bookId=book.id; }
  /* "📖 Başla" ile YENİ doğan kitap — numarası seri kaydından geliyor.
     `seriesTotal` da buradan verilebilirdi ama bilerek verilmedi: seri hedefi
     sonradan değişebiliyor ve kitaba kopyalanınca iki yerde ayrı ayrı eskiyor. */
  seriNoDoldur(book, ser, bkEntry);
  saveDb(); render();
  notify('📖 Okumaya Başlandı', title+' şu an okunanlar listesine eklendi.');
}

function checkSeriesComplete(seriesId){
  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser) return;
  const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
  // Burada da hedef DÜŞÜK kalmışsa seri erkenden "tamamlandı" işaretleniyordu
  // (Efsaneler Üçlemesi'nde hedef 1, kayıtlı 4). seriToplam ikisinin büyüğünü alır.
  // ⚠️ Sayarken kitabı SİLİNMİŞ satırlar atlanıyor: seri kaydında duran ama
  // kütüphanede karşılığı olmayan satırlar var (canlı veride Dune ve Efsaneler'de
  // birer tane). Ekranda zaten gösterilmiyorlar; burada sayılsalardı Dune 6 gerçek
  // kitapla hiçbir zaman "tamamlandı" olamazdı.
  // Ara öykü satırlarında (storyId) ne manualTitle ne bookId var → burada
  // kendiliğinden sayılmıyorlar. Bilerek: öykü seri tamamlanmayı engellemez.
  const gecerliSayi = (ser.books||[]).filter(bk=>
    bk.manualTitle || myBooksList.some(b=>b.id===bk.bookId)
  ).length;
  const total = seriToplam(ser, gecerliSayi);
  const readCount = myBooksList.filter(b=>
    b.series && normalizeSeries(b.series)===normalizeSeries(ser.name) &&
    (b.readingStatus==='new'||b.readingStatus==='past'||b.retroactive)
  ).length;
  if(total>0 && readCount>=total){
    // seriesComplete bayrağını tüm seri kitaplarına set et
    const myBooksList2=db.books[me]||[];
    myBooksList2.filter(b=>b.series&&normalizeSeries(b.series)===normalizeSeries(ser.name)).forEach(b=>{b.seriesComplete=true;});
    saveDb();
  }
}

// Düzenleme formunun DOM'unu kurar (eklemez) — hem tıklamayla açmada hem de
// liste yeniden çizilirken açık formları korumada kullanılır (Ö40).
function _buildSeriesEditFormEl(seriesId, eid, bk, override){
  const containerId = 'seriesEditForm_'+seriesId+'_'+eid;
  const isPlanned = !!(bk.planned||bk.manualTitle);
  const num = (override&&override.num!==undefined) ? override.num : (bk.num||'');
  const pages = (override&&override.pages!==undefined) ? override.pages : (bk.pages||'');
  const title = (override&&override.title!==undefined) ? override.title : (bk.manualTitle||'');
  const author = (override&&override.author!==undefined) ? override.author : (bk.manualAuthor||'');
  const div = document.createElement('div');
  div.id = containerId;
  div.dataset.seriesId = seriesId;
  div.dataset.eid = eid;
  div.style.cssText = 'margin-top:.4rem;padding:.6rem .75rem;background:rgba(44,80,107,.18);border:1px solid rgba(100,160,200,.35);border-left:3px solid rgba(100,180,220,.7);border-radius:6px;display:flex;flex-direction:column;gap:.4rem';
  div.innerHTML = `
    ${isPlanned?`<div style="display:flex;gap:.4rem;flex-wrap:wrap">
      <input class="book-input" id="edit_title_${containerId}" type="text" value="${(title||'').replace(/"/g,'&quot;')}" placeholder="Kitap adı" style="flex:1;font-size:.82rem;padding:.3rem .5rem"/>
      <input class="book-input" id="edit_author_${containerId}" type="text" value="${(author||'').replace(/"/g,'&quot;')}" placeholder="Yazar" style="flex:1;font-size:.82rem;padding:.3rem .5rem"/>
    </div>`:''}
    <div style="display:flex;gap:.4rem;flex-wrap:wrap">
      <input class="book-input" id="edit_num_${containerId}" type="number" value="${num}" ${bk.storyId?'step="any" min="0" placeholder="örn. 4.5" style="width:72px;':'placeholder="#" style="width:55px;'}font-size:.82rem;padding:.3rem .4rem"/>
      <input class="book-input" id="edit_pages_${containerId}" type="number" value="${pages}" placeholder="Sayfa" style="width:70px;font-size:.82rem;padding:.3rem .4rem"/>
      <button class="btn btn-sm btn-primary" style="font-size:.72rem" onclick="saveEditSeriesBook('${seriesId}','${eid}','${containerId}',${isPlanned})">&#10003; Kaydet</button>
      <button class="btn btn-sm" style="font-size:.72rem;background:rgba(100,160,200,.15);color:rgba(100,180,220,.9)" onclick="closeEditSeriesBook('${containerId}')">Iptal</button>
    </div>`;
  return div;
}

function openEditSeriesBook(evt, seriesId, eid){
  // Inline edit — kitabın altında açılan form
  const containerId = 'seriesEditForm_'+seriesId+'_'+eid;
  const existing = document.getElementById(containerId);
  if(existing){ existing.remove(); return; }
  let bk = seriesBkMap[seriesId+'_'+eid];
  if(!bk){
    // map dolmamışsa allSeries'ten kararlı kimlikle (eid) reconstruct et — index kullanmıyoruz,
    // çünkü iki render arasında sıra değişmiş olabilir (Ö39).
    const data = mySeriesData();
    const ser = data.series[seriesId];
    if(!ser) return;
    const rawBk = (ser.books||[]).find(b=>b._eid===eid);
    if(!rawBk) return;
    if(rawBk.storyId){
      bk = oykuSatiriniCoz(rawBk, me);   // ara öykü — bkz. ARA ÖYKÜLER
      if(!bk) return;
    } else {
      const myBooksList = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
      const linked = rawBk.bookId ? myBooksList.find(b=>b.id===rawBk.bookId) : null;
      bk = linked ? {...rawBk, book:linked} : {...rawBk, book:{id:null,title:rawBk.manualTitle,author:rawBk.manualAuthor||'',readingStatus:'planned'}};
    }
    seriesBkMap[seriesId+'_'+eid] = bk;
  }
  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser) return;
  const div = _buildSeriesEditFormEl(seriesId, eid, bk);
  const btn = evt.target.closest('button');
  const item = btn ? (btn.closest('.series-book-item') || btn.closest('[data-grp-book]')) : null;
  if(item){
    item.insertAdjacentElement('afterend', div);
    const booksContainer = item.closest('.ser-in-grp-books');
    if(booksContainer){
      const header = booksContainer.previousElementSibling;
      if(header){
        header.dataset.editActive='1';
        header.style.background='rgba(44,80,107,.25)';
        header.style.borderBottom='1px solid rgba(100,160,200,.4)';
        const titleSpan = header.querySelector('span:first-child');
        if(titleSpan){ titleSpan.style.color='rgba(130,190,230,.95)'; titleSpan.dataset.origColor=titleSpan.style.color||''; }
      }
    }
  }
}

function saveEditSeriesBook(seriesId, eid, containerId, isPlanned){
  const data = mySeriesData();
  const ser = data.series[seriesId];
  if(!ser) return;
  const bkRef = seriesBkMap[seriesId+'_'+eid];
  if(!bkRef) return;
  /* ⚠️ Öykü dalı EN BAŞTA olmalı (2026-09-17). Öykü satırında ne `bookId` ne
     `manualTitle` var; eski koşul `b.manualTitle===bkRef.manualTitle` yani
     `undefined===undefined` olur ve serideki İLK BAĞLI KİTABIN satırıyla
     eşleşirdi — öykünün numarasını değiştirmek bir kitabın numarasını
     değiştirirdi. */
  const rawIdx = ser.books.findIndex(b=>
    bkRef.storyId ? b.storyId===bkRef.storyId :
    bkRef.bookId ? b.bookId===bkRef.bookId : b.manualTitle===bkRef.manualTitle
  );
  if(rawIdx<0) return;
  const numEl = document.getElementById('edit_num_'+containerId);
  const pagesEl = document.getElementById('edit_pages_'+containerId);
  if(bkRef.storyId){
    // Ara öykü: ondalık numara, KAYDIRMA YOK (araya giriyor, kimsenin yerini almıyor).
    const n = parseFloat(numEl?.value);
    ser.books[rawIdx].num = (isFinite(n)&&n>=0) ? n : null;
    ser.books[rawIdx].pages = parseInt(pagesEl?.value)||null;
    ser.books.sort((a,b)=>(a.num??999)-(b.num??999));
    saveDb();
    closeEditSeriesBook(containerId);
    renderSeriesList();
    return;
  }
  // ── NUMARA TAŞIMA (2026-08-31) ──
  // Eskiden girilen numara başka bir kitapta duruyorsa iki kitap aynı numarayı
  // alıyordu. Artık aradakiler kayıyor: 5. kitabı 2 yaparsan eski 2,3,4 birer
  // artıyor; 2. kitabı 5 yaparsan eski 3,4,5 birer azalıyor. Hedef numara boşsa
  // hiçbir şey kaymıyor. Numarasız kitaplara hiç dokunulmuyor.
  const eskiNum = ser.books[rawIdx].num;
  const yeniNum = parseInt(numEl?.value)||null;
  ser.books[rawIdx].num = yeniNum;
  if(yeniNum!=null && ser.books.some((b,i)=>i!==rawIdx && b.num===yeniNum)){
    ser.books.forEach((b,i)=>{
      if(i===rawIdx || b.num==null) return;
      if(eskiNum==null || yeniNum<eskiNum){
        if(b.num>=yeniNum && (eskiNum==null || b.num<eskiNum)) b.num = b.num+1;
      } else if(yeniNum>eskiNum){
        if(b.num>eskiNum && b.num<=yeniNum) b.num = b.num-1;
      }
    });
  }
  ser.books[rawIdx].pages = parseInt(pagesEl?.value)||null;
  if(isPlanned){
    const titleEl = document.getElementById('edit_title_'+containerId);
    const authorEl = document.getElementById('edit_author_'+containerId);
    if(titleEl) ser.books[rawIdx].manualTitle = titleEl.value.trim();
    if(authorEl) ser.books[rawIdx].manualAuthor = authorEl.value.trim();
  }
  ser.books.sort((a,b)=>(a.num||999)-(b.num||999));
  saveDb();
  closeEditSeriesBook(containerId);
  _refreshSeriesBookList(seriesId);
}

function closeEditSeriesBook(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const booksContainer = el.parentElement?.closest('.ser-in-grp-books');
  if(booksContainer){
    const header = booksContainer.previousElementSibling;
    if(header && header.dataset.editActive){
      delete header.dataset.editActive;
      header.style.background='';
      header.style.borderBottom='';
      const titleSpan = header.querySelector('span:first-child');
      if(titleSpan){ titleSpan.style.color=''; }
    }
  }
  el.remove();
}

function toggleSeriesMode(seriesId){
  const modeKey = 'seriesMode_'+seriesId;
  let current = 'books';
  try{ current = localStorage.getItem(modeKey)||'books'; }catch(e){}
  const next = current==='books' ? 'pages' : 'books';
  try{ localStorage.setItem(modeKey, next); }catch(e){}
  renderSeriesList();
}

function togglePathMode(pathId){
  const modeKey = 'pathMode_'+pathId;
  let current = 'books';
  try{ current = localStorage.getItem(modeKey)||'books'; }catch(e){}
  const next = current==='books' ? 'pages' : 'books';
  try{ localStorage.setItem(modeKey, next); }catch(e){}
  renderSeriesList();
}

function toggleSeriesBooks(id){
  const el = document.getElementById('seriesBooks_'+id);
  if(!el) return;
  el.classList.toggle('open');
  const isOpen = el.classList.contains('open');
  const btn = document.getElementById('seriesToggleBtn_'+id);
  const closeBtn = document.getElementById('seriesCloseBtn_'+id);
  if(btn) btn.textContent = isOpen ? '▲ Gizle' : '▼ Kitaplar';
  if(closeBtn) closeBtn.style.display = isOpen ? '' : 'none';
}

function closeSeriesCard(id){
  const el = document.getElementById('seriesBooks_'+id);
  if(el) el.classList.remove('open');
  renderSeriesList();
}

function renderSeriesList(){
  const container = document.getElementById('seriesListContainer');
  if(!container) return;
  // Açık düzenleme formları varsa (kaydedilmemiş girdileriyle) hatırla — hem bağımsız
  // kartlarda hem de grup içindeki serilerde, tam liste yeniden çizilince kaybolmasınlar (Ö40).
  const openEditsAll = [...container.querySelectorAll('[id^="seriesEditForm_"]')].map(div=>({
    seriesId: div.dataset.seriesId,
    eid: div.dataset.eid,
    num: document.getElementById('edit_num_'+div.id)?.value,
    pages: document.getElementById('edit_pages_'+div.id)?.value,
    title: document.getElementById('edit_title_'+div.id)?.value,
    author: document.getElementById('edit_author_'+div.id)?.value
  })).filter(o=>o.seriesId&&o.eid);
  // Ziyaret modunda formları gizle
  const isViewing = !!viewing;
  ['newSeriesName','newSeriesTotal','newSeriesGroupId','newSeriesBulkBooks','newSeriesBulkAuthor','newPathName'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.closest('.add-section') && (el.closest('.add-section').style.display=isViewing?'none':'');
  });
  // Formların tüm add-section'larını gizle/göster
  document.querySelectorAll('#series .add-section').forEach(s=>s.style.display=isViewing?'none':'');
  // Grup select'i güncelle
  const groupSel = document.getElementById('newSeriesGroupId');
  if(groupSel){
    const data0 = viewSeriesData();
    const paths0 = Object.values(data0.paths||{});
    groupSel.innerHTML = '<option value="">— Gruba ekleme —</option>' +
      paths0.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  }
  // Açık kartları hatırla
  const openIds = new Set(
    [...document.querySelectorAll('.series-books-list.open')]
      .map(el=>el.id.replace('seriesBooks_',''))
  );
  const data = viewSeriesData();
  const allSeries = Object.values(data.series||{});
  const myBooksList = targetBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));

  if(!allSeries.length){
    container.innerHTML=`<div class="empty-state" style="padding:2rem">Henüz seri oluşturmadın. Yukarıdan başlayabilirsin!</div>`;
    return;
  }

  // Sıralama: önce devam edenler (şu an okunan kitabı olanlar)
  const readingIds = new Set(myBooksList.filter(b=>b.readingStatus==='reading').map(b=>b.id));

  allSeries.sort((a,b)=>{
    const aActive = (a.books||[]).some(bk=>readingIds.has(bk.bookId));
    const bActive = (b.books||[]).some(bk=>readingIds.has(bk.bookId));
    if(aActive && !bActive) return -1;
    if(!aActive && bActive) return 1;
    return (a.name||'').localeCompare(b.name||'','tr');
  });

  try {

  // Gruba bağlı serileri sayfalamadan ÖNCE listeden çıkar — zaten kendi kartı olarak
  // görünmeyip grup kartının içinde gösterilecekler, sayfalama/sayaç onları saymamalı.
  const groupedSeriesIds = new Set();
  Object.values(data.paths||{}).forEach(path=>(path.steps||[]).forEach(s=>groupedSeriesIds.add(s.seriesId)));
  const paginatableSeries = allSeries.filter(s=>!groupedSeriesIds.has(s.id));

  // Tekil serileri paginate et
  const visibleSeries = paginatableSeries.slice(0, seriesPage * PAGE_SIZE);
  const hasMoreSeries = paginatableSeries.length > seriesPage * PAGE_SIZE;

  container.innerHTML = visibleSeries.map(ser=>{
    (ser.books||[]).forEach(ensureBkEid);
    const books = (ser.books||[]).map(bk=>{
      if(bk.storyId) return oykuSatiriniCoz(bk, viewing||me);   // ara öykü — bkz. ARA ÖYKÜLER
      if(bk.planned){
        // Planlanan kitap — kitaplarımda yok, ama title eşleşirse bağla
        const linked = myBooksList.find(b=>b.title.toLowerCase()===(bk.manualTitle||'').toLowerCase());
        if(linked) return {...bk, book: linked, planned: false};
        return {...bk, book: { id: null, title: bk.manualTitle, author: bk.manualAuthor||'', readingStatus:'planned' }};
      }
      const book = myBooksList.find(b=>b.id===bk.bookId);
      return book ? {...bk, book} : null;
    }).filter(Boolean);
    // Sayaçlar, yüzde, sayfa modu ve "sıradaki" YALNIZCA kitaplardan.
    // `books` (öyküler dahil) yalnızca listeyi çizmek için kullanılıyor.
    const kitaplar = seriKitaplari(books);
    const oykuSayisi = books.length - kitaplar.length;

    const readCount = kitaplar.filter(bk=>{
      const b=bk.book; if(!b||b.readingStatus==="planned"||b.readingStatus==="reading"||b.readingStatus==="paused"||b.readingStatus==="wishlist") return false; return true;
    }).length;
    const total = seriToplam(ser, kitaplar.length) || 1;
	const ongoing = ser.ongoing||false;
const totalDisplay = ongoing ? (seriToplam(ser, kitaplar.length)||'?')+'+' : (seriToplam(ser, kitaplar.length)||'?');
    const pct = Math.round((readCount/total)*100);
    const isDone = readCount>=total && total>0;

    // Sayfa modu hesabi
    const allHavePages = kitaplar.length>0 && kitaplar.every(bk=>{
      const pg=bk.pages||(bk.book&&bk.book.pages); return !!pg;
    });
    const totalPages = allHavePages ? kitaplar.reduce((s,bk)=>s+(bk.pages||(bk.book&&bk.book.pages)||0),0) : 0;
    const readPages = kitaplar.reduce((s,bk)=>{
      const b=bk.book; if(!b) return s;
      if(b.readingStatus==="reading"&&b.currentPage) return s+b.currentPage;
      const pg=bk.pages||b.pages||0;
      if(b.readingStatus!=="planned"&&b.readingStatus!=="reading"&&b.readingStatus!=="paused"&&b.readingStatus!=="wishlist") return s+pg;
      return s;
    },0);
    const pageModePossible = allHavePages && totalPages>0;
    const pageModeWarning = !pageModePossible && books.length>0;
    const modeKey = "seriesMode_"+ser.id;
    let progressMode = "books";
    try{ const m=localStorage.getItem(modeKey); if(m==="pages"&&pageModePossible) progressMode="pages"; }catch(e){}
    const pagePct = pageModePossible ? Math.min(100,Math.round((readPages/totalPages)*100)) : 0;
    const displayPct = progressMode==="pages" ? pagePct : pct;
    const displayLabel = progressMode==="pages"
      ? readPages.toLocaleString("tr")+" / "+totalPages.toLocaleString("tr")+" sayfa · %"+pagePct
      : readCount+" / "+totalDisplay+" kitap · %"+pct+(isDone?" · ✅ Tamamlandı":"");

    // Şu an okunan kitap
    const currentlyReading = books.find(bk=>bk.book.readingStatus==='reading');

    // Sıradaki okunmamış — KİTAP. Öykü ayrıca, yanında seçenek olarak (siradakiOyku).
   const nextUnread = kitaplar.find(bk=>
  bk.book.readingStatus==='wishlist'||
  bk.book.readingStatus==='planned'||
  (!bk.book.readingStatus)
);
    const nextOyku = siradakiOyku(books, nextUnread);
    const siradakiParcalar = [
      nextOyku ? '<span style="color:#dccbf0">📄 '+escapeHtml(nextOyku.book.title)+'</span>' : '',
      nextUnread ? escapeHtml(nextUnread.book.title) : ''
    ].filter(Boolean);

    // Kitap listesi HTML — gruplara ayır
    const booksReading = books.filter(bk=>bk.book.readingStatus==='reading');
    const booksRead = books.filter(bk=>{
      const s=bk.book.readingStatus;
      // s yoksa (eski kayıt) ve bookId ile bağlıysa okundu say
      if(!s) return !!bk.bookId;
      return s!=='reading'&&s!=='paused'&&s!=='wishlist'&&s!=='planned';
    });
    const booksPaused = books.filter(bk=>bk.book.readingStatus==='paused');
    const booksPlanned = books.filter(bk=>{
      const s=bk.book.readingStatus;
      if(!s) return !bk.bookId; // bookId yoksa planlanan
      return s==='wishlist'||s==='planned';
    });

    const groupHtml = (label, icon, items) => items.length ? `
      <div style="font-family:'Space Mono',monospace;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:var(--gold-light);opacity:.92;padding:.4rem .4rem .2rem">${icon} ${label} (${items.length})</div>
      ${items.map(bk=>renderSeriesBookItemHtml(ser.id,bk)).join('')}
    ` : '';

    const bookListHtml = 
      groupHtml('Şu An Okunuyor','📖', booksReading) +
      groupHtml('Okundu','✅', booksRead) +
      groupHtml('Yarım Bırakıldı','🚧', booksPaused) +
      groupHtml('Okunacak / Planlanan','⏳', booksPlanned);

    // Kitap ekleme select
    const availableBooks = myBooksList.filter(b=>!(ser.books||[]).find(bk=>bk.bookId===b.id));
    // Serideki mevcut yazar
    const seriesAuthor = (()=>{
      for(const bk of (ser.books||[])){
        if(bk.manualAuthor) return bk.manualAuthor;
        if(bk.bookId){ const lb=myBooksList.find(b=>b.id===bk.bookId); if(lb&&lb.author) return lb.author; }
      }
      return '';
    })();
    const bookSelectHtml = `<div class="series-add-book-row" style="flex-direction:column;align-items:stretch;gap:.4rem">
      <div style="display:flex;gap:.3rem;margin-bottom:.2rem;flex-wrap:wrap">
        <button class="btn btn-sm" id="seriesAddModeBtn_${ser.id}"
          style="font-size:.68rem;padding:.15rem .5rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)"
          onclick="toggleSeriesAddMode('${ser.id}')">📋 Toplu giriş</button>
        <button class="btn btn-sm seri-oyku-dugme" id="seriesAddOykuBtn_${ser.id}"
          style="font-size:.68rem;padding:.15rem .5rem"
          onclick="seriOykuFormuAc('${ser.id}')">📄 Ara öykü</button>
      </div>
      ${oykuEkleFormuHtml(ser.id, false)}
      <div id="seriesAddSingle_${ser.id}">
        <div style="position:relative">
          <input class="book-input" id="seriesBookTitle_${ser.id}" type="text" placeholder="Kitap adı..." 
            style="width:100%;font-size:.85rem;padding:.4rem .6rem"
            oninput="seriesAcSearch('${ser.id}')" onblur="setTimeout(()=>hideSeriesAc('${ser.id}'),300)"/>
          <div id="seriesAcList_${ser.id}" class="series-ac-dropdown" style="display:none"></div>
        </div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.3rem">
          <input class="book-input" id="seriesBookAuthor_${ser.id}" type="text" placeholder="Yazar${seriesAuthor?' ('+seriesAuthor+')':' (opsiyonel)'}"
            style="flex:1;min-width:120px;font-size:.82rem;padding:.35rem .5rem"/>
          <input class="book-input" id="seriesBookNum_${ser.id}" type="number" min="1" placeholder="#"
            style="width:50px;font-size:.82rem;padding:.35rem .4rem"/>
          <input class="book-input" id="seriesBookPages_${ser.id}" type="number" min="1" placeholder="Sayfa"
            style="width:65px;font-size:.82rem;padding:.35rem .4rem"/>
        </div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-top:.3rem">
          <button class="btn btn-sm btn-primary" onclick="addBookToSeries('${ser.id}')">+ Ekle</button>
        </div>
      </div>
      <div id="seriesAddBulk_${ser.id}" style="display:none">
        <textarea class="book-input" id="seriesBulkText_${ser.id}" placeholder="Her satıra bir kitap adı&#10;Asimov'un Vakfı&#10;Vakıf ve İmparatorluk&#10;İkinci Vakıf"
          style="min-height:90px;resize:vertical;font-size:.85rem;line-height:1.5"></textarea>
        <div style="display:flex;gap:.4rem;align-items:center;margin-top:.3rem">
          <input class="book-input" id="seriesBulkAuthor_${ser.id}" type="text" placeholder="Yazar (opsiyonel — tümü için)"
            style="flex:1;font-size:.82rem;padding:.35rem .5rem"/>
          <button class="btn btn-sm btn-primary" onclick="addBulkBooksToSeries('${ser.id}')">+ Toplu Ekle</button>
        </div>
      </div>
      <div style="font-size:.7rem;color:var(--gold-light);opacity:.92;font-style:italic;margin-top:.2rem">Kitaplarımda olmayan kitaplar "planlanan" olarak eklenir</div>
    </div>`;


    return `<div class="series-card" data-sid="${ser.id}">
      <div class="series-card-header">
        <div>
          ${viewing
            ?`<div class="series-card-name">${escapeHtml(ser.name)}</div>`
            :`<div class="series-card-name" id="seriesNameDisp_${ser.id}">${escapeHtml(ser.name)}</div>`}
          <div class="series-card-stats" id="seriesStats_${ser.id}">${displayLabel}</div>
        </div>
        <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">
          ${pageModePossible ? `<button class="btn btn-sm" style="font-size:.6rem;padding:.2rem .5rem;background:${progressMode==='pages'?'rgba(74,103,65,.2)':'rgba(201,162,39,.1)'};color:${progressMode==='pages'?'var(--moss)':'var(--gold)'};border:1px solid ${progressMode==='pages'?'rgba(74,103,65,.3)':'rgba(201,162,39,.2)'}" onclick="toggleSeriesMode('${ser.id}')">
            ${progressMode==='pages'?'📖 Sayfa modu':'📚 Kitap modu'}
          </button>` : ''}
          ${pageModeWarning && progressMode==='pages' ? `<span style="font-size:.6rem;color:var(--gold-light);opacity:.92">⚠️ Sayfa bilgisi eksik</span>` : ''}
          ${viewing?`<button class="btn btn-sm btn-primary" style="font-size:.6rem" onclick="copySeriesToMyList('${ser.id}')">📚 Ekle</button>`:`
          <div id="seriesTotalView_${ser.id}" style="display:flex;align-items:center;gap:.5rem">
            <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--gold-light);opacity:.92">Toplam: ${ser.total||'?'}${ongoing?'+':''}</span>
            ${ongoing?`<span style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--moss)">✓ devam eden seri</span>`:''}
            <button class="btn btn-sm" style="font-size:.6rem;padding:.15rem .4rem;background:none;border:none" onclick="toggleSeriesTotalEdit('${ser.id}')" title="Düzenle">✏️</button>
          </div>
          <div id="seriesTotalEdit_${ser.id}" style="display:none;align-items:center;gap:.4rem;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:.25rem;font-family:'Space Mono',monospace;font-size:.6rem;color:var(--gold-light);opacity:.92;cursor:pointer" title="Yazar bu seriye hâlâ yeni kitap ekliyorsa işaretle">
              <input type="checkbox" ${ongoing?'checked':''} onchange="toggleSeriesOngoing('${(ser.name||'').replace(/'/g,"\\'")}',this.checked)" style="margin:0"/> devam ediyor
            </label>
            <div style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--gold-light);opacity:.92">Toplam:</div>
            <input class="book-input" type="number" min="1" value="${ser.total||''}" placeholder="?" 
              style="width:50px;font-size:.75rem;padding:.2rem .4rem;text-align:center"
              onchange="updateSeriesTotal('${ser.id}',this.value)"/>
            <button class="btn btn-sm btn-danger" style="font-size:.75rem;padding:.2rem .5rem;background:rgba(160,82,45,.35);border-width:1.5px" onclick="confirmDeleteSeries(event,'${ser.id}')">🗑</button>
            <button class="btn btn-sm" style="font-size:.6rem;padding:.15rem .4rem" onclick="toggleSeriesTotalEdit('${ser.id}')">✓ Bitti</button>
          </div>`}
        </div>
      </div>
      <div class="series-progress-wrap">
        <div class="series-progress-fill ${isDone?'done':''}" style="width:${displayPct}%"></div>
      </div>
      ${currentlyReading ? `<div style="font-size:.8rem;color:var(--moss);margin:.3rem 0">
        📖 Şu an: <strong>${escapeHtml(currentlyReading.book.title)}</strong>
        ${currentlyReading.book.currentPage&&currentlyReading.book.pages
          ?`<span style="font-family:'Space Mono',monospace;font-size:.65rem;opacity:.7"> · ${currentlyReading.book.currentPage}/${currentlyReading.book.pages} sayfa</span>`:''}
      </div>` : ''}
      ${!currentlyReading && siradakiParcalar.length ? `<div style="font-size:.8rem;color:var(--gold-light);opacity:.92;margin:.3rem 0">⏭ Sıradaki: ${siradakiParcalar.join(' / ')}</div>` : ''}
      <div class="series-actions">
        <button class="btn btn-sm" id="seriesToggleBtn_${ser.id}" 
          style="font-size:.7rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)"
          onclick="toggleSeriesBooks('${ser.id}')">▼ Kitaplar (${kitaplar.length}${oykuSayisi?' + '+oykuSayisi+' öykü':''})</button>
        <button class="btn btn-sm" id="seriesCloseBtn_${ser.id}" 
          style="font-size:.7rem;background:rgba(139,0,0,.1);color:var(--gold-light);border:1px solid rgba(139,0,0,.2);display:none"
          onclick="closeSeriesCard('${ser.id}')">✓ Bitti</button>
      </div>
      <div class="series-books-list" id="seriesBooks_${ser.id}">
        <div class="series-book-list-inner">${bookListHtml}</div>
        <div style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid rgba(201,162,39,.1)">
          <div style="font-size:.75rem;color:var(--gold-light);opacity:.92;margin-bottom:.3rem">Kitap Ekle</div>
          ${bookSelectHtml}
        </div>
      </div>
    </div>`;
  }).join('')+(hasMoreSeries?`<button class="load-more-btn" onclick="seriesPage++;renderSeriesList()">↓ Daha fazla yükle (${paginatableSeries.length-seriesPage*PAGE_SIZE} kaldı)</button>`:'');
  } catch(e) { console.error('[Seriler HATA]', e.message, e.stack); container.innerHTML='<div class="empty-state" style="padding:2rem;color:var(--gold-light)">Render hatası: '+e.message+'</div>'; }
  // Grup kartlarını üste ekle
  renderGroupCards(container);
  // Açık kartları geri aç — renderGroupCards'tan sonra çalışmalı
  openIds.forEach(id=>{
    const el = document.getElementById('seriesBooks_'+id);
    const btn = document.getElementById('seriesToggleBtn_'+id);
    const closeBtn = document.getElementById('seriesCloseBtn_'+id);
    if(el){ el.classList.add('open'); }
    if(btn){ btn.textContent='▲ Gizle'; }
    if(closeBtn){ closeBtn.style.display=''; }
  });
  // Hatırlanan açık düzenleme formlarını, girilen değerleriyle geri koy
  openEditsAll.forEach(({seriesId,eid,num,pages,title,author})=>{
    const ser2 = (data.series||{})[seriesId];
    const rawBk = ser2 && (ser2.books||[]).find(b=>b._eid===eid);
    const item = container.querySelector('[data-eid="'+eid+'"]');
    if(!rawBk || !item) return;
    const div = _buildSeriesEditFormEl(seriesId, eid, rawBk, {num,pages,title,author});
    item.insertAdjacentElement('afterend', div);
    const grpBooksContainer = item.closest('.ser-in-grp-books');
    if(grpBooksContainer){
      const header = grpBooksContainer.previousElementSibling;
      if(header){
        header.dataset.editActive='1';
        header.style.background='rgba(44,80,107,.25)';
        header.style.borderBottom='1px solid rgba(100,160,200,.4)';
        const titleSpan = header.querySelector('span:first-child');
        if(titleSpan){ titleSpan.style.color='rgba(130,190,230,.95)'; }
      }
    }
  });
}

function renderGroupCards(seriesContainer){
  const data = viewSeriesData();
  const allPaths = Object.values(data.paths||{});
  if(!allPaths.length) return;
  const myBooksList = targetBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:'));
  const allSeries = data.series||{};

  // Grup kartlarını üste taşı — her grup kartını seriesListContainer'ın başına ekle
  const existingGroups = seriesContainer.querySelectorAll('.group-card');
  existingGroups.forEach(g=>g.remove());

  // Gruba bağlı seri kartlarını gizle
  const groupedSeriesIds = new Set();
  allPaths.forEach(path=>{
    (path.steps||[]).forEach(s=>groupedSeriesIds.add(s.seriesId));
  });
  // Render öncesi hangi kartların açık olduğunu hatırla
  const openSeriesIds = new Set(
    [...seriesContainer.querySelectorAll('.series-books-list.open')]
      .map(el=>el.id.replace('seriesBooks_',''))
  );
  seriesContainer.querySelectorAll('.series-card[data-sid]').forEach(card=>{
    const sid = card.dataset.sid;
    if(card.dataset.pinned) return;
    // Kart açıksa gruba bağlı olsa bile gizleme
    if(openSeriesIds.has(sid)) return;
    card.style.display = groupedSeriesIds.has(sid) ? 'none' : '';
  });

  // Grup kartlarını oluştur ve üste ekle (ters sırayla prepend)
  [...allPaths].reverse().forEach(path=>{
    const steps = (path.steps||[]).map(s=>{
      const ser = allSeries[s.seriesId];
      if(!ser) return null;
      (ser.books||[]).forEach(ensureBkEid);
      const serBooks = (ser.books||[]).map(bk=>{
        if(bk.storyId) return oykuSatiriniCoz(bk, viewing||me);   // ara öykü — bkz. ARA ÖYKÜLER
        if(bk.planned){
          const linked=myBooksList.find(b=>b.title.toLowerCase()===(bk.manualTitle||'').toLowerCase());
          return linked?{...bk,book:linked}:{...bk,book:{readingStatus:'planned',title:bk.manualTitle,pages:bk.pages||null}};
        }
        const book=myBooksList.find(b=>b.id===bk.bookId);
        return book?{...bk,book}:null;
      }).filter(Boolean);
      // Grup sayaçları da yalnızca kitaplardan (öykü toplamı şişirmesin).
      const serKitaplar=seriKitaplari(serBooks);
      const readCount=serKitaplar.filter(bk=>{const b=bk.book;return b&&b.readingStatus!=='planned'&&((b.readingStatus!=='reading'&&b.readingStatus!=='paused')||!!(b.endDate||b.yearOnly))&&b.readingStatus!=='wishlist';}).length;
      const total=seriToplam(ser, serKitaplar.length)||1;
      const pct=Math.round((readCount/total)*100);
      return {...s,ser,serBooks,readCount,total,pct};
    }).filter(Boolean);

    const totalBooks=steps.reduce((s,st)=>s+st.total,0);
    const totalRead=steps.reduce((s,st)=>s+st.readCount,0);
    const overallPct=totalBooks>0?Math.round((totalRead/totalBooks)*100):0;

    // Grup tamamlanınca altın konfeti (sadece kendi verimizde, ilk tamamlanma)
    if(!viewing && overallPct>=100 && totalBooks>0){
      const flagKey='groupDone_'+path.id;
      if(!sessionStorage.getItem(flagKey)){
        sessionStorage.setItem(flagKey,'1');
        setTimeout(()=>launchConfetti('group'),200);
      }
    }

    const div=document.createElement('div');
    div.className='group-card';
    div.dataset.pathId=path.id;
    const openKey='groupOpen_'+path.id;
    const isOpen=sessionStorage.getItem(openKey)==='1';
    div.style.cssText='background:rgba(74,103,65,.08);border:1px solid rgba(74,103,65,.25);border-radius:10px;padding:1rem;margin-bottom:.75rem';
    div.innerHTML=`
      <div style="display:flex;align-items:center;gap:.5rem;cursor:pointer;flex-wrap:wrap" onclick="toggleGroupCard('${path.id}',this.closest('.group-card'))">
        <span style="font-size:1rem">🗂</span>
        ${viewing
          ?`<span style="font-family:'Playfair Display',serif;font-size:1.05rem;color:var(--moss);font-weight:700;flex:1">${escapeHtml(path.name)}</span>`
          :`<span id="pathNameDisp_${path.id}" style="font-family:'Playfair Display',serif;font-size:1.05rem;color:var(--moss);font-weight:700;flex:1">${escapeHtml(path.name)}</span>`}
        <span style="font-family:'Space Mono',monospace;font-size:.62rem;color:var(--moss);opacity:.7;background:rgba(74,103,65,.15);padding:.1rem .4rem;border-radius:20px">${steps.length} seri · ${totalRead}/${totalBooks} kitap · %${overallPct}</span>
        <div style="display:flex;gap:.3rem" onclick="event.stopPropagation()">
          ${viewing?`<button class="btn btn-sm btn-primary" style="font-size:.6rem;padding:.1rem .35rem" onclick="copyGroupToMyList('${path.id}')">🗂 Ekle</button>`:`<button class="btn btn-sm" style="font-size:.6rem;padding:.1rem .35rem;background:none;border:none" onclick="startPathNameEdit('${path.id}')" title="Adı düzenle">✏️</button><button class="btn btn-sm btn-danger" style="font-size:.6rem;padding:.1rem .35rem" onclick="deletePath('${path.id}',this)">🗑</button>`}
        </div>
        <span style="color:var(--moss);font-size:.8rem">${isOpen?'▲':'▼'}</span>
      </div>
      <div class="group-card-body" style="display:${isOpen?'block':'none'};margin-top:.75rem">
        ${steps.map((st,i)=>{
          const booksHtml=st.serBooks.map((bk,bkIdx)=>{
            if(bk.storyId) return oykuGrupSatiriHtml(st.ser.id, bk);   // ara öykü
            const title=bk.book.title||bk.manualTitle||'?';
            const lb=bk.book;
            const ico=lb.readingStatus==='reading'?'📖':lb.readingStatus==='paused'?'🚧':(lb.readingStatus==='planned'||lb.readingStatus==='wishlist')?'⏳':'✅';
            const isRead=ico==='✅';
            const isReading=lb.readingStatus==='reading';
            const canStart=!isReading&&!viewing;
            const startBtn=canStart?(lb.id
              ?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .35rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" onclick="startReadingSeriesBook(${lb.id})">📖 ${isRead?'Tekrar':'Başla'}</button>`
              :`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .35rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" data-sid="${st.ser.id}" data-mt="${(bk.manualTitle||'').replace(/"/g,'&quot;')}" data-ma="${(bk.manualAuthor||'').replace(/"/g,'&quot;')}" onclick="startPlannedBook(this.dataset.sid,this.dataset.mt,this.dataset.ma)">📖 Başla</button>`):'';
            const readingLabel=isReading?`<span style="font-size:.55rem;padding:.1rem .35rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3);border-radius:4px">📖 Okuyorum</span>`:'';
            const removeKey=bk.planned?`'${st.ser.id}',null,true,'${(bk.manualTitle||'').replace(/'/g,"\\'")}'  `:`'${st.ser.id}',${lb.id||'null'},false`;
            seriesBkMap[st.ser.id+'_'+ensureBkEid(bk)]=bk;
            const editBtn=!viewing?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .3rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)" onclick="openEditSeriesBook(event,'${st.ser.id}','${ensureBkEid(bk)}')" title="Kitabı düzenle">✏️</button>`:'';
            return `<div data-grp-book="1" data-eid="${ensureBkEid(bk)}" style="display:flex;align-items:center;gap:.3rem;padding:.15rem .5rem .15rem 1.25rem;font-size:.8rem;color:var(--parchment);opacity:.85">${ico}${bk.num?' #'+bk.num+' ':' '}<span style="flex:1">${title}</span><div style="display:flex;gap:.2rem;flex-shrink:0">${readingLabel}${startBtn}${editBtn}</div></div>`;
          }).join('');
          const serOpenKey='serInGrp_'+st.ser.id;
          const serIsOpen=sessionStorage.getItem(serOpenKey)==='1';
          const grpAddFormHtml=!viewing?`<div class="series-add-book-row" style="flex-direction:column;align-items:stretch;gap:.35rem;padding:.4rem .5rem .2rem 1.25rem">
            <div style="display:flex;gap:.3rem;flex-wrap:wrap">
              <button class="btn btn-sm" id="seriesAddModeBtn_${st.ser.id}"
                style="font-size:.62rem;padding:.1rem .4rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)"
                onclick="toggleSeriesAddMode('${st.ser.id}')">📋 Toplu giriş</button>
              <button class="btn btn-sm seri-oyku-dugme" id="seriesAddOykuBtn_${st.ser.id}"
                style="font-size:.62rem;padding:.1rem .4rem"
                onclick="seriOykuFormuAc('${st.ser.id}')">📄 Ara öykü</button>
            </div>
            ${oykuEkleFormuHtml(st.ser.id, true)}
            <div id="seriesAddSingle_${st.ser.id}">
              <div style="position:relative">
                <input class="book-input" id="seriesBookTitle_${st.ser.id}" type="text" placeholder="Kitap adı..."
                  style="width:100%;font-size:.78rem;padding:.32rem .5rem"
                  oninput="seriesAcSearch('${st.ser.id}')" onblur="setTimeout(()=>hideSeriesAc('${st.ser.id}'),300)"/>
                <div id="seriesAcList_${st.ser.id}" class="series-ac-dropdown" style="display:none"></div>
              </div>
              <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.3rem">
                <input class="book-input" id="seriesBookAuthor_${st.ser.id}" type="text" placeholder="Yazar (opsiyonel)"
                  style="flex:1;min-width:100px;font-size:.75rem;padding:.3rem .45rem"/>
                <input class="book-input" id="seriesBookNum_${st.ser.id}" type="number" min="1" placeholder="#"
                  style="width:45px;font-size:.75rem;padding:.3rem .35rem"/>
                <input class="book-input" id="seriesBookPages_${st.ser.id}" type="number" min="1" placeholder="Sayfa"
                  style="width:60px;font-size:.75rem;padding:.3rem .35rem"/>
                <button class="btn btn-sm btn-primary" style="font-size:.68rem" onclick="addBookToSeries('${st.ser.id}')">+ Ekle</button>
              </div>
            </div>
            <div id="seriesAddBulk_${st.ser.id}" style="display:none">
              <textarea class="book-input" id="seriesBulkText_${st.ser.id}" placeholder="Her satıra bir kitap adı"
                style="min-height:70px;resize:vertical;font-size:.78rem;line-height:1.4"></textarea>
              <div style="display:flex;gap:.3rem;align-items:center;margin-top:.3rem">
                <input class="book-input" id="seriesBulkAuthor_${st.ser.id}" type="text" placeholder="Yazar (opsiyonel — tümü için)"
                  style="flex:1;font-size:.75rem;padding:.3rem .45rem"/>
                <button class="btn btn-sm btn-primary" style="font-size:.68rem" onclick="addBulkBooksToSeries('${st.ser.id}')">+ Toplu Ekle</button>
              </div>
            </div>
          </div>`:'';
          return `<div style="border:1px solid rgba(74,103,65,.2);border-radius:6px;margin-bottom:.4rem;overflow:hidden">
            <div style="display:flex;align-items:center;gap:.4rem;padding:.4rem .6rem;cursor:pointer;background:rgba(74,103,65,.06)" onclick="toggleSeriesInGroup('${st.ser.id}',this)">
              ${viewing
                ?`<span style="font-size:.85rem;flex:1;font-family:'Crimson Pro',serif;color:var(--parchment)">${escapeHtml(st.ser.name)}</span>`
                :`<span id="grpSeriesNameDisp_${st.ser.id}" style="font-size:.85rem;flex:1;font-family:'Crimson Pro',serif;color:var(--parchment)">${escapeHtml(st.ser.name)}</span>`}
              <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--moss);opacity:.7">${st.readCount}/${st.total} · %${st.pct}</span>
              ${!viewing?`<div onclick="event.stopPropagation()" style="display:flex;gap:.2rem">
                <button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .3rem;background:none;border:none" onclick="startGroupedSeriesNameEdit('${st.ser.id}')" title="Adı düzenle">✏️</button>
                <button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .3rem;background:rgba(201,162,39,.1);color:var(--gold)" onclick="moveStep('${path.id}',${i},-1)" ${i===0?'disabled':''}>▲</button>
                <button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .3rem;background:rgba(201,162,39,.1);color:var(--gold)" onclick="moveStep('${path.id}',${i},1)" ${i===steps.length-1?'disabled':''}>▼</button>
                <button class="btn btn-sm btn-danger" style="font-size:.55rem;padding:.1rem .3rem" onclick="removeStepFromPath('${path.id}','${st.seriesId}',event)">✕</button>
              </div>`:`<div onclick="event.stopPropagation()"><button class="btn btn-sm btn-primary" style="font-size:.55rem;padding:.1rem .3rem" onclick="copySeriesToMyList('${st.ser.id}')">📚 Ekle</button></div>`}
              <span style="font-size:.7rem;color:var(--moss)">${serIsOpen?'▲':'▼'}</span>
            </div>
            <div class="ser-in-grp-books" data-sid="${st.ser.id}" style="display:${serIsOpen?'block':'none'};padding:.3rem 0">${booksHtml||'<div style="padding:.2rem 1rem;font-size:.8rem;opacity:.5;font-style:italic">Kitap yok</div>'}${grpAddFormHtml}</div>
          </div>`;
        }).join('')}
        ${steps.length===0?'<div style="font-size:.85rem;opacity:.5;font-style:italic">Henüz seri eklenmemiş.</div>':''}
        ${!viewing?`<div style="display:flex;gap:.4rem;align-items:center;margin-top:.5rem;flex-wrap:wrap">
          <select class="book-input" id="grpSerSel_${path.id}" style="flex:1;font-size:.8rem;padding:.35rem .5rem">
            <option value="">— Mevcut seriyi gruba ekle —</option>
            ${Object.values(allSeries).filter(s=>!(path.steps||[]).find(st=>st.seriesId===s.id)).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-primary" onclick="addSeriesToPath('${path.id}')">+ Ekle</button>
        </div>`:''}
      </div>`;
    seriesContainer.prepend(div);
  });
}

function toggleGroupCard(pathId, card){
  const body=card.querySelector('.group-card-body');
  const arrow=card.querySelector('span:last-child');
  const isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'block';
  if(arrow) arrow.textContent=isOpen?'▼':'▲';
  sessionStorage.setItem('groupOpen_'+pathId, isOpen?'0':'1');
}

function toggleSeriesInGroup(seriesId, headerEl){
  // Grup içinde kitapları göster/gizle
  const body=headerEl.parentElement.querySelector('.ser-in-grp-books');
  const arrow=headerEl.querySelector('span:last-child');
  const isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'block';
  if(arrow) arrow.textContent=isOpen?'▼':'▲';
  sessionStorage.setItem('serInGrp_'+seriesId, isOpen?'0':'1');
}



// ══════════════════════════════════════════════════════════════════════
// ARA ÖYKÜLER — seriye Hikâyelerim'deki bir öyküyü bağlama (2026-09-17)
// ══════════════════════════════════════════════════════════════════════
// Gökşin'in örneği: Katilbot Günlükleri #4.5 "HOME" — 17 sayfa, Türkçe
// çevirisi yok, Hikâyelerim → Tsundoku'da duruyor, seriyle bağı yoktu.
//
// ⚠️ MODEL: seri satırı öykünün KOPYASINI tutmuyor, ona İŞARET ediyor:
//     { storyId, num, pages, _eid }
// Başlık, yazar, okundu/okunacak, yıldız, not — hepsi Hikâyelerim'deki TEK
// kayıttan geliyor. Kitap satırlarının `bookId` ile yaptığının aynısı.
// Reddedilen yol (gelecek-planlar.md): seriye ayrı bir "ara öykü" kaydı
// yazmak — HOME zaten Hikâyelerim'deydi, çift kayıt olurdu.
//
// ⚠️ SAYIM: öykü satırı serinin TOPLAMINA ve OKUNAN sayısına GİRMEZ.
// Gökşin'in 7'si "6 Türkçe + 1 çevrilmemiş kitap"; HOME o 7'nin içinde değil.
// Rozetler kendiliğinden doğru: completedSeriesCount / maxSeriesBooks /
// sameUniverseFromGroups hepsi `bk.bookId`'ye bakıyor, öykü satırında o yok.
// checkSeriesComplete de `bookId || manualTitle` sayıyor — o da görmüyor.
// Ekrandaki sayaçlar ise elle ayrıldı: `seriKitaplari()` kullanılıyor.
//
// ⚠️ SATIRI ÇÖZEN YER DÖRT TANE: _refreshSeriesBookList, renderSeriesList,
// renderGroupCards, openEditSeriesBook. Dördü de en başta
// `if(bk.storyId) return oykuSatiriniCoz(...)` çağırıyor. Beşinci bir yer
// eklenirse oraya da konmalı — yoksa o görünümde öykü satırı "kitabı
// silinmiş" sanılıp sessizce kaybolur.

/* Başlık karşılaştırması — kitap eklemedeki `normalizeForDup` ile AYNI kural
   (index.html, addBook). "zaten mevcut" uyarısı iki yerde aynı davransın diye. */
function oykuNormal(s){
  return (s||'').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'').trim();
}

function kisininOykuleri(sahip){ return (db.stories&&db.stories[sahip])||[]; }

/* Seri satırını çizime hazır hale getirir. Öykü için sahte bir "book" kuruluyor
   ki mevcut gruplama (Okundu / Okunacak) aynen çalışsın:
     okundu   → readingStatus 'new'     → "Okundu" grubu
     okunacak → readingStatus 'planned' → "Okunacak / Planlanan" grubu
   Öykü Hikâyelerim'den SİLİNMİŞSE null döner ve satır gizlenir (kitaplarda da
   böyle). Silme zaten bağlantıyı temizliyor; bu yalnızca eski kayıt güvencesi. */
function oykuSatiriniCoz(bk, sahip){
  const s = kisininOykuleri(sahip).find(x=>x.id===bk.storyId);
  if(!s) return null;
  return {...bk, book:{
    id:null, storyId:s.id, _oyku:true,
    title:s.title||'', author:s.author||'',
    readingStatus: s.status==='read' ? 'new' : 'planned',
    pages: bk.pages||null
  }};
}

/* Sayaçlar için: öykü satırları ÇIKARILMIŞ liste. */
function seriKitaplari(books){ return (books||[]).filter(bk=>!bk.storyId); }

/* "⏭ Sıradaki" satırında öykü de gösterilsin mi? (Gökşin'in isteği: kısa
   öyküler her zaman erişilebilir değil — sıradaki KİTABI gizlememeli, onun
   yanında seçenek olarak durmalı: "Sıradaki: 📄 HOME / Ağ Etkisi")
   Kural: okunmamış bir öykü, sıradaki kitap ile ONDAN ÖNCEKİ kitap arasında
   duruyorsa gösterilir. Öyküyü atlayıp #5'i okuduysan, sıradaki #6 olur ve
   4.5 bir daha çıkmaz — atlanmış öykü seriyi sonsuza kadar dürtmüyor.
   Hiç okunmamış kitap kalmadıysa: son kitaptan SONRA gelen öykü gösterilir
   (ör. finalden sonra yazılmış bir 7.5). */
function siradakiOyku(books, siradakiKitap){
  const bekleyen = (books||[]).filter(bk=>bk.storyId && bk.book && bk.book.readingStatus!=='new' && bk.num!=null);
  if(!bekleyen.length) return null;
  const kitapNolari = seriKitaplari(books).map(bk=>bk.num).filter(n=>n!=null);
  if(siradakiKitap){
    if(siradakiKitap.num==null) return null;
    const onceki = kitapNolari.filter(n=>n<siradakiKitap.num);
    const alt = onceki.length ? Math.max(...onceki) : -Infinity;
    return bekleyen.find(o=>o.num>alt && o.num<siradakiKitap.num) || null;
  }
  const enSon = kitapNolari.length ? Math.max(...kitapNolari) : -Infinity;
  return bekleyen.find(o=>o.num>enSon) || null;
}

/* Bir öykünün bağlı olduğu seriler — Hikâyelerim tarafında "📚 Katilbot
   Günlükleri #4.5" satırı için. */
function oykununSerileri(sahip, storyId){
  const seriler = (db.seriesData&&db.seriesData[sahip]&&db.seriesData[sahip].series)||{};
  const sonuc = [];
  Object.values(seriler).forEach(ser=>{
    (ser.books||[]).forEach(bk=>{
      if(bk.storyId===storyId) sonuc.push({ ad:ser.name||'', num:bk.num });
    });
  });
  return sonuc;
}
function oykuSeriEtiketi(sahip, storyId){
  return oykununSerileri(sahip, storyId)
    .map(x=>escapeHtml(x.ad)+(x.num!=null?' #'+x.num:'')).join(' · ');
}

/* Seri kartındaki öykü satırı. Kitap satırıyla (renderSeriesBookItemHtml) AYNI
   iskelet; farkları: mor renk, "kısa öykü" etiketi, tıklayınca öykü detayı,
   "📖 Başla" yerine "✔ Okudum" (öykülerde "okunuyor" durumu yok). */
function oykuSatiriHtml(seriesId, bk){
  const b = bk.book;
  const eid = ensureBkEid(bk);
  seriesBkMap[seriesId+'_'+eid] = bk;
  const okundu = b.readingStatus==='new';
  const sahip = viewing||me;
  const benim = !viewing;
  return `<div class="series-book-item seri-oyku ${okundu?'':'seri-oyku-bekliyor'}" data-eid="${eid}" onclick="openStoryDetail('${sahip}',${b.storyId})">
    <span class="series-book-num">${bk.num!=null?'#'+bk.num:''}</span>
    <span class="series-book-status">${okundu?'✅':'⏳'}</span>
    <span class="series-book-title">📄 ${escapeHtml(b.title)}${b.author?'<span style="opacity:.6;font-size:.75rem"> — '+escapeHtml(b.author)+'</span>':''}<span class="seri-oyku-etiket">kısa öykü</span>${bk.pages?'<span style="opacity:.6;font-size:.7rem"> · '+bk.pages+' sayfa</span>':''}</span>
    <div style="display:flex;gap:.25rem;margin-left:auto" onclick="event.stopPropagation()">
      ${benim&&!okundu?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .4rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" onclick="seridenOykuOkundu(${b.storyId})">✔ Okudum</button>`:''}
      ${benim?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .35rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)" onclick="openEditSeriesBook(event,'${seriesId}','${eid}')">✏️</button>
      <button class="btn btn-sm btn-danger" style="font-size:.55rem;padding:.1rem .35rem" onclick="oykuyuSeridenCikarSor(event,'${seriesId}',${b.storyId})">✕</button>`:''}
    </div>
  </div>`;
}

/* Grup (okuma yolu) kartının içindeki kısa satır — oradaki kitap satırlarının
   kalıbı: ikon · numara · başlık · düğmeler. Kitap satırlarında orada silme
   düğmesi yok, öyküde de yok. */
function oykuGrupSatiriHtml(seriesId, bk){
  const b = bk.book;
  const eid = ensureBkEid(bk);
  seriesBkMap[seriesId+'_'+eid] = bk;
  const okundu = b.readingStatus==='new';
  const sahip = viewing||me;
  return `<div data-grp-book="1" data-eid="${eid}" class="seri-oyku-grup" onclick="openStoryDetail('${sahip}',${b.storyId})" style="display:flex;align-items:center;gap:.3rem;padding:.15rem .5rem .15rem 1.25rem;font-size:.8rem;cursor:pointer">${okundu?'✅':'⏳'}${bk.num!=null?' #'+bk.num+' ':' '}<span style="flex:1;color:#dccbf0">📄 ${escapeHtml(b.title)}<span class="seri-oyku-etiket">kısa öykü</span></span><div style="display:flex;gap:.2rem;flex-shrink:0" onclick="event.stopPropagation()">${!viewing&&!okundu?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .35rem;background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.3)" onclick="seridenOykuOkundu(${b.storyId})">✔ Okudum</button>`:''}${!viewing?`<button class="btn btn-sm" style="font-size:.55rem;padding:.1rem .3rem;background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)" onclick="openEditSeriesBook(event,'${seriesId}','${eid}')" title="Öyküyü düzenle">✏️</button>`:''}</div></div>`;
}

/* "📄 Ara öykü" ekleme formu — seri kartında ve grup kartında AYNI form, o
   yüzden tek yerde üretiliyor (kitap formu iki yerde ayrı ayrı yazılmış;
   aynı hatayı tekrarlamayalım). `kucuk` grup kartının sıkışık ölçüsü. */
function oykuEkleFormuHtml(seriesId, kucuk){
  const fs = kucuk ? '.75rem' : '.82rem';
  const pd = kucuk ? '.3rem .45rem' : '.35rem .5rem';
  return `<div id="seriesAddOyku_${seriesId}" style="display:none">
    <div style="position:relative">
      <input class="book-input" id="seriOykuBaslik_${seriesId}" type="text" placeholder="Öykü adı — Hikâyelerim'de ara..."
        style="width:100%;font-size:${kucuk?'.78rem':'.85rem'};padding:${kucuk?'.32rem .5rem':'.4rem .6rem'}"
        oninput="delete this.dataset.oykuId;seriOykuAra('${seriesId}')" onblur="setTimeout(()=>seriOykuAraGizle('${seriesId}'),300)"/>
      <div id="seriOykuListe_${seriesId}" class="series-ac-dropdown" style="display:none"></div>
    </div>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.3rem">
      <input class="book-input" id="seriOykuYazar_${seriesId}" type="text" placeholder="Yazar (opsiyonel)"
        style="flex:1;min-width:110px;font-size:${fs};padding:${pd}"/>
      <input class="book-input" id="seriOykuNo_${seriesId}" type="number" step="any" min="0" placeholder="örn. 4.5"
        style="width:72px;font-size:${fs};padding:${pd}"/>
      <input class="book-input" id="seriOykuSayfa_${seriesId}" type="number" min="1" placeholder="Sayfa"
        style="width:62px;font-size:${fs};padding:${pd}"/>
    </div>
    <div class="confirm-bar" id="seriOykuOnay_${seriesId}">
      <span id="seriOykuOnayMsg_${seriesId}" style="flex:1;color:var(--gold-light)"></span>
      <button class="btn btn-sm btn-primary" onclick="seriyeOykuEkle('${seriesId}','bagla')">🔗 Onu Bağla</button>
      <button class="btn btn-sm" style="background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.2)" onclick="seriyeOykuEkle('${seriesId}','yeni')">Yine de Yeni Ekle</button>
      <button class="btn btn-sm" style="background:rgba(138,69,19,.1);color:var(--gold-light);border:1px solid rgba(201,162,39,.3)" onclick="seriOykuOnayKapat('${seriesId}')">İptal</button>
    </div>
    <div style="display:flex;gap:.4rem;align-items:center;margin-top:.3rem">
      <button class="btn btn-sm btn-primary" style="font-size:${kucuk?'.68rem':''}" onclick="seriyeOykuEkle('${seriesId}')">+ Öyküyü Ekle</button>
    </div>
    <div style="font-size:.7rem;color:#dccbf0;opacity:.9;font-style:italic;margin-top:.3rem">Hikâyelerim'de yoksa oraya ⏳ Okunacak olarak eklenir. Ara öykü serinin toplamına sayılmaz.</div>
  </div>`;
}

/* Form düğmesi: "📄 Ara öykü" ↔ kitap formuna geri dönüş. Toplu giriş
   düğmesiyle aynı yerde duruyor; üç form aynı anda açık olmuyor. */
function seriOykuFormuAc(seriesId){
  const oyku = document.getElementById('seriesAddOyku_'+seriesId);
  const tek = document.getElementById('seriesAddSingle_'+seriesId);
  const toplu = document.getElementById('seriesAddBulk_'+seriesId);
  const dugme = document.getElementById('seriesAddOykuBtn_'+seriesId);
  const modDugme = document.getElementById('seriesAddModeBtn_'+seriesId);
  if(!oyku) return;
  const acik = getComputedStyle(oyku).display!=='none';
  oyku.style.display = acik ? 'none' : '';
  if(tek) tek.style.display = acik ? '' : 'none';
  if(toplu) toplu.style.display = 'none';
  if(modDugme){ modDugme.textContent = '📋 Toplu giriş'; modDugme.style.display = acik ? '' : 'none'; }
  if(dugme) dugme.textContent = acik ? '📄 Ara öykü' : '📖 Kitap ekle';
  if(!acik){ const b=document.getElementById('seriOykuBaslik_'+seriesId); if(b) b.focus(); }
}

/* Hikâyelerim'de ara — kitaplardaki seriesAcSearch'ün kopyası. */
function seriOykuAra(seriesId){
  const input = document.getElementById('seriOykuBaslik_'+seriesId);
  const liste = document.getElementById('seriOykuListe_'+seriesId);
  if(!input||!liste) return;
  seriOykuOnayKapat(seriesId);
  const q = input.value.trim().toLowerCase();
  if(q.length < 2){ liste.style.display='none'; return; }
  const ser = mySeriesData().series[seriesId];
  const bagli = new Set(((ser&&ser.books)||[]).map(b=>b.storyId).filter(Boolean));
  const eslesen = kisininOykuleri(me).filter(s=>
    (s.title||'').toLowerCase().includes(q) || (s.author||'').toLowerCase().includes(q)
  ).slice(0,6);
  if(!eslesen.length){ liste.style.display='none'; return; }
  liste.innerHTML = eslesen.map(s=>{
    const zaten = bagli.has(s.id);
    return `<div class="series-ac-item" ${zaten?'style="opacity:.5;cursor:default"':`onclick="seriOykuSec('${seriesId}',${s.id})"`}>
      <span style="font-size:.88rem;color:var(--parchment);font-weight:600">📄 ${escapeHtml(s.title)}</span>
      ${s.author?`<span style="font-size:.75rem;color:var(--gold-light);opacity:.92"> — ${escapeHtml(s.author)}</span>`:''}
      <span style="font-size:.65rem;color:#dccbf0;font-family:'Space Mono',monospace"> · ${zaten?'bu seride zaten var':(s.status==='read'?'✔ okundu':'⏳ okunacak')}</span>
    </div>`;
  }).join('');
  liste.style.display='block';
}
function seriOykuAraGizle(seriesId){
  const liste = document.getElementById('seriOykuListe_'+seriesId);
  if(liste) liste.style.display='none';
}
function seriOykuSec(seriesId, storyId){
  const s = kisininOykuleri(me).find(x=>x.id===storyId);
  if(!s) return;
  const baslik = document.getElementById('seriOykuBaslik_'+seriesId);
  const yazar = document.getElementById('seriOykuYazar_'+seriesId);
  if(baslik){ baslik.value = s.title||''; baslik.dataset.oykuId = String(s.id); }
  if(yazar) yazar.value = s.author||'';
  seriOykuAraGizle(seriesId);
  const no = document.getElementById('seriOykuNo_'+seriesId);
  if(no) no.focus();
}
function seriOykuOnayKapat(seriesId){
  const bar = document.getElementById('seriOykuOnay_'+seriesId);
  if(bar) bar.classList.remove('show');
}

/* Seriye öykü ekle / bağla.
   secim: undefined → normal ekleme (aynı adlı öykü varsa önce SOR)
          'bagla'   → sorudan sonra: var olanı bağla
          'yeni'    → sorudan sonra: yine de yeni öykü oluştur
   "zaten mevcut" sorusu kitap eklemedeki dupConfirmBar'ın karşılığı; farkı,
   burada asıl önerilen şeyin YENİ KAYIT değil VAR OLANI BAĞLAMAK olması. */
function seriyeOykuEkle(seriesId, secim){
  const baslikEl = document.getElementById('seriOykuBaslik_'+seriesId);
  const yazarEl = document.getElementById('seriOykuYazar_'+seriesId);
  const noEl = document.getElementById('seriOykuNo_'+seriesId);
  const sayfaEl = document.getElementById('seriOykuSayfa_'+seriesId);
  const baslik = baslikEl ? baslikEl.value.trim() : '';
  if(!baslik){ notify('⚠️','Öykü adı boş olamaz.'); return; }
  const ser = mySeriesData().series[seriesId];
  if(!ser) return;
  if(!db.stories) db.stories={};
  if(!db.stories[me]) db.stories[me]=[];
  const oykuler = db.stories[me];

  let oyku = null;
  if(baslikEl.dataset.oykuId){
    // Listeden seçildi — soru sormaya gerek yok, kullanıcı zaten o kaydı seçti.
    oyku = oykuler.find(s=>String(s.id)===baslikEl.dataset.oykuId) || null;
  } else if(secim==='bagla'){
    oyku = oykuler.find(s=>String(s.id)===baslikEl.dataset.oykuAday) || null;
  } else if(secim!=='yeni'){
    const ayni = oykuler.find(s=>oykuNormal(s.title)===oykuNormal(baslik));
    if(ayni){
      const bar = document.getElementById('seriOykuOnay_'+seriesId);
      const msg = document.getElementById('seriOykuOnayMsg_'+seriesId);
      baslikEl.dataset.oykuAday = String(ayni.id);
      if(msg) msg.textContent = `"${ayni.title}" zaten Hikâyelerim'de var (${ayni.status==='read'?'Okundu':'Tsundoku'}). Onu mu bağlayayım?`;
      if(bar) bar.classList.add('show');
      return;
    }
  }

  if(oyku && (ser.books||[]).some(b=>b.storyId===oyku.id)){
    notify('⚠️','Bu öykü zaten seriye ekli.'); return;
  }

  let yeni = false;
  if(!oyku){
    // Yazar boşsa serideki bir kitaptan al — addBookToSeries'in yaptığı gibi.
    let yazar = yazarEl ? yazarEl.value.trim() : '';
    if(!yazar){
      for(const bk of (ser.books||[])){
        if(bk.manualAuthor){ yazar = bk.manualAuthor; break; }
        if(bk.bookId){ const lb=(db.books[me]||[]).find(b=>b.id===bk.bookId); if(lb&&lb.author){ yazar=lb.author; break; } }
      }
    }
    // addStory ile AYNI alanlar — Hikâyelerim'in beklediği şekil.
    oyku = {
      id:Date.now(),
      title:baslik, author:yazar, source:'kitap', status:'toread',
      link:null, sourceBook:null, readDate:null, readYearOnly:null,
      rating:0, note:null, retroactive:false,
      addedAt:new Date().toISOString(),
    };
    oykuler.push(oyku);
    yeni = true;
  }

  const no = parseFloat(noEl ? noEl.value : '');
  ser.books = ser.books||[];
  // ⚠️ Kaydırma YOK: kitap eklerken aynı numara doluysa sonrakiler kayıyor,
  // ama ara öykü bir kitabın yerini almıyor — araya giriyor.
  ser.books.push({ storyId:oyku.id, num:(isFinite(no)&&no>=0)?no:null, pages:parseInt(sayfaEl?sayfaEl.value:'')||null });
  ser.books.sort((a,b)=>(a.num??999)-(b.num??999));
  saveDb();

  [baslikEl,yazarEl,noEl,sayfaEl].forEach(el=>{ if(el){ el.value=''; delete el.dataset.oykuId; delete el.dataset.oykuAday; } });
  seriOykuOnayKapat(seriesId);
  seriOykuAraGizle(seriesId);
  notify(yeni?'📄 Öykü eklendi':'🔗 Öykü bağlandı',
    yeni ? `"${baslik}" Hikâyelerim'e ⏳ Okunacak olarak eklendi ve seriye bağlandı.`
         : `Hikâyelerim'deki "${oyku.title}" seriye bağlandı.`);
  renderSeriesList();
  // Kitap formu eklemeden sonra açık kalıyor; öykü formu da kalsın — art arda
  // birkaç ara öykü eklenebilsin (liste yeniden çizilince form kapalı doğuyor).
  seriOykuFormuAc(seriesId);
  if(typeof renderStories==='function') renderStories();
}

/* Seri satırındaki "✔ Okudum" — öykünün KENDİSİNİ okundu yapar.
   ⚠️ saveStoryField üzerinden gidiyor, oykuyuOkunduYap üzerinden DEĞİL:
   saveStoryField rozet kontrolünü ve diyar keşfini de yapıyor;
   oykuyuOkunduYap rozet kontrolü yapmıyor. */
function seridenOykuOkundu(storyId){
  const s = kisininOykuleri(me).find(x=>x.id===storyId);
  if(!s) return;
  saveStoryField(storyId,'status','read');   // seri kartını da o yeniden çiziyor
  notify('✔ Öykü okundu', `"${s.title}" okundu olarak işaretlendi.`);
}

/* Seriden çıkar — yalnızca BAĞLANTIYI siler, öykü Hikâyelerim'de kalır.
   Onay metni bunu açıkça söylüyor; yoksa "✕" öyküyü de siliyor sanılır. */
function oykuyuSeridenCikarSor(evt, seriesId, storyId){
  evt.stopPropagation();
  const s = kisininOykuleri(me).find(x=>x.id===storyId);
  const kutuId = 'rmOyku_'+seriesId+'_'+storyId;
  const eski = document.getElementById(kutuId);
  if(eski){ eski.remove(); return; }
  const satir = evt.target.closest('.series-book-item');
  if(!satir) return;
  const kutu = document.createElement('div');
  kutu.id = kutuId;
  kutu.style.cssText = 'display:flex;align-items:center;gap:.4rem;padding:.25rem .5rem;background:rgba(139,0,0,.12);border:1px solid rgba(139,0,0,.3);border-radius:4px;font-family:Crimson Pro,serif;font-size:.78rem;color:var(--gold-light);flex-wrap:wrap;margin-top:.2rem';
  const ad = document.createElement('span');
  ad.textContent = `"${(s&&s.title)||'Bu öykü'}" seriden çıkarılsın mı? Hikâyelerim'de kalır.`;
  kutu.appendChild(ad);
  kutu.insertAdjacentHTML('beforeend',
    `<button class="btn btn-sm btn-danger" style="font-size:.68rem;padding:.1rem .4rem" onclick="oykuyuSeridenCikar('${seriesId}',${storyId})">Evet</button>
     <button class="btn btn-sm" style="font-size:.68rem;padding:.1rem .4rem;background:rgba(201,162,39,.1);color:var(--gold)" onclick="this.parentElement.remove()">İptal</button>`);
  satir.insertAdjacentElement('afterend', kutu);
}
function oykuyuSeridenCikar(seriesId, storyId){
  const ser = mySeriesData().series[seriesId];
  if(!ser) return;
  ser.books = (ser.books||[]).filter(b=>b.storyId!==storyId);
  saveDb();
  renderSeriesList();
  if(typeof renderStories==='function') renderStories();
}

/* Öykü Hikâyelerim'den SİLİNİNCE tüm serilerdeki bağlantısını temizle —
   kitap silmedeki "öksüz bookId bırakma" (Ö34) kuralının öykü karşılığı. */
function oykuSeriBaglariniTemizle(storyId){
  const seriler = (db.seriesData&&db.seriesData[me]&&db.seriesData[me].series)||{};
  Object.values(seriler).forEach(ser=>{
    if((ser.books||[]).some(b=>b.storyId===storyId)){
      ser.books = ser.books.filter(b=>b.storyId!==storyId);
    }
  });
}

// ── OKUMA YOLLARI ─────────────────────────────────────────────

function copySeriesToMyList(seriesId){
  const srcData = viewSeriesData();
  const ser = srcData.series[seriesId];
  if(!ser){ notify('⚠️','Seri bulunamadı.'); return; }
  const myData = mySeriesData();
  // Aynı isimde seri var mı?
  const exists = Object.values(myData.series||{}).find(s=>s.name.toLowerCase()===ser.name.toLowerCase());
  if(exists){ notify('⚠️',ser.name+' zaten serilerinizde var.'); return; }
  const newId = 'ser_'+Date.now();
  // Kitapları planned olarak kopyala (bookId'ler başkasına ait)
  const books = (ser.books||[]).map((bk,i)=>({
    manualTitle: bk.manualTitle || bk.bookId ? (myBooks().find(b=>b.id===bk.bookId)||{title:bk.manualTitle||''}).title || '' : '',
    manualAuthor: bk.manualAuthor||'',
    num: bk.num||null,
    pages: bk.pages||null,
    planned: true
  })).filter(b=>b.manualTitle);
  myData.series[newId] = { id:newId, name:ser.name, total:ser.total||null, books, createdAt:new Date().toISOString() };
  saveDb();
  renderSeriesList();
  notify('✅ Eklendi', ser.name+' serilerinize eklendi.');
}

function copyGroupToMyList(pathId){
  const srcData = viewSeriesData();
  const path = srcData.paths[pathId];
  if(!path){ notify('⚠️','Grup bulunamadı.'); return; }
  const myData = mySeriesData();
  const exists = Object.values(myData.paths||{}).find(p=>p.name.toLowerCase()===path.name.toLowerCase());
  if(exists){ notify('⚠️',path.name+' zaten gruplarınızda var.'); return; }
  // Önce serileri kopyala, sonra grubu oluştur
  const newSteps = [];
  (path.steps||[]).forEach(s=>{
    const ser = srcData.series[s.seriesId];
    if(!ser) return;
    const alreadyExists = Object.values(myData.series||{}).find(ms=>ms.name.toLowerCase()===ser.name.toLowerCase());
    if(alreadyExists){ newSteps.push({seriesId:alreadyExists.id}); return; }
    const newId = 'ser_'+(Date.now()+Math.random()*1000|0);
    const books = (ser.books||[]).map(bk=>({
      manualTitle: bk.manualTitle||(myBooks().find(b=>b.id===bk.bookId)||{}).title||'',
      manualAuthor: bk.manualAuthor||'',
      num: bk.num||null, pages: bk.pages||null, planned:true
    })).filter(b=>b.manualTitle);
    myData.series[newId] = {id:newId, name:ser.name, total:ser.total||null, books, createdAt:new Date().toISOString()};
    newSteps.push({seriesId:newId});
  });
  const newPathId = 'path_'+Date.now();
  myData.paths[newPathId] = {id:newPathId, name:path.name, steps:newSteps, createdAt:new Date().toISOString()};
  saveDb();
  renderSeriesList();
  notify('✅ Eklendi', path.name+' grubu ve serileri listenize eklendi.');
}

function createPath(){
  const name = document.getElementById('newPathName').value.trim();
  const st = document.getElementById('pathCreateStatus');
  if(!name){ st.textContent='⚠️ Yol adı boş olamaz.'; return; }
  const data = mySeriesData();
  if(!data.paths) data.paths={};
  const id = 'path_'+Date.now();
  data.paths[id] = { id, name, steps:[], createdAt: new Date().toISOString() };
  saveDb();
  document.getElementById('newPathName').value='';
  st.textContent='✓ Okuma yolu oluşturuldu!';
  setTimeout(()=>{ st.textContent=''; }, 2500);
  renderSeriesList();
}

// 2026-08-31: tarayıcının `confirm()` kutusu yerine uygulama içi onay şeridi
// (`showInlineConfirm`, feed.js). Düğme öğesi `this` ile geliyor; gelmezse
// SİLMİYORUZ — onaysız silmektense hiç silmemek.
function deletePath(id, btn){
  const sil=()=>{
    const data = mySeriesData();
    delete data.paths[id];
    saveDb();
    renderSeriesList();
    mesajGoster('Okuma yolu silindi.');
  };
  if(!btn || typeof showInlineConfirm!=='function'){
    mesajGoster('Silme onayı açılamadı, işlem yapılmadı.','uyari');
    return;
  }
  showInlineConfirm(btn, 'Okuma yolu silinsin mi?', sil);
}

function addSeriesToPath(pathId){
  const sel = document.getElementById('grpSerSel_'+pathId) || document.getElementById('pathSeriesSel_'+pathId);
  if(!sel||!sel.value) return;
  const data = mySeriesData();
  const path = data.paths[pathId];
  if(!path) return;
  if((path.steps||[]).find(s=>s.seriesId===sel.value)){
    notify('⚠️','Bu seri zaten grupta mevcut.'); return;
  }
  path.steps = path.steps||[];
  path.steps.push({ seriesId: sel.value });
  saveDb();
  renderSeriesList();
}

function removeStepFromPath(pathId, seriesId, evt){
  const confirmId = 'stepRemoveConf_'+pathId+'_'+seriesId;
  const existing = document.getElementById(confirmId);
  if(existing){ existing.remove(); return; }
  const data = mySeriesData();
  const ser = data.series[seriesId];
  const serName = ser ? ser.name : 'Bu seri';
  const btn = evt ? evt.target.closest('button') : null;
  if(!btn) { _doRemoveStep(pathId, seriesId); return; }
  const box = document.createElement('div');
  box.id = confirmId;
  box.style.cssText = 'display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .4rem;background:rgba(139,0,0,.12);border:1px solid rgba(139,0,0,.3);border-radius:4px;font-family:Crimson Pro,serif;font-size:.75rem;color:var(--gold-light)';
  box.innerHTML = `"${serName}" gruptan çıkar?
    <button class="btn btn-sm btn-danger" style="font-size:.65rem;padding:.1rem .35rem" onclick="_doRemoveStep('${pathId}','${seriesId}')">Evet</button>
    <button class="btn btn-sm" style="font-size:.65rem;padding:.1rem .35rem;background:rgba(201,162,39,.1);color:var(--gold)" onclick="document.getElementById('${confirmId}').remove()">İptal</button>`;
  btn.insertAdjacentElement('afterend', box);
}
function _doRemoveStep(pathId, seriesId){
  const confirmId = 'stepRemoveConf_'+pathId+'_'+seriesId;
  document.getElementById(confirmId)?.remove();
  const data = mySeriesData();
  const path = data.paths[pathId];
  if(!path) return;
  path.steps = (path.steps||[]).filter(s=>s.seriesId!==seriesId);
  saveDb();
  renderSeriesList();
}

function moveStep(pathId, idx, dir){
  const data = mySeriesData();
  const path = data.paths[pathId];
  if(!path||!path.steps) return;
  const newIdx = idx+dir;
  if(newIdx<0||newIdx>=path.steps.length) return;
  const tmp = path.steps[idx];
  path.steps[idx] = path.steps[newIdx];
  path.steps[newIdx] = tmp;
  saveDb();
  renderSeriesList();
}
