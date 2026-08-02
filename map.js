// ══════════════════════════════════════════════════════════════
// DÜNYA HARİTASI MODÜLÜ — The Armchair Adventurers
// ══════════════════════════════════════════════════════════════
// Bu dosya index.html'den ayrıldı (Ö40, 2026-08-02).
//
// ⚠️  index.html ile AYNI KLASÖRDE bulunmalıdır.
//     index.html içinde ana <script> bloğundan ÖNCE yükleniyor:
//         <script src="map.js"></script>
//
// Bu modülün DIŞARIDAN kullandıkları (hepsi çalışma anında çağrılıyor,
// yükleme anında değil — yükleme sırası bu yüzden güvenli):
//     db, me, viewing, saveDb(), readBooksOf()
//
// DIŞARININ bu modülden kullandıkları:
//     countryToISO()  → rozet kontrolleri (bölgesel rozetler) + uniqueISOs()
//     renderMap()     → switchStatsTab, renderSafe, finishReading, confirmResetMap
//     ISO_CONTINENT   → allContinents() rozet yardımcısı
// ══════════════════════════════════════════════════════════════

// ── DÜNYA HARİTASI ────────────────────────────────────────────
const COUNTRY_ISO = {
  'türkiye':'TR','turkey':'TR','almanya':'DE','germany':'DE','fransa':'FR','france':'FR',
  'ingiltere':'GB','ingilere':'GB','ingiltre':'GB','birleşik krallık':'GB','united kingdom':'GB','uk':'GB','england':'GB','great britain':'GB',
  'abd':'US','amerika':'US','usa':'US','united states':'US','united states of america':'US','amerika birleşik devletleri':'US',
  'rusya':'RU','russia':'RU','çin':'CN','china':'CN','japonya':'JP','japan':'JP',
  'brezilya':'BR','brazil':'BR','arjantin':'AR','argentina':'AR','hindistan':'IN','india':'IN',
  'avustralya':'AU','australia':'AU','kanada':'CA','canada':'CA','meksika':'MX','mexico':'MX',
  'ispanya':'ES','spain':'ES','italya':'IT','italy':'IT','portekiz':'PT','portugal':'PT',
  'hollanda':'NL','netherlands':'NL','belçika':'BE','belgium':'BE','isveç':'SE','sweden':'SE',
  'norveç':'NO','norway':'NO','danimarka':'DK','denmark':'DK','finlandiya':'FI','finland':'FI',
  'polonya':'PL','poland':'PL','çekya':'CZ','czech republic':'CZ','czechia':'CZ',
  'avusturya':'AT','austria':'AT','isviçre':'CH','İsviçre':'CH','switzerland':'CH',
  'yunanistan':'GR','greece':'GR','macaristan':'HU','hungary':'HU','romanya':'RO','romania':'RO',
  'bulgaristan':'BG','bulgaria':'BG','sırbistan':'RS','serbia':'RS','hırvatistan':'HR','croatia':'HR',
  'ukrayna':'UA','ukraine':'UA','mısır':'EG','egypt':'EG','güney afrika':'ZA','south africa':'ZA',
  'nijerya':'NG','nigeria':'NG','etiyopya':'ET','ethiopia':'ET','kenya':'KE',
  'fas':'MA','morocco':'MA','cezayir':'DZ','algeria':'DZ','tunus':'TN','tunisia':'TN',
  'iran':'IR','irak':'IQ','iraq':'IQ','suriye':'SY','syria':'SY','lübnan':'LB','lebanon':'LB',
  'israel':'IL','İsrail':'IL','isreil':'IL','suudi arabistan':'SA','saudi arabia':'SA',
  'birleşik arap emirlikleri':'AE','uae':'AE','pakistan':'PK','bangladeş':'BD','bangladesh':'BD',
  'endonezya':'ID','indonesia':'ID','filipinler':'PH','philippines':'PH','vietnam':'VN',
  'tayland':'TH','thailand':'TH','malezya':'MY','malaysia':'MY',
  'güney kore':'KR','south korea':'KR','kore':'KR','kuzey kore':'KP','north korea':'KP',
  'tayvan':'TW','taiwan':'TW','kolombiya':'CO','colombia':'CO','şili':'CL','chile':'CL',
  'peru':'PE','venezuela':'VE','küba':'CU','cuba':'CU','yeni zelanda':'NZ','new zealand':'NZ',
  'arnavutluk':'AL','albania':'AL','bosna hersek':'BA','bosnia':'BA','makedonya':'MK',
  'north macedonia':'MK','slovenya':'SI','slovenia':'SI','slovakya':'SK','slovakia':'SK',
  'litvanya':'LT','lithuania':'LT','letonya':'LV','latvia':'LV','estonya':'EE','estonia':'EE',
  'beyaz rusya':'BY','belarus':'BY','moldova':'MD','gürcistan':'GE','georgia':'GE',
  'ermenistan':'AM','armenia':'AM','azerbaycan':'AZ','azerbaijan':'AZ',
  'kazakistan':'KZ','kazakhstan':'KZ','özbekistan':'UZ','uzbekistan':'UZ',
  'afganistan':'AF','afghanistan':'AF','angola':'AO','kamerun':'CM','cameroon':'CM',
  'senegal':'SN','gana':'GH','ghana':'GH','tanzanya':'TZ','tanzania':'TZ','uganda':'UG',
  'mozambik':'MZ','mozambique':'MZ','madagaskar':'MG','madagascar':'MG','sri lanka':'LK',
  'myanmar':'MM','kamboçya':'KH','cambodia':'KH','nepal':'NP','uruguay':'UY','paraguay':'PY',
  'bolivya':'BO','bolivia':'BO','ekvador':'EC','ecuador':'EC','panama':'PA','guatemala':'GT',
  'honduras':'HN','nikaragua':'NI','nicaragua':'NI','el salvador':'SV',
  'kosta rika':'CR','costa rica':'CR','dominik cumhuriyeti':'DO','dominican republic':'DO',
  'haiti':'HT','jamaika':'JM','jamaica':'JM','trinidad':'TT','trinidad and tobago':'TT',
  'zimbabve':'ZW','zimbabwe':'ZW','zambia':'ZM','demokratik kongo cumhuriyeti':'CD','dr congo':'CD',
  'kongo':'CG','fildişi sahili':'CI',"cote d'ivoire":'CI','ivory coast':'CI',
  'mali':'ML','burkina faso':'BF','nijer':'NE','niger':'NE','çad':'TD','chad':'TD',
  'sudan':'SD','güney sudan':'SS','south sudan':'SS','somali':'SO','somalia':'SO',
  'eritre':'ER','eritrea':'ER','libya':'LY','lüksemburg':'LU','luxembourg':'LU',
  'irlanda':'IE','ireland':'IE','izlanda':'IS','İzlanda':'IS','iceland':'IS',
  'kibris':'CY','kıbrıs':'CY','cyprus':'CY','malta':'MT','kosova':'XK','kosovo':'XK',
  'karadağ':'ME','montenegro':'ME','isvicre':'CH',
  'moldava':'MD','moldova':'MD','zambiya':'ZM','zambia':'ZM','ürdün':'JO','jordan':'JO','israil':'IL',
};

