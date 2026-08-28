// badges.js — Rozet sistemi tanımları ve hesaplama yardımcıları modülü (Ö40, 2026-08-06)
// index.html'teki ana <script> bloğundan ÖNCE yükleniyor,
// bu yüzden buradaki fonksiyonlar ana bloktan çağrılabilir.
// NOT: Rozet gösterim/kazanma mantığı (renderBadges, checkAndAwardBadges, toggleBadgeDetail,
// gizli rozet efsane pencereleri vb.) henüz burada değil, index.html'de kalmaya devam ediyor
// — ayrı bir adımda taşınacak.

// Tür ID'sinin rozet için hangi ana türe sayılacağını döner
const GENRE_BADGE_MAP = {
  'roman':'roman','epik_fantastik':'fantastik','dark_fantasy':'fantastik','masalsi':'fantastik','mitolojik_kurgu':'fantastik',
  'cyberpunk':'bilimkurgu','steampunk':'bilimkurgu','space_opera':'bilimkurgu','distopya':'bilimkurgu','utopya':'bilimkurgu',
  'noir':'polisiye','suc':'polisiye','hukuk_gerilim':'polisiye',
  'psikolojik_gerilim':'gerilim','casusluk':'gerilim',
  'gotik':'korku','vampir':'korku',
  'tarihi_roman':'tarihi_roman',
  'genclik':'genclik','cocuk':'genclik',
  'absurt':'roman',
  'sosyoloji':'psikoloji',
  'teknoloji':'bilim',
  'ekonomi':'ekonomi','is_dunyasi':'ekonomi',
  'otobiyografi':'biyografi','ani':'biyografi',
  'liderlik':'kisisel_gelisim','saglik':'kisisel_gelisim',
  'muzik':'sanat','mimari':'sanat',
  'grafik_roman':'cizgi_roman',
  'kutsal_meta':'kutsal_meta',
  'klasik':'klasik',
};
function badgeGenre(id){return GENRE_BADGE_MAP[id]||id;}

