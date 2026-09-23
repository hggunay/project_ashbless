# OYUN EKLEME — Ashbless

Bu dosya üç bölüm:

- **Bölüm 1** — Claude Free'ye yapıştırılacak genel sözleşme (her oyun için aynı).
- **Bölüm 2** — Gökşin ve Claude Code için: dosya nereye gidecek, ne zaman
  deploy gerekir, nasıl ölçülür.
- **Bölüm 3** — sıradaki oyunların ayrıntıları. Free'ye önce Bölüm 1'i, sonra
  buradaki ilgili başlığı yapıştır.

> Bu bir çalışma dosyası, **depoya yüklenmesi gerekmiyor.**

---

## ⚠️ EN SIK YAPILAN HATA — İKİ PARÇA, TEK MESAJ

Free'ye **Bölüm 1 + o oyunun Bölüm 3 başlığı**, ikisi birlikte gider.
Tek başına Bölüm 1 yetmez: içinde oyunun ne olduğu yazmaz, Free de
"mekanik ne, hangi kitap, kim karar verecek" diye sormaya başlar.

(2026-09-21'de tam bu oldu: 1984 ve WWW için yalnız Bölüm 1 gitti, gelen
soruların hepsinin cevabı Bölüm 3'te yazılıydı. Bir tur boşa gitti.)

**Kopyalama sırası:**
1. Bölüm 1'in `----` çizgileri arasındaki her şey
2. Hemen altına Bölüm 3'ten o oyunun başlığı (`## Oyun: …`'dan sonraki
   `---` işaretine kadar)
3. Tek mesajda gönder.

---

## Önce bil: bir oyun eklemek kaç dosyaya dokunuyor?

**İki dosya, ve ikisi de Claude Free'ye yapıştırılabilecek kadar küçük:**

| Dosya | Boyut | Ne yapılacak |
|---|---|---|
| `oyunlar/<yeni-oyun>.html` | — | yeni dosya, Free yazacak |
| `oyunlar/oyun-listesi.js` | 3 KB | listeye bir kayıt eklenecek |

`index.html`'e **dokunmak gerekmiyor** (645 KB, zaten yapıştırılamaz). Sebebi:

- Yeni oyun dosyasının tarayıcıda bir kopyası yok, ilk açılışta taze geliyor.
- `oyun-listesi.js` değiştiğinde tarayıcı onu **en geç 10 dakika içinde**
  kendiliğinden yeniliyor (GitHub Pages `max-age=600`, 2026-09-20'de canlıdan
  doğrulandı). Yani deploy'dan hemen sonra oyun görünmezse 10 dakika bekle.