const ISO_CONTINENT = {
  AD:'europe',AE:'asia',AF:'asia',AL:'europe',AM:'asia',AO:'africa',AR:'americas',AT:'europe',AU:'oceania',AZ:'asia',
  BA:'europe',BD:'asia',BE:'europe',BF:'africa',BG:'europe',BH:'asia',BI:'africa',BJ:'africa',BN:'asia',BO:'americas',BR:'americas',BT:'asia',BW:'africa',BY:'europe',BZ:'americas',
  CA:'americas',CD:'africa',CF:'africa',CG:'africa',CH:'europe',CI:'africa',CL:'americas',CM:'africa',CN:'asia',CO:'americas',CR:'americas',CU:'americas',CY:'europe',CZ:'europe',
  DE:'europe',DJ:'africa',DK:'europe',DO:'americas',DZ:'africa',
  EC:'americas',EE:'europe',EG:'africa',ER:'africa',ES:'europe',ET:'africa',
  FI:'europe',FJ:'oceania',FR:'europe',
  GA:'africa',GB:'europe',GE:'asia',GH:'africa',GM:'africa',GN:'africa',GR:'europe',GT:'americas',GW:'africa',GY:'americas',
  HN:'americas',HR:'europe',HT:'americas',HU:'europe',
  ID:'asia',IE:'europe',IL:'asia',IN:'asia',IQ:'asia',IR:'asia',IS:'europe',IT:'europe',
  JM:'americas',JO:'asia',JP:'asia',
  KE:'africa',KG:'asia',KH:'asia',KP:'asia',KR:'asia',KW:'asia',KZ:'asia',
  LA:'asia',LB:'asia',LI:'europe',LK:'asia',LR:'africa',LS:'africa',LT:'europe',LU:'europe',LV:'europe',LY:'africa',
  MA:'africa',MC:'europe',MD:'europe',ME:'europe',MG:'africa',MK:'europe',ML:'africa',MM:'asia',MN:'asia',MR:'africa',MT:'europe',MW:'africa',MX:'americas',MY:'asia',MZ:'africa',
  NA:'africa',NE:'africa',NG:'africa',NI:'americas',NL:'europe',NO:'europe',NP:'asia',NZ:'oceania',
  OM:'asia',PA:'americas',PE:'americas',PG:'oceania',PH:'asia',PK:'asia',PL:'europe',PT:'europe',PY:'americas',
  QA:'asia',RO:'europe',RS:'europe',RU:'europe',RW:'africa',
  SA:'asia',SD:'africa',SE:'europe',SG:'asia',SI:'europe',SK:'europe',SL:'africa',SN:'africa',SO:'africa',SR:'americas',SS:'africa',SV:'americas',SY:'asia',SZ:'africa',
  TD:'africa',TG:'africa',TH:'asia',TJ:'asia',TM:'asia',TN:'africa',TR:'asia',TT:'americas',TZ:'africa',
  UA:'europe',UG:'africa',US:'americas',UY:'americas',UZ:'asia',
  VA:'europe',VE:'americas',VN:'asia',
  XK:'europe',YE:'asia',ZA:'africa',ZM:'africa',ZW:'africa',
};