const BADGE_CATS = [
  // ── 1. OKUMA MİKTARI ──────────────────────────────────────────
  {label:'📚 Okuma Miktarı', chains:[
    {id:'toplam_kitap', label:'📖 Toplam Kitap', badges:[
      {id:'b5',   tier:'bronze', icon:'📖', name:'İlk Adım',          desc:'5 kitap oku.',            check:b=>cap(b.length,5)},
      {id:'b10',  tier:'bronze', icon:'📚', name:'Okuma Alışkanlığı', desc:'10 kitap oku.',           check:b=>cap(b.length,10)},
      {id:'b25',  tier:'silver', icon:'🥈', name:'Kitap Kurdu',       desc:'25 kitap oku.',           check:b=>cap(b.length,25)},
      {id:'b50',  tier:'silver', icon:'🏅', name:'Kütüphane Dostu',   desc:'50 kitap oku.',           check:b=>cap(b.length,50)},
      {id:'b100', tier:'gold',   icon:'🥇', name:'Yüzler Kulübü',     desc:'100 kitap oku.',          check:b=>cap(b.length,100)},
      {id:'b250', tier:'diamond',icon:'💎', name:'Efsanevi Okuyucu',  desc:'250 kitap oku.',          check:b=>cap(b.length,250)},
    ]},
    {id:'sayfa_okuma', label:'📄 Sayfa Okuma', badges:[
      {id:'p1k',  tier:'bronze', icon:'📄', name:'Sayfa Avcısı',       desc:'1.000 sayfa oku.',       check:b=>cap(totalPages(b),1000)},
      {id:'p5k',  tier:'silver', icon:'📑', name:'Maraton Okuyucu',    desc:'5.000 sayfa oku.',       check:b=>cap(totalPages(b),5000)},
      {id:'p10k', tier:'gold',   icon:'📋', name:'Sayfa Deryası',      desc:'10.000 sayfa oku.',      check:b=>cap(totalPages(b),10000)},
      {id:'p25k', tier:'diamond',icon:'🌊', name:'Kelime Okyanusçusu', desc:'25.000 sayfa oku.',      check:b=>cap(totalPages(b),25000)},
    ]},
    {id:'uzun_kitap', label:'📕 Uzun Kitap (500+ sayfa)', badges:[
      {id:'long1',tier:'bronze', icon:'📕', name:'Dev Kitap Cesuru',   desc:'500+ sayfalık 1 kitap oku.', check:b=>cap(b.filter(x=>x.pages&&x.pages>=500).length,1)},
      {id:'long2',tier:'silver', icon:'📗', name:'Kalın Kitap Dostu',  desc:'500+ sayfalık 3 kitap oku.', check:b=>cap(b.filter(x=>x.pages&&x.pages>=500).length,3)},
      {id:'long3',tier:'gold',   icon:'📘', name:'Epik Okuyucu',       desc:'500+ sayfalık 10 kitap oku.',check:b=>cap(b.filter(x=>x.pages&&x.pages>=500).length,10)},
    ]},
    {id:'kisa_kitap', label:'📒 Kısa Kitap (150- sayfa)', badges:[
      {id:'short1',tier:'bronze', icon:'📒', name:'Hızlı Okuyucu',             desc:'150 sayfa altında 5 kitap oku.',  check:b=>cap(b.filter(x=>x.pages&&x.pages<=150).length,5)},
      {id:'short2',tier:'silver', icon:'📓', name:'Mini Kitap Koleksiyoncusu', desc:'150 sayfa altında 15 kitap oku.', check:b=>cap(b.filter(x=>x.pages&&x.pages<=150).length,15)},
      {id:'short3',tier:'gold',   icon:'🗒️', name:'Küçük Ama Güçlü',          desc:'150 sayfa altında 30 kitap oku.', check:b=>cap(b.filter(x=>x.pages&&x.pages<=150).length,30)},
      {id:'short4',tier:'diamond',icon:'⚡', name:'Mini Kitap Efsanesi',        desc:'150 sayfa altında 50 kitap oku.', check:b=>cap(b.filter(x=>x.pages&&x.pages<=150).length,50)},
    ]},
    {id:'cizgi_roman', label:'🎨 Çizgi Roman / Manga', badges:[
      {id:'comic1',tier:'bronze', icon:'🎨', name:'Panel Meraklısı',   desc:'3 çizgi roman/manga oku.',   check:b=>cap(b.filter(x=>(x.formats||[]).includes('cizgi')).length,3)},
      {id:'comic2',tier:'bronze', icon:'🦸', name:'Çizgi Roman Dostu', desc:'5 çizgi roman/manga oku.',   check:b=>cap(b.filter(x=>(x.formats||[]).includes('cizgi')).length,5)},
      {id:'comic3',tier:'silver', icon:'🐉', name:'Manga Kâşifi',      desc:'10 çizgi roman/manga oku.',  check:b=>cap(b.filter(x=>(x.formats||[]).includes('cizgi')).length,10)},
      {id:'comic4',tier:'gold',   icon:'⚡', name:'Çizgi Ustası',       desc:'20 çizgi roman/manga oku.',  check:b=>cap(b.filter(x=>(x.formats||[]).includes('cizgi')).length,20)},
      {id:'comic5',tier:'diamond',icon:'👑', name:'Çizgi Efsanesi',    desc:'50 çizgi roman/manga oku.',  check:b=>cap(b.filter(x=>(x.formats||[]).includes('cizgi')).length,50)},
    ]},
  ], badges:[]},
  // ── 2. TÜR KEŞFİ ──────────────────────────────────────────────
  {label:'🎭 Tür Keşfi', chains:[
    {id:'kc_genre',  label:'🔍 Tür Keşfi',    badges:[
      {id:'genre1',tier:'bronze', icon:'🔍', name:'Meraklı Gezgin',  desc:'3 farklı türden kitap oku.',  check:b=>cap(uniqueGenres(b),3)},
      {id:'genre2',tier:'silver', icon:'🗺️', name:'Tür Kâşifi',      desc:'7 farklı türden kitap oku.',  check:b=>cap(uniqueGenres(b),7)},
      {id:'genre3',tier:'gold',   icon:'🌟', name:'Ufuk Açıcı',       desc:'15 farklı türden kitap oku.', check:b=>cap(uniqueGenres(b),15)},
      {id:'genre4',tier:'diamond',icon:'🌈', name:'Sınırsız Okuyucu', desc:'25 farklı tür keşfet.',       check:b=>cap(uniqueGenres(b),25)},
    ]},
    {id:'kc_fan',    label:'🧙 Fantastik',     badges:[
      {id:'fan1',tier:'bronze', icon:'🧙', name:'Büyü Çırağı',      desc:'3 fantastik kitap oku.',  check:b=>genre(b,'fantastik',3)},
      {id:'fan2',tier:'silver', icon:'🐉', name:'Ejderha Dostu',    desc:'7 fantastik kitap oku.',  check:b=>genre(b,'fantastik',7)},
      {id:'fan3',tier:'gold',   icon:'🗡️', name:'Fantastik Kâşif',  desc:'15 fantastik kitap oku.', check:b=>genre(b,'fantastik',15)},
      {id:'fan4',tier:'diamond',icon:'👁️', name:'Fantastik Ustası', desc:'30 fantastik kitap oku.', check:b=>genre(b,'fantastik',30)},
    ]},
    {id:'kc_sf',     label:'🚀 Bilim Kurgu',   badges:[
      {id:'sf1',tier:'bronze', icon:'🚀', name:'Uzay Yolcusu',       desc:'3 bilim kurgu kitabı oku.',  check:b=>genre(b,'bilimkurgu',3)},
      {id:'sf2',tier:'silver', icon:'🛸', name:'Galaksi Kâşifi',     desc:'7 bilim kurgu kitabı oku.',  check:b=>genre(b,'bilimkurgu',7)},
      {id:'sf3',tier:'gold',   icon:'🌌', name:'Bilimkurgu Kaptanı', desc:'15 bilim kurgu kitabı oku.', check:b=>genre(b,'bilimkurgu',15)},
      {id:'sf4',tier:'diamond',icon:'⭐', name:'Evrenin Efendisi',   desc:'30 bilim kurgu kitabı oku.', check:b=>genre(b,'bilimkurgu',30)},
    ]},
    {id:'kc_det',    label:'🔎 Polisiye',       badges:[
      {id:'det1',tier:'bronze', icon:'🔎', name:'Çaylak Dedektif', desc:'3 polisiye kitabı oku.',  check:b=>genre(b,'polisiye',3)},
      {id:'det2',tier:'silver', icon:'🕵️', name:'İpucu Avcısı',   desc:'7 polisiye kitabı oku.',  check:b=>genre(b,'polisiye',7)},
      {id:'det3',tier:'gold',   icon:'⚖️', name:'Sır Çözücü',      desc:'15 polisiye kitabı oku.', check:b=>genre(b,'polisiye',15)},
      {id:'det4',tier:'diamond',icon:'🎩', name:'Baş Dedektif',    desc:'30 polisiye kitabı oku.', check:b=>genre(b,'polisiye',30)},
    ]},
    {id:'kc_ger',    label:'⚡ Gerilim',         badges:[
      {id:'ger1',tier:'bronze', icon:'⚡', name:'Heyecan Avcısı',   desc:'3 gerilim kitabı oku.',  check:b=>genre(b,'gerilim',3)},
      {id:'ger2',tier:'silver', icon:'🔪', name:'Gerilim Dostu',    desc:'7 gerilim kitabı oku.',  check:b=>genre(b,'gerilim',7)},
      {id:'ger3',tier:'gold',   icon:'🕶️', name:'Gerilim Ustası',   desc:'15 gerilim kitabı oku.', check:b=>genre(b,'gerilim',15)},
      {id:'ger4',tier:'diamond',icon:'🎯', name:'Ajan',             desc:'30 gerilim kitabı oku.', check:b=>genre(b,'gerilim',30)},
    ]},
    {id:'kc_hor',    label:'👻 Korku',          badges:[
      {id:'hor1',tier:'bronze', icon:'👻', name:'Cesur Okuyucu',  desc:'3 korku kitabı oku.',  check:b=>genre(b,'korku',3)},
      {id:'hor2',tier:'silver', icon:'🦇', name:'Karanlık Kâşif', desc:'7 korku kitabı oku.',  check:b=>genre(b,'korku',7)},
      {id:'hor3',tier:'gold',   icon:'💀', name:'Korku Ustası',   desc:'15 korku kitabı oku.', check:b=>genre(b,'korku',15)},
      {id:'hor4',tier:'diamond',icon:'🕷️', name:'Gece Bekçisi',   desc:'30 korku kitabı oku.', check:b=>genre(b,'korku',30)},
    ]},
    {id:'kc_his',    label:'🏺 Tarih',          badges:[
      {id:'his1',tier:'bronze', icon:'🏺', name:'Zaman Yolcusu',   desc:'3 tarih kitabı oku.',  check:b=>genre(b,'tarih',3)},
      {id:'his2',tier:'silver', icon:'🏰', name:'Tarih Meraklısı', desc:'7 tarih kitabı oku.',  check:b=>genre(b,'tarih',7)},
      {id:'his3',tier:'gold',   icon:'📜', name:'Geçmişin Tanığı', desc:'15 tarih kitabı oku.', check:b=>genre(b,'tarih',15)},
      {id:'his4',tier:'diamond',icon:'🗿', name:'Tarih Bilgesi',   desc:'30 tarih kitabı oku.', check:b=>genre(b,'tarih',30)},
    ]},
    {id:'kc_phi',    label:'❓ Felsefe',         badges:[
      {id:'phi1',tier:'bronze', icon:'❓', name:'Soru İşareti',    desc:'3 felsefe kitabı oku.',  check:b=>genre(b,'felsefe',3)},
      {id:'phi2',tier:'silver', icon:'🤔', name:'Düşünür',         desc:'7 felsefe kitabı oku.',  check:b=>genre(b,'felsefe',7)},
      {id:'phi3',tier:'gold',   icon:'🦉', name:'Felsefe Yolcusu', desc:'15 felsefe kitabı oku.', check:b=>genre(b,'felsefe',15)},
      {id:'phi4',tier:'diamond',icon:'⚡', name:'Bilge',            desc:'30 felsefe kitabı oku.', check:b=>genre(b,'felsefe',30)},
    ]},
    {id:'kc_psy',    label:'🧠 Psikoloji',       badges:[
      {id:'psy1',tier:'bronze', icon:'🧠', name:'Zihin Meraklısı',      desc:'3 psikoloji kitabı oku.',  check:b=>genre(b,'psikoloji',3)},
      {id:'psy2',tier:'silver', icon:'💭', name:'İç Dünya Kâşifi',      desc:'7 psikoloji kitabı oku.',  check:b=>genre(b,'psikoloji',7)},
      {id:'psy3',tier:'gold',   icon:'🔬', name:'Bilinç Araştırmacısı', desc:'15 psikoloji kitabı oku.', check:b=>genre(b,'psikoloji',15)},
      {id:'psy4',tier:'diamond',icon:'🌀', name:'Zihin Ustası',          desc:'30 psikoloji kitabı oku.', check:b=>genre(b,'psikoloji',30)},
    ]},
    {id:'kc_ess',    label:'✒️ Deneme',          badges:[
      {id:'ess1',tier:'bronze', icon:'✒️', name:'Kalem Dostu',     desc:'3 deneme kitabı oku.',  check:b=>genre(b,'deneme',3)},
      {id:'ess2',tier:'silver', icon:'📝', name:'Fikir Toplayıcı', desc:'7 deneme kitabı oku.',  check:b=>genre(b,'deneme',7)},
      {id:'ess3',tier:'gold',   icon:'🖋️', name:'Deneme Okuru',    desc:'15 deneme kitabı oku.', check:b=>genre(b,'deneme',15)},
      {id:'ess4',tier:'diamond',icon:'📰', name:'Edebi Gezgin',    desc:'30 deneme kitabı oku.', check:b=>genre(b,'deneme',30)},
    ]},
    {id:'kc_myt',    label:'⚡ Mitoloji',         badges:[
      {id:'myt1',tier:'bronze', icon:'⚡', name:'Efsane Takipçisi',   desc:'3 mitoloji kitabı oku.',  check:b=>genre(b,'mitoloji',3)},
      {id:'myt2',tier:'silver', icon:'🏛️', name:'Tanrı Kâşifi',       desc:'7 mitoloji kitabı oku.',  check:b=>genre(b,'mitoloji',7)},
      {id:'myt3',tier:'gold',   icon:'🐍', name:'Mit Koleksiyoncusu',  desc:'15 mitoloji kitabı oku.', check:b=>genre(b,'mitoloji',15)},
      {id:'myt4',tier:'diamond',icon:'🔱', name:'Olympos Bilgesi',     desc:'30 mitoloji kitabı oku.', check:b=>genre(b,'mitoloji',30)},
    ]},
    {id:'kc_sci',    label:'🔭 Popüler Bilim',   badges:[
      {id:'sci1',tier:'bronze', icon:'🔭', name:'Meraklı Zihin', desc:'3 popüler bilim kitabı oku.',  check:b=>genre(b,'bilim',3)},
      {id:'sci2',tier:'silver', icon:'⚗️', name:'Bilim Dostu',   desc:'7 popüler bilim kitabı oku.',  check:b=>genre(b,'bilim',7)},
      {id:'sci3',tier:'gold',   icon:'🌍', name:'Evren Kâşifi',  desc:'15 popüler bilim kitabı oku.', check:b=>genre(b,'bilim',15)},
      {id:'sci4',tier:'diamond',icon:'🧬', name:'Bilim İnsanı',  desc:'30 popüler bilim kitabı oku.', check:b=>genre(b,'bilim',30)},
    ]},
    {id:'kc_rom',    label:'💕 Romantik',          badges:[
      {id:'rom1',tier:'bronze', icon:'💘', name:'Romantik Ruh',         desc:'3 romantik kitap oku.',  imgSrc:'badges/badge_rom1.png', check:b=>genre(b,'romantik',3)},
      {id:'rom2',tier:'silver', icon:'💝', name:'Aşk Hikayeleri Dostu', desc:'7 romantik kitap oku.',  imgSrc:'badges/badge_rom2.png', check:b=>genre(b,'romantik',7)},
      {id:'rom3',tier:'gold',   icon:'💖', name:'Kalp Koleksiyoncusu',  desc:'15 romantik kitap oku.', imgSrc:'badges/badge_rom3.png', check:b=>genre(b,'romantik',15)},
      {id:'rom4',tier:'diamond',icon:'💜', name:'Romantizm Ustası',     desc:'30 romantik kitap oku.', imgSrc:'badges/badge_rom4.png', check:b=>genre(b,'romantik',30)},
    ]},
    {id:'kc_bio',    label:'🧬 Biyografi',        badges:[
      {id:'bio1',tier:'bronze', icon:'🧬', name:'Hayat Hikayesi Okuru',  desc:'3 biyografi/otobiyografi oku.',  check:b=>genre(b,'biyografi',3)},
      {id:'bio2',tier:'silver', icon:'📓', name:'Yaşam Kâşifi',          desc:'7 biyografi/otobiyografi oku.',  check:b=>genre(b,'biyografi',7)},
      {id:'bio3',tier:'gold',   icon:'🏆', name:'Biyografi Ustası',       desc:'15 biyografi/otobiyografi oku.', check:b=>genre(b,'biyografi',15)},
      {id:'bio4',tier:'diamond',icon:'⭐', name:'Hayat Bilgesi',          desc:'30 biyografi/otobiyografi oku.', check:b=>genre(b,'biyografi',30)},
    ]},
    {id:'kc_gezi',   label:'🌍 Gezi & Seyahat',  badges:[
      {id:'gez1',tier:'bronze', icon:'🌍', name:'Gezgin Ruhu',      desc:'3 gezi kitabı oku.',  check:b=>genre(b,'gezi',3)},
      {id:'gez2',tier:'silver', icon:'✈️', name:'Seyyah',           desc:'7 gezi kitabı oku.',  check:b=>genre(b,'gezi',7)},
      {id:'gez3',tier:'gold',   icon:'🗺️', name:'Dünya Gezgini',    desc:'15 gezi kitabı oku.', check:b=>genre(b,'gezi',15)},
      {id:'gez4',tier:'diamond',icon:'🧭', name:'Efsanevi Seyyah',  desc:'30 gezi kitabı oku.', check:b=>genre(b,'gezi',30)},
    ]},
    {id:'kc_kisisel',label:'🎯 Kişisel Gelişim', badges:[
      {id:'kis1',tier:'bronze', icon:'🎯', name:'Kendini Geliştiren',  desc:'3 kişisel gelişim kitabı oku.',  check:b=>genre(b,'kisisel_gelisim',3)},
      {id:'kis2',tier:'silver', icon:'💪', name:'Motivasyon Kaynağı',  desc:'7 kişisel gelişim kitabı oku.',  check:b=>genre(b,'kisisel_gelisim',7)},
      {id:'kis3',tier:'gold',   icon:'🚀', name:'Potansiyel Avcısı',   desc:'15 kişisel gelişim kitabı oku.', check:b=>genre(b,'kisisel_gelisim',15)},
      {id:'kis4',tier:'diamond',icon:'🌟', name:'Yaşam Koçu',          desc:'30 kişisel gelişim kitabı oku.', check:b=>genre(b,'kisisel_gelisim',30)},
    ]},
    {id:'kc_siir',   label:'✒️ Şiir',             badges:[
      {id:'siir1',tier:'bronze', icon:'✒️', name:'Mısra Dostu',       desc:'2 şiir kitabı oku.',  check:b=>genre(b,'siir',2)},
      {id:'siir2',tier:'silver', icon:'🌸', name:'Şair Ruhu',          desc:'5 şiir kitabı oku.',  check:b=>genre(b,'siir',5)},
      {id:'siir3',tier:'gold',   icon:'📜', name:'Şiir Koleksiyoncusu',desc:'10 şiir kitabı oku.', check:b=>genre(b,'siir',10)},
      {id:'siir4',tier:'diamond',icon:'🌙', name:'Şiir Ustası',        desc:'20 şiir kitabı oku.', check:b=>genre(b,'siir',20)},
    ]},
    {id:'kc_oyku',   label:'📖 Öykü',             badges:[
      {id:'oyk1',tier:'bronze', icon:'📖', name:'Hikaye Dostu',       desc:'Kitaplığındaki öykü kitapları (aşağıda listelenir) + Hikayelerim sekmesindeki okunanlar birlikte sayılır.',  check:(b,ctx)=>cap(b.filter(x=>(x.genres||[]).some(g=>normalizeGenre(g)==='oyku')).length+((ctx&&ctx.stories)||(db.stories&&db.stories[me])||[]).filter(s=>s.status==="read"&&!s.retroactive).length,5)},
      {id:'oyk2',tier:'silver', icon:'📚', name:'Öykü Avcısı',        desc:'Kitaplığındaki öykü kitapları (aşağıda listelenir) + Hikayelerim sekmesindeki okunanlar birlikte sayılır.',  check:(b,ctx)=>cap(b.filter(x=>(x.genres||[]).some(g=>normalizeGenre(g)==='oyku')).length+((ctx&&ctx.stories)||(db.stories&&db.stories[me])||[]).filter(s=>s.status==="read"&&!s.retroactive).length,15)},
      {id:'oyk3',tier:'gold',   icon:'🎭', name:'Öykü Koleksiyoncusu',desc:'Kitaplığındaki öykü kitapları (aşağıda listelenir) + Hikayelerim sekmesindeki okunanlar birlikte sayılır.',  check:(b,ctx)=>cap(b.filter(x=>(x.genres||[]).some(g=>normalizeGenre(g)==='oyku')).length+((ctx&&ctx.stories)||(db.stories&&db.stories[me])||[]).filter(s=>s.status==="read"&&!s.retroactive).length,30)},
      {id:'oyk4',tier:'diamond',icon:'🌟', name:'Öykü Efsanesi',      desc:'Kitaplığındaki öykü kitapları (aşağıda listelenir) + Hikayelerim sekmesindeki okunanlar birlikte sayılır.',  check:(b,ctx)=>cap(b.filter(x=>(x.genres||[]).some(g=>normalizeGenre(g)==='oyku')).length+((ctx&&ctx.stories)||(db.stories&&db.stories[me])||[]).filter(s=>s.status==="read"&&!s.retroactive).length,50)},
    ]},
    {id:'kc_dis',    label:'🔥 Distopya',          badges:[
      {id:'dis1',tier:'bronze', icon:'🔥', name:'Distopya Kaçkını',   desc:'3 distopya/cyberpunk kitabı oku.',  check:b=>genre(b,'distopya',3)},
      {id:'dis2',tier:'silver', icon:'⚙️', name:'Sistem Eleştirmeni', desc:'7 distopya/cyberpunk kitabı oku.',  check:b=>genre(b,'distopya',7)},
      {id:'dis3',tier:'gold',   icon:'🤖', name:'İsyankâr',           desc:'15 distopya/cyberpunk kitabı oku.', check:b=>genre(b,'distopya',15)},
      {id:'dis4',tier:'diamond',icon:'💀', name:'Karanlık Gelecek Kâşifi',desc:'30 distopya/cyberpunk kitabı oku.',check:b=>genre(b,'distopya',30)},
    ]},
    {id:'kc_genc',   label:'🌱 Gençlik & Çocuk',  badges:[
      {id:'gen1',tier:'bronze', icon:'🌱', name:'Genç Okuyucu',       desc:'3 gençlik/çocuk kitabı oku.',  check:b=>genre(b,'genclik',3)},
      {id:'gen2',tier:'silver', icon:'🦋', name:'Hayal Gücü Ustası',  desc:'7 gençlik/çocuk kitabı oku.',  check:b=>genre(b,'genclik',7)},
      {id:'gen3',tier:'gold',   icon:'🌈', name:'Masal Kâşifi',        desc:'15 gençlik/çocuk kitabı oku.', check:b=>genre(b,'genclik',15)},
      {id:'gen4',tier:'diamond',icon:'⭐', name:'Çocuk Ruhu',          desc:'30 gençlik/çocuk kitabı oku.', check:b=>genre(b,'genclik',30)},
    ]},
  ], badges:[]},
  // ── 3. COĞRAFYA ───────────────────────────────────────────────
  {label:'🌍 Coğrafya', chains:[
    {id:'dunya_gezgini', label:'🗺️ Dünya Gezgini', badges:[
      {id:'geo1',tier:'bronze', icon:'🗺️', name:'Pasaport Sahibi',  desc:'3 farklı ülkeden kitap oku.',   check:b=>cap(uniqueCountries(b),3)},
      {id:'geo2',tier:'bronze', icon:'✈️', name:'Dünya Okuru',       desc:'5 farklı ülkeden kitap oku.',   check:b=>cap(uniqueCountries(b),5)},
      {id:'geo3',tier:'silver', icon:'🌐', name:'Kıta Gezgini',      desc:'10 farklı ülkeden kitap oku.',  check:b=>cap(uniqueCountries(b),10)},
      {id:'geo4',tier:'gold',   icon:'🏆', name:'Küresel Kütüphane', desc:'20 farklı ülkeden kitap oku.',  check:b=>cap(uniqueCountries(b),20)},
      {id:'geo5',tier:'diamond',icon:'🌟', name:'Dünyayı Dolaşan',   desc:'6 kıtanın tümünden kitap oku.', check:b=>cap(allContinents(b),1)},
    ]},
    {id:'bolge_rozetleri', label:'📍 Bölge Rozetleri', badges:[
      {id:'reg_med',tier:'gold',icon:'🌊', name:'Akdeniz Kâşifi',    desc:'Akdeniz ülkelerinden en az 3 farklı ülkeden kitap oku.', check:b=>cap(new Set([...b.filter(x=>x.country).map(x=>countryToISO(x.country))].filter(iso=>iso&&REGIONS.mediterranean.has(iso))).size,3)},
      {id:'reg_nor',tier:'gold',icon:'🧊', name:'Kuzey Rüzgarı',     desc:'Kuzey Avrupa ülkelerinden (NO, SE, DK, FI, IS) en az 3 farklı ülkeden kitap oku.', check:b=>cap(new Set([...b.filter(x=>x.country).map(x=>countryToISO(x.country))].filter(iso=>iso&&REGIONS.nordic.has(iso))).size,3)},
      {id:'reg_lat',tier:'gold',icon:'🌿', name:'Latin Amerika Sesi', desc:'Latin Amerika ülkelerinden en az 3 farklı ülkeden kitap oku.', check:b=>cap(new Set([...b.filter(x=>x.country).map(x=>countryToISO(x.country))].filter(iso=>iso&&REGIONS.latin.has(iso))).size,3)},
      {id:'reg_eas',tier:'gold',icon:'🌸', name:"Doğu'nun Sesi",     desc:'Doğu Asya ülkelerinden en az 3 farklı ülkeden kitap oku.', check:b=>cap(new Set([...b.filter(x=>x.country).map(x=>countryToISO(x.country))].filter(iso=>iso&&REGIONS.eastasia.has(iso))).size,3)},
      {id:'reg_sas',tier:'gold',icon:'🐘', name:'Güney Asya Kâşifi', desc:'Güney Asya ülkelerinden en az 3 farklı ülkeden kitap oku.', check:b=>cap(new Set([...b.filter(x=>x.country).map(x=>countryToISO(x.country))].filter(iso=>iso&&REGIONS.southasia.has(iso))).size,3)},
      {id:'reg_afr',tier:'gold',icon:'🌍', name:"Afrika'nın Sesi",   desc:'Afrika ülkelerinden en az 3 farklı ülkeden kitap oku.', check:b=>cap(new Set([...b.filter(x=>x.country).map(x=>countryToISO(x.country))].filter(iso=>iso&&REGIONS.africa.has(iso))).size,3)},
      {id:'reg_mid',tier:'gold',icon:'🕌', name:'Orta Doğu Kâşifi',  desc:'Orta Doğu ülkelerinden en az 3 farklı ülkeden kitap oku.', check:b=>cap(new Set([...b.filter(x=>x.country).map(x=>countryToISO(x.country))].filter(iso=>iso&&REGIONS.middleeast.has(iso))).size,3)},
    ]},
  ], badges:[]},
  // ── 4. OKUMA ALIŞKANLIĞI ──────────────────────────────────────
  {label:'🌙 Okuma Alışkanlığı', chains:[
    {id:'gece_okuru', label:'🌙 Gece Okuru', badges:[
      {id:'night1',tier:'bronze',icon:'🌙', name:'Gece Kuşu',            desc:'3 kitabı "çoğunlukla gece okudum" olarak işaretle.',  check:b=>cap(b.filter(x=>x.nightReading).length,3)},
      {id:'night2',tier:'silver',icon:'🦉', name:'Gece Bekçisi',         desc:'7 kitabı "çoğunlukla gece okudum" olarak işaretle.',  check:b=>cap(b.filter(x=>x.nightReading).length,7)},
      {id:'night3',tier:'gold',  icon:'⭐', name:'Karanlığın Okuyucusu', desc:'15 kitabı "çoğunlukla gece okudum" olarak işaretle.', check:b=>cap(b.filter(x=>x.nightReading).length,15)},
    ]},
    {id:'zorluk', label:'🧩 Zorluk', badges:[
      {id:'hard1',tier:'bronze',icon:'🧩', name:'Cesur Okuyucu',     desc:'1 zorlu kitabı bitir ("Zorlandım" olarak işaretle).', check:b=>cap(b.filter(x=>x.challenging).length,1)},
      {id:'hard2',tier:'silver',icon:'⚔️', name:'Zorlukla Dans Eden', desc:'3 zorlu kitabı bitir.',                              check:b=>cap(b.filter(x=>x.challenging).length,3)},
      {id:'hard3',tier:'gold',  icon:'🏋️', name:'Demir İrade',        desc:'5 zorlu kitabı bitir.',                              check:b=>cap(b.filter(x=>x.challenging).length,5)},
    ]},
    {id:'streak', label:'📅 Okuma Serisi', badges:[
      {id:'streak3', tier:'bronze',icon:'📅', name:'Düzenli Okuyucu',   desc:'Bu yıl içinde 3 ay üst üste en az 1 kitap bitir.',  check:b=>cap(streakBadgesForYear(b).length>=1?3:0,3)},
      {id:'streak6', tier:'silver',icon:'🗓️', name:'Okuma Alışkanlığı', desc:'Bu yıl içinde 6 ay üst üste en az 1 kitap bitir.',  check:b=>cap(streakBadgesForYear(b).length>=2?6:0,6)},
      {id:'streak12',tier:'gold',  icon:'🏅', name:'Yılın Okuyucusu',   desc:'Bu yıl içinde 12 ay üst üste en az 1 kitap bitir.', check:b=>cap(streakBadgesForYear(b).length>=3?12:0,12)},
    ]},
    {id:'yeniden_okuma', label:'🔄 Yeniden Okuma', badges:[
      {id:'reread1',tier:'bronze',icon:'🔄', name:'Nostaljik',        desc:'1 kitabı yeniden oku ("Yeniden okuma" olarak işaretle).', check:b=>cap(b.filter(x=>x.reread).length,1)},
      {id:'reread2',tier:'silver',icon:'💫', name:'Favori Avcısı',    desc:'3 kitabı yeniden oku.',                                  check:b=>cap(b.filter(x=>x.reread).length,3)},
      {id:'reread3',tier:'gold',  icon:'♾️', name:'Zamansız Okuyucu', desc:'5 kitabı yeniden oku.',                                  check:b=>cap(b.filter(x=>x.reread).length,5)},
    ]},
    {id:'klasik', label:'📜 Klasik Edebiyat (1950 öncesi)', badges:[
      {id:'clas1',tier:'bronze',icon:'📜', name:'Geçmişe Yolculuk',    desc:'1950 öncesi yayımlanmış 2 klasik eser oku.',  check:b=>cap(b.filter(x=>x.pubYear&&x.pubYear<1950).length,2)},
      {id:'clas2',tier:'silver',icon:'🏛️', name:'Klasik Dost',         desc:'1950 öncesi yayımlanmış 5 klasik eser oku.',  check:b=>cap(b.filter(x=>x.pubYear&&x.pubYear<1950).length,5)},
      {id:'clas3',tier:'gold',  icon:'🗿', name:'Edebiyat Mirasyedisi',desc:'1950 öncesi yayımlanmış 10 klasik eser oku.', check:b=>cap(b.filter(x=>x.pubYear&&x.pubYear<1950).length,10)},
    ]},
  ], badges:[]},
  // ── 5. SERİ & ÖZEL ────────────────────────────────────────────
  {label:'📚 Seri & Özel', chains:[
    {id:'seri_ustaligi', label:'📖 Seri Okuma', badges:[
      {id:'ser1',tier:'bronze', icon:'📖', name:'Seri Başlangıcı',  desc:'1 seriyi baştan sona bitir.',        check:b=>cap(completedSeriesCount(b),1)},
      {id:'ser2',tier:'silver', icon:'📚', name:'Seri Tutkunu',     desc:'3 farklı seriyi baştan sona bitir.', check:b=>cap(completedSeriesCount(b),3)},
      {id:'ser3',tier:'gold',   icon:'🏆', name:'Seri Ustası',      desc:'5 farklı seriyi baştan sona bitir.', check:b=>cap(completedSeriesCount(b),5)},
      {id:'ser4',tier:'diamond',icon:'💎', name:'Seri Takıntılısı', desc:'Bir seriden 10+ kitap oku.',         check:b=>cap(maxSeriesBooks(b),10)},
    ]},
    {id:'ayni_evren', label:'🔮 Aynı Evren', badges:[
      {id:'univ1',tier:'bronze',icon:'🔮', name:'Evren Kâşifi',       desc:'Seriler sekmesinden bir grup oluştur ve 2+ farklı seriden kitap oku.', check:b=>cap(sameUniverseFromGroups(b),1)},
      {id:'univ2',tier:'silver',icon:'🌌', name:'Paralel Gezgin',     desc:'Farklı gruplarda 3 evren keşfet.',  check:b=>cap(sameUniverseFromGroups(b),3)},
      {id:'univ3',tier:'gold',  icon:'✨', name:'Çoklu Evren Ustası', desc:'Farklı gruplarda 5 evren keşfet.', check:b=>cap(sameUniverseFromGroups(b),5)},
    ]},
    {id:'bagimsiz', label:'🌱 Bağımsız Yayınevi', badges:[
      {id:'ind1',tier:'bronze',icon:'🌱', name:'Bağımsız Ruh',              desc:'1 bağımsız yayınevi kitabı oku ("Bağımsız yayınevi" işaretle).', check:b=>cap(b.filter(x=>x.indie).length,1)},
      {id:'ind2',tier:'silver',icon:'🎵', name:'Alternatif Ses',            desc:'3 bağımsız yayınevi kitabı oku.', check:b=>cap(b.filter(x=>x.indie).length,3)},
      {id:'ind3',tier:'gold',  icon:'🦋', name:'Bağımsız Yayın Destekçisi',desc:'10 bağımsız yayınevi kitabı oku.', check:b=>cap(b.filter(x=>x.indie).length,10)},
    ]},
    {id:'kadin_yazar', label:'👩 Kadın Yazar', badges:[
      {id:'fem1',tier:'bronze',icon:'👩', name:'Kadın Sesi',            desc:'1 kadın yazar kitabı oku.',  check:b=>cap(b.filter(x=>x.femaleAuthor).length,1)},
      {id:'fem2',tier:'silver',icon:'💜', name:'Kadın Kalemleri',       desc:'5 kadın yazar kitabı oku.',  check:b=>cap(b.filter(x=>x.femaleAuthor).length,5)},
      {id:'fem3',tier:'gold',  icon:'🌸', name:'Kadın Edebiyatı Dostu',desc:'10 kadın yazar kitabı oku.', check:b=>cap(b.filter(x=>x.femaleAuthor).length,10)},
    ]},
    {id:'genc_yazar', label:'🌱 Genç Yazar', badges:[
      {id:'yng1',tier:'bronze',icon:'🌱', name:'Genç Yeteneğe Destek', desc:'1 genç yazar kitabı oku (yazıldığında 30 yaş altı).', check:b=>cap(b.filter(x=>x.youngAuthor).length,1)},
      {id:'yng2',tier:'silver',icon:'⚡', name:'Genç Kalemlerin Dostu',desc:'3 genç yazar kitabı oku.', check:b=>cap(b.filter(x=>x.youngAuthor).length,3)},
      {id:'yng3',tier:'gold',  icon:'🚀', name:'Yeni Nesil Okuyucu',  desc:'5 genç yazar kitabı oku.', check:b=>cap(b.filter(x=>x.youngAuthor).length,5)},
    ]},
    {id:'sesli_kitap', label:'🎧 Sesli Kitap', badges:[
      {id:'aud1',tier:'bronze',icon:'🎧', name:'Dinleyici',         desc:'1 sesli kitap dinle.',  check:b=>cap(b.filter(x=>(x.formats||[]).includes('sesli')).length,1)},
      {id:'aud2',tier:'silver',icon:'🎵', name:'Sesli Kitap Dostu',desc:'3 sesli kitap dinle.',  check:b=>cap(b.filter(x=>(x.formats||[]).includes('sesli')).length,3)},
      {id:'aud3',tier:'gold',  icon:'🎼', name:'Kulak Okuyucu',    desc:'10 sesli kitap dinle.', check:b=>cap(b.filter(x=>(x.formats||[]).includes('sesli')).length,10)},
    ]},
    {id:'seri_rozetleri', label:'📖 Özel Seri Rozetleri', badges:[
      {id:'badge_dune',     tier:'diamond', icon:'🏜️', name:'Altın Yolun Tanığı',          desc:'Frank Herbert\'in Dune serisini tamamla (6 kitap).', imgSrc:'badges/badge_dune.png',
        check:b=>flag(b.filter(x=>(x.readingStatus==='new'||x.retroactive)&&(x.author||'').toLowerCase().includes('herbert')&&(x.series||'').toLowerCase().includes('dune')).length>=6)},
      {id:'badge_vakif',    tier:'diamond', icon:'🤖', name:'Psikotarihin Ustası',          desc:'Asimov\'un Vakıf serisini tamamla (7 kitap).', imgSrc:'badges/badge_vakif.png',
        check:b=>flag(b.filter(x=>(x.readingStatus==='new'||x.retroactive)&&(x.author||'').toLowerCase().includes('asimov')&&((x.series||'').toLowerCase().includes('vakıf')||(x.series||'').toLowerCase().includes('foundation'))).length>=7)},
      {id:'badge_hp',       tier:'diamond', icon:'🧙', name:'Ölüm Yadigarlarının Efendisi', desc:'Harry Potter serisini tamamla (7 kitap).', imgSrc:'badges/badge_hp.png',
        check:b=>flag(b.filter(x=>(x.readingStatus==='new'||x.retroactive)&&(x.author||'').toLowerCase().includes('rowling')&&(x.series||'').toLowerCase().includes('harry potter')).length>=7)},
      {id:'badge_ye',       tier:'diamond', icon:'💍', name:'Tek Yüzüğün Taşıyıcısı',      desc:'Yüzüklerin Efendisi üçlemesini tamamla (3 kitap).', imgSrc:'badges/badge_ye.png',
        check:b=>flag(b.filter(x=>(x.readingStatus==='new'||x.retroactive)&&(x.author||'').toLowerCase().includes('tolkien')&&((x.series||'').toLowerCase().includes('yüzük')||(x.series||'').toLowerCase().includes('lord of the rings')||(x.series||'').toLowerCase().includes('lotr'))).length>=3)},
      {id:'badge_earthsea', tier:'diamond', icon:'🐉', name:'Gerçek Adların Ustası',        desc:'Le Guin\'in Yerdeniz serisini tamamla (6 kitap).', imgSrc:'badges/badge_earthsea.png',
        check:b=>flag(b.filter(x=>(x.readingStatus==='new'||x.retroactive)&&(x.author||'').toLowerCase().includes('le guin')&&((x.series||'').toLowerCase().includes('yerdeniz')||(x.series||'').toLowerCase().includes('earthsea'))).length>=6)},
      {id:'badge_hainish',  tier:'diamond', icon:'🌌', name:'Ekumen Yolcusu',               desc:'Le Guin\'in Hainli Döngüsü serisini tamamla (8 kitap).', imgSrc:'badges/badge_hainish.png',
        check:b=>flag(b.filter(x=>(x.readingStatus==='new'||x.retroactive)&&(x.author||'').toLowerCase().includes('le guin')&&((x.series||'').toLowerCase().includes('hainl')||(x.series||'').toLowerCase().includes('hainish'))).length>=8)},
    ]},
  ], badges:[]},
  // ── 6. SOSYAL ETKİLEŞİM ───────────────────────────────────────
  {label:'👥 Sosyal Etkileşim', chains:[
    {id:'paylasim', label:'💬 Paylaşım', badges:[
      {id:'soc1',tier:'bronze',icon:'✏️', name:'Kalem Dostu',      desc:'3 alıntı veya değerlendirme paylaş (Defterim sekmesinden).', check:b=>cap(countReviews(b),3)},
      {id:'soc2',tier:'silver',icon:'💬', name:'Aktif Paylaşımcı', desc:'10 alıntı veya değerlendirme paylaş.',                      check:b=>cap(countReviews(b),10)},
      {id:'soc3',tier:'gold',  icon:'🌟', name:'Kulüp Ruhu',       desc:'30 alıntı veya değerlendirme paylaş.',                      check:b=>cap(countReviews(b),30)},
    ]},
  ], badges:[]},
  // ── 7. KADİM METİNLER ─────────────────────────────────────────
  {label:'📿 Kadim Metinler', chains:[
    {id:'semavi_kitaplar', label:'✨ Semavi Kitaplar', badges:[
      {id:'semavi',tier:'gold',  icon:'✨', name:'Dört Kitap Bilgesi',     desc:'Tevrat, Zebur, İncil ve Kuran-ı Kerimi oku ("kutsal" türünde etiketle). Geçmişte okuduklarım da sayılır.', check:b=>cap(b.filter(x=>(x.genres||[]).includes('kutsal')).length,4)},
    ]},
    {id:'dunya_dinleri', label:'🌿 Dünya Dinleri Metinleri', badges:[
      {id:'kadim1',tier:'bronze',icon:'🌿', name:'Kadim Yolcu',           desc:'Dünya dinlerine ait 2 kutsal metin oku ("kutsal meta" türünde etiketle).', check:b=>cap(b.filter(x=>(x.genres||[]).includes('kutsal meta')).length,2)},
      {id:'kadim2',tier:'silver',icon:'🌸', name:'Bilgelik Arayıcısı',    desc:'Dünya dinlerine ait 4 kutsal metin oku.', check:b=>cap(b.filter(x=>(x.genres||[]).includes('kutsal meta')).length,4)},
      {id:'kadim3',tier:'gold',  icon:'🌟', name:'Kadim Metinler Kâşifi', desc:'Dünya dinlerine ait 7 kutsal metin oku.', check:b=>cap(b.filter(x=>(x.genres||[]).includes('kutsal meta')).length,7)},
    ]},
  ], badges:[]},
  // ── 8. GİZLİ ROZETLER ─────────────────────────────────────────
  {label:'🔮 Gizli Rozetler', chains:[
    {id:'gizli', label:'🔮 Gizli', badges:[
      {id:'secret_ashbless',tier:'diamond',icon:'🗝️', name:'Project Ashbless', imgSrc:'badges/badge_ashbless.png', desc:'Uygulamanın tüm bölümlerini keşfet.', check:b=>{
        const hasBook=b.length>0;
        const hasRead=b.some(x=>x.readingStatus==='new'||x.readingStatus==='past');
        const hasSeries=Object.keys(mySeriesData().series||{}).length>0;
        const hasStory=(db.stories&&db.stories[me]&&db.stories[me].length>0);
        const hasShelf=(()=>{const s=db.shelf||{};const ud=s[me]||s;return Object.keys(ud).some(k=>k!=='mags'&&typeof ud[k]==='object'&&ud[k].books&&ud[k].books.length>0);})();
        const hasCountry=b.some(x=>x.country&&(x.readingStatus==='new'||x.readingStatus==='past'));
        return flag([hasBook,hasRead,hasSeries,hasStory,hasShelf,hasCountry].filter(Boolean).length>=5);
      }},
      {id:'secret_bedside',tier:'diamond',icon:'🌙', name:'Başucu Seçkisi', imgSrc:'images/basucuseckisi.png', desc:'25 kitap oku, 5 farklı ülkeden yazar oku, 5 tür rozeti kazan ve 1 seriyi tamamla.',
        check:b=>{
          const books25=b.length>=25;
          const countries5=uniqueCountries(b)>=5;
          const series1=completedSeriesCount(b)>=1;
          const books2=validBooks();
          let genreRozetCount=0;
          const turZincirleri=['kc_roman','kc_sf','kc_fantastik','kc_polisiye','kc_korku','kc_tarih','kc_felsefe','kc_psikoloji','kc_gezi','kc_biyografi','kc_deneme','kc_dis','kc_romantik','kc_mitoloji','kc_oyku'];
          BADGE_CATS.forEach(cat=>{(cat.chains||[]).forEach(ch=>{if(turZincirleri.includes(ch.id)){const allEarned=ch.badges.every(bg=>bstat(bg,books2).earned);if(allEarned)genreRozetCount++;}});});
          const genres5=genreRozetCount>=5;
          return flag(books25&&countries5&&series1&&genres5);
        }},
      {id:'secret_forbidden',tier:'diamond',icon:'⛓️', name:'Yasaklı Bilgi', imgSrc:'images/yasaklibilgi.png', desc:'Korku, Felsefe ve Mitoloji türlerinden her birinde en az 3 kitap oku.',
        check:b=>flag(genre(b,'korku',3).cur>=3&&genre(b,'felsefe',3).cur>=3&&genre(b,'mitoloji',3).cur>=3)},
      {id:'secret_anubis',   tier:'diamond', icon:'🗝️', name:'Ashbless\'in İzinde', desc:'Zamanın çizgisel olmadığını fark ettin. Ashbless\'in izini sürerken, aslında kendi izine rastladın.\nBazı hikâyeler okunmaz — yaşanır. Ve bazı isimler yazılmaz — hatırlanır.\n\nGecenin On İki Saati\n\n"Ve bir nehir uzanır\nAlacakaranlıkla şafak arasında.\nVe saatler mesafedir, değişken gecenin\nEngin gelgitinde ölçülen —\nKorku duymayacak kadar felakete mahkûm,\nİhtiyaçları kalmamış bu deniz yolcuları hızla çekiliyor\nGözkamaştırıcı bir ışık gibi parlayan karanlığın içine\nGecenin On İki Saati\'nde."\n— William Ashbless (buluntu metin)', imgSrc:'badges/badge_anubis.png',
        check:b=>flag(b.some(x=>(x.readingStatus==='new'||x.readingStatus==='past'||x.retroactive)&&(x.author||'').toLowerCase().includes('powers')&&(x.title||'').toLowerCase().includes('anubis')))},
      {id:'secret_month', tier:'diamond',icon:'📅', name:'Aylık Seri',      desc:'Tek bir ayda 3 veya daha fazla kitap bitir.', check:b=>cap(maxMonth(b),3)},
      {id:'secret_whale', tier:'diamond',icon:'🐋', name:'Balina Avcısı', imgSrc:'badges/badge_secret_whale.png', desc:'1000 sayfadan uzun bir kitap oku.', check:b=>flag(b.some(x=>x.pages&&x.pages>=1000))},
      {id:'secret_speed', tier:'diamond',icon:'⚡', name:'Bir Solukta',     desc:'Bir kitabı tek günde bitir (okumaya başlama ve bitirme tarihi aynı olmalı).', check:b=>flag(b.some(x=>x.startDate&&x.endDate&&x.startDate===x.endDate))},
      {id:'secret_multi', tier:'diamond',icon:'🎪', name:'Çılgın Okuyucu', desc:'Aynı anda 3 kitap oku. Ama dikkat, ben biraz gelip geçiciyim.😶\u200d🌫️', check:(b,ctx)=>flag(((ctx&&ctx.readingCount!==undefined)?ctx.readingCount:(db.books[me]||[]).filter(x=>x.readingStatus==='reading').length)>=3)},
      {id:'secret_100pg', tier:'diamond',icon:'📑', name:'Maraton Günü',    desc:'Bir günde 100 sayfa oku ("Bir günde 100 sayfa" işaretle).', check:b=>flag(b.some(x=>x.hundredPages))},
      {id:'secret_creator',tier:'diamond',icon:'✨', name:'Yaratıcının Tanığı', imgSrc:'images/yaraticinintanigi.png', desc:'Her şey görünenlerden ibaret değildi. Satır aralarını okudun. Sistemin ardındaki sesi duydun. Yaratıcının izine rastladın.\n\nGeliştirici: Claude (Anthropic) + hggunay aka Gweluien (Elf adıyla bilinen) · 8 Mart 2026\'dan bu yana devam ediyor...',
        check:b=>{
          const books=validBooks();
          const hasAshbless=bstat({id:'secret_ashbless',check:BADGE_CATS.flatMap(c=>c.chains||[]).flatMap(ch=>ch.badges||[]).find(bg=>bg.id==='secret_ashbless')?.check||flag.bind(null,false)},books).earned;
          const hasBedside=bstat({id:'secret_bedside',check:BADGE_CATS.flatMap(c=>c.chains||[]).flatMap(ch=>ch.badges||[]).find(bg=>bg.id==='secret_bedside')?.check||flag.bind(null,false)},books).earned;
          const hasForbidden=bstat({id:'secret_forbidden',check:BADGE_CATS.flatMap(c=>c.chains||[]).flatMap(ch=>ch.badges||[]).find(bg=>bg.id==='secret_forbidden')?.check||flag.bind(null,false)},books).earned;
          const otherSecretIds=['secret_anubis','secret_month','secret_whale','secret_speed','secret_multi','secret_100pg'];
          const allBadges=BADGE_CATS.flatMap(c=>c.chains||[]).flatMap(ch=>ch.badges||[]);
          const hasOther=otherSecretIds.some(sid=>{const bg=allBadges.find(x=>x.id===sid);return bg&&bstat(bg,books).earned;});
          return flag(hasAshbless&&hasBedside&&hasForbidden&&hasOther);
        }},
    ]},
    {id:'kombinasyon', label:'🌟 Kombinasyon', badges:[
      {id:'comb_dark',   tier:'diamond',icon:'🌑', name:'Karanlık Okuyucu',       desc:'Korku, Distopya ve Gerilim türlerinden her birinde en az 3 kitap oku.', check:b=>flag(genre(b,'korku',3).cur>=3&&genre(b,'distopya',3).cur>=3&&genre(b,'gerilim',3).cur>=3)},
      {id:'comb_spec',   tier:'diamond',icon:'🌌', name:'Spekülatif Kurgu Ustası', desc:'Fantastik ve Bilim Kurgu türlerinden her birinde en az 3 kitap oku.', check:b=>flag(genre(b,'fantastik',3).cur>=3&&genre(b,'bilimkurgu',3).cur>=3)},
      {id:'comb_world',  tier:'diamond',icon:'🧭', name:'Dünya Kâşifi',            desc:'En az 3 gezi kitabı oku ve 5 farklı ülkeden yazar oku.', check:b=>flag(genre(b,'gezi',3).cur>=3&&uniqueCountries(b)>=5)},
      {id:'comb_intel',  tier:'diamond',icon:'🎓', name:'Entelektüel',             desc:'Felsefe, Psikoloji ve Tarih türlerinden her birinde en az 3 kitap oku.', check:b=>flag(genre(b,'felsefe',3).cur>=3&&genre(b,'psikoloji',3).cur>=3&&genre(b,'tarih',3).cur>=3)},
      {id:'comb_multi',  tier:'diamond',icon:'📖', name:'Çok Yönlü Okuyucu',      desc:'8 farklı türden en az 5 tanesinde 3 veya daha fazla kitap oku.', check:b=>{const cats=[genre(b,'fantastik',3),genre(b,'bilimkurgu',3),genre(b,'polisiye',3),genre(b,'tarih',3),genre(b,'felsefe',3),genre(b,'psikoloji',3),genre(b,'romantik',3),genre(b,'korku',3)];return flag(cats.filter(c=>c.cur>=3).length>=5);}},
      {id:'comb_all',    tier:'diamond',icon:'🌈', name:'Sınır Tanımaz',           desc:'10 farklı türün tamamında en az 3 kitap oku.', check:b=>{const cats=[genre(b,'fantastik',3),genre(b,'bilimkurgu',3),genre(b,'polisiye',3),genre(b,'tarih',3),genre(b,'felsefe',3),genre(b,'psikoloji',3),genre(b,'romantik',3),genre(b,'korku',3),genre(b,'deneme',3),genre(b,'mitoloji',3)];return flag(cats.filter(c=>c.cur>=3).length>=10);}},
      {id:'comb_classic',tier:'diamond',icon:'🏛️', name:'Klasik ile Modern',       desc:'1950 öncesi en az 3 klasik ve 2000 sonrası en az 3 modern kitap oku.', check:b=>flag(b.filter(x=>x.pubYear&&x.pubYear<1950).length>=3&&b.filter(x=>x.pubYear&&x.pubYear>=2000).length>=3)},
      {id:'comb_ser_geo',tier:'diamond',icon:'🗺️', name:'Seyahat Eden Seri Okuru', desc:'En az 1 seriyi tamamla ve 5 farklı ülkeden yazar oku.', check:b=>flag(completedSeriesCount(b)>=1&&uniqueCountries(b)>=5)},
    ]},
  ], badges:[]},
]


