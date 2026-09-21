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
    /* ⚠️ `seriler: ['WWW']` ancak kitabın seri alanı tam olarak "WWW" yazıyorsa
       tutar. Üç kitabın adı tek tek yazılı, seri alanı boş olsa da oyun açılır. */
    tetikleyiciler: {
      seriler: ['WWW'],
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
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = { OYUN_LISTESI };