const CONTINENT_COLORS = {
  europe:   ['#2d1a08','#f5e070','#d4a820','#a07010','#6a4a00'],
  asia:     ['#2d1a08','#f0c090','#d07030','#a04010','#6a1a00'],
  americas: ['#2d1a08','#a0e8a0','#50a050','#207020','#0a3a0a'],
  africa:   ['#2d1a08','#f8d070','#d09020','#a05a00','#6a2a00'],
  oceania:  ['#2d1a08','#d0b0e0','#9060b0','#603080','#381050'],
};

function countryToISO(name){
  if(!name) return null;
  const n=name.trim().toLowerCase().replace(/i̇/g,'i').replace(/İ/gi,'i');
  return COUNTRY_ISO[n]||COUNTRY_ISO[name.trim().toLowerCase()]||null;
}

function getCountryColor(iso, count){
  const cont = ISO_CONTINENT[iso]||'europe';
  const shades = CONTINENT_COLORS[cont];
  if(count>=7) return shades[4];
  if(count>=4) return shades[3];
  if(count>=2) return shades[2];
  return shades[1];
}

function toggleMapFullscreen(){
  const wrap=document.getElementById('map-wrap');
  if(!wrap) return;
  if(!document.fullscreenElement){
    const doFsResize=()=>{
      setTimeout(()=>{
        const svg=document.getElementById('world-svg');
        if(!svg) return;
        // Ekran boyutunu al — mobilde yatay mod için her iki boyutu karşılaştır
        const sw=screen.width,sh=screen.height;
        const W=Math.max(sw,sh); // yatay boyut her zaman büyük olan
        const H=Math.min(sw,sh); // dikey boyut her zaman küçük olan
        svg.setAttribute('width',W);
        svg.setAttribute('height',H);
        svg.setAttribute('viewBox','0 0 960 500');
        svg.style.width='100%';
        svg.style.height='100%';
        // wrap'i de yatay doldur
        wrap.style.width='100vw';
        wrap.style.height='100vh';
        _mapZoom=1;applyMapTransform();
      },100);
    };
    wrap.requestFullscreen().then(doFsResize).catch(()=>{
      wrap.style.position='fixed';wrap.style.top='0';wrap.style.left='0';
      wrap.style.width='100vw';wrap.style.height='100vh';wrap.style.zIndex='9999';
      wrap.style.background='#1a0f00';
      document.getElementById('map-exit-fs').style.display='block';
      doFsResize();
    });
  } else {
    document.exitFullscreen();
  }
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement){
      wrap.style.cssText='';
      document.getElementById('map-exit-fs').style.display='none';
      resizeMap();
    }
  },{once:true});
}

function resizeMap(){
  const svg=document.getElementById('world-svg');
  const wrap=document.getElementById('map-wrap');
  if(!svg||!wrap) return;
  const W=wrap.offsetWidth;
  const H=Math.round(W*(500/960));
  svg.setAttribute('width',W);
  svg.setAttribute('height',H);
  svg.style.width='';svg.style.height='';
  _mapZoom=1;applyMapTransform();
}

let _mapZoom=1, _mapX=0, _mapY=0, _mapDrag=null;