function cap(cur,max){return{cur:Math.min(cur,max),max};}
function flag(bool){return{cur:bool?1:0,max:1};}
function genre(books,kw,max){const n=books.filter(b=>(b.genres||[]).some(g=>{const norm=normalizeGenre(g);const badge=badgeGenre(norm);return norm===kw.toLowerCase()||badge===kw.toLowerCase();})).length;return{cur:Math.min(n,max),max};}

function maxMonth(books){const c={};books.forEach(b=>{if(b.month)c[b.month]=(c[b.month]||0)+1;});return Math.max(0,...Object.values(c));}
function maxSeries(books){const c={};books.filter(b=>b.series).forEach(b=>{c[b.series]=(c[b.series]||0)+1;});return Math.max(0,...Object.values(c));}
function maxComicSeries(books){const c={};books.filter(b=>b.comicSeries).forEach(b=>{c[b.comicSeries]=(c[b.comicSeries]||0)+1;});return Math.max(0,...Object.values(c));}
function totalPages(books){return books.reduce((s,b)=>s+(b.pages||0),0);}
function uniqueCountries(books){return new Set(books.filter(b=>b.country&&b.country.trim()).map(b=>b.country.trim().toLowerCase())).size;}
function uniqueISOs(books){return new Set(books.filter(b=>b.country).map(b=>countryToISO(b.country)).filter(Boolean));}