**Sürüm damgası yalnız ŞU DURUMDA gerekir:** var olan bir oyun dosyasını
DEĞİŞTİRDİĞİNDE. O zaman `oyunlar.js` içindeki `OYUN_SURUM` güncellenmeli
(ve `oyunlar.js` değiştiği için `index.html`'deki damgası da). Bu iş Claude
Code'a düşer. Yeni oyun eklerken gerekmez.

---

# BÖLÜM 1 — CLAUDE FREE'YE YAPIŞTIRILACAK

> Aşağıdaki "----" çizgileri arasındaki her şeyi kopyalayıp Claude'a yapıştır,
> sonuna da ne istediğini yaz (oyunun adı, kuralı, hangi kitaptan).

----

Ashbless adlı bir kitap takip uygulaması için tek dosyalık bir HTML oyunu
yazmanı istiyorum. Aşağıdaki kurallar uygulamanın gereği, hepsi zorunlu.

## Ne üreteceksin
**Tek bir `.html` dosyası.** İçinde HTML, CSS ve JavaScript birlikte.
Uygulama bu dosyayı bir `<iframe>` içinde açıyor.

## Kesin kurallar

1. **Hiçbir dış kaynak yok.** CDN yok, Google Fonts yok, dış görsel yok,
   `fetch` yok. Her şey dosyanın içinde. (Görsel gerekiyorsa ya canvas ile
   çiz ya da bana söyle, `oyunlar/gorseller/` klasörüne koyarız.)
2. **`alert()`, `confirm()`, `prompt()` KULLANMA.** Bunlar iframe'i kilitliyor.
   Mesajlar için sayfanın içindeki mesaj satırını kullan.
3. **Ekrana sığacak.** Oyun telefonda da açılıyor. Düğmeler hiçbir ekranda
   alta taşmamalı, sayfa kaydırılmamalı. Aşağıdaki iskeletteki esnek yerleşim
   ve `boyutlandir()` fonksiyonu bunu çözüyor — **ikisini de aynen koru.**
   320×568'den 1100×760'a kadar çalışmalı.
4. **Yüksekliği değişen hiçbir kutu olmayacak.** Mesaj satırı, sayaçlar,
   uyarılar — hepsi sabit yükseklikte olmalı (`height`, `min-height` değil).
   Bir yazı bir satırdan ikiye çıktığında aşağısı büyüyor, tuval onu
   dengelemek için küçülüyor ve **ekran zıplıyor**. Uzun metinleri sığdır ya
   da kısalt; kutuyu büyütme.
5. **Emoji'ye kritik iş yükleme.** Emoji her cihazda farklı görünüyor; oyunun
   anlaşılması ona bağlı olmasın. Oyun taşlarını canvas ile çiz. Emoji yalnız
   süs olarak kullanılabilir.
6. **Kontrast.** Oyun taşları zeminden açıkça ayrılmalı. (Bu oyunda bir kez
   yanıldık: kum rengi zemin üstünde kum rengi figürler seçilmiyordu.)
7. **Türkçe arayüz.** Bütün yazılar Türkçe.
8. **Kural görünür olacak — ama sade.** Oyuncuyu etkileyen hiçbir kural yalnız
   kodda kalmasın: ne yapılır, hangi şey kaç puan, **hangi hareket ceza getirir**
   `?` düğmesindeki yardım kutusunda yazsın. Konvansiyona güvenme.
   **Yüzde, saniye, olasılık YAZMA** — kısa ve merak uyandıran cümleler kur
   ("Kırmızılar bazen iyi bir nesnenin yanına düşer. Hangisini yakalayacaksın?").
   Yardım telefonda tek ekrana sığsın. (2026-09-24, Gökşin: "çok fazla % anlatılmış,
   çok teknik... sade ve gizemli bir açıklama yeter.")
9. **ÇIKMAZ OLMAYACAK.** Oyunun, hiçbir şeyin değişemeyeceği bir duruma
   girmesi yasak. Bir taş sıkışabiliyorsa kurtulma yolu olmalı; puan kaynağı
   tükenebiliyorsa yenilenmeli. Bu kuralı iki oyunda da sonradan öğrendik,
   ikisinde de oyun sessizce ölmüştü.
10. **Yeniden başlatma düğmesi olacak.**
11. **Ses yok.**
12. **Dokunma ayarları**: canvas'ta `touch-action:none`, sayfada
    `-webkit-touch-callout:none` ve `contextmenu` engeli. (Tablette uzun
    basınca tarayıcının kopyala/yapıştır menüsü açılıyordu.)

## Skoru bildirme — bu blok aynen kalacak

Oyun bitince tek bir mesaj atıyor. Oyun veritabanı, kullanıcı, kayıt hakkında
**hiçbir şey bilmiyor**; kaydı uygulama yapıyor.

```js
function skoruBildir(p){
  if(window.parent===window) return;               // tek başına açıldıysa sessiz
  try{
    window.parent.postMessage({ ashbless:'oyun-skor', oyun:OYUN_ID,
                                skor:Math.max(0,Math.round(p)) }, '*');
  }catch(e){}
}
```

- `OYUN_ID` listedeki kimlikle **birebir aynı** olmalı.
- Skor **tam sayı**, 0 ile 1.000.000 arası. Büyük daha iyidir (en yüksek skor
  tutuluyor). Oyunun doğası "küçük daha iyi" ise (süre gibi), skoru
  tersine çevir — örneğin `10000 - saniye`.
- **Oyun başına bir kez**, oyun bittiğinde gönder.
- Zaman sınırı olmayan, bitmeyen bir oyun tasarlama; skor bir yerde kapanmalı.

## Başlangıç iskeleti

Bu iskeletten başla. `boyutlandir()`, `skoruBildir()` ve yerleşim yapısına
dokunma; oyunun kendi mantığını aralara yaz.

**Tahta canvas olmak zorunda değil.** Kutu/kart ızgarası gibi oyunlarda
`<canvas>` yerine `.tahta` içine normal HTML düğmeleri koyabilirsin — o zaman
`boyutlandir()`'a gerek kalmaz, ama `.tahta`nın esnek yapısı (`flex:1;
min-height:0`) ve taşmama kuralı aynen geçerli.

```html
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>OYUN ADI</title>
<style>
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:#1a1410;color:#ecdcc0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
     overflow:hidden;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
.app{height:100%;display:flex;flex-direction:column;align-items:center;
     padding:6px 8px calc(6px + env(safe-area-inset-bottom));gap:6px}
.ust{width:100%;max-width:640px;display:flex;align-items:center;gap:8px}
h1{margin:0;font-size:17px;flex:1;text-align:left;letter-spacing:.5px}
.yardim{width:30px;height:30px;flex:none;border-radius:50%;font-size:15px;font-weight:700;
        background:#3a2b1c;color:#ecdcc0;border:1px solid #7d5f39}
.sayac{width:100%;max-width:640px;display:flex;justify-content:space-between;font-size:12px;
       background:#2a1f15;border:1px solid #4c3826;border-radius:7px;padding:5px 9px}
.sayac b{color:#ffd98a;font-size:13px}
.tahta{flex:1 1 auto;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
canvas{background:#a98a55;border:2px solid #76532c;border-radius:8px;touch-action:none;display:block}
.alt{width:100%;max-width:640px;display:flex;align-items:center;justify-content:space-between;gap:10px}
/* SABİT yükseklik — min-height DEĞİL. Değişken olursa yazı iki satıra
   çıktığında aşağısı büyür, tuval küçülür ve ekran zıplar. */
#msg{width:100%;max-width:640px;font-size:12px;line-height:1.35;height:2.8em;
     overflow:hidden;color:#e8d6b4}
button{background:#3a2b1c;color:#ecdcc0;border:1px solid #7d5f39;border-radius:8px;
       font-size:13px;min-height:38px;padding:0 12px}
button:active{background:#6d5030}
#yardimKat{position:fixed;inset:0;background:rgba(16,10,5,.92);display:none;overflow:auto;padding:18px;z-index:9}
#yardimKat.acik{display:block}
.yk{max-width:520px;margin:auto;background:#2a1f15;border:1px solid #6b4d2c;border-radius:12px;padding:16px 18px}
.yk h2{margin:0 0 10px;font-size:17px;color:#ffd98a}
.yk p{margin:0 0 9px;font-size:13.5px;line-height:1.55}
.yk b{color:#ffc978}
.yk .kapat{width:100%;margin-top:6px;height:38px;background:#6b4d2c;color:#f5e3bb;
           border:none;border-radius:8px;font-size:14px}
</style>
</head>
<body>
<div class="app">
  <div class="ust">
    <h1>OYUN ADI</h1>
    <button class="yardim" id="yardimAc" aria-label="Nasıl oynanır">?</button>
  </div>

  <div class="sayac">
    <span>Puan <b id="puan">0</b></span>
  </div>

  <div id="msg">Kısa bir yönlendirme cümlesi.</div>

  <div class="tahta"><canvas id="tuval" width="600" height="600"></canvas></div>

  <div class="alt">
    <button id="yeni">YENİ OYUN</button>
  </div>
</div>

<div id="yardimKat"><div class="yk">
  <h2>Nasıl oynanır</h2>
  <p>Bütün kurallar, sayılar ve olasılıklar burada yazılı olacak.</p>
  <button class="kapat" id="yardimKapat">Anladım</button>
</div></div>

<script>
const OYUN_ID="oyun-kimligi";          // oyun-listesi.js'teki id ile AYNI
const T=600;                            // tuvalin iç çözünürlüğü
const tuval=document.getElementById("tuval"), ctx=tuval.getContext("2d");
let puan=0, bitti=false;

function mesaj(t){ document.getElementById("msg").textContent=t; }
function sayaclar(){ document.getElementById("puan").textContent=puan; }

function ciz(){
  ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1;
  ctx.clearRect(0,0,T,T);
  // ... oyunun çizimi ...
}

function yeniOyun(){
  puan=0; bitti=false;
  // ... durumu sıfırla ...
  sayaclar(); mesaj("Kısa bir yönlendirme cümlesi."); boyutlandir(); ciz();
}

function oyunBitti(neden){
  bitti=true;
  mesaj(neden+" Puan: "+puan);
  ciz();
  skoruBildir(puan);
}

/* ── SKORU BİLDİR — DEĞİŞTİRME ─────────────────────────────────────── */
function skoruBildir(p){
  if(window.parent===window) return;
  try{
    window.parent.postMessage({ ashbless:'oyun-skor', oyun:OYUN_ID,
                                skor:Math.max(0,Math.round(p)) }, '*');
  }catch(e){}
}

/* ── TUVALİ KALAN BOŞLUĞA SIĞDIR — DEĞİŞTİRME ──────────────────────── */
function boyutlandir(){
  const k=document.querySelector(".tahta").getBoundingClientRect();
  const b=Math.max(150, Math.floor(Math.min(k.width,k.height,620))-12);
  tuval.style.width=b+"px"; tuval.style.height=b+"px";
}
window.addEventListener("resize",boyutlandir);
if(window.visualViewport) window.visualViewport.addEventListener("resize",boyutlandir);
document.addEventListener("contextmenu",e=>e.preventDefault());

const kat=document.getElementById("yardimKat");
const yardimKapat=()=>kat.classList.remove("acik");
document.getElementById("yardimAc").onclick=()=>kat.classList.add("acik");
document.getElementById("yardimKapat").onclick=yardimKapat;
kat.addEventListener("click",e=>{ if(e.target===kat) yardimKapat(); });
window.addEventListener("keydown",e=>{ if(e.key==="Escape") yardimKapat(); });
document.getElementById("yeni").onclick=yeniOyun;

boyutlandir(); yeniOyun();
</script>
</body>
</html>
```

## Son olarak bana şunu da ver

Dosyanın sonunda, `oyun-listesi.js`'e eklenecek kaydı ayrıca yaz:

```js
{
  id: 'oyun-kimligi',                    // kısa, Türkçe karaktersiz, DEĞİŞMEYECEK
  ad: 'Oyunun Adı',
  kitap: 'Kitap Adı — Yazar',
  aciklama: 'İki cümle. SPOILER YOK: kitabı okumamış üyeler de bu yazıyı görüyor.',
  ikon: '🎮',                            // tek emoji
  tur: 'oyun',                           // skor tutulacaksa 'oyun', izlenecekse 'simulasyon'
  skorAdi: 'puan',                       // "En iyin: 23 baharat" derken kullanılır
  dosya: 'oyunlar/oyun-kimligi.html',
  tetikleyiciler: {
    seriler: ['Seri Adı'],
    kitaplar: [{ baslik: 'Kitap Adı', yazar: 'Yazar', takmaAdlar: ['Başka Çevirisi'] }],
    yazarlar: [],
    baslikIcerir: [{ yazar: 'Yazar', baslikIcerir: 'kelime' }],
    haric: []
  }
}
```

**Not:** Oyunun kendisi yalnız kitabı okumuş üyelere açılıyor, o yüzden oyunun
İÇİNDE spoiler serbest. Ama yukarıdaki `aciklama` herkese görünüyor —
orada spoiler olamaz.

----

# BÖLÜM 2 — GÖKŞİN VE CLAUDE CODE İÇİN

## Yeni oyun geldiğinde

1. HTML dosyasını `claude code\oyunlar\` klasörüne kaydet.
2. `claude code\oyunlar\oyun-listesi.js` içindeki `OYUN_LISTESI` dizisine
   kaydı ekle (Free'nin verdiği blok). Virgüllere dikkat.
3. Deploy: **`oyunlar` klasörünü depoya sürükle.** Başka bir şey gerekmiyor.
4. Oyun hemen görünmezse **10 dakika bekle** (tarayıcı önbelleği).

## Var olan bir oyunu DEĞİŞTİRDİYSEN (bu iş Claude Code'a düşer)

`oyunlar.js` içindeki `OYUN_SURUM` bir sonraki değere getirilmeli, sonra
`oyunlar.js` ve `index.html` de deploy edilmeli. Yoksa tarayıcı oyunun eski
hâlini 10 dakika daha gösterir.

## Kapıyı açmak (özelliği herkese göstermek)

Şu an oyunlar sekmesi ve akıştaki rekor kartları yalnız `hggunay` ve `deneme`
hesaplarında görünüyor. Açmak için **tek bir satır**, `oyunlar.js` içinde:

```js
const OYUN_TEST_HESAPLARI = [];        // boş liste = herkese açık
```

`feed.js` değişmiyor; oradaki kapı bu fonksiyona bağlı. `oyunlar.js` 13 KB,
yani gerekirse Claude Free'ye de yaptırılabilir. Ardından `oyunlar.js` +
`index.html` (damga) deploy edilir.

**Ne zaman açalım:** oyun sayısı 4-5'e ulaşınca. Şu an iki oyun var ve ikisi
de çoğu üyede kilitli görünür.

## Oyunu ölçmek (Claude Code ile)

Bugün iki oyunda da denge hatalarını ancak ölçerek bulduk; göz kararı
yetmedi. Yöntem: oyunun `<script>` bloğunu Node'un `vm`'inde çalıştırmak,
DOM ve canvas'ı taklit etmek, oyunu elle döndürmek. Tarayıcı gerekmiyor,
yüzlerce oyun saniyeler içinde koşuyor.

```js
const fs=require('fs'), vm=require('vm');
const kod=fs.readFileSync(DOSYA,'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const ctx=new Proxy({},{get:(t,k)=>k==='createRadialGradient'
  ?()=>({addColorStop(){}}):()=>{}, set:()=>true});
const kutu={};
const el=id=>(kutu[id]=kutu[id]||{id,textContent:'',className:'',style:{},onclick:null,
  addEventListener(){},classList:{add(){},remove(){}},getContext:()=>ctx,
  getBoundingClientRect:()=>({width:600,height:600})});
const o={console,Math,Date,JSON,Object,Set,Array,setTimeout,
  document:{getElementById:el,querySelector:()=>el('t'),querySelectorAll:()=>[],addEventListener(){}},
  window:{addEventListener(){},visualViewport:null},
  Image:function(){this.onerror&&setTimeout(()=>this.onerror(),0);},
  requestAnimationFrame:()=>{}};
o.window.parent=o.window;                 // postMessage gitmesin
vm.createContext(o); vm.runInContext(kod,o);
const move=vm.runInContext('move',o);     // oyunun kendi fonksiyonları
```

Sonra binlerce rastgele oyun koşturup şunlara bak:

- **Çıkmaz var mı**: durum üst üste N hamle hiç değişiyor mu?
- **Hep aynı sonuç mu çıkıyor**: kazanan/biten dağılımı ne kadar dengeli?
- **Tutarlılık**: taşlar tahtadan çıkıyor mu, üst üste biniyor mu?

⚠️ **Tarayıcıdan dinamik ölçmeye çalışma.** Arka plandaki sekmede Chrome
`requestAnimationFrame`'i tamamen durduruyor; "hiçbir şey değişmiyor" diye
yarım saat aradığımız hata buydu.

## Bugüne kadar öğrenilenler (yeni oyunlarda tekrar etmeyelim)

- **Çıkmaz sessizce oluşur.** Maymunlar Gezegeni'nde halkada komşu olmayan
  iki tür kalınca hiçbir dönüşüm kalmıyordu; Kumda Ritim'de solucan kendi
  halkasına kapanıp bir daha hiç kımıldamıyordu. İkisi de nadirdi (%0,7),
  ikisi de oyunu öldürüyordu. Her yeni oyunda bunu ayrıca ara.
- **Kum renginde figür, kum renginde zeminde görünmüyor.** Zemin figürlerden
  belirgin biçimde koyu olsun.
- **Emoji her cihazda aynı değil.** Oyun taşlarını çiz.
- **Görsel üretimi**: Gemini "saydam zemin" istendiğinde arkaya satranç
  deseni çiziyor, gerçekten saydam yapmıyor. Düz tek renk zemin iste, kesmek
  kolay olur. Gövde/kuyruk gibi birbirine bağlanması gereken parçaları
  görselle değil kodla çiz.
- **Kritik bilgi göz ucuyla görünsün.** Ritim uyarısı üstteki küçük sayaçta
  duruyordu, kimse fark etmiyordu; çerçeveyi renklendirince çözüldü.

---

# BÖLÜM 3 — SIRADAKİ OYUNLARIN AYRINTILARI

Her oyun için: önce **Bölüm 1**'i yapıştır, sonra buradaki ilgili başlığı.
Tek mesajda ver, parça parça değil.


## Oyun: 1984 — Çift Düşün
George Orwell'in *1984* romanından. Hafıza oyunu, ama tersine çalışıyor.

### Tahta
- **20 kapalı kutu** (4×5), dama tahtası gibi dizili.
- Kutuya basınca içindeki **kelime** görünür.
- 20 kutu = **10 çift**. Her kelime yalnızca bir kutuda bulunur, tekrar yok.

### Çiftler iki türlü
- **7 ZIT çift** (ör. savaş–barış): ikisini açarsan **eşleşir**, ikisi de açık kalır, **+1 puan**.
- **3 EŞ çift** (aynı anlama gelen iki kelime): ikisini açarsan **Düşünce Polisi sayacı +1**, ikisi de kapanır.
- İki kutu ne zıt ne eşse: hiçbir şey olmaz, ikisi de kapanır.

### Oyunun kalbi — bunu bozma
Oyuncu iki kelimenin **birbiriyle ilgili olduğunu görür ama zıt mı eş mi
olduğunu ANLAYAMAZ.** Riski alıp açması gerekir. Romanın "savaş barıştır"
fikri mekaniğin içine gömülü; oyunun bütün gerilimi buradan geliyor.

### Bitiş
- **5 eş çift açılırsa** Düşünce Polisi yakalar, oyun biter.
  Ekranda büyük harflerle **2 + 2 = 5** belirir.
- **7 zıt çiftin hepsi bulunursa** oyun kazanılır.
  Ekranda **2 + 2 = 4** belirir (Winston'ın son direnci).

### Polis sayacı
Ekranda görünür ama **kaç hak kaldığı YAZMAZ** — sadece sayı artar.
Oyuncu sınırın 5 olduğunu bilmemeli, tedirgin kalmalı.
(Yine de yardım kutusunda kuralların tamamı yazılı olacak — orası ayrı.)

### Puan
Yakalanana kadar bulunan **zıt çift sayısı**. `skorAdi: 'çift'`

### Havuz
**Kelime havuzunu SEN yazacaksın** — dosyanın içinde, oyunun bir parçası olarak.
Bir oyunluktan büyük olacak, her oyun rastgele çekecek:
- **18 zıt çift**
- **10 eş çift**
Her oyun bunlardan rastgele **7 zıt + 3 eş** seçer. Böylece her oyun farklı olur.

**Omurga kitabın kendi sloganları olsun:** savaş–barış, özgürlük–kölelik,
cahillik–güç. Geri kalanını sen doldur. 12 zıt çiftin altına inme — havuz
küçülürse oyunlar birbirine benzemeye başlar.

### Atmosfer
Sessiz, steril, soğuk. Parti afişi estetiği. Kutlama, renk cümbüşü, animasyon
şenliği yok. Kutular açılırken sade bir geçiş yeter.

### oyun-listesi.js kaydı — dosyanın sonunda bunu da ver
```js
{
  id: 'cift-dusun',
  ad: 'Çift Düşün',
  kitap: '1984 — George Orwell',
  aciklama: 'Kutuları aç, zıt kelimeleri eşleştir. Ama bazıları zıt değil aynı —
             ve bunu ancak açtığında anlarsın.',
  ikon: '👁️',
  tur: 'oyun',
  skorAdi: 'çift',
  dosya: 'oyunlar/cift-dusun.html',
  tetikleyiciler: {
    kitaplar: [{ baslik: '1984', yazar: 'George Orwell',
                 takmaAdlar: ['Bin Dokuz Yüz Seksen Dört', 'Nineteen Eighty-Four'] }]
  }
}
```

⚠️ Tetikleyici **kitap adına** bağlı, yazara değil: kütüphanede Orwell'in
"Hayvan Çiftliği"i de var, o bu oyunu açmamalı.


---

## WWW — Hücresel Otomat  *(simülasyon, skor yok)*
Robert J. Sawyer'ın *WWW* serisinden. Ağda kendiliğinden bir bilinç doğuyor.

### Ne olacak
- Kareli bir tahta. Her kare ya **canlı** ya **ölü**.
- Tahta kendi kendine adım adım ilerliyor: komşu sayısına bakarak kareler
  canlanıp ölüyor (Conway'in Yaşam Oyunu kuralları uygun).
- **Kullanıcı istediği kareye basıp canlandırabilir ya da öldürebilir.**
  Tek müdahalesi bu — desene dokunup ne olacağını izliyor.
- Hız düğmesi olsun (1× / 2× / 4×).

### Izgara ve başlangıç
- **30×30 kare.** Telefonda da parmakla basılabilmeli, kare çok küçülmesin.
- **Başlangıç rastgele:** karelerin yaklaşık dörtte biri canlı.
- ⚠️ **Klasik desen İSTEMİYORUM** (Glider, Pulsar, Gosper vb.). Onlar ya
  sonsuza kadar aynı şeyi tekrarlar ya birkaç adımda durur — ikisi de
  izlenecek bir şey bırakmaz. Ayrıca kitabın konusu bir şeyin *kendiliğinden*
  uyanması; düzensiz bir başlangıç buna uyuyor.

### ⚠️ En önemli kural: durunca BİTER
Bu tür desenler er geç durur — ya her şey ölür ya da donup kalır.
**Desen durduğunda (üst üste birkaç adımda hiçbir kare değişmiyorsa ya da
hiç canlı kare kalmadıysa) simülasyon biter.** Ekranda kısa bir kapanış
yazısı çıkar ve "Yeniden" düğmesi kalır. **Kurtarma mekanizması EKLEME** —
yeni hücre göndermek, otomatik canlandırmak gibi şeyler istemiyorum.

### Atmosfer
Sade. Koyu zemin, canlı kareler parlak. Gösteri yok.
**Nöron/beyin çizme, soyut kal** — kare kare bir ızgara yeter, canlı kareler
hafif parlasın. Kitabın kahramanı küresel bir yapay bilinç ama onu resmetmeye
çalışmak tek dosyaya ağır gelir; sadelik zaten temaya daha yakın.

### Skor
**Yok.** Bu bir simülasyon, izlenir. `tur: 'simulasyon'` olacak ve
`skoruBildir` hiç çağrılmayacak.

### oyun-listesi.js kaydı — dosyanın sonunda bunu da ver

⚠️ `seriler: ['WWW']` ancak kitabın **seri alanı** tam olarak "WWW" yazıyorsa
tutar. Kütüphanede başka türlü yazıldıysa (ör. "WWW Üçlemesi") o da eklenmeli.
Zaten üç kitabın adı tek tek yazılı, seri alanı boş olsa da oyun açılır.

```js
{
  id: 'www-otomat',
  ad: 'Uyanış',
  kitap: 'WWW serisi — Robert J. Sawyer',
  aciklama: 'Kareler kendiliğinden canlanıp ölüyor. Dokun, deseni değiştir, ne olacağını izle.',
  ikon: '🧠',
  tur: 'simulasyon',
  dosya: 'oyunlar/www-otomat.html',
  tetikleyiciler: {
    seriler: ['WWW'],
    kitaplar: [
      { baslik: 'Uyanış', yazar: 'Robert J. Sawyer', takmaAdlar: ['Wake',   'WWW: Wake'] },
      { baslik: 'Takip',  yazar: 'Robert J. Sawyer', takmaAdlar: ['Watch',  'WWW: Watch'] },
      { baslik: 'Mucize', yazar: 'Robert J. Sawyer', takmaAdlar: ['Wonder', 'WWW: Wonder'] }
    ]
  }
}
```

---

## Algernon'a Çiçekler — Fare Labirenti  *(oyun, skorlu)*
Daniel Keyes'in *Algernon'a Çiçekler* romanından. Bir fareyi labirentten
çıkarıyorsun. Ama oyunun asıl konusu labirent değil, **farenin zekâsı.**

### Oyunun şekli — kitabın şekli
Roman bir yükseliş ve geri iniş eğrisidir. Oyun da öyle:

- **Başta fare aptaldır:** labirentin yalnız **bir kare** ötesini görür.
- **Her labirent çözüldükçe zekâ artar:** görüş alanı genişler, geçtiği
  yollar haritada kalır, labirentler büyür.
- **8. labirentten sonra geri iniş başlar:** görüş daralır, hatırlanan
  yollar **kararır**, süre kısalır. Labirentler küçülmez.
- **Kazanmak yok, olamaz da.** Er ya da geç süre yetişmez. Oyun orada biter.

### Sayılar — bunlara uy
| Labirent | Izgara | Görüş | Hafıza | Süre |
|---|---|---|---|---|
| 1 | 9×9 | 1 kare | yok | 90 sn |
| 2 | 9×9 | 2 kare | var | 90 sn |
| 3–4 | 11×11 | 3–4 kare | var | 90 sn |
| 5–6 | 13×13 | 5 kare | var | 90 sn |
| 7–8 | 15×15 | 5 kare | var — **zirve** | 90 sn |
| 9 ve sonrası | 15×15 | her seferinde **1 azalır** (en az 1) | yavaşça silinir | her seferinde **10 sn azalır** (en az 30) |

- **Görüş:** fare yalnız bu yarıçaptaki kareleri görür, gerisi karanlık.
- **Hafıza:** geçtiği kareler haritada soluk olarak kalır. Geri inişte bu
  kareler **birer birer kararmaya** başlar — gittiği yolu unutur.
- **Süre:** her labirent için ayrı. Süre biterse **oyun biter.**

### Puan ve çiçekler
- **Puan = toplam çözülen labirent sayısı.** `skorAdi: 'labirent'`
- Her çözülen labirent ekranın altına bir **🌸** bırakır.
- Oyun bitince tahta boşalır, geriye **yalnızca çiçekler** kalır.

⚠️ **Puan kuralı tasarım notundan DEĞİŞTİ.** Orada "geri iniş başlamadan
çözülen labirent sayısı" yazıyordu; o kural puanı herkes için 8'de
sabitliyordu, yani geri iniş süs olurdu. Şimdi iniş sırasında çözülenler de
sayılıyor — asıl beceri farkı orada ortaya çıkıyor.

### Kontroller
- Tuvalin altında **dört yön düğmesi** (◀ ▲ ▼ ▶), masaüstünde ayrıca ok tuşları.
- ❌ Kaydırma (swipe) ile hareket İSTEMİYORUM — labirentte yanlış yöne
  gitmeye yol açıyor, telefonda sinir bozucu.
- Bir basış = bir kare.

### Atmosfer
Sade, laboratuvar hissi. Soğuk beyaz-gri, koyu zemin. Sevimli fare çizme,
tek bir işaret yeter. Geri iniş başladığında **hiçbir uyarı verme** — oyuncu
görüşünün daraldığını kendisi fark etsin. Kutlama, konfeti yok.

📌 Kapanış ekranına romanın son cümlesinin yankısı yazılabilir
("Algernon'un mezarına çiçek koymayı unutma"). Oyun ancak kitabı okuyanda
açıldığı için burası spoiler sayılmaz.

### oyun-listesi.js kaydı — dosyanın sonunda bunu da ver
```js
{
  id: 'fare-labirenti',
  ad: 'Algernon',
  kitap: "Algernon'a Çiçekler — Daniel Keyes",
  aciklama: 'Fareyi labirentten çıkar. Her çözdüğünde biraz daha iyi görürsün — ' +
            'bir yere kadar.',
  ikon: '🐭',
  tur: 'oyun',
  skorAdi: 'labirent',
  dosya: 'oyunlar/fare-labirenti.html',
  tetikleyiciler: {
    kitaplar: [{ baslik: "Algernon'a Çiçekler", yazar: 'Daniel Keyes',
                 takmaAdlar: ['Flowers for Algernon', 'Algernona Çiçekler'] }]
  }
}
```

### ⚠️ Kodlarken dikkat
- **Labirent her seferinde yeniden üretilecek** (ezber engellensin), ve
  **çıkışa giden bir yol MUTLAKA olmalı.** Çözümsüz labirent üretilirse
  oyuncu süreyi boşuna harcar ve bunu anlayamaz.
- Tuval kalan boşluğa sığmalı; düğmeler alta taşmamalı.
- Süre sayacı görünür olsun, ama **geri inişin başladığını yazma.**

---

## Fahrenheit 451 — Kelime Listesi  *(oyun sonra, şimdilik sadece içerik)*

Oyunun kendisi henüz yazılmayacak. Şimdilik yalnızca **kelime havuzu** lazım.

**Liste neyi besleyecek:** ileride yazılacak Fahrenheit oyununu — kelimeler
yukarıdan düşecek, oyuncu kurtarmak istediklerini yakalayacak, yakalayamadığı
yanacak. Bu yüzden her kelimenin bir düşme hızı var. Listeyi şimdi ayrı
istememin sebebi, oyundan bağımsız olarak **tek tek gözden geçirilmesi**:
kategorisi yanlış konmuş bir kelime oyunun bütün anlamını bozuyor.

Ray Bradbury'nin *Fahrenheit 451*'inden esinlenen, **60 kelimelik** bir liste.
Her kelimenin iki özelliği olacak:

**1. Gizli kategori** (oyuncu GÖRMEZ, oyun sonunda açıklanır):
- **Yıkım** — ateş, kül, yakmak, yok etmek…
- **Direniş** — kitap, hafıza, okumak, bilgi, saklamak…
- **Baskı** — korku, yasak, sansür, itaat, uyum…
- **Umut** — özgürlük, gelecek, kaçmak, hatırlamak…

Dördüne de yakın sayıda kelime düşsün (15'er civarı).

**2. Düşme hızı:**
- **Hızlı** — güzel ve değerli kelimeler; alta ulaşamadan yanar.
- **Yavaş** — propaganda ve baskı kelimeleri; rahatça alta ulaşır.
- Direniş kelimelerinin küçük bir kısmı yavaş olabilir (oyuncuya şans).

Türkçe kelimeler, tek kelime (tamlama değil). Şu biçimde ver:

```js
const KELIMELER = [
  { kelime:'ateş',      kategori:'yikim',    hiz:'yavas' },
  { kelime:'hafıza',    kategori:'direnis',  hiz:'hizli' },
  // ... 60 satır
];
```
