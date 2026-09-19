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
    aciklama: 'Çölde baharat topla. Düz yürürsen kum altındakiler ritmini duyar; ' +
              'adımlarını bozarak ilerle.',
    ikon: '🏜️',
    tur: 'oyun',
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
    aciklama: 'Dört tür birbirini dönüştürüyor. Salgın, kıtlık ve isyan düğmeleriyle ' +
              'dengeyi boz, ne olacağını izle.',
    ikon: '🦧',
    tur: 'simulasyon',
    dosya: 'oyunlar/maymunlar-gezegeni.html',
    tetikleyiciler: {
      kitaplar: [{ baslik: 'Maymunlar Gezegeni', yazar: 'Pierre Boulle',
                   takmaAdlar: ['La Planète des singes', 'Planet of the Apes'] }]
    }
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = { OYUN_LISTESI };