function allContinents(books){const isos=uniqueISOs(books);const conts=new Set([...isos].map(iso=>ISO_CONTINENT[iso]).filter(Boolean));return conts.size>=6?1:0;}
// Ortak hesaplama — bir yıl için ay bazlı okuma serisi.
// 'current': şu ana kadar (bu ay dahil) kesintisiz devam eden seri.
// 'best': o yıl içinde ulaşılan en uzun kesintisiz seri.
// İkisi de bookMonth() ile normalize edilmiş ay bilgisini kullanır.
function _monthStreakStats(books,year){
  const now=new Date();
  const yr=year||now.getFullYear();
  const months=new Set(books.map(b=>bookMonth(b)).filter(Boolean));
  const maxMonth=yr===now.getFullYear()?now.getMonth():11;
  let best=0,cur=0;
  for(let m=0;m<=maxMonth;m++){
    const key=`${yr}-${String(m+1).padStart(2,'0')}`;
    if(months.has(key)){cur++;best=Math.max(best,cur);}
    else cur=0;
  }
  return{current:cur,best};
}
// "🔥 X ay" göstergesi için — şu an hâlâ devam eden kesintisiz seri.
function currentReadingStreak(books,year){
  return _monthStreakStats(books,year).current;
}
function streakBadgesForYear(books,year){
  const{best}=_monthStreakStats(books,year);
  const earned=[];
  if(best>=3) earned.push({icon:'🥉',name:'Düzenli Okuyucu (3 ay)'});
  if(best>=6) earned.push({icon:'🥈',name:'Okuma Alışkanlığı (6 ay)'});
  if(best>=12) earned.push({icon:'🥇',name:'Yılın Okuyucusu (12 ay)'});
  return earned;
}
function countReviews(books){
  // Tüm değerlendirme ve alıntı sayısı
  let total=0;
  books.forEach(b=>{if(b.review&&b.review.trim())total++;total+=(b.quotes||[]).length;});
  return total;
}
function sameUniverseFromGroups(books,user){
  user=user||me;
  books=books||db.books[user]||[];
  // Bir grupta 2+ farklı seriden kitap okunmuşsa sameUniverse sayılır
  if(!db||!db.seriesData||!db.seriesData[user]) return 0;
  const data=db.seriesData[user];
  let count=0;
  Object.values(data.paths||{}).forEach(path=>{
    const seriesInPath=(path.steps||[]).map(s=>s.seriesId).filter(Boolean);
    const readSeries=seriesInPath.filter(sid=>{
      const ser=Object.values(data.series||{}).find(s=>s.id===sid);
      if(!ser) return false;
      return (ser.books||[]).some(bk=>{
        if(!bk.bookId) return false;
        const book=books.find(b=>b.id===bk.bookId);
        return book&&book.readingStatus==='new'&&!book.retroactive;
      });
    });
    if(readSeries.length>=2) count+=readSeries.length-1;
  });
  return count;
}
function uniqueGenres(books){return new Set(books.flatMap(b=>b.genres||[]).map(g=>badgeGenre(normalizeGenre(g)))).size;}
// ⚠️ RETROAKTİF SÖZLEŞMESİ — Ö9 refactoru sırasında SİLİNMEMELİ ⚠️
// completedSeriesCount()/maxSeriesBooks() içindeki `!book.retroactive` filtresi KASITLI.
// Genel seri rozetleri (ser1-4) retroaktif kitapları SAYMAMALI — amaç, kullanıcının
// geçmişte okuduğu 10 seriyi toplu girip bu rozetleri ilk günde tüketmesini önlemek.
// İsme özel rozetler (badge_dune, badge_hp vb.) ise retroaktifi DAHİL etmeli — onlar
// koleksiyon/başarı listesi gibi çalışıyor, "meydan okuma" değil.
// Bu asimetri BURADA, bu iki fonksiyonun içindeki elle yazılmış filtrede duruyor —
// bstat() (aşağıda) SERIES_BADGE_IDS'teki HİÇBİR rozet için retroaktif filtrelemiyor
// (ikisi de aynı kefede). Yani ser1-4'ün retroaktif hariç tutması TAMAMEN bu iki
// fonksiyonun kendi içindeki filtreye bağlı. Ö9'da bu fonksiyonlar "canlı db okumasın,
// bağlam nesnesi alsın" diye yeniden yazılırken, biri "zaten filtrelenmiş books dizisi
// var, kendi filtremi kaldırayım" derse, ser1-4 sessizce retroaktifi dahil etmeye
// başlar ve bu kasıtlı tasarım kararı fark edilmeden bozulur. Refactor sırasında bu
// filtreyi mutlaka koru — context nesnesi ne olursa olsun, bu iki fonksiyon kendi
// retroaktif kontrolünü kendisi yapmaya devam etmeli.
// 2026-07-29 (Ö9): artık db.books[me]'i canlı okumak yerine `books` parametresini
// kullanıyor (verilmezse eski canlı davranışa düşer) — böylece rozet kontrolü
// "önce/sonra" karşılaştırması yapabiliyor. Seri YAPISI (db.seriesData) hâlâ canlı
// okunuyor, çünkü bir kitabı bitirmek seri yapısını değiştirmiyor, sadece kitabın
// durumunu değiştiriyor — diff'lenmesi gereken tek şey `books`.
function completedSeriesCount(books,user){
  user=user||me;
  books=books||db.books[user]||[];
  if(!db||!db.seriesData||!db.seriesData[user]) return 0;
  const data=db.seriesData[user];
  let count=0;
  Object.values(data.series||{}).forEach(ser=>{
    if(!ser.total||!ser.books) return;
    const readCount=(ser.books||[]).filter(bk=>{
      if(!bk.bookId) return false;
      const book=books.find(b=>b.id===bk.bookId);
      return book&&book.readingStatus==='new'&&!book.retroactive;
    }).length;
    if(readCount>=ser.total) count++;
  });
  return count;
}
function maxSeriesBooks(books,user){
  user=user||me;
  books=books||db.books[user]||[];
  if(!db||!db.seriesData||!db.seriesData[user]) return 0;
  const data=db.seriesData[user];
  let max=0;
  Object.values(data.series||{}).forEach(ser=>{
    const readCount=(ser.books||[]).filter(bk=>{
      if(!bk.bookId) return false;
      const book=books.find(b=>b.id===bk.bookId);
      return book&&book.readingStatus==='new'&&!book.retroactive;
    }).length;
    if(readCount>max) max=readCount;
  });
  return max;
}

// Bölge ISO setleri
const REGIONS={
  mediterranean:new Set(['TR','GR','IT','ES','PT','FR','HR','MA','EG','IL','TN','DZ','LB','CY','MT','SI','BA','ME','AL','LY']),
  nordic:new Set(['NO','SE','DK','FI','IS']),
  latin:new Set(['BR','AR','MX','CO','PE','CL','VE','EC','BO','PY','UY','CR','CU','DO','HN','NI','PA','SV','GT']),
  eastasia:new Set(['JP','CN','KR','TW','MN','VN','TH','KH','LA','MM','PH','ID','MY','SG']),
  southasia:new Set(['IN','PK','BD','LK','NP','BT','AF']),
  africa:new Set(['ZA','NG','KE','ET','GH','TZ','UG','SN','CI','CM','ZM','ZW','MW','MZ','AO','MG','RW','BJ','TG']),
  middleeast:new Set(['IR','IQ','SA','SY','LB','JO','AE','KW','QA','BH','OM','YE','PS']),
};

// Seri rozetleri retroactive kitapları da sayar, diğerleri saymaz
// ⚠️ Bu set kendisi retroaktif AYRIMI yapmıyor — hem genel (ser1-4/univ1-3) hem isme
// özel (badge_dune vb.) rozetler burada bstat()'a aynı şekilde davranıyor. Genel
// rozetlerin retroaktifi hariç tutması, completedSeriesCount()/maxSeriesBooks()
// içindeki AYRI, elle yazılmış filtreden geliyor (yukarıdaki uyarıya bakın). Ö9
// refactorunda bu ikisini karıştırmayın.
const SERIES_BADGE_IDS = new Set(['ser1','ser2','ser3','ser4','univ1','univ2','univ3','badge_dune','badge_vakif','badge_hp','badge_ye','badge_earthsea','badge_hainish','secret_anubis','secret_ashbless','secret_creator']);

// ZAMANDAN BAĞIMSIZ ROZETLER — retroaktif ("geçmişte okudum") kitapları SAYAR.
// SERIES_BADGE_IDS'ten bilerek ayrı bir set: oradaki liste yukarıdaki seri
// sözleşmesine bağlı ve o sözleşmeyle birlikte okunmalı; buradaki gerekçe ise
// bambaşka. Ölçüt "seri mi" değil, "kitabın NE ZAMAN okunduğu rozetin anlamına
// giriyor mu". Kutsal metinler için girmiyor: onları yıllar önce okumuş olmak
// okumamış saymaz, rozet için tekrar okutmak anlamsız olurdu (Gökşin, 2026-08-28).
// Hem semavi kitaplar hem dünya dinleri metinleri (kadim1-3) aynı gerekçeyle burada.
const ZAMANDAN_BAGIMSIZ_ROZETLER = new Set(['semavi','kadim1','kadim2','kadim3']);
function retroaktifSayilirMi(badgeId){
  return SERIES_BADGE_IDS.has(badgeId)||ZAMANDAN_BAGIMSIZ_ROZETLER.has(badgeId);
}
function isRetroactive(b){
  return b.retroactive===true;
}
function bstat(badge,books,ctx){
  const filteredBooks = retroaktifSayilirMi(badge.id)
    ? books
    : books.filter(b=>!isRetroactive(b));
  const{cur,max}=badge.check(filteredBooks,ctx||badgeCtxFor(viewing||me));
  const pct=max>0?Math.round(cur/max*100):0;
  return{cur,max,pct,earned:cur>=max};
}
// Rozet check() fonksiyonlarına geçirilen bağlam — canlı db okuması yerine bunu kullanırlar.
// ctx.stories: o kullanıcının Hikayelerim listesi (dizi). Snapshot alınırken (Ö9 kapsamında,
// checkAndAwardBadges) bu da derin kopyalanmalı — yoksa "önce/sonra" karşılaştırması
// öykü rozetleri için hep aynı sonucu verir (K9).
function badgeCtxFor(user){
  return{
    stories:(db.stories&&db.stories[user])||[],
    readingCount:(db.books[user]||[]).filter(b=>b.readingStatus==='reading').length,
  };
}