function renderMap(){
  const container=document.getElementById('mapContainer');
  if(!container) return;
  const target=viewing||me;
  // Gizli profilde harita gösterme
  const isPrivate=viewing&&db.users[viewing]&&db.users[viewing].publicProfile===false;
  if(isPrivate){container.innerHTML='<div style="padding:2rem;text-align:center;font-family:\'Space Mono\',monospace;font-size:.7rem;color:var(--rust);opacity:.6">🔒 Bu profil gizli.</div>';return;}
  if(!db.mapReset) db.mapReset={};
  // mapReset tarihi varsa o tarihten SONRA eklenen kitapları göster (addedAt bazlı),
  // yoksa tüm kitapları göster (hiç sıfırlanmamış = filtre yok)
  const mapResetDate=db.mapReset[target]?new Date(db.mapReset[target]):null;
  const books=readBooksOf(target,{excludeRetroactive:true}).filter(b=>
    b.country&&(!mapResetDate||!b.addedAt||new Date(b.addedAt)>=mapResetDate)
  );
  const counts={};
  books.forEach(b=>{const iso=countryToISO(b.country);if(iso)counts[iso]=(counts[iso]||0)+1;});
  const lastBook=[...books].reverse().find(b=>countryToISO(b.country));
  const avatarISO=lastBook?countryToISO(lastBook.country):null;
  const countryCount=Object.keys(counts).length;

  container.innerHTML=`
    <div style="font-family:'Space Mono',monospace;font-size:.65rem;color:var(--rust);opacity:.8;margin-bottom:.5rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
      <span>🌍 ${countryCount} ülke keşfedildi</span>
      <span>📚 ${books.length} kitap</span>
      ${avatarISO?`<span>📍 ${lastBook.country}</span>`:''}
      <button onclick="toggleMapFullscreen()" style="margin-left:auto;background:rgba(201,162,39,.12);border:1px solid rgba(201,162,39,.3);border-radius:4px;cursor:pointer;font-size:.65rem;color:var(--gold);padding:.2rem .5rem;font-family:'Space Mono',monospace">⛶ Tam Ekran</button>
    </div>
    <div id="map-wrap" style="position:relative;width:100%;overflow:hidden;border-radius:8px;background:#1a0f00;touch-action:none;user-select:none">
      <button id="map-exit-fs" onclick="document.exitFullscreen()" style="display:none;position:absolute;top:8px;right:8px;z-index:10;background:rgba(201,162,39,.3);border:1px solid var(--gold);border-radius:4px;color:var(--gold);font-size:.7rem;padding:.2rem .5rem;cursor:pointer">✕ Çıkış</button>
      <div style="position:absolute;top:8px;left:8px;z-index:10;display:flex;flex-direction:column;gap:4px">
        <button onclick="mapZoom(1.3)" style="width:28px;height:28px;background:rgba(201,162,39,.2);border:1px solid rgba(201,162,39,.4);border-radius:4px;color:var(--gold);font-size:1rem;cursor:pointer;line-height:1">+</button>
        <button onclick="mapZoom(0.77)" style="width:28px;height:28px;background:rgba(201,162,39,.2);border:1px solid rgba(201,162,39,.4);border-radius:4px;color:var(--gold);font-size:1rem;cursor:pointer;line-height:1">−</button>
        <button onclick="mapReset()" style="width:28px;height:28px;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.3);border-radius:4px;color:var(--gold);font-size:.6rem;cursor:pointer;line-height:1">⌂</button>
      </div>
      <div id="map-tooltip" style="display:none;position:absolute;background:rgba(26,15,0,.95);border:1px solid rgba(201,162,39,.4);border-radius:4px;padding:.3rem .6rem;font-family:'Space Mono',monospace;font-size:.6rem;color:var(--gold);pointer-events:none;z-index:20;max-width:200px"></div>
      <div id="map-viewport" style="transform-origin:center center;will-change:transform;width:100%">
        <div id="map-loading" style="color:var(--rust);font-family:'Space Mono',monospace;font-size:.7rem;padding:2rem;text-align:center;opacity:.6">🗺️ Harita yükleniyor...</div>
      </div>
      <div id="map-anim-btns" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:10;display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
        <button onclick="playMapAnimation('last')" style="background:rgba(26,15,0,.75);border:1px solid rgba(201,162,39,.6);border-radius:6px;cursor:pointer;font-size:.72rem;color:var(--gold);padding:.35rem .8rem;font-family:'Space Mono',monospace;backdrop-filter:blur(4px)">▶ Tekrar Oynat</button>
        <button onclick="playMapAnimation('all')" style="background:rgba(26,15,0,.75);border:1px solid rgba(201,162,39,.4);border-radius:6px;cursor:pointer;font-size:.72rem;color:var(--gold);padding:.35rem .8rem;font-family:'Space Mono',monospace;backdrop-filter:blur(4px)">⏮ Baştan Oynat</button>
      </div>
    </div>`;

  // SVG haritayı CDN'den yükle
  _mapZoom=1;_mapX=0;_mapY=0;
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r=>r.json())
    .then(topo=>{
      renderTopoMap(topo, counts, avatarISO, target, books);
    })
    .catch(()=>{
      const loading=document.getElementById('map-loading');
      if(loading) loading.textContent='❌ Harita yüklenemedi. İnternet bağlantını kontrol et.';
    });

  // Pan & zoom event'leri
  setupMapEvents();
}

function setupMapEvents(){
  const wrap=document.getElementById('map-wrap');
  if(!wrap) return;
  let startDist=0,startZoom=1;

  // Mouse pan — sadece zoom yapılmışsa
  wrap.addEventListener('mousedown',e=>{
    if(_mapZoom<=1) return;
    _mapDrag={x:e.clientX-_mapX,y:e.clientY-_mapY};
    wrap.style.cursor='grabbing';
  });
  window.addEventListener('mousemove',e=>{
    if(!_mapDrag) return;
    _mapX=e.clientX-_mapDrag.x;
    _mapY=e.clientY-_mapDrag.y;
    applyMapTransform();
  });
  window.addEventListener('mouseup',()=>{_mapDrag=null;if(wrap)wrap.style.cursor='default';});

  // Mouse wheel zoom
  wrap.addEventListener('wheel',e=>{
    e.preventDefault();
    mapZoom(e.deltaY<0?1.15:0.87,e.clientX,e.clientY);
  },{passive:false});

  // Touch — 1 parmak pan sadece zoom > 1 ise, 2 parmak pinch zoom
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length===1&&_mapZoom>1){
      _mapDrag={x:e.touches[0].clientX-_mapX,y:e.touches[0].clientY-_mapY};
    } else if(e.touches.length===2){
      _mapDrag=null;
      startDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      startZoom=_mapZoom;
    }
  },{passive:true});
  wrap.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1&&_mapDrag&&_mapZoom>1){
      _mapX=e.touches[0].clientX-_mapDrag.x;
      _mapY=e.touches[0].clientY-_mapDrag.y;
      applyMapTransform();
    } else if(e.touches.length===2){
      const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      _mapZoom=Math.max(0.5,Math.min(8,startZoom*(dist/startDist)));
      applyMapTransform();
    }
  },{passive:false});
  wrap.style.cursor='default';
}

