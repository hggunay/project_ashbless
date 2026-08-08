// feed.js — Ana Sayfa (Feed) + Günlük (Journal) + Özel Notlar modülü (Ö40, 2026-08-04)
// index.html'teki ana <script> bloğundan ÖNCE yükleniyor,
// bu yüzden buradaki fonksiyonlar ana bloktan çağrılabilir.
// NOT: escapeHtml BİLEREK burada DEĞİL — tüm uygulama genelinde (rozetler, kitap rafı,
// modal, series.js vb.) kullanılan paylaşılan bir yardımcı, ana dosyada kaldı.
// PAGE_SIZE de ana dosyada kaldı (Hikayeler ve Kitap Rafı sayfalaması da onu kullanıyor).

let feedFilter='all';
let lastFeedVisit=0;
let feedPage=1, journalPage=1, privateNotesPage=1;

// Feed kartındaki kitap başlığına tıklanınca çağrılır. openBook() kitabı
// targetBooks() = db.books[viewing||me] içinde arıyor; kart başka bir
// kullanıcıya aitse ve o kullanıcı şu an "viewing" değilse kitap orada
// bulunamıyor ve modal sessizce açılmıyordu. viewMember()/stopViewing()
// zaten uygulamanın geri kalanında (avatar/isim tıklaması) kullanılan,
// test edilmiş context-değiştirme yolu — burada da onu kullanıyoruz.
// Bkz. ö40-devir-teslim-notu #5.
function openBookFromFeed(owner,bookId){
  if(owner===me){ if(viewing) stopViewing(); }
  else if(owner!==viewing){ viewMember(owner); }
  openBook(bookId);
}

