// ══════════════════════════════════════════════════════════════════════
// SEKME KARŞILAMA ŞERİTLERİ
// ══════════════════════════════════════════════════════════════════════
// Fikir Gökşin'in (2026-09-03): hesabı açan kişi uygulamaya giriyor ama hangi
// sekmenin ne işe yaradığını bilmiyor. Bir sekmeye girildiğinde o sekmeyi
// anlatan küçük bir şerit çıkıyor; "tekrar gösterme"ye basılana kadar her
// girişte görünmeye devam ediyor.
//
// ⚠️ BAKIM KURALI (Gökşin, 2026-09-04): uygulamaya YENİ BİR SEKME eklenirse,
// o sekmenin karşılama metnini yazmak da işin parçasıdır. Yoksa yeni sekme
// sessizce metinsiz kalır ve kimse fark etmez — "seri kırıldı" kusurunun
// yıllarca görünmemesi gibi.
//
// ⚠️ "Görüldü" bilgisi localStorage'da, CİHAZ BAŞINA (Gökşin'in kararı,
// 2026-09-11: "firebase'de yer tutmaya değer bir özellik değil, tasarruflu
// olalım"). Sonucu: aynı kişi telefonda şeridi bir kez daha görür. Yeni üye
// için sorun değil, asıl amaç zaten ilk tanışma.
// Firebase'e taşınacak olsaydı `aa-v4` altına yeni bir düğüm gerekirdi ve
// o düğümün DÖRT yerde ele alınması gerekirdi (bkz. denetim raporu, 10.09).
// ══════════════════════════════════════════════════════════════════════

const KARSILAMA_DEPO = 'aa-karsilama';

/* Metinler Gökşin tarafından onaylandı (2026-09-11). Her biri aynı kalıpta:
   NE OLDUĞU + İLK NE YAPMALI. Ekranda gerçekten görünen sözcükler (Tsundoku,
   "+ Kitap Ekle", "🎲 Eğlence") bilerek adıyla anıldı — metinle ekran
   birbirini tutsun diye. */
const KARSILAMA_METINLERI = {
  feed: {
    baslik: '🏠 Ana Sayfa',
    metin: 'Herkesin okuma akışı burada: değerlendirmeler, alıntılar, hikâyeler ve ' +
           'birlikte okumalar. Üstteki süzgeçlerden yalnızca ilgilendiğin türü seçebilirsin.'
  },
  myBooks: {
    baslik: '📖 Kitaplarım',
    metin: 'Okuduğun, okumakta olduğun ve okumak istediğin her kitap burada toplanıyor. ' +
           '<b>+ Kitap Ekle</b> ile başla — adını yazıp aratabilir ya da arka kapaktaki ' +
           'barkodu okutabilirsin.'
  },
  series: {
    baslik: '📚 Seriler',
    metin: 'Çok kitaplı serileri buradan takip edersin; hangisinde kaldığın ve kaç kitabın ' +
           'kaldığı tek bakışta görünür. <b>+ Yeni Seri</b> ile serini oluştur, kitaplarını ' +
           'içine ekle.'
  },
  stories: {
    baslik: '📖 Hikâyelerim',
    metin: 'Kısa öyküler için — Kitaplarım\'ın küçük kardeşi. Bir öykü kitabının tamamını ' +
           'bitirmeden içinden yalnızca birkaç öykü okuduysan, kitabı değil <b>okuduğun ' +
           'öyküleri</b> buraya kaydedersin. Herkesin konuştuğu bir öyküyü unutmamak için ' +
           '<b>⏳ Okunacak</b> olarak da işaretleyebilirsin; öyle olanlar 🔖 Tsundoku ' +
           'bölümünde birikir.<br><br>' +
           'Öykü her zaman basılı olmuyor: kaynağı <b>kitap, e-kitap, sesli ya da web</b> ' +
           'seçebilir, internetten okuduysan bağlantısını da kaydedebilirsin — böylece ' +
           'nereden okuduğun kayıtlı kalır.'
  },
  journal: {
    baslik: '📒 Defterim',
    metin: 'İki bölümü var: <b>Yayınlar</b>\'a yazdığın değerlendirme ve alıntılar akışta ' +
           'herkese görünür, <b>Kişisel Notlar</b> ise yalnızca senin gözüne. Bir kitap ' +
           'seçip yazmaya başlaman yeterli.'
  },
  shelf: {
    baslik: '🗄️ Kitap Rafım',
    metin: 'Bu, okuma listen değil — <b>evindeki fiziksel kitaplığın</b>. Hangi kitabın ' +
           'sende olduğunu unutmamak için. Önce bir raf oluştur ("Odamdaki Kitaplık" gibi), ' +
           'sonra kitapları içine ekle. Dergiler için ayrı bir bölüm var.'
  },
  myBadges: {
    baslik: '🏅 Rozetlerim',
    metin: 'Okudukça rozetler açılıyor: tür rozetleri, okuma serileri, seri rozetleri. ' +
           'Bazıları <b>gizli</b> — şartını bilmeden, beklemediğin bir anda karşına çıkıyorlar.'
  },
  stats: {
    baslik: '📊 İstatistikler',
    metin: 'Okuma alışkanlığının sayılara dökülmüş hâli: aylık seriler, türler, ülkeler. ' +
           '<b>🎲 Eğlence</b> alt sekmesinde ise ölçüm değil oyun var — falına bakabilir, ' +
           'Şeytan ile Melek\'in ayın hesabını görüşmesini izleyebilirsin.'
  },
  members: {
    baslik: '👥 Üyeler',
    metin: 'Kütüphanenin diğer üyeleri. Birine dokununca profiline geçip ne okuduğunu, ' +
           'rozetlerini ve rafını görebilirsin.'
  },
  settings: {
    baslik: '⚙️ Ayarlar',
    metin: 'Profilin, avatarın ve güvenlik ayarların burada. Girişini e-posta ile güvenli ' +
           'hale getirmek ve verilerinin yedeğini almak da bu sayfadan.'
  }
};