function applyMapTransform(){
  if(_mapZoom<=1){_mapX=0;_mapY=0;}
  const vp=document.getElementById('map-viewport');
  if(vp) vp.style.transform=`translate(${_mapX}px,${_mapY}px) scale(${_mapZoom})`;
}

function mapZoom(factor,cx,cy){
  const wrap=document.getElementById('map-wrap');
  if(!wrap) return;
  const rect=wrap.getBoundingClientRect();
  const px=cx!==undefined?cx-rect.left:rect.width/2;
  const py=cy!==undefined?cy-rect.top:rect.height/2;
  const newZoom=Math.max(0.5,Math.min(8,_mapZoom*factor));
  _mapX=px-(px-_mapX)*newZoom/_mapZoom;
  _mapY=py-(py-_mapY)*newZoom/_mapZoom;
  _mapZoom=newZoom;
  applyMapTransform();
}

function mapReset(){
  _mapZoom=1;_mapX=0;_mapY=0;
  applyMapTransform();
}

function renderTopoMap(topo, counts, avatarISO, target, books){
  if(typeof topojson==='undefined'){
    const loading=document.getElementById('map-loading');
    if(loading) loading.textContent='❌ Harita kütüphanesi yüklenemedi.';
    return;
  }

  const countries=topojson.feature(topo,topo.objects.countries);
  const W=960,H=500;

  // Basit equirectangular projeksiyon
  function project(lon,lat){
    const x=(lon+180)/360*W;
    const y=(90-lat)/180*H;
    return[x,y];
  }

  function coordsToPath(coords){
    return coords.map((ring)=>{
      // Longitude'u önceki noktaya göre normalize et (180° sıçramayı önle)
      const normalized=[];
      let prevLon=null;
      for(const pt of ring){
        let lon=pt[0];
        if(prevLon!==null){
          // Önceki noktadan farkı -180..+180 aralığına çek
          let diff=lon-prevLon;
          if(diff>180) lon-=360;
          else if(diff<-180) lon+=360;
        }
        normalized.push([lon,pt[1]]);
        prevLon=lon;
      }
      const d=normalized.map((pt,i)=>{
        const[x,y]=project(pt[0],pt[1]);
        return(i===0?`M${x.toFixed(1)},${y.toFixed(1)}`:`L${x.toFixed(1)},${y.toFixed(1)}`);
      }).join(' ')+'Z';
      return d;
    }).join(' ');
  }

  function geomToPath(geom){
    if(!geom) return '';
    if(geom.type==='Polygon') return coordsToPath(geom.coordinates);
    if(geom.type==='MultiPolygon') return geom.coordinates.map(coordsToPath).join(' ');
    return '';
  }

  // ISO numeric → ISO2 eşleştirmesi (topojson numeric id kullanıyor)
  const NUM_TO_ISO2={4:'AF',8:'AL',12:'DZ',24:'AO',32:'AR',36:'AU',40:'AT',50:'BD',56:'BE',64:'BT',68:'BO',76:'BR',100:'BG',116:'KH',120:'CM',124:'CA',152:'CL',156:'CN',170:'CO',180:'CD',188:'CR',192:'CU',196:'CY',203:'CZ',208:'DK',218:'EC',818:'EG',231:'ET',246:'FI',250:'FR',276:'DE',288:'GH',300:'GR',320:'GT',324:'GN',340:'HN',348:'HU',356:'IN',360:'ID',364:'IR',368:'IQ',372:'IE',376:'IL',380:'IT',392:'JP',400:'JO',398:'KZ',404:'KE',408:'KP',410:'KR',414:'KW',418:'LA',422:'LB',430:'LR',434:'LY',440:'LT',442:'LU',450:'MG',454:'MW',458:'MY',466:'ML',484:'MX',504:'MA',508:'MZ',516:'NA',524:'NP',528:'NL',558:'NI',562:'NE',566:'NG',578:'NO',586:'PK',591:'PA',598:'PG',600:'PY',604:'PE',608:'PH',616:'PL',620:'PT',630:'PR',634:'QA',642:'RO',643:'RU',646:'RW',682:'SA',686:'SN',694:'SL',706:'SO',710:'ZA',724:'ES',740:'SR',752:'SE',756:'CH',760:'SY',762:'TJ',764:'TH',768:'TG',788:'TN',792:'TR',800:'UG',804:'UA',784:'AE',826:'GB',840:'US',858:'UY',860:'UZ',862:'VE',704:'VN',887:'YE',894:'ZM',716:'ZW',32:'AR',76:'BR',124:'CA',144:'LK',191:'HR',208:'DK',214:'DO',222:'SV',232:'ER',233:'EE',246:'FI',288:'GH',328:'GY',332:'HT',388:'JM',426:'LS',428:'LV',496:'MN',498:'MD',499:'ME',512:'OM',531:'CW',535:'BQ',585:'PW',624:'GW',630:'PR',659:'KN',670:'VC',780:'TT',882:'WS',887:'YE',895:'XK'};

  const avatarUser=db.users[target]?.avatar||'📚';

  const paths=countries.features.map(f=>{
    const numId=parseInt(f.id);
    const iso2=NUM_TO_ISO2[numId];
    const count=iso2?counts[iso2]:0;
    const continent=iso2?ISO_CONTINENT[iso2]:'europe';
    let fill='#2d1a08';
    let stroke='rgba(201,162,39,0.4)';
    if(count){
      fill=getCountryColor(iso2,count);
      stroke='rgba(201,162,39,0.7)';
    }

    const d=geomToPath(f.geometry);
    if(!d) return '';

    // Tooltip bilgisi
    const name=f.properties?.name||iso2||'';
    const tipBooks=count?(db.books[target]||[]).filter(b=>countryToISO(b.country)===iso2&&!b.retroactive&&b.readingStatus==='new').map(b=>b.title).slice(0,5):[];
    const tipData=count?JSON.stringify({name,count,books:tipBooks}):'';

    return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="0.5" data-iso="${iso2||''}" data-tip="${tipData.replace(/"/g,'&quot;')}"
      onmouseenter="showMapTip(event,this)" onmouseleave="hideMapTip()" onclick="showMapTip(event,this)" ontouchstart="showMapTip(event,this)"
      style="cursor:${count?'pointer':'default'};transition:fill .2s"/>`;
  }).join('');

  // Avatar ayarları
  const avatarVal=(db.users[target]&&db.users[target].avatar)||null;
  const mapAvatarUrl=avatarVal&&avatarVal.startsWith('avatar_')?`https://hggunay.github.io/project_ashbless/avatars/${avatarVal}`:null;

  // Ülke koordinat haritası — animasyon için
  const countryCoords={};
  countries.features.forEach(f=>{
    const iso2=NUM_TO_ISO2[parseInt(f.id)];
    if(!iso2||!f.geometry) return;
    try{
      const coords=f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.coordinates[0][0];
      let sx=0,sy=0,n=0;
      coords.forEach(pt=>{
        let lon=pt[0];
        if(n>0){
          const prev=coords[n-1];
          let diff=lon-prev[0];
          if(diff>180)lon-=360;
          else if(diff<-180)lon+=360;
        }
        const[x,y]=project(lon,pt[1]);
        sx+=x;sy+=y;n++;
      });
      if(n>0) countryCoords[iso2]=[sx/n,sy/n];
    }catch(e){}
  });
  // Türkiye fallback — hiç kitap yoksa başlangıç noktası
  if(!countryCoords['TR']) countryCoords['TR']=[project(35,39)[0],project(35,39)[1]];

  const wrap=document.getElementById('map-wrap');
  const wrapW=wrap?wrap.offsetWidth:360;
  const scale=wrapW/W;
  const svgH=Math.round(H*scale);

  document.getElementById('map-loading').outerHTML=`
    <svg id="world-svg" viewBox="0 0 ${W} ${H}" width="${wrapW}" height="${svgH}"
      style="display:block;max-width:100%">
      <rect width="${W}" height="${H}" fill="#1a0f00"/>
      ${paths}
      <g id="map-trail-layer"></g>
      <g id="map-avatar-layer"></g>
    </svg>`;

  // Animasyon butonları artık map-wrap içinde (tam ekranda da görünür)

  // Koordinat haritasını global'e kaydet — animasyon fonksiyonları kullanacak
  window._mapCountryCoords=countryCoords;
  window._mapAvatarUrl=mapAvatarUrl;
  window._mapAvatarUser=avatarUser;
  window._mapTarget=target;

  // Otomatik animasyon — son ziyaretten bu yana yeni ülke eklendiyse
  let lastMapVisit=0;
  if(db.users[me]&&db.users[me].mapVisits&&typeof db.users[me].mapVisits[target]==='number'){
    lastMapVisit=db.users[me].mapVisits[target];
  } else {
    // Tek seferlik geçiş: Firebase'de kayıt yoksa eski localStorage değerini kullan
    try{
      lastMapVisit=parseInt(localStorage.getItem('aa-map-visit-'+target)||'0');
      if(db.users[me]&&lastMapVisit){
        if(!db.users[me].mapVisits) db.users[me].mapVisits={};
        db.users[me].mapVisits[target]=lastMapVisit;
        saveDb();
      }
    }catch(e){}
  }
  const newEvents=((db.countryEvents&&db.countryEvents[target])||[]).filter(ev=>{
    const t=new Date(ev.ts).getTime();
    return t>lastMapVisit;
  });
  if(newEvents.length>0){
    setTimeout(()=>playMapAnimation('new',newEvents),800);
  } else {
    // Yeni event yok — avatarı son konumda sabit göster
    setTimeout(()=>_placeAvatarStatic(),300);
  }
  if(db.users[me]){
    if(!db.users[me].mapVisits) db.users[me].mapVisits={};
    db.users[me].mapVisits[target]=Date.now();
    saveDb();
  }
  try{localStorage.setItem('aa-map-visit-'+target,String(Date.now()));}catch(e){} // çevrimdışı yedek
}