// Bir rozetin hangi kitaplarla kazanıldığını veya ilerlediğini döner
function booksForBadge(badge,books){
  const filtered=retroaktifSayilirMi(badge.id)?books:books.filter(b=>!isRetroactive(b));
  const id=badge.id;
  // Okuma Miktarı
  if(['b5','b10','b25','b50','b100','b250'].includes(id)) return filtered;
  if(['p1k','p5k','p10k','p25k'].includes(id)) return filtered.filter(b=>b.pages);
  if(['long1','long2','long3'].includes(id)) return filtered.filter(b=>b.pages&&b.pages>=500);
  if(['short1','short2','short3','short4'].includes(id)) return filtered.filter(b=>b.pages&&b.pages<=150);
  if(['comic1','comic2','comic3','comic4','comic5'].includes(id)) return filtered.filter(b=>(b.formats||[]).includes('cizgi'));
  // Tür Keşfi
  if(['genre1','genre2','genre3','genre4'].includes(id)) return filtered.filter(b=>(b.genres||[]).length>0);
  if(['fan1','fan2','fan3','fan4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('fantastik')));
  if(['sf1','sf2','sf3','sf4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('bilimkurgu')));
  if(['det1','det2','det3','det4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('polisiye')));
  if(['hor1','hor2','hor3','hor4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('korku')));
  if(['his1','his2','his3','his4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('tarih')));
  if(['phi1','phi2','phi3','phi4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('felsefe')));
  if(['psy1','psy2','psy3','psy4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('psikoloji')));
  if(['ess1','ess2','ess3','ess4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('deneme')));
  if(['myt1','myt2','myt3','myt4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>g.includes('mitoloji')));
  if(['sci1','sci2','sci3','sci4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>normalizeGenre(g)==='bilim'));
  if(['rom1','rom2','rom3','rom4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>normalizeGenre(g)==='romantik'));
  if(['ger1','ger2','ger3','ger4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>normalizeGenre(g)==='gerilim'));
  if(['bio1','bio2','bio3','bio4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>['biyografi','otobiyografi','ani'].includes(normalizeGenre(g))));
  if(['gez1','gez2','gez3','gez4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>normalizeGenre(g)==='gezi'));
  if(['kis1','kis2','kis3','kis4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>normalizeGenre(g)==='kisisel_gelisim'));
  if(['siir1','siir2','siir3','siir4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>normalizeGenre(g)==='siir'));
  if(['oyk1','oyk2','oyk3','oyk4'].includes(id)){
    const bookList=filtered.filter(b=>(b.genres||[]).some(g=>normalizeGenre(g)==='oyku'));
    const storyCount=db.stories&&db.stories[me]?Object.values(db.stories[me]).filter(s=>s.status==="read").length:0;
    if(storyCount>0) bookList._storyCount=storyCount;
    return bookList;
  }
  if(['dis1','dis2','dis3','dis4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>['distopya','cyberpunk','steampunk'].includes(normalizeGenre(g))));
  if(['gen1','gen2','gen3','gen4'].includes(id)) return filtered.filter(b=>(b.genres||[]).some(g=>['genclik','cocuk'].includes(normalizeGenre(g))));
  // Coğrafya
  if(['geo1','geo2','geo3','geo4','geo5'].includes(id)) return filtered.filter(b=>b.country&&b.country.trim());
  if(id.startsWith('reg_')) return filtered.filter(b=>b.country&&b.country.trim());
  // Okuma Alışkanlığı
  if(['night1','night2','night3'].includes(id)) return filtered.filter(b=>b.nightReading);
  if(['hard1','hard2','hard3'].includes(id)) return filtered.filter(b=>b.challenging);
  if(['streak3','streak6','streak12'].includes(id)) return filtered.filter(b=>b.endDate||b.month);
  if(['reread1','reread2','reread3'].includes(id)) return filtered.filter(b=>b.reread);
  if(['clas1','clas2','clas3'].includes(id)) return filtered.filter(b=>b.pubYear&&b.pubYear<1950);
  // Seri & Özel
  if(['ser1','ser2','ser3','ser4'].includes(id)) return filtered.filter(b=>b.series);
  if(['univ1','univ2','univ3'].includes(id)) return filtered.filter(b=>b.series);
  if(['ind1','ind2','ind3'].includes(id)) return filtered.filter(b=>b.indie);
  if(['fem1','fem2','fem3'].includes(id)) return filtered.filter(b=>b.femaleAuthor);
  if(['yng1','yng2','yng3'].includes(id)) return filtered.filter(b=>b.youngAuthor);
  if(['aud1','aud2','aud3'].includes(id)) return filtered.filter(b=>(b.formats||[]).includes('sesli'));
  // Sosyal
  if(['soc1','soc2','soc3'].includes(id)) return filtered.filter(b=>b.review||(b.quotes||[]).length>0);
  // Kadim Metinler
  if(id==='semavi') return filtered.filter(b=>(b.genres||[]).includes('kutsal'));
  if(['kadim1','kadim2','kadim3'].includes(id)) return filtered.filter(b=>(b.genres||[]).includes('kutsal meta'));
  // Gizli — önce spesifik olanlar
  if(id==='secret_anubis') return filtered.filter(b=>(b.readingStatus==='new'||b.retroactive)&&(b.author||'').toLowerCase().includes('powers')&&((b.title||'').toLowerCase().includes('anubis')||(b.title||'').toLowerCase().includes('kapı')));
  if(id==='secret_author'){const counts=filtered.reduce((acc,x)=>{if(x.author){acc[x.author]=(acc[x.author]||0)+1;}return acc;},{});const topAuthor=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];return topAuthor?filtered.filter(b=>b.author===topAuthor[0]):[];}
  if(id==='secret_whale') return filtered.filter(b=>b.pages&&b.pages>=1000);
  if(id==='secret_speed') return filtered.filter(b=>b.startDate&&b.endDate&&b.startDate===b.endDate);
  if(id==='secret_multi') return (db.books[me]||[]).filter(b=>b.readingStatus==='reading');
  if(id==='secret_month'||id==='secret_100pg') return filtered.filter(b=>b.hundredPages);
  if(id==='secret_ashbless') return [];
  if(id==='secret_creator') return [];
  // Diğer gizliler
  if(id.startsWith('secret_')) return [];
  // Seri rozetleri — kitap listesi gösterme, desc yeterli
  if(['badge_dune','badge_vakif','badge_hp','badge_ye','badge_earthsea','badge_hainish'].includes(id)) return [];
  return [];
}

// ── Rozet gösterim / kazanma / bildirim mantığı (Ö40, 2026-08-06) ──
// ── ROZET KONTROLÜ (ortak) ──────────────────────────────────────
// prevValidBooks: değişiklikten ÖNCE alınmış bir snapshot olmalı — snapshotValidBooks() kullan.
function snapshotValidBooks(){
  return validBooks().map(b=>({...b, genres:[...(b.genres||[])], formats:[...(b.formats||[])], quotes:(b.quotes||[]).map(q=>({...q, reactions:{...(q.reactions||{})}}))}));
}
// Rozet karşılaştırması için "önceki" bağlamın anlık görüntüsü — şu an sadece
// stories'i kapsıyor (Ö9'un ilk dilimi). İleride seri verisi de buraya eklenecek.
function snapshotBadgeContext(){
  return{
    stories:((db.stories&&db.stories[me])||[]).map(s=>({...s})),
    readingCount:(db.books[me]||[]).filter(b=>b.readingStatus==='reading').length,
  };
}
function checkAndAwardBadges(prevValidBooks, delay=500, prevCtx){
  const newlyEarned=[];
  const newlyEarnedBadges=[];
  const newValid=validBooks();
  const newCtx=badgeCtxFor(me);
  // prevCtx verilmezse (çoğu tetikleyici stories'e dokunmuyor) yeni bağlamla aynı kabul
  // edilir — eski davranış korunur, sadece stories değişen yerlerde (addStory) fark eder.
  const usedPrevCtx=prevCtx||newCtx;
  BADGE_CATS.forEach(cat=>{
    const allB=cat.chains?cat.chains.flatMap(c=>c.badges):(cat.badges||[]);
    allB.forEach(b=>{
      if(!bstat(b,prevValidBooks,usedPrevCtx).earned&&bstat(b,newValid,newCtx).earned){
        newlyEarned.push(b.id);
        newlyEarnedBadges.push(b);
      }
    });
  });
  if(newlyEarned.length){
    launchConfetti('badge');
    newlyEarned.forEach(id=>pendingShimmerBadges.add(id));
    setTimeout(()=>notifyBadgesSequentially(newlyEarnedBadges),delay);
    if(!db.badgeEvents) db.badgeEvents={};
    if(!db.badgeEvents[me]) db.badgeEvents[me]=[];
    newlyEarnedBadges.forEach(b=>{
      db.badgeEvents[me].push({
        id:'bd_'+Date.now()+'_'+b.id,
        badgeId:b.id, tier:b.tier, icon:b.icon, name:b.name, desc:b.desc,
        ts:Date.now(), reactions:{}
      });
    });
    saveDb();
  }
  return newlyEarnedBadges;
}

function notifyBadgesSequentially(badges){
  if(!badges.length) return;
  const tierLabels={bronze:'🥉',silver:'🥈',gold:'🥇',diamond:'💎'};
  badges.forEach((b,i)=>{
    setTimeout(()=>{
      const tier=tierLabels[b.tier]||'🏅';
      notify(`${tier} Rozet Kazandın!`,`${b.icon} ${b.name}`);
      // Shadow aura efekti
      if(['hor1','hor2','hor3','hor4'].includes(b.id)) triggerShadowEffect('hor');
      else if(['ger1','ger2','ger3','ger4'].includes(b.id)) triggerShadowEffect('ger');
    }, i*2000);
  });
}

// ── FILTER ────────────────────────────────────────────────────
function filterBadges(f,el){
  badgeFilter=f;openBadgeId=null;document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderBadges();
}

function confirmResetBadges(){
  const btn=document.querySelector('[onclick="confirmResetBadges()"]');
  if(btn.dataset.confirming==='1'){
    (db.books[me]||[]).forEach(b=>{ b.retroactive=true; });
    ((db.stories&&db.stories[me])||[]).forEach(s=>{ s.retroactive=true; });
    saveDb();renderSafe();renderBadges();
    btn.textContent='🏅 Rozetleri Sıfırla';
    btn.dataset.confirming='';
    notify('🏅 Rozetler Sıfırlandı','Tüm kitap ve hikayelerin "geçmişte okundu" olarak işaretlendi.');
    return;
  }
  btn.dataset.confirming='1';
  btn.textContent='⚠️ Emin misin? Tekrar tıkla!';
  btn.style.background='rgba(160,82,45,.5)';
  setTimeout(()=>{btn.textContent='🏅 Rozetleri Sıfırla';btn.dataset.confirming='';btn.style.background='';},4000);
}

let openBadgeId=null;

// Rozet görseli (GitHub'dan) yüklenemezse emoji ikonuna düş
function badgeImgFallback(el,icon){
  try{ el.outerHTML='<span class="badge-icon" style="font-size:3rem;display:block;text-align:center;padding:1.2rem 0">'+icon+'</span>'; }catch(e){}
}

function renderBadges(){
  const books=validBooks();
  let prefs={};
  try{prefs=JSON.parse(localStorage.getItem('aa-acc')||'{}');}catch(e){}

  // Tüm rozetleri düz listede topla
  function allBadgesOf(cat){
    if(cat.chains) return cat.chains.flatMap(c=>c.badges);
    return cat.badges||[];
  }

  // Toplam rozet sayısı
  let totalEarned=0,totalAll=0;
  BADGE_CATS.forEach(cat=>{allBadgesOf(cat).forEach(b=>{totalAll++;if(bstat(b,books).earned)totalEarned++;});});
  const totalEl=document.getElementById('badgeTotalInfo');
  if(totalEl) totalEl.textContent=`${totalEarned} / ${totalAll} rozet kazanıldı`;

  const tierLabels={bronze:'🥉 Bronz',silver:'🥈 Gümüş',gold:'🥇 Altın',diamond:'💎 Elmas'};

  function badgeCardHtml(b){
    const s=bstat(b,books);
    const tier=b.tier||'gold';
    const isSecret=b.id.startsWith('secret_')||b.id.startsWith('comb_');
    const isNew=pendingShimmerBadges.has(b.id);
    // ── ROZET AURA HARİTASI ──
    // Her rozet ailesinin ID listesi ve karşılık gelen CSS aura sınıfı.
    // Yeni aile eklemek için buraya satır eklemek yeterli.
    const BADGE_AURA_MAP = [
      { ids: ['fan1','fan2','fan3','fan4'],                                                                           cls: 'badge-aura-fantasy' }, // 💜 Arcane Fantastik — mor/altın
      { ids: ['sf1','sf2','sf3','sf4'],                                                                              cls: 'badge-aura-sf'      }, // 🔵 Arcane Bilim Kurgu — mavi/cyan
      { ids: ['myt1','myt2','myt3','myt4'],                                                                          cls: 'badge-aura-myth'    }, // 🟡 Arcane Mitoloji — altın/amber
      { ids: ['his1','his2','his3','his4','phi1','phi2','phi3','phi4','ess1','ess2','ess3','ess4','sci1','sci2','sci3','sci4'], cls: 'badge-aura-neutral' }, // 🟤 Neutral — sepia
      { ids: ['psy1','psy2','psy3','psy4'],                                                                          cls: 'badge-aura-human'   }, // 🟣 Human/Inner — lavanta
      { ids: ['det1','det2','det3','det4'],                                                                          cls: 'badge-aura-action'  }, // ⚫ Action Polisiye — koyu gri
    ];
    let auraClass='';
    if(s.earned){
      const found = BADGE_AURA_MAP.find(entry => entry.ids.includes(b.id));
      if(found) auraClass = ' ' + found.cls;
    }
    const cls=(s.earned?'earned':s.cur===0?'locked':'')+' tier-'+tier+auraClass;
    const isOpen2=openBadgeId===b.id;
    const relBooks=booksForBadge(b,books);
    const MAX_BOOKS=5;
    const storyCount=relBooks._storyCount||0;
    const storyNote=storyCount>0?`<div style="font-size:.75rem;color:var(--rust);font-style:italic;padding:.2rem 0">+ ${storyCount} hikaye (Hikayelerim sekmesi)</div>`:'';
    const isSerisBadge=['badge_dune','badge_vakif','badge_hp','badge_ye','badge_earthsea','badge_hainish'].includes(b.id);
    const isShelfBadge=b.id==='secret_bedside'||b.id==='secret_forbidden';
    const isForbiddenBadge=b.id==='secret_forbidden';
    const shelfLink=isShelfBadge&&s.earned?(
      b.id==='secret_bedside'
        ?`<div style="margin-top:.75rem;font-family:'Crimson Pro',serif;font-size:.9rem;color:var(--ink);line-height:1.7">İz bırakan kitapları biriktirdin. Artık, sana ait bir köşe var.<br>Okuma yolculuğunun sonunda, <span onclick="goToShelf('bedside')" style="color:var(--gold);text-decoration:underline;cursor:pointer;font-weight:600">başucu rafın</span> hazır.</div>`
        :`<div style="margin-top:.75rem;font-family:'Crimson Pro',serif;font-size:.9rem;color:var(--ink);line-height:1.7">Bazı kapılar merakla değil, bedelle açılır.<br>Geri dönmeyeceğini bilerek okudun.<br><span onclick="goToShelf('forbidden')" style="color:#7c3aed;text-decoration:underline;text-decoration-color:#4c1d95;text-underline-offset:3px;cursor:pointer;font-weight:600;border-bottom:1px solid #4c1d95">Yasaklı rafın</span> açıldı.</div>`
    ):'';
    const bookListHtml=relBooks.length===0&&!storyCount
      ? (isSerisBadge||b.id.startsWith('secret_'))
        ? `<div style="font-size:.88rem;color:var(--ink);padding:.4rem 0;font-style:italic">${b.desc}</div>${shelfLink}`
        : '<div style="font-style:italic;opacity:.5;font-size:.8rem;padding:.5rem 0">Henüz ilgili kitap yok.</div>'
      :relBooks.slice(0,MAX_BOOKS).map(bk=>'<div class="badge-book-item" onclick="openBook('+bk.id+');event.stopPropagation()">'
          +'<span style="font-size:.85rem;font-weight:600;color:var(--ink)">'+bk.title+'</span>'
          +(bk.author?'<span style="font-size:.75rem;color:var(--rust);font-style:italic"> — '+bk.author+'</span>':'')
          +(bk.retroactive?'<span class="badge-book-past">geçmiş</span>':'')
        +'</div>').join('')
      +(relBooks.length>MAX_BOOKS?`<div style="font-size:.75rem;color:var(--rust);opacity:.6;font-style:italic;padding:.3rem 0">...ve ${relBooks.length-MAX_BOOKS} kitap daha</div>`:'')
      +storyNote;
    const tooltipHtml=isOpen2?`
      <div class="badge-tooltip open" id="tooltip-${b.id}" onclick="event.stopPropagation()">
        <div class="badge-tooltip-title">${isSerisBadge?'📖 Seri Bilgisi':'📚 İlgili Kitaplar ('+relBooks.length+')'}</div>
        ${bookListHtml}
      </div>`:'';
    return`<div class="badge-tooltip-wrap" id="twrap-${b.id}">
      ${tooltipHtml}
      <div class="badge-card ${cls} ${isNew?'badge-shine-new':''} ${b.id==='secret_multi'?(isNew?'foggy-badge':'foggy-badge-rest'):''}" onclick="toggleBadgeDetail('${b.id}')" ${b.imgSrc?`style="overflow:hidden;position:relative;"`:''}>
        ${b.id==='secret_multi'?'<span class="foggy-bug" title="şşt, kimseye söyleme">🐛</span>':''}
        ${isNew?'<span class="badge-new-tag">✨ YENİ</span>':''}
        ${isNew?'<span class="badge-new-dot"></span>':''}
        ${s.earned&&!isNew?'<span class="earned-stamp">✓</span>':''}
        ${(()=>{
          if(b.id!=='secret_whale') return '';
          // Kitap sayfasındaki balinanın taban konum/boyutu, kullanıcının verdiği referans
          // görselden (4.png) ölçülmüştü: sol=%33.5 üst=%28.17 genişlik=%21.5 yükseklik=%13.67.
          // WHALE_ANIM.restScale bu boyutu MERKEZİ SABİT TUTARAK büyütüp küçültüyor. Değerler
          // kullanıcıyla birlikte yerel bir test panelinde bulundu, son hâliyle kalıcı hale getirildi
          // (test paneli deploy öncesi koddan kaldırıldı).
          const rs=window.WHALE_ANIM?.restScale||1;
          const baseW=21.5, baseH=13.67, baseL=33.5, baseT=28.17;
          const w=baseW*rs, h=baseH*rs;
          const l=baseL+baseW/2-w/2, t=baseT+baseH/2-h/2;
          return `
          <div class="tier-label ${tier}" style="position:relative;z-index:1;margin-top:.5rem">${tierLabels[tier]||tier}</div>
          <div style="padding:.3rem .6rem .1rem;display:flex;justify-content:center;">
            <div style="position:relative;width:55px;height:55px;">
              <img src="${b.imgSrc}" style="width:100%;height:100%;object-fit:contain;display:block" onerror="badgeImgFallback(this,'📖')" />
              <img id="whaleRealImg-${b.id}" src="badges/balina.png" style="position:absolute;left:${l}%;top:${t}%;width:${w}%;height:${h}%;object-fit:contain;transition:opacity .8s ease" />
            </div>
          </div>`;
        })()}
        ${b.id==='secret_whale'?`
          <div style="padding:.15rem .6rem .5rem;text-align:center;">
            <div class="badge-name" style="font-size:.78rem;margin-bottom:.15rem">${b.name}</div>
            <div class="badge-desc" style="font-size:.68rem;margin-bottom:.25rem;-webkit-line-clamp:2">${b.desc}</div>
            <div class="progress-wrap" style="margin:.15rem 0 .1rem"><div class="progress-fill ${s.earned?'done':''}" style="width:${s.pct}%"></div></div>
            <div class="progress-text">${s.cur} / ${s.max} · %${s.pct}</div>
          </div>
        `:b.imgSrc?`
          <div style="padding:.6rem .6rem .2rem;display:flex;justify-content:center;">
            <img src="${b.imgSrc}" style="width:120px;height:120px;object-fit:contain;display:block;${s.earned?'':'filter:grayscale(1);opacity:.6'}" onerror="badgeImgFallback(this,'${b.icon}')" />
          </div>
          <div style="padding:.3rem .6rem .5rem;text-align:center;">
            <div class="badge-name" style="font-size:.78rem;margin-bottom:.25rem">${b.name}</div>
            <div class="progress-wrap" style="margin:.15rem 0 .1rem"><div class="progress-fill ${s.earned?'done':''}" style="width:${s.pct}%"></div></div>
            <div class="progress-text">${s.cur} / ${s.max} · %${s.pct}</div>
          </div>
        `:`
        <div class="tier-label ${tier}">${tierLabels[tier]||tier}</div>
        <span class="badge-icon">${b.icon}</span>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="progress-wrap"><div class="progress-fill ${s.earned?'done':''}" style="width:${s.pct}%"></div></div>
        <div class="progress-text">${s.cur} / ${s.max} · %${s.pct}</div>
        ${['streak3','streak6','streak12'].includes(b.id)?`<div style="font-family:'Space Mono',monospace;font-size:.55rem;color:var(--rust);opacity:.7;margin-top:.15rem">🔥 ${currentReadingStreak(books,new Date().getFullYear())} ay (${new Date().getFullYear()})</div>`:''}
        ${!isOpen2?'':''}`}
      </div>
    </div>`;
  }

  document.getElementById('badgeContainer').innerHTML=BADGE_CATS.map((cat,ci)=>{
    const allBadges=allBadgesOf(cat);
    const catEarned=allBadges.filter(b=>bstat(b,books).earned).length;
    const catTotal=allBadges.length;
    const hasNew=allBadges.some(b=>pendingShimmerBadges.has(b.id));
    const key='badgeCat-'+ci;
    // Bir filtre aktifken (Kazanılanlar/İlerleyenler/Kilitli) kategoriler varsayılan
    // olarak açık gelsin — kullanıcı zaten "sadece bunu göster" demiş, tek tek açması
    // gerekmesin. "Tümü" görünümünde eski davranış (kapalı başla) korunuyor. Kullanıcının
    // kendi elle kapattığı/açtığı bir tercihi varsa (prefs[key]) her zaman ona uyulur.
    const isOpen=prefs[key]!==undefined?prefs[key]:(badgeFilter!=='all');

    const chains=(cat.chains||[]).map(chain=>{
      const filtered=chain.badges.filter(b=>{
        const s=bstat(b,books);
        const isSecret=b.id.startsWith('secret_')||b.id.startsWith('comb_');
        // Gizli rozetler kazanılmamışsa hiç gösterme
        if(isSecret&&!s.earned) return false;
        if(badgeFilter==='earned') return s.earned;
        if(badgeFilter==='progress') return !s.earned&&s.cur>0;
        if(badgeFilter==='locked') return s.cur===0&&!s.earned;
        return true;
      });
      return {...chain, badges:filtered};
    }).filter(c=>c.badges.length>0);

    if(!chains.length) return'';

    const chainsHtml=chains.map(chain=>{
      const chainEarned=chain.badges.filter(b=>bstat(b,books).earned).length;
      const chainTotal=chain.badges.length;
      const chainComplete=chainEarned===chainTotal;
      const chainKey='chain-'+chain.id;
      const chainOpen=prefs[chainKey]!==undefined?prefs[chainKey]:true;
      return`<div class="badge-chain">
        <div class="badge-chain-header" style="cursor:pointer" onclick="toggleSection('${chainKey}')">
          <span class="badge-chain-label">${chain.label}</span>
          <span style="display:flex;align-items:center;gap:.4rem">
            <span class="badge-chain-count" style="color:${chainComplete?'var(--gold)':'var(--rust)'}">${chainEarned}/${chainTotal}${chainComplete?' ✦':''}</span>
            <span class="acc-arrow ${chainOpen?'open':''}" id="arr-${chainKey}">▶</span>
          </span>
        </div>
        <div class="acc-body ${chainOpen?'open':''}" id="body-${chainKey}">
          <div class="badge-chain-cards" style="padding-top:.4rem">${chain.badges.map(b=>badgeCardHtml(b)).join('')}</div>
        </div>
      </div>`;
    }).join('');

    return`<div class="badge-category">
      <div class="category-label acc-header" onclick="toggleSection('${key}')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
        <span>${cat.label}${hasNew?'<span style="display:inline-block;width:7px;height:7px;background:var(--rust);border-radius:50%;margin-left:.4rem;vertical-align:middle"></span>':''}</span>
        <span style="display:flex;align-items:center;gap:.5rem">
          <span style="font-family:'Space Mono',monospace;font-size:.6rem;color:${catEarned===catTotal?'var(--gold)':'var(--rust)'};opacity:.8">${catEarned}/${catTotal}</span>
          <span class="acc-arrow ${isOpen?'open':''}" id="arr-${key}">▶</span>
        </span>
      </div>
      <div class="acc-body ${isOpen?'open':''}" id="body-${key}">
        <div style="padding:.5rem">${chainsHtml}</div>
      </div>
    </div>`;
  }).join('');

  // Kazanılmış rozetlere 3D tilt efekti
  document.querySelectorAll('.badge-card.earned').forEach(card=>{
    card.addEventListener('mousemove',function(e){
      const rect=card.getBoundingClientRect();
      const x=e.clientX-rect.left;
      const y=e.clientY-rect.top;
      const rotateY=(x-rect.width/2)/6;
      const rotateX=-(y-rect.height/2)/6;
      card.style.transform=`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    });
    card.addEventListener('mouseleave',function(){
      card.style.transform='';
    });
  });
}

function openAnubisModal(){
  const overlay=document.getElementById('modalOverlay');
  const title=document.getElementById('modalTitle');
  const subtitle=document.getElementById('modalSubtitle');
  const body=document.getElementById('modalBody');
  const footer=document.getElementById('modalFooter');
  if(!overlay) return;
  title.textContent='🗝️ Ashbless\'in İzinde';
  subtitle.textContent='Tim Powers · Anubis Kapıları';
  footer.innerHTML=`<button class="btn" onclick="closeModal()">Kapat</button>`;
  body.innerHTML=`<div style="font-family:'Crimson Pro',serif;color:var(--ink);line-height:1.8;padding:.5rem 0">
    <p style="margin-bottom:1rem">Zamanın çizgisel olmadığını fark ettin. Ashbless'in izini sürerken, aslında kendi izine rastladın.</p>
    <p style="margin-bottom:1.5rem">Bazı hikâyeler okunmaz — yaşanır. Ve bazı isimler yazılmaz — hatırlanır.</p>
    <div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:.8rem auto 1.5rem"></div>
    <div style="font-family:'Playfair Display',serif;font-size:.85rem;color:var(--leather);margin-bottom:.5rem;letter-spacing:.05em;text-align:center">Gecenin On İki Saati</div>
    <div style="background:rgba(201,162,39,.06);border-left:3px solid var(--gold);padding:.9rem 1.1rem;border-radius:0 4px 4px 0;margin-bottom:1rem">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:.92rem;color:var(--leather);line-height:2">
        "Ve bir nehir uzanır<br>
        Alacakaranlıkla şafak arasında.<br>
        Ve saatler mesafedir, değişken gecenin<br>
        Engin gelgitinde ölçülen —<br>
        Korku duymayacak kadar felakete mahkûm,<br>
        İhtiyaçları kalmamış bu deniz yolcuları hızla çekiliyor<br>
        Gözkamaştırıcı bir ışık gibi parlayan karanlığın içine<br>
        Gecenin On İki Saati'nde."
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:.6rem;color:var(--rust);opacity:.7;margin-top:.75rem;text-align:right">— William Ashbless (buluntu metin)</div>
    </div>
  </div>`;
  overlay.classList.add('open');
  launchConfetti('secret');
}

function openAshblessModal(){
  const overlay=document.getElementById('modalOverlay');
  const title=document.getElementById('modalTitle');
  const subtitle=document.getElementById('modalSubtitle');
  const body=document.getElementById('modalBody');
  const footer=document.getElementById('modalFooter');
  if(!overlay) return;
  title.textContent='🗝️ Project Ashbless';
  subtitle.textContent='The Armchair Adventurers · 2026';
  footer.innerHTML=`<button class="btn" onclick="closeModal()">Kapat</button>`;
  body.innerHTML=`<div style="font-family:'Crimson Pro',serif;color:var(--ink);line-height:1.8;padding:.5rem 0">
    <div style="font-family:'Playfair Display',serif;font-size:1rem;color:var(--leather);margin-bottom:.5rem;font-style:italic;text-align:center">"Gerçek bir macera için çok tembel; okumayı bırakmak için fazla meraklı."</div>
    <div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:.8rem auto 1rem"></div>
    <p style="margin-bottom:.9rem">Okumayı oyunlaştırma fikri üzerine düşünürken rozet fikri aklıma geldi. Rozet adlarını ve açıklamalarını önce deftere yazdım, sonra Notion'da listeledim. Niyetim kazandığım rozetlerin yanına tek tek tik atabilmekti. Ancak bir kitabın birden fazla rozeti tetiklemesi, sistemi takip etmeyi giderek zorlaştırdı. Bir noktadan sonra bu, keyifli bir fikir olmaktan çıkıp küçük bir karmaşaya dönüştü. Aradım, düşündüm, bulamadım...</p>
    <p style="margin-bottom:.9rem;font-style:italic;text-align:center">Bir gün...</p>
    <p style="margin-bottom:.9rem">Evrim Ağacı'nda karşıma çıkan bir videoda, "hiç kodlama bilmeden bile Claude ile uygulama yapabilirsiniz" diyordu. Zaten aylardır aklımı meşgul eden rozet projem vardı. Bu cümle, ertelemek için kalan son bahaneyi de ortadan kaldırdı. Ve <strong>8 Mart 2026'da Project Ashbless başladı.</strong></p>
    <p style="margin-bottom:.9rem">Projenin adı: <em>Project Ashbless.</em> İsim, o dönem okuyup çok beğendiğim <em>Anubis Kapıları</em> kitabından geliyor. Benim için özel bir yeri var — uzun süre etkisinden çıkamadığım, bittiğinde bir süre boşluğunu hissettiğim, bazı sahneleri zihnimde yeniden yeniden dönen kitaplardan biri.</p>
    <p style="margin-bottom:.9rem;font-size:.88rem;color:var(--rust);font-style:italic">Ashbless kimdi? Köpek Surat Joe şimdi nerede, kime benziyor? Antoian Kardeşliği hâlâ faaliyet gösteriyor mu? Gecenin On İki Saati'nde ne demek? Ya Dr. Romany neyin peşinde? Bu film gibi maceranın neden hâlâ bir dizisi yok? Yoksa sen hâlâ Anubis Kapıları'nı okumadın mı?</p>
    <p style="margin-bottom:1.2rem">Eğer bu yazıyı okuyorsan, uygulamanın her alanını en az bir kez kullanmışsın demektir. Yani Project Ashbless rozetini açtın. Kısacası: sistemi keşfettin.<br><span style="font-size:.9rem;opacity:.7">(Bir de üstüne küçük bir konfeti patlattık. Hak ettin. 🎉)</span></p>
    <div style="border-top:1px solid rgba(201,162,39,.2);padding-top:1rem;margin-bottom:1rem">
      <div style="font-family:'Playfair Display',serif;font-size:.95rem;color:var(--leather);margin-bottom:.6rem">📚 The Armchair Adventurers Okuma Kulübü</div>
      <p style="font-size:.9rem;margin-bottom:.75rem">Mayıs 2018'den bu yana var. Resmî bir kuruluş tarihi yok — yazmamışız. Hâlâ acemiyiz. Ama belki de bu yüzden devam ediyoruz. 🙂</p>
      <div style="font-family:'Space Mono',monospace;font-size:.7rem;color:var(--rust);opacity:.8;margin-bottom:.5rem">KULÜP KURALLARI</div>
      <div style="font-size:.82rem;line-height:2">
        <div><strong>1.</strong> "Bakmadan Geçme."</div>
        <div><strong>2.</strong> 1. Madde değiştirilemez ve değiştirilmesi teklif dahi edilemez.</div>
        <div><strong>3.</strong> Kulüp üyesi, bir diğer üyenin bilgi alışverişini engelleyecek davranışlarda bulunmamalıdır.</div>
        <div><strong>4.</strong> Kulüp üyesi, bir diğer üyenin bilgilenmesini tehlikeye düşürecek bir davranışta bulunmamalıdır.</div>
        <div><strong>5.</strong> Kulüp üyesi, kendi inisiyatifini kullanarak kulüp haklarını bir başka üyeye devredemez.</div>
        <div><strong>6.</strong> Yıl içerisinde periyodik olarak üyelerin bilgi akışı kontrol edilebilir. Kontroller mail ile yapılacaktır.</div>
        <div><strong>7.</strong> Kulüp hakkında duyuru yapıldığında her üyeye ulaşıldığından emin olunmalıdır.</div>
        <div><strong>8.</strong> Öneri ve eleştiriler yapıcı yönde olacaksa dile getirilecektir. Gereksiz fikirler ortaya atılıp beyindeki çöplüğün dolmasına izin verilmeyecektir.</div>
        <div><strong>9.</strong> Kitap okuma esnasında mutlaka uykunun alınmış olması gerekmektedir.</div>
        <div><strong>10.</strong> Kitap okuma esnasında beyin yorgun olmamalı; alkol, uyuşturucu, antidepresan vb. maddeler vücutta bulunmamalıdır.</div>
        <div><strong>11.</strong> Kitap okurken eleştirel bakış açısı elden bırakılmamalıdır.</div>
        <div><strong>12.</strong> Peyami Safa'nın dediği gibi, "öğüterek okumak." Kitabın ana fikrini taşıyan cümleleri ağır ağır okuyup kendimizle münakaşa etmeliyiz.</div>
        <div><strong>13.</strong> Okuma bittiği andan itibaren uyumak.</div>
        <div><strong>14.</strong> Yolculuğun kısa süreceği ulaşım araçlarında kitap okunmamalıdır.</div>
        <div><strong>15.</strong> Okumaya başlamak için okuma arzusunun doğmasını beklememek. Okuma arzusu çoğu zaman birkaç satır okuduktan sonra başlar.</div>
      </div>
    </div>
    <div style="font-family:'Space Mono',monospace;font-size:.65rem;color:var(--rust);opacity:.6;text-align:right;margin-top:.5rem">Nimet & Gweluien · Kurucu Asil Üyeler</div>
  </div>`;
  overlay.classList.add('open');
  launchConfetti('ashbless');
  notify('🗝️ Project Ashbless','Uygulamanın tüm bölümlerini keşfettin!',true);
}

function openCreatorModal(){
  const overlay=document.getElementById('modalOverlay');
  const title=document.getElementById('modalTitle');
  const subtitle=document.getElementById('modalSubtitle');
  const body=document.getElementById('modalBody');
  const footer=document.getElementById('modalFooter');
  if(!overlay) return;

  // Üst cümle bankası
  const TOP_SENTENCES=[
    'Bu ekranın görünmemesi gerekiyordu.',
    'Yetkisiz erişim tespit edilmedi.',
    'Bu bilgi herkese açık değil.',
    'Sistem bu katmanı gizlemek üzere tasarlandı.',
    'Buraya kadar gelmen beklenmiyordu.',
    'Görmemen gereken bir şeye baktın.',
    'Kayıt altına alındın.',
    'Bu noktadan sonrası izleniyor.',
    'Erişim verildi… geçici olarak.',
  ];

  // NODE FRAGMENT grupları
  const NODE_FRAGMENTS=[
    {label:'NODE FRAGMENT I — EARLY SIGNALS',   logs:['log_07: rozet sistemi başlangıç parametresi = kağıt tabanlı işaretleme','log_23: rozet zorluk dengesi yeniden hesaplandı']},
    {label:'NODE FRAGMENT II — SYSTEM DRIFT',   logs:['log_04: sistem başlangıç modu = kişisel kullanım','log_31: ses çıktısı konfigürasyonu — dobby (kedim) tarafından seçildi','log_19: sistem yönlendirme değişikliği kaydedildi (birden fazla revizyon)']},
    {label:'NODE FRAGMENT III — PARTIAL ACCESS', logs:['log_52: gizli veri alanları aktif (kısmi görünürlük: fark eden kullanıcılar)','log_03: proje başlatma tarihi = 08.03.2026']},
    {label:'NODE FRAGMENT IV — MEMORY LEAKS',   logs:['log_44: geliştirme birimi = claude + gweluien','log_11: sistem tasarım modu = kişisel prototip','log_38: bug düzeltme sayısı = ∞ / kayıt tutulmadı','log_56: feature count = 50+']},
    {label:'NODE FRAGMENT V — HIDDEN ROUTES',   logs:['log_27: change request state = persistent (override loop detected)','log_09: gece oturum sayacı = undefined / düşük güven']},
    {label:'NODE FRAGMENT VI — UNSTABLE LOGS',  logs:['log_47: hata analiz süresi = %50+ toplam runtime','log_33: kaynak tüketimi (çay/kahve) = ölçülemez','log_16: ilham kaynağı = anubis kapıları + oturma birimi']},
    {label:'NODE FRAGMENT VII — FINAL TRACE',   logs:['log_58: geliştirici kimliği = claude (anthropic) + hggunay // alias: gweluien']},
    {label:'NODE FRAGMENT VIII — CONTROLLED ERRORS', logs:['log_29: bazı bug\'lar sistemden bilinçli olarak çıkarılmadı']},
  ];

  const topSentence=TOP_SENTENCES[Math.floor(Math.random()*TOP_SENTENCES.length)];
  const fragment=NODE_FRAGMENTS[Math.floor(Math.random()*NODE_FRAGMENTS.length)];

  title.textContent='✨ Yaratıcının Tanığı';
  subtitle.textContent='yetkisiz erişim — devam ediliyor';
  footer.innerHTML=`<button class="btn" onclick="closeModal()">Kapat</button>`;

  body.innerHTML=`<div style="font-family:'Crimson Pro',serif;color:var(--ink);line-height:1.8;padding:.5rem 0">

    <!-- Üst cümle -->
    <div style="font-family:'Space Mono',monospace;font-size:.95rem;color:#1a1208;letter-spacing:.04em;text-align:center;padding:.75rem 0 1rem;border-bottom:1px solid rgba(201,162,39,.2);margin-bottom:1.2rem">${topSentence}</div>

    <!-- NODE FRAGMENT -->
    <div style="margin-bottom:1.2rem">
      <div style="font-family:'Space Mono',monospace;font-size:.55rem;text-transform:uppercase;letter-spacing:.12em;color:var(--rust);opacity:.7;margin-bottom:.6rem">${fragment.label}</div>
      <div id="creator-log-block" style="background:#0d0d0d;border-radius:4px;padding:.75rem 1rem;position:relative;overflow:hidden">
        ${fragment.logs.map(l=>`<div class="creator-log-line" style="font-family:'Space Mono',monospace;font-size:.72rem;color:#39ff14;line-height:2;position:relative">${l}</div>`).join('')}
        <div style="position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,.015) 2px,rgba(0,255,0,.015) 4px);border-radius:4px"></div>
      </div>
    </div>

    <!-- Ayırıcı -->
    <div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:.5rem auto 1.2rem"></div>

    <!-- Sabit alt metin -->
    <div style="font-family:'Crimson Pro',serif;font-size:.92rem;color:var(--ink);line-height:2">
      <p style="margin-bottom:.4rem">Bir kitap kulübü uygulaması bu kadar derin olmak zorunda mıydı?</p>
      <p style="margin-bottom:.4rem;font-style:italic;color:var(--rust)">Belki de koltuğumuzdan kalkıp gerçek bir maceraya atmak daha kolaydı. Hayır. Ama işte buradayız.</p>
      <p style="margin-bottom:.4rem">Her şey görünenlerden ibaret değildi.</p>
      <p style="margin-bottom:.4rem">Satır aralarını okudun.</p>
      <p style="margin-bottom:.4rem">Sistemin ardındaki sesi duydun.</p>
      <p>Yaratıcının izine rastladın.</p>
    </div>

  </div>`;

  // Modal açılış glitch+distortion+karıncalanma efekti
  const modal=overlay.querySelector('.modal');
  if(modal){
    modal.style.transition='none';
    modal.style.filter='hue-rotate(90deg) saturate(4) brightness(1.6)';
    modal.style.transform='translateY(20px) skewX(6deg) translateX(8px)';
    overlay.classList.add('open');

    // Karıncalanma (static noise) overlay
    const noise=document.createElement('canvas');
    noise.style.cssText='position:absolute;inset:0;width:100%;height:100%;opacity:.35;pointer-events:none;z-index:9999;border-radius:4px;';
    modal.style.position='relative';
    modal.appendChild(noise);
    const ctx2=noise.getContext('2d');
    let noiseFrame;
    function drawNoise(){
      noise.width=modal.offsetWidth||400;
      noise.height=modal.offsetHeight||500;
      const img=ctx2.createImageData(noise.width,noise.height);
      for(let i=0;i<img.data.length;i+=4){
        const v=Math.random()<.5?0:255;
        img.data[i]=img.data[i+1]=img.data[i+2]=v;
        img.data[i+3]=Math.random()*180;
      }
      ctx2.putImageData(img,0,0);
      noiseFrame=requestAnimationFrame(drawNoise);
    }
    drawNoise();

    setTimeout(()=>{
      modal.style.filter='hue-rotate(200deg) saturate(2) brightness(.5) contrast(2)';
      modal.style.transform='translateY(15px) skewX(-4deg) translateX(-6px)';
    },150);
    setTimeout(()=>{
      modal.style.filter='hue-rotate(300deg) saturate(3) brightness(1.3) contrast(1.5)';
      modal.style.transform='translateY(8px) skewX(2deg) translateX(4px)';
    },300);
    setTimeout(()=>{
      modal.style.filter='hue-rotate(0deg) saturate(5) brightness(.8) contrast(3)';
      modal.style.transform='translateY(5px) skewX(-1deg) translateX(-2px)';
    },450);
    setTimeout(()=>{
      modal.style.transition='filter .25s ease,transform .25s ease';
      modal.style.filter='none';
      modal.style.transform='translateY(0)';
    },600);
    setTimeout(()=>{
      cancelAnimationFrame(noiseFrame);
      if(noise.parentNode) noise.remove();
    },850);
  } else {
    overlay.classList.add('open');
  }

  // Açılış sesi — 0-150ms jitter
  setTimeout(()=>{_playGlitchSound(_getNmAudioCtx());}, Math.random()*150);

  // Log glitch — 3-4sn aralıklı sürekli
  let _creatorGlitchTimer=null;
  function _runLogGlitch(){
    const block=document.getElementById('creator-log-block');
    if(!block||!overlay.classList.contains('open')){clearTimeout(_creatorGlitchTimer);return;}
    const lines=block.querySelectorAll('.creator-log-line');
    // 1-2 rastgele satırı glitch'le
    const count=Math.floor(Math.random()*2)+1;
    const picked=[];
    while(picked.length<count&&picked.length<lines.length){
      const idx=Math.floor(Math.random()*lines.length);
      if(!picked.includes(idx))picked.push(idx);
    }
    picked.forEach(idx=>{
      const el=lines[idx];
      const orig=el.textContent;
      const chars='█▓▒░⣿⡇⢸|/\\-_<>[]{}#@$%&*!?~^';
      // Kısa glitch: 3 frame
      let f=0;
      const glitchInterval=setInterval(()=>{
        if(f>=4){clearInterval(glitchInterval);el.textContent=orig;el.style.color='#39ff14';return;}
        if(f%2===0){
          el.textContent=orig.split('').map(c=>Math.random()<.25?chars[Math.floor(Math.random()*chars.length)]:c).join('');
          el.style.color=f===0?'#ff00ff':'#00ffff';
        } else {
          el.textContent=orig;
          el.style.color='#39ff14';
        }
        f++;
      },60);
    });
    // Tüm bloğun kısa skew'i
    block.style.transition='transform .05s steps(1)';
    block.style.transform=`skewX(${(Math.random()-.5)*4}deg) translateX(${(Math.random()-.5)*6}px)`;
    setTimeout(()=>{block.style.transform='none';},120);

    _creatorGlitchTimer=setTimeout(_runLogGlitch, 3000+Math.random()*1000);
  }
  setTimeout(_runLogGlitch,1500);

  // Idle ses — 8-22dk aralıklı, %70 ihtimal
  const LEAK_TEXTS=[
    'log_19... override detected',
    'node fragment unstable',
    'memory sector... incomplete',
    'system drift detected...',
  ];

  function _playGlitchSound(ctx,volume){
    const type=Math.floor(Math.random()*3);
    if(type===0){
      const buf=ctx.createBuffer(1,ctx.sampleRate*2.4,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(i<d.length*.3?1:Math.max(0,1-(i-d.length*.3)/(d.length*.7)));
      const s=ctx.createBufferSource();s.buffer=buf;
      const g=ctx.createGain();g.gain.setValueAtTime(volume||.25,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+2.4);
      s.connect(g);g.connect(ctx.destination);s.start();
    } else if(type===1){
      const buf=ctx.createBuffer(1,ctx.sampleRate*3.0,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.4;
      const s=ctx.createBufferSource();s.buffer=buf;
      const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=800;f.Q.value=0.5;
      const g=ctx.createGain();g.gain.setValueAtTime(volume||.15,ctx.currentTime);g.gain.linearRampToValueAtTime((volume||.15)+.05,ctx.currentTime+.8);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+3.0);
      s.connect(f);f.connect(g);g.connect(ctx.destination);s.start();
    } else {
      const buf=ctx.createBuffer(1,ctx.sampleRate*2.0,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=i<200?(Math.random()*2-1)*(1-i/200):(Math.random()*2-1)*.3*(1-i/d.length);
      const s=ctx.createBufferSource();s.buffer=buf;
      const g=ctx.createGain();g.gain.setValueAtTime(volume||.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+2.0);
      s.connect(g);g.connect(ctx.destination);s.start();
    }
  }

  function _triggerDataLeak(){
    const block=document.getElementById('creator-log-block');
    if(!block) return;
    const leak=document.createElement('div');
    const txt=LEAK_TEXTS[Math.floor(Math.random()*LEAK_TEXTS.length)];
    const chars='█▓▒░|/\\';
    const glitched=txt.split('').map(c=>Math.random()<.3?chars[Math.floor(Math.random()*chars.length)]:c).join('');
    leak.style.cssText='font-family:"Space Mono",monospace;font-size:.72rem;color:#ff00ff;line-height:2;opacity:0;transition:opacity .15s ease;';
    leak.textContent=glitched;
    block.appendChild(leak);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{leak.style.opacity='1';}));
    const dur=400+Math.random()*800;
    setTimeout(()=>{
      leak.style.opacity='0';
      setTimeout(()=>{if(leak.parentNode)leak.remove();},200);
    },dur);
  }

  let _creatorIdleSoundTimer=null;
  function _playIdleSound(){
    if(!overlay.classList.contains('open')) return;
    if(Math.random()<.15) _triggerDataLeak();
    _creatorIdleSoundTimer=setTimeout(_playIdleSound, 480000+Math.random()*840000);
  }
  _creatorIdleSoundTimer=setTimeout(_playIdleSound, 480000+Math.random()*840000);
  window._creatorCleanup=function(){
    clearTimeout(_creatorIdleSoundTimer);
    clearTimeout(_creatorGlitchTimer);
  };
}

// ── BALİNA AVCISI ROZETİ ETKİLEŞİM ANİMASYONU ──────────────────
// Tüm zamanlamalar burada tek yerde — konsoldan canlı denemek için örn.:
//   WHALE_ANIM.swimMs = 4000
// yazıp rozete tekrar tıklamak yeterli, sayfa yenilemeye gerek yok.
// Aşağıdaki değerler kullanıcının panelden deneyip beğendiği, KALICI hale getirilen son hâl
// (2026-08-07). Panelden yine de değiştirilebilir — orada değişince sadece o oturum için geçerli
// olur, kalıcı değişiklik için buradaki sayılar güncellenmeli.
window.WHALE_ANIM = window.WHALE_ANIM || {
  preDelayMs: 100,                                // tıklama sonrası ilk kalp atışından önceki bekleme
  heartbeatScales: [1, 1.15, 1.4, 1.8, 2.5, 3.5, 5], // her atışın HAM zirve değeri — heartbeatIntensity ile ölçeklenir
  heartbeatIntensity: 3.0,                        // 1 = ham değerler; 3.0 = kullanıcının seçtiği, çok daha belirgin büyüme
  heartbeatBeatMs: [867, 800, 733, 667, 600, 533], // her atışın toplam süresi (0.30x hız çarpanı zaten uygulanmış hâli)
  meltBlurPx: 6,                                  // yüzerken eriyip kaybolma sırasındaki bulanıklık miktarı
  whaleScaleMult: 12.5,                           // yüzüp uzaklaşırken ulaşılacak son boyut (kalp atışının son zirvesine göre, aynı ölçek biriminde)
  whaleIdleMs: 425,                               // zirve boyutuna ulaşınca yüzmeye başlamadan önceki kısa bekleme
  swimMs: 2000,                                   // yüzüp ekrandan çıkarken AYNI ANDA eriyip kaybolma süresi
  bubbleCount: 6,
  restScale: 4.14,                                // rozet dinlenme hâlindeyken kitap sayfasındaki balinanın boyut çarpanı (merkezi sabit kalır) — kart kutusu 120→90→55px küçülürken görsel balinanın MUTLAK boyutu hep aynı kalsın diye orijinal 1.9'dan orantılı büyütüldü (120/55×1.9)
  soundEnabled: true                              // her baloncukta kısa bir "cup" sesi çalsın mı
};

// Uygulamanın "Yaratıcının Tanığı" rozetindeki gibi (bkz. _playGlitchSound) dosya kullanmadan,
// Web Audio API ile anlık sentezlenen kısa bir "cup" (baloncuk) sesi. Tüm ayarlar WHALE_SOUND'da
// toplandı — değerler kullanıcıyla birlikte yerel bir test panelinde bulunup kalıcı hale getirildi.
// Gerekirse konsoldan da anlık denenebilir, örn.:
//   WHALE_SOUND.baseFreq=250; WHALE_SOUND.noteRise=0.6;
// Kullanıcının panelden bulup beğendiği, KALICI hale getirilen ses değerleri (2026-08-07).
window.WHALE_SOUND = window.WHALE_SOUND || {
  baseFreq: 550,   // ilk (en kalın/bas) notanın perdesi — düşürünce daha kalın başlar
  noteCount: 2,    // kaç ana nota art arda çalsın
  noteRise: 0.35,  // her nota bir öncekinden ne kadar tiz olsun (0=hepsi aynı perde, 1=çok dramatik kalından inceye)
  subMix: 1.00,    // bir oktav alttaki "kalınlaştırma" katmanının ana notaya oranı (0=ince/saf, 1=çok bas ağırlıklı)
  tailCount: 1,    // ana notalardan sonra eklenen, hızla incelen "parıltı" notası sayısı
  seqRise: 0.09    // BİR ANİMASYONDAKİ ardışık baloncuklar arasında perde kayması — pozitif: her
                   // sonraki baloncuk bir öncekinden tizleşir (balina uzaklaşıp kabarcıklar yükseldikçe
                   // incelen his), negatif: kalınlaşır, 0: sıradaki gibi sadece küçük rastgele fark
};
function _playBubbleSound(seqIndex){
  if(!window.WHALE_ANIM?.soundEnabled) return;
  try{
    if(!window._whaleAudioCtx) window._whaleAudioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const ctx=window._whaleAudioCtx;
    if(ctx.state==='suspended') ctx.resume();
    const S=window.WHALE_SOUND;
    const noteCount=Math.max(1,Math.round(S.noteCount));
    const seqMult=Math.pow(1+(S.seqRise||0), seqIndex||0); // aynı animasyondaki kaçıncı baloncuk olduğuna göre kademeli kaydırma
    const base=S.baseFreq*seqMult*(0.92+Math.random()*0.16); // + hafif rastgelelik, her baloncuk biraz farklı çalsın
    const mainPeak=.12, subPeak=mainPeak*S.subMix;
    let lastFreq=base;
    for(let n=0;n<noteCount;n++){
      const t0=ctx.currentTime+n*0.06;
      const freq=base*(1+n*S.noteRise);
      lastFreq=freq;

      const osc=ctx.createOscillator();
      osc.type='triangle';
      osc.frequency.setValueAtTime(freq*0.82,t0);
      osc.frequency.exponentialRampToValueAtTime(freq*1.18,t0+.045);
      const g=ctx.createGain();
      g.gain.setValueAtTime(.0001,t0);
      g.gain.exponentialRampToValueAtTime(mainPeak,t0+.014);
      g.gain.exponentialRampToValueAtTime(.0001,t0+.1);
      osc.connect(g);g.connect(ctx.destination);
      osc.start(t0);osc.stop(t0+.12);

      // Kalınlaştırma katmanı — bir oktav alttan, subMix ile ayarlanan sessizlikte
      if(subPeak>.0002){
        const subOsc=ctx.createOscillator();
        subOsc.type='sine';
        subOsc.frequency.setValueAtTime(freq*0.41,t0);
        subOsc.frequency.exponentialRampToValueAtTime(freq*0.59,t0+.045);
        const subG=ctx.createGain();
        subG.gain.setValueAtTime(.0001,t0);
        subG.gain.exponentialRampToValueAtTime(subPeak,t0+.014);
        subG.gain.exponentialRampToValueAtTime(.0001,t0+.1);
        subOsc.connect(subG);subG.connect(ctx.destination);
        subOsc.start(t0);subOsc.stop(t0+.12);
      }
    }

    // Ana notalardan sonra eklenen, hızla incelen "parıltı" kuyruğu — saf ince ton, bas katmanı yok
    const tailCount=Math.max(0,Math.round(S.tailCount));
    for(let s=0;s<tailCount;s++){
      const t0=ctx.currentTime+noteCount*0.06+s*0.05;
      const freq=lastFreq*(1.5+s*0.4);
      const osc=ctx.createOscillator();
      osc.type='sine';
      osc.frequency.setValueAtTime(freq*0.9,t0);
      osc.frequency.exponentialRampToValueAtTime(freq*1.1,t0+.03);
      const g=ctx.createGain();
      g.gain.setValueAtTime(.0001,t0);
      g.gain.exponentialRampToValueAtTime(.08,t0+.01);
      g.gain.exponentialRampToValueAtTime(.0001,t0+.09);
      osc.connect(g);g.connect(ctx.destination);
      osc.start(t0);osc.stop(t0+.1);
    }
  }catch(e){}
}

function triggerWhaleAnimation(badgeId){
  // Not: toggleBadgeDetail() bu fonksiyonu çağırdıktan hemen sonra kendi akışında
  // renderBadges()'i de çalıştırıyor (tooltip aç/kapa mantığı), bu da rozet kartlarının
  // DOM'unu anında yeniden oluşturuyor. Ama bu, click anında SENKRON olarak bir kere oluyor;
  // realImg referansını hemen aşağıda o render'dan SONRA (bu fonksiyon çağrıldığında) alıyoruz,
  // ondan sonra sekans boyunca (birkaç saniye) başka bir kendiliğinden re-render olmuyor —
  // bu yüzden referansı elde tutmak güvenli.
  //
  // Akış KESİNTİSİZ tek bir hareket: kalp atışı büyümeyi transform:scale() ile yapıyor, yüzme adımı
  // da AYNI scale özelliğini kaldığı yerden devam ettirip (whaleScaleMult'a kadar) eş zamanlı olarak
  // opacity/blur ile eritiyor. Kitap sayfasındaki GERÇEK balina görseli, kopya (overlay) yüzmeye
  // başladığı anda gizlenir ("sayfa boş kalır"), animasyon bitince fade-in ile geri döner.
  const realImg=document.getElementById('whaleRealImg-'+badgeId);
  if(!realImg) return;
  if(document.querySelector('.whale-anim-overlay')) return; // zaten oynuyorsa üst üste başlatma
  const T=window.WHALE_ANIM;
  const rect=realImg.getBoundingClientRect();
  const baseW=rect.width||40, baseH=rect.height||26;
  const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;

  const overlay=document.createElement('img');
  overlay.className='whale-anim-overlay';
  overlay.src=realImg.currentSrc||realImg.src;
  overlay.style.cssText=`position:fixed;left:${cx}px;top:${cy}px;width:${baseW}px;height:${baseH}px;object-fit:contain;`
    +`transform:translate(-50%,-50%) scale(1) rotate(0deg);opacity:1;filter:blur(0px);`
    +`z-index:9999;pointer-events:none;will-change:transform,opacity,filter;`;
  document.body.appendChild(overlay);

  // Her atışı tek bir sıçrama yerine "yüksel + kısmen geri düş" olarak iki adıma bölüyoruz —
  // gerçek kalp atışı hissi bu ikisi olmadan (düz büyüme) oluşmuyordu. Son atışta geri düşüş yok,
  // zirve boyutunda kısa bir bekleme sonrası doğrudan yüzmeye/erimeye geçiyor.
  const intensity=T.heartbeatIntensity||1;
  const peaks=T.heartbeatScales.map(v=>1+(v-1)*intensity); // her zirveyi 1'den itibaren ölçekle
  const frames=[];
  let prevSettle=peaks[0];
  for(let p=1;p<peaks.length;p++){
    const peak=peaks[p];
    const totalMs=T.heartbeatBeatMs[p-1]||180;
    const riseMs=Math.round(totalMs*0.45);
    frames.push({scale:peak, ms:riseMs});
    if(p<peaks.length-1){
      const settle=peak-(peak-prevSettle)*0.35;
      frames.push({scale:settle, ms:totalMs-riseMs});
      prevSettle=settle;
    }
  }
  setTimeout(()=>{
    let fi=0;
    (function beat(){
      if(fi>=frames.length){ setTimeout(swim,T.whaleIdleMs); return; }
      const f=frames[fi];
      overlay.style.transition=`transform ${f.ms}ms ease-in-out`;
      overlay.style.transform=`translate(-50%,-50%) scale(${f.scale}) rotate(0deg)`;
      fi++;
      setTimeout(beat,f.ms);
    })();
  }, T.preDelayMs);

  function swim(){
    // Balina "sayfadan ayrılıyor" — gerçek görsel burada anında gizlenir (kopya zaten üstünü
    // kaplıyordu), animasyon bitince fade-in ile geri gelecek.
    realImg.style.transition='none';
    realImg.style.opacity='0';
    spawnBubbles();
    overlay.style.transition=`transform ${T.swimMs}ms cubic-bezier(.3,0,.7,1), opacity ${T.swimMs}ms ease-in, filter ${T.swimMs}ms ease-in`;
    overlay.style.transform=`translate(${window.innerWidth-cx+200}px,-60px) scale(${T.whaleScaleMult}) rotate(5deg)`;
    overlay.style.opacity='0';
    overlay.style.filter=`blur(${T.meltBlurPx}px)`;
    setTimeout(finish, T.swimMs);
  }

  function finish(){
    overlay.remove();
    void realImg.offsetHeight; // reflow — opacity:0'ın oturduğundan emin ol, sonra geri fade-in başlasın
    realImg.style.transition='opacity .8s ease';
    realImg.style.opacity='1';
  }

  function spawnBubbles(){
    // Baloncukları balinanın O ANKİ gerçek konum/boyutuna göre (getBoundingClientRect ile canlı
    // ölçülerek) ve balinanın ÜSTÜNDE (daha yüksek z-index) oluşturuyoruz, yoksa büyümüş balinanın
    // altında/gerisinde kalıp görünmez oluyorlardı.
    if(T.bubbleCount<=0) return;
    const spacing=Math.max(120, T.swimMs/(T.bubbleCount+1));
    for(let b=0;b<T.bubbleCount;b++){
      setTimeout(()=>{
        if(!overlay.isConnected) return;
        const r=overlay.getBoundingClientRect();
        const whaleSize=Math.max(r.width,r.height)||baseW;
        _playBubbleSound(b);
        const bub=document.createElement('div');
        bub.className='whale-anim-bubble';
        // Görünürlük için hem oransal hem de mutlak bir alt sınır var — animasyonun başında
        // balina henüz küçükken bile baloncuklar fark edilir kalsın diye. Parıltı, tek bir
        // yumuşak box-shadow yerine iç+dış iki katmanlı, parlak/doygun bir glow ile yapılıyor.
        const size=Math.max(13, whaleSize*(0.07+Math.random()*0.08));
        const bx=r.left+r.width*(0.15+Math.random()*0.5);
        const by=r.top+r.height*(0.1+Math.random()*0.4);
        bub.style.cssText=`position:fixed;left:${bx}px;top:${by}px;`
          +`width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.95), rgba(120,210,255,.9) 55%, rgba(60,150,220,.85) 100%);`
          +`border:${Math.max(1.5,size*.07)}px solid rgba(255,255,255,.9);`
          +`box-shadow:0 0 ${size*.5}px ${size*.18}px rgba(120,210,255,.85), 0 0 ${size*1.4}px ${size*.5}px rgba(80,180,255,.5);`
          +`z-index:10000;pointer-events:none;opacity:0;transform:scale(.4);`
          +`transition:transform 1.4s ease-out, opacity 1.4s ease-out;`;
        document.body.appendChild(bub);
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          bub.style.opacity='1';
          bub.style.transform=`translateY(-${size*(1.5+Math.random())}px) scale(1)`;
        }));
        setTimeout(()=>{bub.style.opacity='0';setTimeout(()=>bub.remove(),400);},1200);
      }, b*spacing);
    }
  }
}

function toggleBadgeDetail(badgeId){
  pendingShimmerBadges.delete(badgeId);
  if(badgeId==='secret_ashbless'){openAshblessModal();return;}
  if(badgeId==='secret_anubis'){openAnubisModal();return;}
  if(badgeId==='secret_creator'){openCreatorModal();return;}

  // Balina Avcısı rozeti — kalp atışı + erime + yüzen balina animasyonu
  if(badgeId==='secret_whale'){
    const books=validBooks();
    const allB=BADGE_CATS.flatMap(c=>c.chains?c.chains.flatMap(ch=>ch.badges):(c.badges||[]));
    const badge=allB.find(b=>b.id==='secret_whale');
    if(badge&&bstat(badge,books).earned) triggerWhaleAnimation('secret_whale');
  }

  // Rom rozeti kalp animasyonu
  if(['rom1','rom2','rom3','rom4'].includes(badgeId)){
    const books=validBooks();
    const allB=BADGE_CATS.flatMap(c=>c.chains?c.chains.flatMap(ch=>ch.badges):(c.badges||[]));
    const badge=allB.find(b=>b.id===badgeId);
    if(badge&&bstat(badge,books).earned){
      const wrap=document.getElementById('twrap-'+badgeId);
      const card=wrap?.querySelector('.badge-card');
      if(card){
        const duration=1.2;
        const beats=4;
        card.style.animation=`romHeartbeat ${duration}s ease-in-out ${beats},romAura ${duration}s ease-in-out ${beats}`;
        setTimeout(()=>{card.style.animation='';},duration*beats*1000+100);
      }
    }
  }
  const wasOpen=openBadgeId===badgeId;
  openBadgeId=wasOpen?null:badgeId;
  renderBadges();
  if(!wasOpen){
    // Tooltip konumunu ayarla — sayfanın üstüne taşıyorsa aşağı, altına taşıyorsa yukarı aç
    setTimeout(()=>{
      const tooltip=document.getElementById('tooltip-'+badgeId);
      const wrap=document.getElementById('twrap-'+badgeId);
      if(tooltip&&wrap){
        tooltip.style.display='block';
        const wrapRect=wrap.getBoundingClientRect();
        const tooltipW=Math.min(280,window.innerWidth-16);
        const tooltipH=tooltip.offsetHeight||150;
        // Yatay konum — ortala, taşma varsa düzelt
        let left=wrapRect.left+wrapRect.width/2-tooltipW/2;
        if(left<8) left=8;
        if(left+tooltipW>window.innerWidth-8) left=window.innerWidth-tooltipW-8;
        tooltip.style.left=left+'px';
        tooltip.style.width=tooltipW+'px';
        // Dikey konum — alan varsa altına, yoksa üstüne
        const spaceBelow=window.innerHeight-wrapRect.bottom;
        const spaceAbove=wrapRect.top;
        if(spaceBelow>=tooltipH+10||spaceBelow>=spaceAbove){
          tooltip.style.top=(wrapRect.bottom+6)+'px';
          tooltip.style.bottom='auto';
        } else {
          tooltip.style.top=(wrapRect.top-tooltipH-6)+'px';
          tooltip.style.bottom='auto';
        }
      }
      // Açılan kazanılmış rozet parıldasın
      const books=validBooks();
      const allB=BADGE_CATS.flatMap(c=>c.chains?c.chains.flatMap(ch=>ch.badges):(c.badges||[]));
      const badge=allB.find(b=>b.id===badgeId);
      if(badge&&bstat(badge,books).earned){
        const card=wrap?.querySelector('.badge-card');
        if(card){card.classList.add('badge-shine-new');setTimeout(()=>card.classList.remove('badge-shine-new'),1500);}
      }
      // Rozet görünür alandan çıkınca tooltip kapat
      if(wrap){
        if(window._badgeObserver) window._badgeObserver.disconnect();
        window._badgeObserver=new IntersectionObserver((entries)=>{
          if(!entries[0].isIntersecting){
            window._badgeObserver.disconnect();
            closeBadgeTooltip();
          }
        },{threshold:0.1});
        window._badgeObserver.observe(wrap);
      }
    },50);
  }
}

function closeBadgeTooltip(){
  openBadgeId=null;
  renderBadges();
}

function shimmerEarnedBadges(){
  const cards=document.querySelectorAll('.badge-card.earned');
  cards.forEach((card,i)=>{
    setTimeout(()=>{
      card.classList.add('badge-shine');
      setTimeout(()=>card.classList.remove('badge-shine'),1200);
    }, i*80);
  });
}

function shimmerNewBadges(prevEarned){
  // prevEarned: Set of badge ids that were earned before re-render
  const SECRET_IDS=new Set(['secret_ashbless','secret_bedside','secret_forbidden','secret_anubis','secret_month','secret_whale','secret_speed','secret_multi','secret_100pg']);
  setTimeout(()=>{
    document.querySelectorAll('.badge-card.earned').forEach(card=>{
      const onclick=card.getAttribute('onclick')||'';
      const m=onclick.match(/toggleBadgeDetail\('([^']+)'\)/);
      if(m&&!prevEarned.has(m[1])){
        card.classList.add('badge-shine');
        setTimeout(()=>card.classList.remove('badge-shine'),3600);
        const bid=m[1];
        if(bid==='secret_creator') launchConfetti('creator');
        else if(SECRET_IDS.has(bid)) launchConfetti('secret');
        else launchConfetti('badge');
      }
    });
  },80);
}

function currentEarnedBadgeIds(){
  const books=validBooks();
  const ids=new Set();
  BADGE_CATS.forEach(cat=>cat.badges.forEach(b=>{if(bstat(b,books).earned)ids.add(b.id);}));
  return ids;
}