function filterFeed(f,el){
  feedFilter=f; feedPage=1;
  document.querySelectorAll('#feed .filter-tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  renderFeed();
}

function getFeedCards(){
  let cards=[];
  Object.keys(db.users).forEach(u=>{
    const user=db.users[u];
    // Gizli profil — sahibi hariç kimse akışta göremesin
    if(u!==me&&user&&user.publicProfile===false) return;
    const books=db.books[u]||[];
    books.forEach(b=>{
      if(b.review&&b.review.trim()){
        cards.push({
          type:'review', u, userName:user.displayName, userAvatar:user.avatar||'📚',
          bookId:b.id, bookTitle:b.title, author:b.author,
          rating:b.rating||0, text:b.review, ts:b.reviewTs||b.addedAt||0,
          reactions:b.reviewReactions||{},
        });
      }
      (b.quotes||[]).forEach((q,qi)=>{
        cards.push({
          type:'quote', u, userName:user.displayName, userAvatar:user.avatar||'📚',
          bookId:b.id, bookTitle:b.title, author:b.author,
          text:q.text, page:q.page, ts:q.ts||b.addedAt||0, quoteIdx:qi,
          reactions:q.reactions||{},
        });
      });
    });
    const stories=(db.stories&&db.stories[u])||[];
    stories.filter(s=>s.status==='read').forEach(s=>{
      cards.push({
        type:'story', u, userName:user.displayName, userAvatar:user.avatar||'📚',
        storyId:s.id, bookTitle:s.title, author:s.author,
        rating:s.rating||0, source:s.source, link:s.link, sourceBook:s.sourceBook||null,
        ts:s.addedAt||0, reactions:s.reactions||{},
      });
    });
    const seriesEvs=(db.seriesEvents&&db.seriesEvents[u])||[];
    seriesEvs.forEach(ev=>{
      cards.push({
        type:'series_event', u, userName:user.displayName, userAvatar:user.avatar||'📚',
        seriesEventId:ev.id, seriesName:ev.seriesName, bookTitle:ev.bookTitle,
        eventType:ev.type, ts:ev.ts||0, reactions:ev.reactions||{},
      });
    });
    const countryEvs=(db.countryEvents&&db.countryEvents[u])||[];
    countryEvs.forEach(ev=>{
      cards.push({
        type:'country_event', u, userName:user.displayName, userAvatar:user.avatar||'📚',
        countryEventId:ev.id, country:ev.country, bookTitle:ev.bookTitle, author:ev.author,
        ts:ev.ts||0, reactions:ev.reactions||{},
      });
    });
    const streakEvs=(db.streakEvents&&db.streakEvents[u])||[];
    streakEvs.forEach(ev=>{
      cards.push({
        type:'streak_milestone', u, userName:user.displayName, userAvatar:user.avatar||'📚',
        months:ev.months, emoji:ev.emoji, badge:ev.badge, ts:ev.ts||0, reactions:ev.reactions||{},
      });
    });
	const badgeEvs=(db.badgeEvents&&db.badgeEvents[u])||[];
    badgeEvs.forEach(ev=>{
      cards.push({
        type:'badge', u, userName:user.displayName, userAvatar:user.avatar||'📚',
        badgeId:ev.badgeId, eventId:ev.id, tier:ev.tier, icon:ev.icon, name:ev.name, desc:ev.desc,
        ts:ev.ts||0, reactions:ev.reactions||{},
      });
    });
    const readingEvs=(db.readingEvents&&db.readingEvents[u])||[];
    readingEvs.forEach(ev=>{
      cards.push({
        type:'reading_event', u, userName:user.displayName, userAvatar:user.avatar||'📚',
        readingEventId:ev.id, bookId:ev.bookId, bookTitle:ev.bookTitle, author:ev.author,
        eventType:ev.type, variant:ev.variant, ts:ev.ts||0, reactions:ev.reactions||{},
      });
    });
  });
  // Birlikte okuma davetleri
  const sessions=db.readingSessions||{};
  const now=Date.now();
  Object.values(sessions).forEach(s=>{
    if(s.status==='cancelled') return;
    if(s.expiresAt&&s.expiresAt<now&&s.status!=='active'&&s.status!=='ended'&&s.status!=='completed') return;
    const initiatorUser=db.users[s.initiator]||{};
    cards.push({
      type:'coreading_invite',
      sessionId:s.id,
      u:s.initiator,
      userName:initiatorUser.displayName||s.initiator,
      userAvatar:initiatorUser.avatar||'📚',
      bookTitle:s.bookTitle,
      author:s.author||'',
      pages:s.pages||0,
      participants: JSON.parse(JSON.stringify(s.participants||{})),
      ts:s.createdAt||0,
      lastActivityAt:s.lastActivityAt||s.createdAt||0,
      expiresAt:s.expiresAt||0,
	  status: s.status||'pending',
      startedAt: s.startedAt||0,
	  progress: JSON.parse(JSON.stringify(s.progress||{})),
      history: JSON.parse(JSON.stringify(s.history||[])),
    });
  });
  return cards;
}

function updateFeedBadge(){
  if(db.users[me]&&typeof db.users[me].lastFeedVisit==='number'){
    lastFeedVisit=db.users[me].lastFeedVisit;
  } else {
    // Tek seferlik geçiş: Firebase'de kayıt yoksa eski localStorage değerini kullan
    try{
      const saved=localStorage.getItem('aa-feed-visit-'+me);
      lastFeedVisit=saved?parseInt(saved):0;
      if(db.users[me]){ db.users[me].lastFeedVisit=lastFeedVisit; saveDb(); }
    }catch(e){lastFeedVisit=0;}
  }
  const allCards=getFeedCards();
  const newCount=allCards.filter(c=>{
    let ts=c.ts;
    if(typeof ts==='string') ts=new Date(ts).getTime();
    if(!ts||isNaN(ts)) return false;
    return ts>lastFeedVisit&&c.u!==me;
  }).length;
  const badge=document.getElementById('feedBadge');
  const inlineBadge=document.getElementById('feedNewBadge');
  if(badge){badge.style.display=newCount>0?'':'none';badge.textContent=newCount>0?String(newCount):'';}
  if(inlineBadge){inlineBadge.style.display=newCount>0?'':'none';inlineBadge.textContent=newCount>0?`${newCount} yeni paylaşım`:'';}
}

function markFeedVisited(){
  const now=Date.now();
  if(db.users[me]) db.users[me].lastFeedVisit=now;
  try{localStorage.setItem('aa-feed-visit-'+me,String(now));}catch(e){} // çevrimdışı yedek
  // K3 devamı: bu salt kozmetik alan (Feed rozeti için) paylaşılan "diğer alanlar" çakışma
  // kontrolünden geçmeden doğrudan kendi granüler yoluna yazılıyor — yoksa Feed'e her girişte
  // tüm profil/rozet verisi gereksiz yere çakışma riskine giriyordu (saveDb() yerine).
  fbSet('aa-v4/users/'+me+'/lastFeedVisit', now).catch(()=>{});
  if(_lastOtherFieldsSnapshot){
    try{
      const cached=JSON.parse(_lastOtherFieldsSnapshot);
      if(cached.users&&cached.users[me]){ cached.users[me].lastFeedVisit=now; _lastOtherFieldsSnapshot=JSON.stringify(cached); }
    }catch(e){}
  }
  lastFeedVisit=now;
  updateFeedBadge();
}

function renderFeed(append=false){
  const container=document.getElementById('feedContainer');
  if(!container) return;
  // NOT: feedPage burada sıfırlanmıyor — filtre değişince filterFeed() kendi
  // feedPage=1 yapıyor. Böylece reaksiyon vermek/alıntı silmek gibi "içerik değişti,
  // görünümü tazele" çağrıları kullanıcıyı akışın başına fırlatmıyor.

  let cards=getFeedCards();
  if(feedFilter==='reviews') cards=cards.filter(c=>c.type==='review');
  else if(feedFilter==='quotes') cards=cards.filter(c=>c.type==='quote');
  else if(feedFilter==='stories') cards=cards.filter(c=>c.type==='story');
  else if(feedFilter==='coreading') cards=cards.filter(c=>c.type==='coreading_invite');

  cards.sort((a,b)=>{
    // Birlikte okuma kartları aktifse en üste
    const aActive=a.type==='coreading_invite'&&a.status==='active';
    const bActive=b.type==='coreading_invite'&&b.status==='active';
    if(aActive&&!bActive) return -1;
    if(bActive&&!aActive) return 1;
    if(a.type==='coreading_invite'&&b.type==='coreading_invite'){
      const now=Date.now();
      const score=s=>{
        if(s.status!=='active') return s.lastActivityAt||s.ts||0;
        const act=s.lastActivityAt||s.ts||0;
        const age=now-act;
        if(age<7*24*60*60*1000) return now+1e12;
        if(age<30*24*60*60*1000) return act;
        return act-1e12;
      };
      return score(b)-score(a);
    }
    // İkisi de coreading ise kendi aralarında tarihe göre
    const getTs=c=>{
      if(c.type==='coreading_invite'&&(c.status==='ended'||c.status==='completed')) return c.lastActivityAt||c.ts||0;
      return typeof c.ts==='number'?c.ts:new Date(c.ts||0).getTime();
    };
    return getTs(b)-getTs(a);
  });

  if(!cards.length){
    container.innerHTML=`<div class="empty-state" style="padding:2rem">Henüz paylaşım yok. Kitap değerlendirmesi yaz, alıntı veya hikâye ekle!</div>`;
    return;
  }

  const defaultReactionList=['📖 Okumak istiyorum','✅ Ben de okudum','💬 Konuşalım','👍'];
  const milestoneReactionList=['🎉 Tebrikler','🔥 Bende de var','💪 Ben de başaracağım','👏 Harika'];

  function fmtDate(ts){
    if(!ts) return '';
    const d=new Date(typeof ts==='number'?ts:ts);
    if(isNaN(d)) return '';
    return d.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  }

  function feedReactionHtml(card){
   const cardKey=card.type==='story'
      ?`story_${card.u}_${card.storyId}`
      :card.type==='series_event'
        ?`seriesev_${card.u}_${card.seriesEventId}`
        :card.type==='country_event'
          ?`countryev_${card.u}_${card.countryEventId}`
          :card.type==='badge'
            ?`badge_${card.u}_${card.badgeId}_${card.ts}`
            :card.type==='reading_event'
              ?`readingev_${card.u}_${card.readingEventId}`
              :card.type==='quote'
                ?`quote_${card.u}_${card.bookId}_${card.quoteIdx}`
                :`review_${card.u}_${card.bookId}`;
    const reactionList=card.type==='streak_milestone'?milestoneReactionList:defaultReactionList;
    // Sağ-tık panelinden seçilmiş ama sabit listede olmayan emojiler (😂😢😤🤯❤️💩) —
    // kullanılmışsa 👍'nin yanına ayrı buton olarak eklenmeli, yoksa veri kaydediliyor
    // ama hiçbir yerde görünmüyor (bkz. 2026-08-08 canlı hata raporu).
    const usedThumbEmojis=card.type==='streak_milestone'?[]:THUMB_PICKER_EMOJIS.filter(em=>
      Object.values(card.reactions).some(arr=>Array.isArray(arr)&&arr.includes(em)));
    const fullReactionList=[...reactionList,...usedThumbEmojis];
    return fullReactionList.map(r=>{
      const myR=(card.reactions[me])||[];
      const active=myR.includes(r)?'active':'';
      const cnt=Object.values(card.reactions).filter(arr=>Array.isArray(arr)&&arr.includes(r)).length;
      const names=cnt>0?reactionNames(card.reactions,r,cardKey):'';
      const rEsc=r.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
      // 👍 butonuna sağ tıklayınca ek emoji paneli açılsın diye — diğer üç buton etkilenmiyor.
      // Kutlama kartlarının (streak_milestone) zaten 👍'si yok, o yüzden orada eklenmiyor.
      const thumbCtx=r==='👍'?(fnName,baseArgsJs)=>` oncontextmenu="openThumbPicker(event,'${fnName}',[${baseArgsJs}],this)"`:null;
      if(card.type==='story'){
        const ctx=thumbCtx?thumbCtx('toggleStoryReaction',`'${card.u}',${card.storyId}`):'';
        return`<button class="journal-reaction-btn ${active}" data-cardkey="${cardKey}" data-r="${rEsc}"${ctx} onclick="toggleStoryReaction('${card.u}',${card.storyId},'${rEsc}',this)">
          ${r}${cnt>0?` · ${cnt}${names}`:''}
        </button>`;
      }
      if(card.type==='series_event'){
        const ctx=thumbCtx?thumbCtx('toggleSeriesEventReaction',`'${card.u}',${card.seriesEventId}`):'';
        return`<button class="journal-reaction-btn ${active}" data-cardkey="${cardKey}" data-r="${rEsc}"${ctx} onclick="toggleSeriesEventReaction('${card.u}',${card.seriesEventId},'${rEsc}',this)">
          ${r}${cnt>0?` · ${cnt}${names}`:''}
        </button>`;
      }
      if(card.type==='country_event'){
        const ctx=thumbCtx?thumbCtx('toggleCountryEventReaction',`'${card.u}',${card.countryEventId}`):'';
        return`<button class="journal-reaction-btn ${active}" data-cardkey="${cardKey}" data-r="${rEsc}"${ctx} onclick="toggleCountryEventReaction('${card.u}',${card.countryEventId},'${rEsc}',this)">
          ${r}${cnt>0?` · ${cnt}${names}`:''}
        </button>`;
      }
      if(card.type==='streak_milestone'){
        const evId=`sm_${card.u}_${card.months}_${card.ts}`;
        return`<button class="journal-reaction-btn ${active}" data-cardkey="${cardKey}" data-r="${rEsc}" onclick="toggleStreakMilestoneReaction('${card.u}','${evId}','${rEsc}',this)">
          ${r}${cnt>0?` · ${cnt}${names}`:''}
        </button>`;
      }
      if(card.type==='badge'){
        const ctx=thumbCtx?thumbCtx('toggleBadgeEventReaction',`'${card.u}','${card.eventId}'`):'';
        return`<button class="journal-reaction-btn ${active}" data-cardkey="${cardKey}" data-r="${rEsc}"${ctx} onclick="toggleBadgeEventReaction('${card.u}','${card.eventId}','${rEsc}',this)">
          ${r}${cnt>0?` · ${cnt}${names}`:''}
        </button>`;
      }
      if(card.type==='reading_event'){
        const ctx=thumbCtx?thumbCtx('toggleReadingEventReaction',`'${card.u}','${card.readingEventId}'`):'';
        return`<button class="journal-reaction-btn ${active}" data-cardkey="${cardKey}" data-r="${rEsc}"${ctx} onclick="toggleReadingEventReaction('${card.u}','${card.readingEventId}','${rEsc}',this)">
          ${r}${cnt>0?` · ${cnt}${names}`:''}
        </button>`;
      }
      const qi=card.type==='quote'?card.quoteIdx:-1;
      const ctx=thumbCtx?thumbCtx('toggleCardReaction',`'${card.type}','${card.u}',${card.bookId},${qi}`):'';
      return`<button class="journal-reaction-btn ${active}" data-cardkey="${cardKey}" data-r="${rEsc}"${ctx} onclick="toggleCardReaction('${card.type}','${card.u}',${card.bookId},${qi},'${rEsc}',this)">
        ${r}${cnt>0?` · ${cnt}${names}`:''}
      </button>`;
    }).join('');
  }

  function cardHtml(card){
    const stars=card.rating?'⭐'.repeat(Math.floor(card.rating))+(card.rating%1?'½':''):'';
    const ts=typeof card.ts==='number'?card.ts:new Date(card.ts||0).getTime();
    const isNewCard=ts>lastFeedVisit&&card.u!==me;
	// Birlikte okuma davet kartı — ayrı render
    if(card.type==='coreading_invite'){
	const isActive = card.status === 'active';
	const isCompleted = card.status === 'completed';
	const isEnded = card.status === 'ended';
      const myStatus=(card.participants[me]||{}).status;
      const alreadyResponded=myStatus==='accepted'||myStatus==='rejected';
      const isInitiator=card.u===me;
      const participantNames=Object.keys(card.participants)
        .filter(u=>card.participants[u].status==='accepted')
        .map(u=>(db.users[u]||{}).displayName||u).join(', ');
      return`<div class="journal-entry" id="coreading_${card.sessionId}" style="border-left:4px solid ${isActive?'var(--moss)':'var(--gold)'};background:${isActive?'rgba(74,103,65,.13)':'rgba(201,162,39,.13)'};position:relative;">
        ${isActive?`<span class="coreading-active-badge">● Aktif</span>`:''}
        <div class="journal-entry-header">
          <span style="font-size:1.3rem">${avatarHtml(card.userAvatar,"1.5rem")}</span>
          <div class="journal-entry-meta">
            <span class="journal-entry-user">${card.userName}</span>
            <span class="journal-entry-book" onclick="${isCompleted?'launchCoreadingConfetti(true)':''}" style="${isCompleted?'cursor:pointer':''}" title="${isCompleted?'🎉 Tıkla!':''}" >👥 Birlikte Okuyalım</span>
          </div>
          <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:rgba(245,237,214,.5)">${formatTimeAgo(new Date(card.ts).toISOString())}</span>
        </div>
        <div style="margin:.75rem 0;font-family:'Crimson Pro',serif;font-size:1.05rem;color:var(--ink)">
          <strong>${card.bookTitle}</strong>${card.author?` — <em>${card.author}</em>`:''}
          ${card.pages?`<span style="font-family:'Space Mono',monospace;font-size:.65rem;color:rgba(245,237,214,.5);margin-left:.5rem">${card.pages} sayfa</span>`:''}
        </div>
        ${participantNames?`<div style="font-family:'Space Mono',monospace;font-size:.65rem;color:var(--moss);margin-bottom:.5rem">✓ Katılan: ${participantNames}</div>`:''}
		${(()=>{const leftNames=Object.keys(card.participants).filter(u=>card.participants[u].status==='left').map(u=>(db.users[u]||{}).displayName||u);return leftNames.length?`<div style="font-family:'Space Mono',monospace;font-size:.65rem;color:var(--rust);margin-bottom:.5rem">👤 ${leftNames.length} kişi ayrıldı</div>`:''})()}
		${(()=>{
  const hist=card.history||[];
  const fmt=ev=>{const name=(db.users[ev.user]||{}).displayName||ev.user;const d=new Date(ev.ts);const ds=d.getDate()+' '+'OcaŞubMarNisMarHazTemAğuEylEkiKasAra'.match(/.{3}/g)[d.getMonth()];if(ev.type==='started')return ds+' — '+name+' oturumu başlattı';if(ev.type==='joined')return ds+' — '+name+' katıldı';if(ev.type==='left')return ds+' — '+name+' ayrıldı';if(ev.type==='reading_started')return ds+' — Okuma başladı';if(ev.type==='milestone')return ds+' — '+name+' %'+ev.pct+(ev.msg?' · '+ev.msg:'');if(ev.type==='completed')return ds+' — 🎉 Birlikte okuma tamamlandı!';if(ev.type==='ended')return ds+' — ⏹ '+name+' oturumu sonlandırdı';if(ev.type==='user_finished')return ds+' — 📖 '+name+' kitabı bitirdi';return ds+' — '+name;};
  if(!hist.length) return '';
  const recent=hist.slice(-2);
  const older=hist.slice(0,-2);
  const sid=card.sessionId;
  return `<div style="font-family:'Space Mono',monospace;font-size:.72rem;color:rgba(26,18,8,.75);margin-bottom:.4rem;line-height:1.7">${recent.map(fmt).join('<br>')}</div>${older.length?`<details style="margin-bottom:.4rem"><summary style="font-family:'Space Mono',monospace;font-size:.65rem;color:rgba(26,18,8,.55);cursor:pointer;list-style:none">▾ Geçmişi gör (${older.length})</summary><div style="font-family:'Space Mono',monospace;font-size:.67rem;color:rgba(26,18,8,.6);margin-top:.3rem;line-height:1.7">${older.map(fmt).join('<br>')}</div></details>`:''}`;
})()}
        ${!isInitiator&&!alreadyResponded&&myStatus!=='left'&&!isCompleted&&!isEnded?`
<div style="display:flex;gap:.5rem;margin-top:.5rem">
  <button class="btn btn-sm" style="background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.4)" onclick="respondCoreading('${card.sessionId}','accepted')">✓ Katıl</button>
  <button class="btn btn-sm" style="background:rgba(160,82,45,.15);color:var(--rust);border:1px solid rgba(160,82,45,.3)" onclick="respondCoreading('${card.sessionId}','rejected')">✗ Katılmıyorum</button>
</div>`:''}

        ${isInitiator&&!isActive&&!isCompleted&&!isEnded?`<div style="display:flex;align-items:center;gap:.75rem;margin-top:.5rem">
  <button class="btn btn-sm" style="background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.4)" onclick="startCoreadingRead('${card.sessionId}')">📖 Okumayı Başlat</button>
  <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:rgba(26,18,8,.4)">Senin davetin · 7 gün görünür</span>
  <button class="btn btn-sm" style="background:rgba(160,82,45,.15);color:var(--rust);border:1px solid rgba(160,82,45,.3)" onclick="confirmCancelCoreading(this,'${card.sessionId}')">✗ İptal et</button>
</div>`:''}
${(()=>{
  const sid=card.sessionId;
  const endBtn=isInitiator?'<button class="btn btn-sm" style="background:rgba(160,82,45,.25);color:var(--rust);border:1px solid rgba(160,82,45,.5)" onclick="confirmEndCoreading(\''+sid+'\')">⏹ Sonlandır</button>':'';
  if(isCompleted) return '<div style="font-family:\'Space Mono\',monospace;font-size:.65rem;color:var(--moss);margin-top:.5rem">🎉 Birlikte okuma tamamlandı!</div>';
  if(isActive&&myStatus==='left') return '<div style="margin-top:.5rem"><button class="btn btn-sm" style="background:rgba(74,103,65,.2);color:var(--moss);border:1px solid rgba(74,103,65,.4)" onclick="respondCoreading(\''+sid+'\',\'accepted\')">↩ Tekrar Katıl</button></div>';
  if(isActive){const myBooks_=(db.books&&db.books[me])||[];const myBound=myBooks_.find(b=>b.coreadingSession===sid);const changeBookBtn=myBound?'<button class="btn btn-sm" style="background:rgba(201,162,39,.1);color:var(--gold);border:1px solid rgba(201,162,39,.3)" onclick="showCoreadingBookPicker(\''+sid+'\')">🔄 Kitap değiştir</button>':'';const finishedUsers=((db.readingSessions&&db.readingSessions[sid]&&db.readingSessions[sid].history)||[]).filter(h=>h.type==='user_finished').map(h=>h.userName||h.user);const finishedLine=finishedUsers.length?'<div style="font-family:\'Space Mono\',monospace;font-size:.65rem;color:var(--rust);margin-bottom:.3rem">📖 '+finishedUsers.join(', ')+' kitabı bitirdi</div>':'';return '<div style="margin-top:.5rem">'+finishedLine+'<div style="font-family:\'Space Mono\',monospace;font-size:.65rem;color:var(--moss);margin-bottom:.4rem">📖 Okuma devam ediyor</div><div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">'+changeBookBtn+'<button class="btn btn-sm" style="background:rgba(160,82,45,.15);color:var(--rust);border:1px solid rgba(160,82,45,.3)" onclick="confirmLeaveCoreading(this,\''+sid+'\')">✗ Ayrıl</button>'+endBtn+'</div></div>';}
  return '';
})()}
        ${alreadyResponded&&!isInitiator?`<div style="font-family:'Space Mono',monospace;font-size:.6rem;color:rgba(26,18,8,.4);margin-top:.5rem">${myStatus==='accepted'?'✓ Katıldın':'✗ Reddedildi'}</div>`:''}
      </div>`;
    }
    const cardKey=card.type==='story'
      ?`story_${card.u}_${card.storyId}`
      :card.type==='country_event'
        ?`countryev_${card.u}_${card.countryEventId}`
        :card.type==='streak_milestone'
          ?`streakm_${card.u}_${card.months}_${card.ts}`
          :card.type==='quote'
            ?`quote_${card.u}_${card.bookId}_${card.quoteIdx}`
            :`review_${card.u}_${card.bookId}`;
    const typeBadgeClass=card.type==='review'?'journal-type-review':card.type==='story'?'journal-type-story':card.type==='badge'?'journal-type-series':(card.type==='series_event'||card.type==='country_event'||card.type==='streak_milestone'||card.type==='reading_event')?'journal-type-series':'journal-type-quote';
const typeBadgeLabel=card.type==='review'?'📖 değerlendirme':card.type==='story'?'📖 hikâye':card.type==='badge'?'🏅 rozet':card.type==='series_event'?'📚 seri':card.type==='country_event'?'🌍 yeni ülke':card.type==='streak_milestone'?'🔥 seri':card.type==='reading_event'?'📖 okuma':' 💬 alıntı';
    const headerBook=card.type==='country_event'
      ?`<span class="journal-entry-book">${escapeHtml(card.country)||'—'}</span>`
      :card.type==='badge'
      ?`<span class="journal-entry-book">—</span>`
      :`<span class="journal-entry-book" onclick="${card.type==='story'?`openStoryDetail('${card.u}',${card.storyId})`:`openBookFromFeed('${card.u}',${card.bookId})`}">${escapeHtml(card.bookTitle)||'—'}</span>`;
    return`<div class="journal-entry" style="${isNewCard?'border-left:3px solid var(--rust);':''}">
      <div class="journal-entry-header">
        <span style="font-size:1.3rem;display:inline-flex;align-items:center;cursor:pointer" onclick="viewMember('${card.u}')">${avatarHtml(card.userAvatar,"1.5rem")}</span>
        <div class="journal-entry-meta">
          <span class="journal-entry-user" style="cursor:pointer" onclick="viewMember('${card.u}')">${escapeHtml(card.userName)}${isNewCard?'<span style="display:inline-block;width:7px;height:7px;background:var(--rust);border-radius:50%;margin-left:.4rem;vertical-align:middle"></span>':''}</span>
          ${headerBook}
          <span class="journal-entry-date">${card.author?escapeHtml(card.author)+' · ':''}${fmtDate(card.ts)}</span>
        </div>
        <span class="journal-entry-type-badge ${typeBadgeClass}">${typeBadgeLabel}</span>
      </div>
      ${card.type==='review'?`
        ${stars?`<div class="journal-stars" style="margin-bottom:.4rem">${stars}</div>`:''}
        <div class="journal-review">${truncateHtml(card.text,cardKey)}</div>
      `:card.type==='story'?`
        ${card.u===me?`<div class="feed-del-wrap"><button class="feed-del-x" onclick="startFeedEventDelete(this,'story',${card.storyId})" title="Sil">✕</button></div>`:''}
        <div style="font-family:'Crimson Pro',serif;font-size:.9rem;color:var(--ink);cursor:pointer" onclick="openStoryDetail('${card.u}',${card.storyId})">
          <strong>${escapeHtml(card.bookTitle)}</strong>${card.author?' — '+escapeHtml(card.author):''}
        </div>
        ${card.sourceBook?`<div style="font-size:.82rem;color:var(--moss);font-style:italic;margin-top:.15rem">📚 ${escapeHtml(card.sourceBook)}</div>`:''}
        <div class="book-tags-row" style="margin-top:.3rem">
          <span class="tag format-tag">${{kitap:'📖 Kitap',ekitap:'📱 E-Kitap',sesli:'🎧 Sesli',web:'🌐 Web'}[card.source]||card.source}</span>
          ${card.link?`<a href="${card.link}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="font-size:.7rem;color:var(--gold);font-family:'Space Mono',monospace">🔗 link</a>`:''}
        </div>
      `:card.type==='series_event'?`
        ${card.u===me?`<div class="feed-del-wrap"><button class="feed-del-x" onclick="startFeedEventDelete(this,'series_event','${card.seriesEventId}')" title="Sil">✕</button></div>`:''}
        <div style="font-family:'Crimson Pro',serif;font-size:.93rem;color:var(--ink);line-height:1.5">
          ${card.eventType==='series_start'
            ?`📚 <strong>${escapeHtml(card.seriesName)}</strong> serisine başladı${card.bookTitle?' — <em>'+escapeHtml(card.bookTitle)+'</em>':''}`
            :card.eventType==='series_continue'
            ?`📖 <strong>${escapeHtml(card.seriesName)}</strong> serisine devam ediyor${card.bookTitle?' — <em>'+escapeHtml(card.bookTitle)+'</em>':''}`
            :`✅ <strong>${escapeHtml(card.seriesName)}</strong> serisini bitirdi 🎉`}
        </div>
      `:card.type==='country_event'?`
        ${card.u===me?`<div class="feed-del-wrap"><button class="feed-del-x" onclick="startFeedEventDelete(this,'country_event','${card.countryEventId}')" title="Sil">✕</button></div>`:''}
        <div style="font-family:'Crimson Pro',serif;font-size:.93rem;color:var(--ink);line-height:1.5">
          🌍 <strong>${escapeHtml(card.userName)}</strong>, <strong>${escapeHtml(card.country)}</strong>'yı haritasına ekledi!
          ${card.bookTitle?`<div style="font-size:.85rem;margin-top:.35rem;color:var(--rust);opacity:.9">📖 <em>${escapeHtml(card.bookTitle)}</em>${card.author?' — '+escapeHtml(card.author):''} ile yeni bir ülkeye açıldı</div>`:''}
        </div>
      `:card.type==='streak_milestone'?`
        ${card.u===me?`<div class="feed-del-wrap"><button class="feed-del-x" onclick="startFeedEventDelete(this,'streak_milestone','sm_${card.u}_${card.months}_${card.ts}')" title="Sil">✕</button></div>`:''}
        <div style="font-family:'Crimson Pro',serif;font-size:.93rem;color:var(--ink);line-height:1.5;display:flex;align-items:center;gap:.75rem">
          <span style="font-size:2rem">${card.emoji}</span>
          <div>
            <strong>${card.userName}</strong>, <strong>${card.months} aylık okuma serisine</strong> ulaştı!<br>
            <span style="font-size:.8rem;color:var(--gold)">${card.badge}</span>
          </div>
        </div>
      `:card.type==='badge'?`
        ${card.u===me?`<div class="feed-del-wrap"><button class="feed-del-x" onclick="startFeedEventDelete(this,'badge','${card.eventId}')" title="Sil">✕</button></div>`:''}
        <div class="badge-feed-card tier-${card.tier}" style="font-family:'Crimson Pro',serif;font-size:.93rem;color:var(--ink);line-height:1.5;display:flex;align-items:center;gap:.75rem">
          <span style="font-size:2rem">${card.icon}</span>
          <div>
            <strong>${card.userName}</strong>, <strong>"${card.name}"</strong> rozetini kazandı!<br>
            <span style="font-size:.8rem;color:var(--gold)">${card.desc}</span>
          </div>
        </div>
      `:card.type==='reading_event'?`
        ${card.u===me?`<div class="feed-del-wrap"><button class="feed-del-x" onclick="startFeedEventDelete(this,'reading','${card.readingEventId}')" title="Sil">✕</button></div>`:''}
        <div style="font-family:'Crimson Pro',serif;font-size:.93rem;color:var(--ink);line-height:1.5">
          ${readingEventIcon(card.eventType)} <strong>${escapeHtml(card.userName)}</strong>, ${readingEventText(card)}
        </div>
      `:`
        <div class="journal-quote">
          <div class="journal-quote-text">${truncateHtml(card.text,cardKey)}</div>
          <div class="journal-quote-footer">
            ${card.page?`<span class="journal-quote-page">s. ${card.page}</span>`:'<span></span>'}
            <button class="journal-copy-btn" onclick="copyCardQuote('${card.u}',${card.bookId},${card.quoteIdx})">📋 kopyala</button>
          </div>
        </div>
      `}
      <div class="journal-reactions">${feedReactionHtml(card)}</div>
    </div>`;
  }

  const visible=cards.slice(0,feedPage*PAGE_SIZE);
  const hasMore=cards.length>feedPage*PAGE_SIZE;
  const html=visible.map(cardHtml).join('')
    +(hasMore?`<button class="load-more-btn" onclick="feedPage++;renderFeed(true)">↓ Daha fazla yükle (${cards.length-feedPage*PAGE_SIZE} kaldı)</button>`:'');

  if(append){
    // Eski butonu kaldır, yeni içeriği ekle
    const oldBtn=container.querySelector('.load-more-btn');
    if(oldBtn) oldBtn.remove();
    const newCards=cards.slice((feedPage-1)*PAGE_SIZE,feedPage*PAGE_SIZE);
    container.insertAdjacentHTML('beforeend',newCards.map(cardHtml).join(''));
    if(hasMore) container.insertAdjacentHTML('beforeend',`<button class="load-more-btn" onclick="feedPage++;renderFeed(true)">↓ Daha fazla yükle (${cards.length-feedPage*PAGE_SIZE} kaldı)</button>`);
  } else {
    container.innerHTML=html;
  }
}

const FEED_TRUNCATE=300;

function truncateHtml(text,cardKey){
  const safe=escapeHtml(text);
  if(!text||text.length<=FEED_TRUNCATE) return`<span>${safe}</span>`;
  const shortSafe=escapeHtml(text.substring(0,FEED_TRUNCATE));
  return`<span>
    <span class="feed-text-short" id="fts-${cardKey}">${shortSafe}<span style="color:var(--gold)">…</span></span>
    <span class="feed-text-full" id="ftf-${cardKey}" style="display:none">${safe}</span>
    <button class="feed-expand-btn" id="feb-${cardKey}" onclick="toggleFeedText('${cardKey}')">daha fazla</button>
  </span>`;
}

function reactionNames(reactions,r,cardKey){
  const users=Object.entries(reactions).filter(([u,arr])=>Array.isArray(arr)&&arr.includes(r));
  if(!users.length) return '';
  const names=users.map(([u])=>u===me?'Sen':escapeHtml(db.users[u]&&db.users[u].displayName||u));
  if(names.length<=2) return ' · '+names.join(', ');
  const rKey=(cardKey+'_'+r).replace(/[^a-zA-Z0-9_]/g,'_');
  const visible=names.slice(0,2).join(', ');
  const rest=names.slice(2);
  return ` · <span id="rn-short-${rKey}">${visible}, <button class="reaction-more-btn" onclick="toggleReactionNames('${rKey}')">+${rest.length} kişi daha</button></span>`
    +`<span id="rn-full-${rKey}" style="display:none">${names.join(', ')} <button class="reaction-more-btn" onclick="toggleReactionNames('${rKey}')">daha az</button></span>`;
}

function toggleReactionNames(rKey){
  const short=document.getElementById('rn-short-'+rKey);
  const full=document.getElementById('rn-full-'+rKey);
  if(!short||!full) return;
  const isOpen=full.style.display!=='none';
  short.style.display=isOpen?'':'none';
  full.style.display=isOpen?'none':'';
}

function toggleFeedText(cardKey){
  const short=document.getElementById('fts-'+cardKey);
  const full=document.getElementById('ftf-'+cardKey);
  const btn=document.getElementById('feb-'+cardKey);
  if(!short||!full||!btn) return;
  const isOpen=full.style.display!=='none';
  short.style.display=isOpen?'':'none';
  full.style.display=isOpen?'none':'';
  btn.textContent=isOpen?'daha fazla':'daha az';
}

// Tıklanan reaksiyon butonunu bulup pop animasyonunu SADECE ona uygular.
// (Eskiden animasyon CSS'te .active class'ına bağlıydı; her re-render'da tüm
// kartlardaki tüm daha-önce-reaksiyon-verilmiş butonlar yeniden oluşturulduğu
// için hepsi birden animasyon oynatıyordu. Bkz. ö40-devir-teslim-notu #5.)
function flashReactionPop(oldBtn){
  if(!oldBtn||!oldBtn.dataset) return;
  const key=oldBtn.dataset.cardkey, r=oldBtn.dataset.r;
  if(key===undefined||r===undefined) return;
  const btns=document.querySelectorAll(`.journal-reaction-btn[data-cardkey="${CSS.escape(key)}"]`);
  for(const b of btns){
    if(b.dataset.r===r){
      b.classList.add('reaction-pop');
      b.addEventListener('animationend',()=>b.classList.remove('reaction-pop'),{once:true});
      break;
    }
  }
}

function toggleSeriesEventReaction(owner,eventId,reaction,btnEl){
  if(!db.seriesEvents||!db.seriesEvents[owner]) return;
  const ev=db.seriesEvents[owner].find(e=>e.id===eventId);
  if(!ev) return;
  if(!ev.reactions) ev.reactions={};
  if(!ev.reactions[me]) ev.reactions[me]=[];
  const idx=ev.reactions[me].indexOf(reaction);
  if(idx>-1) ev.reactions[me].splice(idx,1);
  else{
    ev.reactions[me].push(reaction);
    if(owner!==me) pushReactionNotif(owner,me,reaction,ev.seriesName||'seri');
  }
  saveDb();renderFeed();flashReactionPop(btnEl);
}

function toggleStoryReaction(storyOwner,storyId,reaction,btnEl){
  if(!db.stories||!db.stories[storyOwner]) return;
  const story=db.stories[storyOwner].find(s=>s.id===storyId);
  if(!story) return;
  if(!story.reactions) story.reactions={};
  if(!story.reactions[me]) story.reactions[me]=[];
  const idx=story.reactions[me].indexOf(reaction);
  if(idx>-1) story.reactions[me].splice(idx,1);
  else{
    story.reactions[me].push(reaction);
    if(storyOwner!==me) pushReactionNotif(storyOwner,me,reaction,story.title||'hikâye');
  }
  saveDb();renderFeed();flashReactionPop(btnEl);
}

function toggleStreakMilestoneReaction(owner,eventId,reaction,btnEl){
  if(!db.streakEvents||!db.streakEvents[owner]) return;
  const ev=db.streakEvents[owner].find(e=>`sm_${owner}_${e.months}_${e.ts}`===eventId);
  if(!ev) return;
  if(!ev.reactions) ev.reactions={};
  if(!ev.reactions[me]) ev.reactions[me]=[];
  const idx=ev.reactions[me].indexOf(reaction);
  if(idx>-1) ev.reactions[me].splice(idx,1);
  else{
    ev.reactions[me].push(reaction);
    if(owner!==me) pushReactionNotif(owner,me,reaction,ev.months+' aylık seri');
  }
  saveDb();renderFeed();flashReactionPop(btnEl);
}

function toggleCountryEventReaction(owner,eventId,reaction,btnEl){
  if(!db.countryEvents||!db.countryEvents[owner]) return;
  const ev=db.countryEvents[owner].find(e=>e.id===eventId);
  if(!ev) return;
  if(!ev.reactions) ev.reactions={};
  if(!ev.reactions[me]) ev.reactions[me]=[];
  const idx=ev.reactions[me].indexOf(reaction);
  if(idx>-1) ev.reactions[me].splice(idx,1);
  else{
    ev.reactions[me].push(reaction);
    if(owner!==me) pushReactionNotif(owner,me,reaction,ev.country||'yeni ülke');
  }
  saveDb();renderFeed();flashReactionPop(btnEl);
}

function toggleBadgeEventReaction(owner,eventId,reaction,btnEl){
  if(!db.badgeEvents||!db.badgeEvents[owner]) return;
  const ev=db.badgeEvents[owner].find(e=>e.id===eventId);
  if(!ev) return;
  if(!ev.reactions) ev.reactions={};
  if(!ev.reactions[me]) ev.reactions[me]=[];
  const idx=ev.reactions[me].indexOf(reaction);
  if(idx>-1) ev.reactions[me].splice(idx,1);
  else{
    ev.reactions[me].push(reaction);
    if(owner!==me) pushReactionNotif(owner,me,reaction,ev.name||'rozet');
  }
  saveDb();renderFeed();flashReactionPop(btnEl);
}

function toggleReadingEventReaction(owner,eventId,reaction,btnEl){
  if(!db.readingEvents||!db.readingEvents[owner]) return;
  const ev=db.readingEvents[owner].find(e=>e.id===eventId);
  if(!ev) return;
  if(!ev.reactions) ev.reactions={};
  if(!ev.reactions[me]) ev.reactions[me]=[];
  const idx=ev.reactions[me].indexOf(reaction);
  if(idx>-1) ev.reactions[me].splice(idx,1);
  else{
    ev.reactions[me].push(reaction);
    if(owner!==me) pushReactionNotif(owner,me,reaction,ev.bookTitle||'kitap');
  }
  saveDb();renderFeed();flashReactionPop(btnEl);
}

// Kullanıcının kendi rozet/okuma-olayı kartını akıştan silmesi — küçük ✕, inline "emin misin?" onayı
function startFeedEventDelete(btnEl,cardType,eventId){
  const wrap=btnEl.closest('.feed-del-wrap');
  if(!wrap) return;
  wrap.innerHTML=`<span style="font-size:.62rem;color:var(--rust);font-family:'Space Mono',monospace">Emin misin?</span>
    <button class="btn btn-sm btn-danger" style="font-size:.58rem;padding:.1rem .3rem" onclick="confirmFeedEventDelete(this,'${cardType}','${eventId}')">Sil</button>
    <button class="btn btn-sm" style="font-size:.58rem;padding:.1rem .3rem;background:rgba(74,103,65,.1);color:var(--moss)" onclick="cancelFeedEventDelete(this,'${cardType}','${eventId}')">Vazgeç</button>`;
  wrap._delTimer=setTimeout(()=>{
    if(document.body.contains(wrap)){
      wrap.innerHTML=`<button class="feed-del-x" onclick="startFeedEventDelete(this,'${cardType}','${eventId}')" title="Sil">✕</button>`;
    }
  },4000);
}

function cancelFeedEventDelete(elInside,cardType,eventId){
  const wrap=elInside.closest('.feed-del-wrap');
  if(!wrap) return;
  if(wrap._delTimer) clearTimeout(wrap._delTimer);
  wrap.innerHTML=`<button class="feed-del-x" onclick="startFeedEventDelete(this,'${cardType}','${eventId}')" title="Sil">✕</button>`;
}

function confirmFeedEventDelete(btnEl,cardType,eventId){
  const wrap=btnEl.closest('.feed-del-wrap');
  if(wrap&&wrap._delTimer) clearTimeout(wrap._delTimer);
  if(cardType==='badge'){
    if(db.badgeEvents&&db.badgeEvents[me]){
      const idx=db.badgeEvents[me].findIndex(e=>e.id===eventId);
      if(idx>-1) db.badgeEvents[me].splice(idx,1);
    }
  } else if(cardType==='reading'){
    if(db.readingEvents&&db.readingEvents[me]){
      const idx=db.readingEvents[me].findIndex(e=>e.id===eventId);
      if(idx>-1) db.readingEvents[me].splice(idx,1);
    }
  } else if(cardType==='series_event'){
    if(db.seriesEvents&&db.seriesEvents[me]){
      const idx=db.seriesEvents[me].findIndex(e=>e.id===Number(eventId));
      if(idx>-1) db.seriesEvents[me].splice(idx,1);
    }
  } else if(cardType==='country_event'){
    if(db.countryEvents&&db.countryEvents[me]){
      const idx=db.countryEvents[me].findIndex(e=>e.id===Number(eventId));
      if(idx>-1) db.countryEvents[me].splice(idx,1);
    }
  } else if(cardType==='story'){
    if(db.stories&&db.stories[me]){
      const idx=db.stories[me].findIndex(s=>s.id===Number(eventId));
      if(idx>-1) db.stories[me].splice(idx,1);
    }
  } else if(cardType==='streak_milestone'){
    if(db.streakEvents&&db.streakEvents[me]){
      const idx=db.streakEvents[me].findIndex(e=>`sm_${me}_${e.months}_${e.ts}`===eventId);
      if(idx>-1) db.streakEvents[me].splice(idx,1);
    }
  }
  saveDb();
  renderFeed();
}

let journalFilter='all';

function filterJournal(f,el){
  journalFilter=f; journalPage=1;
  document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
  renderJournal();
}

function buildJournalDropdowns(allCards){
  const authorSel=document.getElementById('journalFilterAuthor');
  const bookSel=document.getElementById('journalFilterBook');
  if(!authorSel) return;
  const curAuthor=authorSel.value, curBook=bookSel.value;
  const authors=new Set(), books=new Set();
  allCards.forEach(c=>{
    if(c.author) authors.add(c.author);
    if(c.bookTitle) books.add(c.bookTitle);
  });
  authorSel.innerHTML='<option value="">✍️ Yazar</option>'+[...authors].sort().map(a=>`<option value="${a}"${a===curAuthor?' selected':''}>${a}</option>`).join('');
  bookSel.innerHTML='<option value="">📖 Kitap</option>'+[...books].sort().map(b=>`<option value="${b}"${b===curBook?' selected':''}>${b}</option>`).join('');
}

let journalQuickRating=0;

function selectJournalEntryType(el){
  document.querySelectorAll('#journalEntryTypeChips .chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  const val=el.dataset.val;
  document.getElementById('journalReviewWrap').style.display=val==='review'?'':'none';
  document.getElementById('journalQuoteWrap').style.display=val==='quote'?'':'none';
  const formBody=document.getElementById('addJournalFormBody');
  if(formBody) formBody.classList.add('open');
}
function toggleAddJournalSection(forceOpen){
  const body=document.getElementById('addJournalAccBody');
  const btn=document.getElementById('addJournalToggleBtn');
  if(!body) return;
  const willOpen=typeof forceOpen==='boolean'?forceOpen:!body.classList.contains('open');
  body.classList.toggle('open',willOpen);
  if(btn) btn.style.display=willOpen?'none':'';
  if(!willOpen){
    const formBody=document.getElementById('addJournalFormBody');
    if(formBody) formBody.classList.remove('open');
    document.querySelectorAll('#journalEntryTypeChips .chip').forEach(c=>c.classList.remove('active'));
  }
}

function setJournalQuickRating(val){
  journalQuickRating=journalQuickRating===val?0:val;
  document.querySelectorAll('#journalQuickStars .star-btn').forEach(btn=>{
    btn.classList.toggle('active',journalQuickRating>=parseFloat(btn.dataset.val));
  });
  const lbl=document.getElementById('journalQuickRatingLabel');
  if(lbl) lbl.textContent=journalQuickRating>0?journalQuickRating+'/5':'';
}

function populateJournalBookSelect(){
  // Artık sadece veriyi hazırlıyoruz, dropdown doldurmaya gerek yok
}

let _journalAcBooks=[];
function journalBookAcSearch(q){
  if(!_journalAcBooks.length){
    _journalAcBooks=(db.books[me]||[]).filter(b=>b.title&&!b.title.startsWith('ISBN:')&&b.readingStatus!=='wishlist'&&b.readingStatus!=='planned');
    _journalAcBooks.sort((a,b)=>(a.title||'').localeCompare(b.title||'','tr'));
  }
  const list=document.getElementById('journalBookAcList');
  if(!q.trim()){list.style.display='none';return;}
  const ql=q.toLowerCase();
  const matches=_journalAcBooks.filter(b=>(b.title||'').toLowerCase().includes(ql)||(b.author||'').toLowerCase().includes(ql)).slice(0,8);
  if(!matches.length){list.style.display='none';return;}
  list.innerHTML=matches.map(b=>`<div class="autocomplete-item" onmousedown="journalBookAcSelect(${b.id},'${(b.title||'').replace(/'/g,"\\'")}')">
    <span class="ac-title">${b.title}</span>${b.author?`<span class="ac-author"> — ${b.author}</span>`:''}
  </div>`).join('');
  list.style.display='';
}
function journalBookAcSelect(id, title){
  document.getElementById('journalBookSelect').value=id;
  document.getElementById('journalBookSearch').value=title;
  document.getElementById('journalBookAcList').style.display='none';
}
function journalBookAcHide(){
  const list=document.getElementById('journalBookAcList');
  if(list) list.style.display='none';
}

function addJournalEntry(){
  const bookId=parseInt(document.getElementById('journalBookSelect').value);
  if(!bookId){notify('⚠️','Lütfen bir kitap seç.');return;}
  const book=(db.books[me]||[]).find(b=>b.id===bookId);
  if(!book) return;
  const typeEl=document.querySelector('#journalEntryTypeChips .chip.active');
  const type=typeEl?typeEl.dataset.val:'review';
  const st=document.getElementById('journalEntryStatus');

  if(type==='review'){
    const text=document.getElementById('journalReviewText').value.trim();
    if(!text){notify('⚠️','Değerlendirme metni boş olamaz.');return;}
    book.review=text;
    book.reviewTs=Date.now();
    if(journalQuickRating>0) book.rating=journalQuickRating;
    // sıfırla
    document.getElementById('journalReviewText').value='';
    journalQuickRating=0;
    document.querySelectorAll('#journalQuickStars .star-btn').forEach(b=>b.classList.remove('active'));
  } else {
    const text=document.getElementById('journalQuoteText').value.trim();
    if(!text){notify('⚠️','Alıntı metni boş olamaz.');return;}
    const page=document.getElementById('journalQuotePage').value;
    if(!book.quotes) book.quotes=[];
    book.quotes.push({text, page:page?parseInt(page):null, ts:Date.now()});
    document.getElementById('journalQuoteText').value='';
    document.getElementById('journalQuotePage').value='';
  }

  saveDb();
  renderJournal();
  renderFeed();
  st.textContent='✓ Eklendi!';
  setTimeout(()=>st.textContent='',2500);
  notify('📒 Deftere eklendi',`"${book.title}" için ${type==='review'?'değerlendirme':'alıntı'} kaydedildi.`);
}

function switchJournalTab(tab){
  document.getElementById('jPanel-public').style.display = tab==='public' ? '' : 'none';
  document.getElementById('jPanel-private').style.display = tab==='private' ? '' : 'none';
  document.getElementById('jTab-public').classList.toggle('active', tab==='public');
  document.getElementById('jTab-private').classList.toggle('active', tab==='private');
  if(tab==='private'){privateNotesPage=1;renderPrivateNotes();}
}

function renderPrivateNotes(){
  const container = document.getElementById('privateNotesContainer');
  if(!container) return;
  const q = (document.getElementById('privateNotesSearch')?.value||'').toLowerCase().trim();
  const onlyNoted = document.getElementById('privateNotesOnlyNoted')?.checked ?? true;
  const showArchive = document.getElementById('privateNotesShowArchive')?.checked ?? false;

  // Arşivlenmiş notlar
  if(showArchive){
    const archived=(db.archivedNotes&&db.archivedNotes[me])||[];
    const filteredArch=archived.filter(n=>
      !q||(n.title||'').toLowerCase().includes(q)||(n.author||'').toLowerCase().includes(q)||(n.comment||'').toLowerCase().includes(q)
    );
    if(!filteredArch.length){
      container.innerHTML=`<div class="empty-state" style="padding:1.5rem">Arşivde not yok.</div>`;
      return;
    }
    container.innerHTML=`<div style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--rust);opacity:.6;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.08em">📦 Kütüphaneden kaldırılan kitapların notları</div>`
      +filteredArch.map((n,i)=>`
      <div style="border-bottom:1px solid rgba(201,162,39,.1);padding:.75rem 0">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem">
          <span style="font-family:'Playfair Display',serif;font-size:.95rem;font-weight:600;color:var(--ink);flex:1">${n.title}</span>
          ${n.author?`<span style="font-size:.75rem;color:var(--rust);font-style:italic">${n.author}</span>`:''}
          <button onclick="event.stopPropagation();deleteArchivedNote(${i},this)" style="background:rgba(138,69,19,.12);border:1px solid rgba(138,69,19,.25);border-radius:4px;cursor:pointer;font-size:.7rem;color:var(--rust);padding:.1rem .4rem;flex-shrink:0" title="Notu sil">✕ sil</button>
        </div>
        <div style="font-family:'Crimson Pro',serif;font-size:.9rem;font-style:italic;color:var(--ink);opacity:.8;white-space:pre-wrap">${n.comment}</div>
      </div>`).join('');
    return;
  }

  const allMyBooks = myBooks().filter(b=>b.title&&!b.title.startsWith('ISBN:')&&b.readingStatus!=='wishlist');
  allMyBooks.sort((a,b)=>(b.addedAt||0)>(a.addedAt||0)?1:-1);

  let filtered = allMyBooks;
  filtered = filtered.filter(b=>b.readingStatus!=='planned'||b.comment);
  if(onlyNoted) filtered = filtered.filter(b=>b.comment);
  if(q) filtered = filtered.filter(b=>(b.title||'').toLowerCase().includes(q)||(b.author||'').toLowerCase().includes(q)||(b.comment||'').toLowerCase().includes(q));

  if(!filtered.length){
    const msg = onlyNoted && !q ? 'Henüz kişisel not yok. Bir kitabı açıp not ekle, ya da "Sadece notlu" filtresini kaldır.'
      : q ? 'Arama sonucu bulunamadı.' : 'Henüz kitap yok.';
    container.innerHTML=`<div class="empty-state" style="padding:1.5rem">${msg}</div>`;
    return;
  }

  const statusIcon = s => s==='reading'?'📖':s==='paused'?'🚧':s==='planned'?'⏳':'✅';

  const visible = filtered.slice(0, privateNotesPage * PAGE_SIZE);
  const hasMore = filtered.length > privateNotesPage * PAGE_SIZE;

  container.innerHTML = visible.map(b=>{
    const note = b.comment||'';
    const sid = `pnote-${b.id}`;
    return `<div style="border-bottom:1px solid rgba(201,162,39,.1);padding:.75rem 0">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;cursor:pointer;flex-wrap:wrap" onclick="togglePrivateNote('${sid}')">
        <span style="font-size:.85rem">${statusIcon(b.readingStatus)}</span>
        <span style="font-family:'Playfair Display',serif;font-size:.95rem;font-weight:600;color:var(--ink);flex:1">${b.title}</span>
        ${b.author?`<span style="font-size:.75rem;color:var(--rust);font-style:italic;flex-shrink:0">${b.author}</span>`:''}
        ${note?`<button onclick="event.stopPropagation();deletePrivateNote(${b.id},this)" style="background:rgba(138,69,19,.12);border:1px solid rgba(138,69,19,.25);border-radius:4px;cursor:pointer;font-size:.7rem;color:var(--rust);padding:.1rem .4rem;flex-shrink:0" title="Notu sil">✕ sil</button>`:''}
        <span style="font-size:.7rem;color:var(--gold);opacity:.7;flex-shrink:0">${note?'✏️ not var':'+ ekle'}</span>
      </div>
      <div id="${sid}" style="display:none;margin-top:.35rem">
        <textarea class="book-input" style="width:100%;min-height:90px;resize:vertical;font-family:'Crimson Pro',serif;font-size:.93rem;box-sizing:border-box"
          placeholder="Kişisel notun... (sadece sen görebilirsin)"
          onchange="savePrivateNote(${b.id},this.value)">${note}</textarea>
      </div>
    </div>`;
  }).join('')
  +(hasMore?`<button class="load-more-btn" onclick="privateNotesPage++;renderPrivateNotes()">↓ Daha fazla yükle (${filtered.length-privateNotesPage*PAGE_SIZE} kaldı)</button>`:'');
}

function deletePrivateNote(bookId, btn){
  const book=(db.books[me]||[]).find(b=>b.id===bookId);
  if(!book) return;
  showInlineConfirm(btn, 'Notu sil?', ()=>{
    book.comment=null;
    saveDb();
    renderPrivateNotes();
  });
}

function deleteArchivedNote(idx, btn){
  if(!db.archivedNotes||!db.archivedNotes[me]) return;
  showInlineConfirm(btn, 'Kalıcı sil?', ()=>{
    db.archivedNotes[me].splice(idx,1);
    saveDb();
    renderPrivateNotes();
  });
}

function showInlineConfirm(anchorBtn, label, onConfirm){
  // Varsa önceki confirm kutusunu kapat
  document.querySelectorAll('.inline-confirm-box').forEach(el=>el.remove());
  const box=document.createElement('span');
  box.className='inline-confirm-box';
  box.style.cssText="display:inline-flex;align-items:center;gap:.3rem;background:var(--cream);border:1px solid rgba(138,69,19,.35);border-radius:6px;padding:.2rem .45rem;font-family:Space Mono,monospace;font-size:.6rem;color:var(--rust);box-shadow:0 2px 8px rgba(0,0,0,.12);position:relative;z-index:10;vertical-align:middle;margin-left:.3rem";
  box.innerHTML=`<span>${label}</span><button style="background:rgba(138,69,19,.18);border:1px solid rgba(138,69,19,.3);border-radius:3px;cursor:pointer;font-size:.6rem;color:var(--rust);padding:.05rem .3rem" class="ic-yes">Evet</button><button style="background:transparent;border:none;cursor:pointer;font-size:.6rem;color:var(--rust);opacity:.6;padding:.05rem .2rem" class="ic-no">İptal</button>`;
  box.querySelector('.ic-yes').onclick=(e)=>{e.stopPropagation();box.remove();onConfirm();};
  box.querySelector('.ic-no').onclick=(e)=>{e.stopPropagation();box.remove();};
  anchorBtn.insertAdjacentElement('afterend',box);
  // Dışarı tıklayınca kapat
  setTimeout(()=>document.addEventListener('click',function h(){box.remove();document.removeEventListener('click',h);},{once:true}),10);
}

function togglePrivateNote(sid){
  const el = document.getElementById(sid);
  if(!el) return;
  el.style.display = el.style.display==='none' ? '' : 'none';
  if(el.style.display!=='none') el.querySelector('textarea').focus();
}

function savePrivateNote(bookId, value){
  const book = (db.books[me]||[]).find(b=>b.id===bookId);
  if(!book) return;
  book.comment = value.trim()||null;
  saveDb();
}

function renderJournal(){
  const container=document.getElementById('journalContainer');
  if(!container) return;

  const searchText=(document.getElementById('journalSearchText')?.value||'').toLowerCase().trim();
  const filterAuthor=document.getElementById('journalFilterAuthor')?.value||'';
  const filterBook=document.getElementById('journalFilterBook')?.value||'';

  const myBooksList=db.books[me]||[];

  // Kitap bazlı grupla
  let bookGroups=myBooksList
    .filter(b=>b.title&&!b.title.startsWith('ISBN:')&&b.readingStatus!=='planned')
    .map(b=>({
      book:b,
      review:(b.review&&b.review.trim())?{text:b.review,rating:b.rating||0,ts:b.reviewTs||b.addedAt||0}:null,
      quotes:(b.quotes||[]).map((q,qi)=>({...q,qi})),
    }))
    .filter(g=>g.review||g.quotes.length);

  buildJournalDropdowns(myBooksList.flatMap(b=>{
    const c=[];
    if(b.review) c.push({type:'review',bookTitle:b.title,author:b.author});
    (b.quotes||[]).forEach(q=>c.push({type:'quote',bookTitle:b.title,author:b.author}));
    return c;
  }));

  // Filtrele
  if(journalFilter==='reviews') bookGroups=bookGroups.filter(g=>g.review);
  if(journalFilter==='quotes') bookGroups=bookGroups.filter(g=>g.quotes.length);
  if(journalFilter==='starred') bookGroups=bookGroups.filter(g=>g.book.reviewStarred||(g.book.quotes||[]).some(q=>q.starred));
  if(filterAuthor) bookGroups=bookGroups.filter(g=>(g.book.author||'')=== filterAuthor);
  if(filterBook) bookGroups=bookGroups.filter(g=>g.book.title===filterBook);
  if(searchText) bookGroups=bookGroups.filter(g=>
    (g.book.title||'').toLowerCase().includes(searchText)||
    (g.book.author||'').toLowerCase().includes(searchText)||
    (g.review&&g.review.text.toLowerCase().includes(searchText))||
    g.quotes.some(q=>(q.text||'').toLowerCase().includes(searchText))
  );

  // Sırala — en son eklenen/düzenlenen üste
  bookGroups.sort((a,b)=>{
    const tsA=Math.max(a.review?.ts||0,...a.quotes.map(q=>q.ts||0));
    const tsB=Math.max(b.review?.ts||0,...b.quotes.map(q=>q.ts||0));
    return tsB-tsA;
  });

  if(!bookGroups.length){
    container.innerHTML=`<div class="empty-state" style="padding:2rem">
      ${(journalFilter==='all'&&!searchText&&!filterAuthor&&!filterBook)
        ?'Henüz defter girişi yok. Kitap detayından puan, yorum veya alıntı ekleyebilirsin.'
        :'Bu kriterlere uygun içerik bulunamadı.'}
    </div>`;
    return;
  }

  function fmtDate(ts){
    if(!ts) return '';
    const d=new Date(typeof ts==='number'?ts:ts);
    if(isNaN(d)) return '';
    return d.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'});
  }

  function stars(r){return r?'⭐'.repeat(Math.floor(r))+(r%1?'½':''):'';}

  function starToggleHtml(b, type, qi){
    const isStarred = type==='review'
      ? (b.reviewStarred||false)
      : ((b.quotes||[])[qi]?.starred||false);
    const onclick = type==='review'
      ? `toggleJournalStar(${b.id},'review',-1)`
      : `toggleJournalStar(${b.id},'quote',${qi})`;
    return `<button onclick="${onclick}" style="background:${isStarred?'rgba(201,162,39,.2)':'rgba(201,162,39,.07)'};border:1px solid ${isStarred?'rgba(201,162,39,.5)':'rgba(201,162,39,.2)'};border-radius:4px;cursor:pointer;font-size:.75rem;padding:.1rem .35rem;color:${isStarred?'var(--gold)':'rgba(201,162,39,.4)'}" title="${isStarred?'Yer imini kaldır':'Yer imi ekle'}">${isStarred?'🔖 yer imi var':'🔖'}</button>`;
  }

  const visible=bookGroups.slice(0,journalPage*PAGE_SIZE);
  const hasMore=bookGroups.length>journalPage*PAGE_SIZE;

  container.innerHTML=visible.map(g=>{
    const b=g.book;
    const openKey=`jbook_${b.id}`;
    const isOpen=sessionStorage.getItem(openKey)!=='0';
    const reviewCount=g.review?1:0;
    const quoteCount=g.quotes.length;
    const badge=stars(b.rating);
    const hasStarred=(b.reviewStarred)||(b.quotes||[]).some(q=>q.starred);

    const reviewHtml=g.review?`
      <div style="padding:.6rem .75rem;border-radius:4px;background:rgba(138,69,19,.06);margin-bottom:.5rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem;flex-wrap:wrap;gap:.3rem">
          <span class="journal-entry-type-badge journal-type-review">📖 değerlendirme</span>
          <div style="display:flex;align-items:center;gap:.5rem">
            ${badge?`<span style="font-size:.8rem">${badge}</span>`:''}
            <span style="font-family:'Space Mono',monospace;font-size:.55rem;opacity:.5">${fmtDate(g.review.ts)}</span>
            ${starToggleHtml(b,'review',-1)}
            <button style="background:rgba(201,162,39,.12);border:1px solid rgba(201,162,39,.3);border-radius:4px;cursor:pointer;font-size:.65rem;color:var(--rust);padding:.1rem .35rem;font-family:'Space Mono',monospace" onclick="openBook(${b.id})">✏️ düzenle</button>
          </div>
        </div>
        <div class="journal-review">${truncateHtml(g.review.text,`jrev_${b.id}`)}</div>
      </div>`:''

    const quotesHtml=g.quotes.map((q,i)=>`
      <div style="padding:.5rem .75rem;border-radius:4px;background:rgba(201,162,39,.05);margin-bottom:.4rem;border-left:2px solid rgba(201,162,39,.3)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;flex-wrap:wrap">
          <span class="journal-entry-type-badge journal-type-quote" style="flex-shrink:0">💬 alıntı</span>
          <div style="display:flex;align-items:center;gap:.4rem;flex-shrink:0">
            ${q.page?`<span style="font-family:'Space Mono',monospace;font-size:.55rem;opacity:.5">s.${q.page}</span>`:''}
            <span style="font-family:'Space Mono',monospace;font-size:.55rem;opacity:.5">${fmtDate(q.ts)}</span>
            ${starToggleHtml(b,'quote',q.qi)}
            <button style="background:rgba(201,162,39,.08);border:1px solid rgba(201,162,39,.2);border-radius:4px;cursor:pointer;font-size:.65rem;color:var(--rust);padding:.1rem .35rem;font-family:'Space Mono',monospace" onclick="copyCardQuote('${me}',${b.id},${q.qi})">📋 kopyala</button>
            <button style="background:rgba(138,69,19,.12);border:1px solid rgba(138,69,19,.25);border-radius:4px;cursor:pointer;font-size:.65rem;color:var(--rust);padding:.1rem .35rem;font-family:'Space Mono',monospace" onclick="deleteQuote(${b.id},${q.qi},this)">✕ sil</button>
          </div>
        </div>
        <div class="journal-quote-text" style="margin-top:.3rem">${truncateHtml(q.text,`jq_${b.id}_${q.qi}`)}</div>
      </div>`).join('');

    return`<div class="journal-entry" style="padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:.5rem;padding:.75rem;cursor:pointer;background:rgba(201,162,39,.04);border-bottom:1px solid rgba(201,162,39,.1)"
        onclick="toggleJournalBook('${openKey}','jbody_${b.id}')">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Playfair Display',serif;font-size:.98rem;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</div>
          ${b.author?`<div style="font-size:.75rem;color:var(--rust);font-style:italic">${b.author}</div>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;flex-shrink:0">
          ${hasStarred?'<span style="font-size:.75rem">🔖</span>':''}
          ${badge?`<span style="font-size:.75rem">${badge}</span>`:''}
          ${reviewCount?`<span style="font-family:'Space Mono',monospace;font-size:.55rem;background:rgba(138,69,19,.12);color:var(--rust);padding:.1rem .35rem;border-radius:20px">📖 ${reviewCount}</span>`:''}
          ${quoteCount?`<span style="font-family:'Space Mono',monospace;font-size:.55rem;background:rgba(201,162,39,.12);color:#9a7a10;padding:.1rem .35rem;border-radius:20px">💬 ${quoteCount}</span>`:''}
          <span style="color:var(--gold);font-size:.8rem">${isOpen?'▲':'▼'}</span>
        </div>
      </div>
      <div id="jbody_${b.id}" style="display:${isOpen?'':'none'};padding:.6rem .75rem">
        ${reviewHtml}
        ${quotesHtml}
        <button style="background:rgba(201,162,39,.08);border:1px solid rgba(201,162,39,.2);border-radius:4px;cursor:pointer;font-size:.7rem;color:var(--rust);padding:.25rem .6rem;font-family:'Space Mono',monospace;margin-top:.3rem" onclick="openBook(${b.id})">+ değerlendirme veya alıntı ekle</button>
      </div>
    </div>`;
  }).join('')
  +(hasMore?`<button class="load-more-btn" onclick="journalPage++;renderJournal()">↓ Daha fazla yükle (${bookGroups.length-journalPage*PAGE_SIZE} kaldı)</button>`:'');
}

function toggleJournalStar(bookId, type, qi){
  const book=(db.books[me]||[]).find(b=>b.id===bookId);
  if(!book) return;
  if(type==='review'){
    book.reviewStarred=!book.reviewStarred;
  } else {
    if(book.quotes&&book.quotes[qi]){
      book.quotes[qi].starred=!book.quotes[qi].starred;
    }
  }
  saveDb();
  renderJournal();
}

function toggleJournalBook(key, bodyId){
  const body=document.getElementById(bodyId);
  if(!body) return;
  const isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'';
  sessionStorage.setItem(key,isOpen?'0':'1');
  renderJournal();
}

function deleteQuote(bookId, qi, btn){
  const book=(db.books[me]||[]).find(b=>b.id===bookId);
  if(!book||!book.quotes) return;
  showInlineConfirm(btn, 'Alıntıyı sil?', ()=>{
    book.quotes.splice(qi,1);
    saveDb();
    renderJournal();
    renderFeed();
  });
}



function countReaction(bookOwner,bookId,reaction){
  const book=(db.books[bookOwner]||[]).find(b=>b.id===bookId);
  if(!book||!book.reactions) return 0;
  return Object.values(book.reactions).filter(arr=>arr.includes(reaction)).length;
}

function toggleReaction(bookOwner,bookId,reaction){
  const book=(db.books[bookOwner]||[]).find(b=>b.id===bookId);
  if(!book) return;
  if(!book.reactions) book.reactions={};
  if(!book.reactions[me]) book.reactions[me]=[];
  const idx=book.reactions[me].indexOf(reaction);
  if(idx>-1) book.reactions[me].splice(idx,1);
  else book.reactions[me].push(reaction);
  saveDb();renderJournal();
}

// 👍 butonuna sağ tıklayınca açılan ek emoji paneli. Ayrı bir veri yapısı gerekmiyor — panelden
// seçilen emoji, o kartın normal reaksiyon fonksiyonuna 👍 yerine aynı şekilde gönderiliyor
// (reactions[me] zaten birden fazla emoji tutabilen bir dizi).
const THUMB_PICKER_EMOJIS=['😂','😢','😤','🤯','❤️','💩'];
function openThumbPicker(ev,fnName,baseArgs,btnEl){
  ev.preventDefault();
  closeThumbPicker();
  const panel=document.createElement('div');
  panel.className='thumb-picker';
  panel.style.cssText='position:fixed;z-index:9000;background:var(--parchment);border:1px solid rgba(201,162,39,.45);'
    +'border-radius:24px;padding:.35rem .5rem;display:flex;gap:.25rem;box-shadow:0 8px 24px rgba(0,0,0,.3);';
  THUMB_PICKER_EMOJIS.forEach(em=>{
    const b=document.createElement('button');
    b.type='button';
    b.textContent=em;
    b.style.cssText='background:none;border:none;font-size:1.25rem;line-height:1;cursor:pointer;padding:.15rem .25rem;'
      +'border-radius:50%;transition:transform .12s ease;';
    b.onmouseenter=()=>{b.style.transform='scale(1.35)';};
    b.onmouseleave=()=>{b.style.transform='';};
    b.onclick=(e)=>{
      e.stopPropagation();
      window[fnName](...baseArgs,em,btnEl);
      closeThumbPicker();
    };
    panel.appendChild(b);
  });
  document.body.appendChild(panel);
  const rect=panel.getBoundingClientRect();
  let x=ev.clientX-rect.width/2;
  x=Math.max(6,Math.min(x,window.innerWidth-rect.width-6));
  let y=ev.clientY-rect.height-12;
  if(y<6) y=ev.clientY+12;
  panel.style.left=x+'px';
  panel.style.top=y+'px';
  window._thumbPickerPanel=panel;
  setTimeout(()=>document.addEventListener('click',closeThumbPicker,{once:true}),0);
  document.addEventListener('keydown',_thumbPickerEscHandler);
}
function _thumbPickerEscHandler(e){
  if(e.key==='Escape') closeThumbPicker();
}
function closeThumbPicker(){
  if(window._thumbPickerPanel){
    window._thumbPickerPanel.remove();
    window._thumbPickerPanel=null;
  }
  document.removeEventListener('keydown',_thumbPickerEscHandler);
}

// Kart bazlı reaksiyon (değerlendirme veya alıntı)
function toggleCardReaction(type,bookOwner,bookId,quoteIdx,reaction,btnEl){
  const book=(db.books[bookOwner]||[]).find(b=>b.id===bookId);
  if(!book) return;
  let reactObj;
  if(type==='review'){
    if(!book.reviewReactions) book.reviewReactions={};
    reactObj=book.reviewReactions;
  } else {
    if(!book.quotes||!book.quotes[quoteIdx]) return;
    if(!book.quotes[quoteIdx].reactions) book.quotes[quoteIdx].reactions={};
    reactObj=book.quotes[quoteIdx].reactions;
  }
  if(!reactObj[me]) reactObj[me]=[];
  const idx=reactObj[me].indexOf(reaction);
  if(idx>-1) reactObj[me].splice(idx,1);
  else{
    reactObj[me].push(reaction);
    if(bookOwner!==me) pushReactionNotif(bookOwner,me,reaction,book.title||'kitap');
  }
  saveDb();renderJournal();renderFeed();flashReactionPop(btnEl);
}

function copyCardQuote(bookOwner,bookId,quoteIdx){
  const book=(db.books[bookOwner]||[]).find(b=>b.id===bookId);
  if(!book||!book.quotes) return;
  const q=book.quotes[quoteIdx];
  if(!q) return;
  const text=`"${q.text}"${q.page?' (s. '+q.page+')':''}\n— ${book.title}, ${book.author||''}`;
  navigator.clipboard.writeText(text).then(()=>notify('📋 Kopyalandı','Alıntı panoya kopyalandı.'));
}