// ── HARİTA ANİMASYONU ────────────────────────────────────────
let _mapAnimRunning=false;

function _placeAvatarStatic(){
  // Animasyon olmadan avatarı son konuma koy
  const svg=document.getElementById('world-svg');
  if(!svg) return;
  const coords=window._mapCountryCoords||{};
  const target=window._mapTarget||me;
  const validCountries=new Set(
  (db.books[target]||[]).filter(b=>b.country&&b.readingStatus==='new'&&!b.retroactive)
  .map(b=>b.country.toLowerCase())
);
const allEvents=((db.countryEvents&&db.countryEvents[target])||[]).filter(
  e=>validCountries.has(e.country.toLowerCase())
);
  let lastISO='TR';
  if(allEvents.length>0){
    const last=allEvents[allEvents.length-1];
    const iso=countryToISO(last.country);
    if(iso&&coords[iso]) lastISO=iso;
  }
  const pos=coords[lastISO]||coords['TR'];
  if(!pos) return;
  const avatarLayer=document.getElementById('map-avatar-layer');
  if(!avatarLayer) return;
  _drawStaticAvatar(avatarLayer, pos[0], pos[1]);
}

function _drawStaticAvatar(layer, x, y){
  const mapAvatarUrl=window._mapAvatarUrl;
  const avatarUser=window._mapAvatarUser||'📚';
  const isPhoto=!mapAvatarUrl&&avatarUser.startsWith('data:');
  let html='';
  if(mapAvatarUrl){
    html=`<image href="${mapAvatarUrl}" x="${x-20}" y="${y-20}" width="40" height="40" pointer-events="none"/>
      <circle cx="${x}" cy="${y}" r="22" fill="none" stroke="#c9a227" stroke-width="1.5" class="map-pulse-ring" pointer-events="none"/>`;
  } else if(isPhoto){
    html=`<image href="${avatarUser}" x="${x-14}" y="${y-14}" width="28" height="28" clip-path="circle(14px at 14px 14px)" pointer-events="none"/>
      <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#c9a227" stroke-width="1.5" class="map-pulse-ring" pointer-events="none"/>`;
  } else {
    html=`<circle cx="${x}" cy="${y}" r="10" fill="rgba(26,15,0,0.85)" stroke="#c9a227" stroke-width="1.5" pointer-events="none"/>
      <text x="${x}" y="${y+5}" text-anchor="middle" font-size="12" pointer-events="none">${avatarUser}</text>
      <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#c9a227" stroke-width="1.5" class="map-pulse-ring" pointer-events="none"/>`;
  }
  layer.innerHTML=`<g class="map-anim-avatar">${html}</g>`;
}

