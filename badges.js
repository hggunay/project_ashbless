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
      {id:'semavi',tier:'gold',  icon:'✨', name:'Dört Kitap Bilgesi',     desc:'Tevrat, Zebur, İncil ve Kuran-ı Kerimi oku ("kutsal" türünde etiketle).', check:b=>cap(b.filter(x=>(x.genres||[]).includes('kutsal')).length,4)},
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
      {id:'secret_whale', tier:'diamond',icon:'🐋', name:'Balina',          desc:'1000 sayfadan uzun bir kitap oku.', check:b=>flag(b.some(x=>x.pages&&x.pages>=1000))},
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

function isRetroactive(b){
  return b.retroactive===true;
}
function bstat(badge,books,ctx){
  const filteredBooks = SERIES_BADGE_IDS.has(badge.id)
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
  const filtered=SERIES_BADGE_IDS.has(badge.id)?books:books.filter(b=>!isRetroactive(b));
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
