/* ══════════════════════════════════════════════════════════════════════
   OYUN LİSTESİ — YENİ OYUN EKLEMEK İÇİN DOKUNULACAK TEK DOSYA
   ══════════════════════════════════════════════════════════════════════
   Ashbless'teki oyunlar ana uygulamaya GÖMÜLMEZ: her biri kendi başına
   çalışan bir HTML dosyasıdır ve `<iframe>` içinde açılır. Böylece bir
   oyundaki hata uygulamayı etkileyemez, oyun kapanınca da her şeyi
   (zamanlayıcılar, sesler) onunla birlikte kapanır.

   YENİ OYUN EKLEME (ayrıntısı OYUN-EKLEME.md'de):
     1. HTML dosyasını `oyunlar/` klasörüne koy.
     2. Aşağıdaki listeye bir satır ekle.
     3. index.html'deki sürüm damgasını güncelle (`?s=...`).

   ALANLAR
     id          benzersiz, kısa, Türkçe karaktersiz ad. Skor kaydının
                 anahtarı bu — sonradan DEĞİŞTİRİLMEMELİ.
     ad          kartta görünen oyun adı
     kitap       hangi kitaba/seriye ait (kartta yazar)
     aciklama    ⚠️ SPOILER YOK — kitabı okumamış biri de görecek
     ikon        tek emoji
     tur         'oyun' (skor tutulur) | 'simulasyon' (izlenir, skor yok)
                 | 'kesif' (Buluntu Metinler: sayfa toplanır, öykü açılır —
                 oyunlar.js'teki BULUNTU METİNLER bölümüne bak)
     kilitsiz    true ise hiçbir kitaba bağlı değil, herkese baştan açık
                 (tetikleyiciler gerekmez)
     skorAdi     'oyun' türünde puanın birimi ("23 baharat"). Yoksa "puan".
     dosya       oyunlar/ altındaki dosya adı
     tetikleyiciler  kilidi açan kitaplar — Hayali Diyarlar kataloğuyla
                 AYNI biçim (kitaplar / seriler / yazarlar / baslikIcerir /
                 haric). Seriden BİR kitap yeter; "geçmişte okundu"
                 işaretli kitaplar da açar; okunmuş hikâyeler de sayılır.
   ══════════════════════════════════════════════════════════════════════ */