function playMapAnimation(mode, eventsOverride){
  if(_mapAnimRunning) return;
  const svg=document.getElementById('world-svg');
  if(!svg) return;
  const coords=window._mapCountryCoords||{};
  const target=window._mapTarget||me;
  const allEvents=(db.countryEvents&&db.countryEvents[target])||[];
  if(!allEvents.length) return;

  let sequence=[];
  if(mode==='last'){
    // Son hareketi tekrar oynat — son iki ülke arası
    const last=allEvents[allEvents.length-1];
    const prev=allEvents.length>1?allEvents[allEvents.length-2]:null;
    const startISO=prev?countryToISO(prev.country):'TR';
    const endISO=countryToISO(last.country);
    if(startISO&&endISO&&coords[startISO]&&coords[endISO]){
      sequence=[{from:coords[startISO],to:coords[endISO],country:last.country}];
    }
  } else if(mode==='all'){
    // Tüm ülkeler baştan sırayla
    let fromISO='TR';
    allEvents.forEach(ev=>{
      const toISO=countryToISO(ev.country);
      if(toISO&&coords[toISO]){
        const fromCoord=coords[fromISO]||coords['TR'];
        if(fromCoord) sequence.push({from:fromCoord,to:coords[toISO],country:ev.country});
        fromISO=toISO;
      }
    });
  } else if(mode==='new'){
    // Sadece yeni eventler — başlangıç noktası son eski event'in ülkesi
    const newEvs=eventsOverride||[];
    const oldEvents=allEvents.filter(ev=>!newEvs.includes(ev));
    let fromISO=oldEvents.length>0?countryToISO(oldEvents[oldEvents.length-1].country):'TR';
    if(!fromISO||!coords[fromISO]) fromISO='TR';
    newEvs.forEach(ev=>{
      const toISO=countryToISO(ev.country);
      if(toISO&&coords[toISO]){
        const fromCoord=coords[fromISO]||coords['TR'];
        if(fromCoord) sequence.push({from:fromCoord,to:coords[toISO],country:ev.country});
        fromISO=toISO;
      }
    });
  }
  if(!sequence.length){_placeAvatarStatic();return;}
  _mapAnimRunning=true;
  _runAnimSequence(svg,sequence,0);
}

function _runAnimSequence(svg,sequence,idx){
  if(idx>=sequence.length){
    _mapAnimRunning=false;
    // Animasyon bitti — avatarı son konumda sabit bırak
    const lastStep=sequence[sequence.length-1];
    if(lastStep){
      const avatarLayer=document.getElementById('map-avatar-layer');
      if(avatarLayer) _drawStaticAvatar(avatarLayer,lastStep.to[0],lastStep.to[1]);
    }
    return;
  }
  const step=sequence[idx];
  _animateAvatarMove(svg,step.from,step.to,()=>{
    setTimeout(()=>_runAnimSequence(svg,sequence,idx+1),600);
  });
}