function karsilamaGorulenler(){
  try{ return JSON.parse(localStorage.getItem(KARSILAMA_DEPO) || '{}'); }
  catch(e){ return {}; }
}
function karsilamaGizle(id){
  try{
    const g = karsilamaGorulenler();
    g[id] = true;
    localStorage.setItem(KARSILAMA_DEPO, JSON.stringify(g));
  }catch(e){}
  const s = document.getElementById('karsilama-' + id);
  if(s) s.remove();
}

/* Sekme her açıldığında çağrılıyor (showPanel → renderPanelContent sonrası).
   ⚠️ Başkasının profiline bakarken GÖSTERİLMİYOR: o an ekrandaki veri senin
   değil, "kitaplarını buraya ekle" demek yanıltıcı olurdu. */
function karsilamaGoster(id){
  const panel = document.getElementById(id);
  const kayit = KARSILAMA_METINLERI[id];
  if(!panel || !kayit) return;
  if(typeof viewing !== 'undefined' && viewing) return;
  if(karsilamaGorulenler()[id]) return;
  if(document.getElementById('karsilama-' + id)) return;   // zaten duruyor

  const s = document.createElement('div');
  s.id = 'karsilama-' + id;
  /* ⚠️ Renkler AÇIKÇA veriliyor: panel zemini koyu, renk verilmezse yazı
     görünmez oluyor (proje kalıbı). Örnek alınan yer `.viewing-banner`. */
  s.style.cssText =
    'background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.3);' +
    'border-radius:6px;padding:.8rem 1rem;margin-bottom:.85rem;' +
    'font-family:\'Crimson Pro\',serif;color:var(--parchment);line-height:1.6';
  s.innerHTML =
    '<div style="font-family:\'Playfair Display\',serif;font-size:1rem;color:var(--gold);' +
         'margin-bottom:.35rem">' + kayit.baslik + '</div>' +
    '<div style="font-size:.93rem">' + kayit.metin + '</div>' +
    '<button onclick="karsilamaGizle(\'' + id + '\')" ' +
      'style="margin-top:.7rem;background:transparent;border:1px solid rgba(201,162,39,.45);' +
      'border-radius:4px;padding:.28rem .7rem;font-family:\'Space Mono\',monospace;' +
      'font-size:.62rem;color:var(--gold);cursor:pointer">✕ Tekrar gösterme</button>';

  panel.insertBefore(s, panel.firstChild);
}

/* Ayarlar'dan hepsini geri getirmek için — yanlışlıkla kapatan ya da yeniden
   okumak isteyen için. Şeritler yeniden görünür hale geliyor. */
function karsilamaSifirla(){
  try{ localStorage.removeItem(KARSILAMA_DEPO); }catch(e){}
  if(typeof mesajGoster === 'function')
    mesajGoster('Sekme tanıtım yazıları geri geldi.', 'uyari');
}