const OYUN_LISTESI = [
  {
    id: 'kumda-ritim',
    ad: 'Kumda Ritim',
    kitap: 'Dune — Frank Herbert',
    aciklama: 'Çölde baharat topla. Aynı adımları tekrarlarsan kumun altındaki seni ' +
              'duyar — ritmini boz, yakalanma.',
    ikon: '🏜️',
    tur: 'oyun',
    skorAdi: 'baharat',
    dosya: 'oyunlar/kumda-ritim.html',
    tetikleyiciler: {
      seriler: ['Dune'],
      kitaplar: [
        { baslik: 'Dune', yazar: 'Frank Herbert', takmaAdlar: ['Çöl Gezegeni'] },
        { baslik: 'Dune Mesihi', yazar: 'Frank Herbert' }
      ],
      baslikIcerir: [{ yazar: 'Frank Herbert', baslikIcerir: 'Dune' }],
      // Brian Herbert'in devam kitapları bu oyunu açmasın (yazar soyadı aynı)
      haric: []
    }
  },
  {
    id: 'maymunlar-gezegeni',
    ad: 'Tür Dönüşümü',
    kitap: 'Maymunlar Gezegeni — Pierre Boulle',
    aciklama: 'Dört tür bir arada yaşıyor ve birbirine dönüşüyor. Salgın, kıtlık, ' +
              'isyan… dengeyi boz ve ne olacağını izle.',
    ikon: '🦧',
    tur: 'simulasyon',
    dosya: 'oyunlar/maymunlar-gezegeni.html',
    tetikleyiciler: {
      kitaplar: [{ baslik: 'Maymunlar Gezegeni', yazar: 'Pierre Boulle',
                   takmaAdlar: ['La Planète des singes', 'Planet of the Apes'] }]
    }
  },
  {
    id: 'www-otomat',
    ad: 'Uyanış',
    kitap: 'WWW serisi — Robert J. Sawyer',
    aciklama: 'Kareler kendiliğinden canlanıp ölüyor. Dokun, deseni değiştir, ' +
              'ne olacağını izle.',
    ikon: '🧠',
    tur: 'simulasyon',
    dosya: 'oyunlar/www-otomat.html',
    /* ⚠️ 2026-09-21: Gökşin üç kitabı da okuduğu hâlde oyun KİLİTLİ kaldı.
       Sebep: `baslik` ve `seriler` TAM EŞLEŞME arıyor (diyar-esleme.js →
       `baslikUyar` / `dnorm(s) === dnorm(kitap.series)`).
         · Kitapları "Watch (Takip)" gibi iki adla kayıtlı → ne "Watch"a
           ne "Takip"e eşit, hiçbiri tutmuyor.
         · Seri alanı "word wide web" yazıyor → "WWW" ile eşleşmiyor.
       Çözüm: asıl yük `baslikIcerir`e verildi — o TAM eşleşme değil
       İÇERİK araması yapıyor, başlık nasıl yazılmış olursa olsun tutuyor.
       `kitaplar` ve `seriler` ek ağ olarak duruyor.
       📌 `baslikIcerir` yazar koşulunu da arar, yani Sawyer'ın WWW dışındaki
       kitapları yanlışlıkla açamaz. */
    tetikleyiciler: {
      baslikIcerir: [
        { yazar: 'Robert J. Sawyer', baslikIcerir: 'wake' },
        { yazar: 'Robert J. Sawyer', baslikIcerir: 'watch' },
        { yazar: 'Robert J. Sawyer', baslikIcerir: 'wonder' },
        { yazar: 'Robert J. Sawyer', baslikIcerir: 'uyanış' },
        { yazar: 'Robert J. Sawyer', baslikIcerir: 'takip' },
        { yazar: 'Robert J. Sawyer', baslikIcerir: 'mucize' }
      ],
      seriler: ['WWW', 'World Wide Web', 'Word Wide Web', 'WWW Üçlemesi'],
      kitaplar: [
        { baslik: 'Uyanış', yazar: 'Robert J. Sawyer', takmaAdlar: ['Wake',  'WWW: Wake'] },
        { baslik: 'Takip',  yazar: 'Robert J. Sawyer', takmaAdlar: ['Watch', 'WWW: Watch'] },
        { baslik: 'Mucize', yazar: 'Robert J. Sawyer', takmaAdlar: ['Wonder','WWW: Wonder'] }
      ]
    }
  },
  {
    id: 'cift-dusun',
    ad: 'Çift Düşün',
    kitap: '1984 — George Orwell',
    aciklama: 'Kutuları aç, zıt kelimeleri eşleştir. Ama bazıları zıt değil aynı — ' +
              've bunu ancak açtığında anlarsın.',
    ikon: '👁️',
    tur: 'oyun',
    skorAdi: 'çift',
    dosya: 'oyunlar/cift-dusun.html',
    /* ⚠️ Tetikleyici KİTAP ADINA bağlı, yazara değil: kütüphanede Orwell'in
       "Hayvan Çiftliği"i de var, o bu oyunu açmamalı. */
    tetikleyiciler: {
      kitaplar: [{ baslik: '1984', yazar: 'George Orwell',
                   takmaAdlar: ['Bin Dokuz Yüz Seksen Dört', 'Nineteen Eighty-Four'] }]
    }
  },
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
    /* Başlık tek başına yeterince ayırt edici değil (WWW dersi): hem tam
       eşleşme hem içerik araması bırakıldı, yazar koşulu ikisinde de var. */
    tetikleyiciler: {
      baslikIcerir: [
        { yazar: 'Daniel Keyes', baslikIcerir: 'algernon' },
        { yazar: 'Daniel Keyes', baslikIcerir: 'flowers for' }
      ],
      kitaplar: [{ baslik: "Algernon'a Çiçekler", yazar: 'Daniel Keyes',
                   takmaAdlar: ['Flowers for Algernon', 'Algernona Çiçekler'] }]
    }
  },
  {
    /* Bir kitaba bağlı DEĞİL: kitapları açan oyun bu. Hikâyeyi uygulama atar,
       oyun yalnızca sayfa sayısını bilir (oyunlar.js → BULUNTU METİNLER).
       Ad kaynağı: Ashbless özel rozetindeki "William Ashbless (buluntu metin)". */
    id: 'buluntu-metinler',
    ad: 'Buluntu Metinler',
    kitap: 'Kayıp öyküler',
    aciklama: 'Fenerli hayaletin düşürdüklerini yakala, sayfaları topla. ' +
              'Öykü tamamlanınca adı açılır — okuman için.',
    ikon: '📜',
    tur: 'kesif',
    kilitsiz: true,
    skorAdi: 'sayfa',
    dosya: 'oyunlar/buluntu-metinler.html'
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = { OYUN_LISTESI };