function _animateAvatarMove(svg,from,to,onDone){
  const DURATION=1200; // ms
  const TRAIL_COUNT=18;
  const trailLayer=document.getElementById('map-trail-layer');
  const avatarLayer=document.getElementById('map-avatar-layer');
  if(!trailLayer||!avatarLayer) {onDone&&onDone();return;}

  // Statik avatarı temizle, animasyon avatarı oluştur
  avatarLayer.innerHTML='';
  const avatarEl=document.createElementNS('http://www.w3.org/2000/svg','g');
  avatarEl.classList.add('map-anim-avatar');
  avatarLayer.appendChild(avatarEl);

  const mapAvatarUrl=window._mapAvatarUrl;
  const avatarUser=window._mapAvatarUser||'📚';
  const isPhoto=!mapAvatarUrl&&avatarUser.startsWith('data:');

  function setAvatarPos(x,y){
    avatarEl.innerHTML='';
    if(mapAvatarUrl){
      avatarEl.innerHTML=`<image href="${mapAvatarUrl}" x="${x-20}" y="${y-20}" width="40" height="40"/>
        <circle cx="${x}" cy="${y}" r="22" fill="none" stroke="#c9a227" stroke-width="1.5" class="map-pulse-ring"/>`;
    } else if(isPhoto){
      avatarEl.innerHTML=`<image href="${avatarUser}" x="${x-14}" y="${y-14}" width="28" height="28" clip-path="circle(14px at 14px 14px)"/>
        <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#c9a227" stroke-width="1.5" class="map-pulse-ring"/>`;
    } else {
      avatarEl.innerHTML=`<circle cx="${x}" cy="${y}" r="10" fill="rgba(26,15,0,0.85)" stroke="#c9a227" stroke-width="1.5"/>
        <text x="${x}" y="${y+5}" text-anchor="middle" font-size="12">${avatarUser}</text>
        <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#c9a227" stroke-width="1.5" class="map-pulse-ring"/>`;
    }
  }

  // Kuyruk noktaları
  const trails=[];
  for(let i=0;i<TRAIL_COUNT;i++){
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('r','3');
    c.setAttribute('fill','#c9a227');
    c.setAttribute('opacity','0');
    trailLayer.appendChild(c);
    trails.push(c);
  }

  const startTime=performance.now();
  function frame(now){
    const t=Math.min((now-startTime)/DURATION,1);
    const ease=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; // easeInOutQuad
    const x=from[0]+(to[0]-from[0])*ease;
    const y=from[1]+(to[1]-from[1])*ease;
    setAvatarPos(x,y);

    // Kuyruk — geçmiş pozisyonlar
    for(let i=0;i<TRAIL_COUNT;i++){
      const trailT=Math.max(0,ease-(i+1)*(0.9/TRAIL_COUNT));
      const tx=from[0]+(to[0]-from[0])*trailT;
      const ty=from[1]+(to[1]-from[1])*trailT;
      const alpha=Math.max(0,(1-i/TRAIL_COUNT)*0.7*(1-t*0.5));
      trails[i].setAttribute('cx',tx);
      trails[i].setAttribute('cy',ty);
      trails[i].setAttribute('opacity',alpha);
      trails[i].setAttribute('r', 3-i*0.1);
    }

    if(t<1){
      requestAnimationFrame(frame);
    } else {
      // Kuyruk sönümle
      let fadeT=0;
      function fadeTrail(now2){
        fadeT=Math.min((now2-now)/400,1);
        trails.forEach((c,i)=>{
          const base=parseFloat(c.getAttribute('opacity'));
          c.setAttribute('opacity',base*(1-fadeT));
        });
        if(fadeT<1) requestAnimationFrame(fadeTrail);
        else{
          trails.forEach(c=>trailLayer.removeChild(c));
          onDone&&onDone();
        }
      }
      requestAnimationFrame(fadeTrail);
    }
  }
  setAvatarPos(from[0],from[1]);
  requestAnimationFrame(frame);
}

function showMapTip(e,el){
  const tipJson=el.dataset?.tip;
  if(!tipJson) return;
  const tt=document.getElementById('map-tooltip');
  if(!tt) return;
  try{
    const d=JSON.parse(tipJson);
    tt.innerHTML=`<div style="font-weight:700;margin-bottom:.2rem">${d.name}: ${d.count} kitap</div>`+
      d.books.map(b=>`<div>• ${b}</div>`).join('');
  }catch(err){return;}
  tt.style.display='block';
  const wrap=document.getElementById('map-wrap');
  const rect=wrap.getBoundingClientRect();
  const clientX=e.touches?e.touches[0].clientX:e.clientX;
  const clientY=e.touches?e.touches[0].clientY:e.clientY;
  tt.style.left=Math.min(clientX-rect.left+10,rect.width-210)+'px';
  tt.style.top=Math.max(clientY-rect.top-40,5)+'px';
}

function hideMapTip(){
  const tt=document.getElementById('map-tooltip');
  if(tt) tt.style.display='none';
}
document.addEventListener('touchstart',e=>{
  const tt=document.getElementById('map-tooltip');
  if(tt&&tt.style.display!=='none'&&!e.target.closest('#map-tooltip')&&!e.target.closest('path')){
    tt.style.display='none';
  }
});
