// ══════════════════════════════════════════════════════════════════════
// HAYALİ DİYARLAR — KATALOG
// ══════════════════════════════════════════════════════════════════════
// Bu dosya HERKES İÇİN ORTAK katalogdur: hangi diyar var, görselleri neler,
// hangi kitaplar açar. Kimin haritasında hangi hex'te durduğu BURADA DEĞİL —
// o kişiye özeldir ve Firebase'de tutulur.
//
// YENİ DİYAR EKLEMEK = bu dosyaya bir blok eklemek + görseli images klasörüne
// koymak. Başka hiçbir dosyaya, Firebase'e dokunmak GEREKMEZ.
//
// ══════════════════════════════════════════════════════════════════════
// TETİKLEYİCİLER — hangi kitap bu diyarı açar?
// ══════════════════════════════════════════════════════════════════════
// Dört tip var, bir diyarda hepsi bir arada kullanılabilir. Biri bile
// tutarsa diyar açılır.
//
//  1) yazarlar: ['J.R.R. Tolkien']
//     Bu yazarın HER kitabı diyarı açar. Sadece tüm eserleri aynı dünyada
//     geçen yazarlar için (Tolkien, Baum). Stephen King için KULLANMA —
//     her kitabı Derry'de geçmiyor.
//
//  2) baslikIcerir: [{ yazar:'J.K. Rowling', baslikIcerir:'Harry Potter' }]
//     Yazar tutuyorsa VE kitap adının içinde o ifade geçiyorsa açar.
//     Bir serinin tüm kitaplarını tek satırla yakalar, hangi dilde
//     yazılmış olursa olsun.
//
//  3) kitaplar: [{ baslik:'O', yazar:'Stephen King', takmaAdlar:['It'] }]
//     Tekil kitaplar için. Başlık + yazar eşleşmesi.
//
//  4) seriler: ['Harry Potter']
//     Kitabın "seri" alanına bakar. SADECE EK AĞ — tek başına asla yeterli
//     sayılmaz, çünkü seri alanı kitapların yalnızca ~%16'sında dolu ve
//     elle girildiği için herkes farklı yazıyor.
//
// Karşılaştırma yapılmadan önce her şey sadeleştirilir (küçük harf, Türkçe
// harfler katlanır: ı/İ→i, ü→u, ş→s, ç→c, ğ→g, ö→o, noktalama atılır).
// Yani "Dune Sapkinlari" ile "Dune Sapkınları" aynı sayılır.
//
// ══════════════════════════════════════════════════════════════════════
// KURALLAR
// ══════════════════════════════════════════════════════════════════════
//  1. `id` ASLA DEĞİŞMEZ — keşif kayıtları buna bağlanır. Ad değişebilir.
//  2. Bir diyar BİR hex kaplar; sahne eklemek yeni hex açmaz.
//  3. Keşif kalıcıdır; kitap silinse bile diyar kapanmaz.
//  4. Aynı diyarı açan ikinci kitap sessiz geçer.
//  5. `gizli:true` → yeni keşfe kapanır, keşfetmiş olanlarda durmaya devam
//     eder. Diyar SİLİNMEZ.
//  6. Eşleşme ıskalanırsa çözüm buraya bir takma ad eklemektir; kullanıcının
//     verisine dokunulmaz. Onarım fonksiyonu diyarı geçmişe dönük açar.
//
// ⚠️ TASLAK (2026-08-12) — görsel adları .webp yazıldı; dönüştürme ayrı adım
//    (şu an elde .png var).
// ══════════════════════════════════════════════════════════════════════

const DIYAR_KATALOG = [

  {
    id: 'derry',
    ad: 'Derry',
    not: 'Maine\'in küçük kasabası; kanalizasyonundan yükselen bir şey var.',
    sahneler: [
      { dosya: 'derry1.webp' }
    ],
    tetikleyiciler: {
      // King'in yalnızca BAZI kitapları Derry — yazar tabanlı tetikleyici YOK.
      // Liste gökşin tarafından çıkarıldı (2026-08-12).
      kitaplar: [
        // — Romanlar —
        { baslik: 'O',              yazar: 'Stephen King', takmaAdlar: ['It', 'O - It'] },
        { baslik: 'Uykusuzluk',     yazar: 'Stephen King', takmaAdlar: ['Insomnia'] },
        { baslik: 'Düş Kapanı',     yazar: 'Stephen King', takmaAdlar: ['Dreamcatcher'] },
        { baslik: 'Kemik Torbası',  yazar: 'Stephen King', takmaAdlar: ['Bag of Bones'] },
        { baslik: '11/22/63',       yazar: 'Stephen King', takmaAdlar: ['11.22.63', '22/11/63'] },

        // — Derleme kitapları: tamamı okunursa açar —
        { baslik: 'Gece Yarısını İki Geçe', yazar: 'Stephen King', takmaAdlar: ['Four Past Midnight'] },
        { baslik: 'Karanlık Öyküler',       yazar: 'Stephen King', takmaAdlar: ["Everything's Eventual"] },

        // — Tek tek öyküler: "Hikâyelerim"e eklenirse açar —
        // Hikâye kaydı da title+author taşıdığı için aynı liste ikisini de karşılar.
        { baslik: 'Gizli Pencere, Gizli Bahçe', yazar: 'Stephen King',
          takmaAdlar: ['Secret Window, Secret Garden', 'Gizli Pencere Gizli Bahçe'] },
        { baslik: 'Kuzeye Doğru Giden Yol Virüsü', yazar: 'Stephen King',
          takmaAdlar: ['The Road Virus Heads North'] }
      ]
    }
  },

  {
    id: 'orta-dunya',
    ad: 'Orta Dünya',
    sahneler: [
      { dosya: 'lotr.webp' }
    ],
    tetikleyiciler: {
      // Tolkien'in her kitabı Orta Dünya. "Yüzük kardeşliği", "iki kule",
      // "Kralın dönüşü" gibi tekil çeviri adlarını da bu yakalar.
      yazarlar: ['J.R.R. Tolkien'],
      seriler: ['Yüzüklerin Efendisi', 'The Lord of the Rings', 'Orta Dünya']
    }
  },

  {
    id: 'arrakis',
    ad: 'Arrakis',
    not: 'Çöl gezegeni. Baharat burada akar.',
    sahneler: [
      { dosya: 'dune.webp' }
    ],
    tetikleyiciler: {
      baslikIcerir: [
        { yazar: 'Frank Herbert', baslikIcerir: 'Dune' }
      ],
      kitaplar: [
        { baslik: 'Çöl Gezegeni', yazar: 'Frank Herbert', takmaAdlar: [] }
      ],
      seriler: ['Dune', 'Çöl Gezegeni']
    }
  },

  {
    id: 'gecenin-on-ikisi-nehri',
    ad: 'Gecenin On İkisi Nehri',
    // Tek sahne: "anubis gates" görseli temaya uymadığı için gökşin tarafından
    // klasörden çıkarıldı (silinmedi, başka klasörde duruyor). Beğenilen görsel
    // anubis1 adını taşıyor.
    sahneler: [
      { dosya: 'anubis1.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Anubis\'in Kapıları', yazar: 'Tim Powers',
          // "Anubis Kapıları" — gerçek kullanıcı verisinde bu şekilde kayıtlı (2 kişide).
          takmaAdlar: ['The Anubis Gates', 'Anubisin Kapıları', 'Anubis Kapıları'] }
      ]
    }
  },

  {
    id: 'buyucu-dunyasi',
    ad: 'Büyücü Dünyası',
    sahneler: [
      { dosya: 'hp1.webp' },
      { dosya: 'hp2.webp' },
      { dosya: 'hp3.webp' },
      { dosya: 'hp4.webp' },
      { dosya: 'hp5.webp' }
    ],
    tetikleyiciler: {
      // 7 kitabın hepsi, Türkçe de İngilizce de olsa, adında "Harry Potter" geçer.
      baslikIcerir: [
        { yazar: 'J.K. Rowling', baslikIcerir: 'Harry Potter' }
      ],
      seriler: ['Harry Potter']
    }
  },

  {
    id: 'narnia',
    ad: 'Narnia',
    not: 'Gardırobun arkasında, kar altında bir lamba direği.',
    sahneler: [
      { dosya: 'narnia.webp' }
    ],
    tetikleyiciler: {
      // C.S. Lewis'in Narnia dışı kitapları da var — yazar tabanlı tetikleyici YOK.
      // Kitap adları ortak bir kelime paylaşmadığı için yedi kitap tek tek yazıldı.
      kitaplar: [
        { baslik: 'Büyücünün Yeğeni', yazar: 'C.S. Lewis', takmaAdlar: ['The Magician\'s Nephew'] },
        { baslik: 'Aslan, Cadı ve Dolap', yazar: 'C.S. Lewis', takmaAdlar: ['The Lion, the Witch and the Wardrobe', 'Aslan Cadı ve Dolap'] },
        { baslik: 'At ve Çocuk', yazar: 'C.S. Lewis', takmaAdlar: ['The Horse and His Boy'] },
        { baslik: 'Prens Kaspiyan', yazar: 'C.S. Lewis', takmaAdlar: ['Prince Caspian'] },
        { baslik: 'Şafak Yıldızı\'nın Yolculuğu', yazar: 'C.S. Lewis', takmaAdlar: ['The Voyage of the Dawn Treader', 'Şafak Yıldızının Yolculuğu'] },
        { baslik: 'Gümüş Sandalye', yazar: 'C.S. Lewis', takmaAdlar: ['The Silver Chair'] },
        { baslik: 'Son Savaş', yazar: 'C.S. Lewis', takmaAdlar: ['The Last Battle'] }
      ],
      seriler: ['Narnia Günlükleri', 'The Chronicles of Narnia', 'Narnia']
    }
  },

  {
    id: 'neverland',
    ad: 'Neverland',
    sahneler: [
      { dosya: 'neverland1.webp' },
      { dosya: 'neverland2.webp' },
      { dosya: 'neverland3.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Peter Pan', yazar: 'J.M. Barrie',
          takmaAdlar: ['Peter and Wendy', 'Peter Pan ve Wendy'] }
      ]
    }
  },

  {
    id: 'oz',
    ad: 'Oz',
    sahneler: [
      { dosya: 'oz1.webp' },
      { dosya: 'oz2.webp' }
    ],
    tetikleyiciler: {
      // Baum'un kitapları Oz serisidir.
      yazarlar: ['L. Frank Baum'],
      kitaplar: [
        { baslik: 'Oz Büyücüsü', yazar: 'L. Frank Baum',
          takmaAdlar: ['The Wonderful Wizard of Oz', 'Muhteşem Oz Büyücüsü'] }
      ],
      seriler: ['Oz', 'Oz Büyücüsü']
    }
  },

  {
    id: 'harikalar-diyari',
    ad: 'Harikalar Diyarı',
    sahneler: [
      { dosya: 'wonderland.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Alice Harikalar Diyarında', yazar: 'Lewis Carroll',
          takmaAdlar: ['Alice\'s Adventures in Wonderland', 'Alice Harikalar Ülkesinde', 'Alice in Wonderland'] },
        { baslik: 'Aynanın İçinden', yazar: 'Lewis Carroll',
          takmaAdlar: ['Through the Looking-Glass', 'Aynadan Yansımalar'] }
      ]
    }
  },

  {
    id: 'westeros',
    ad: 'Westeros',
    sahneler: [
      { dosya: 'got1.webp' },
      { dosya: 'got2.webp' },
      { dosya: 'got3.webp' }
    ],
    tetikleyiciler: {
      // Martin'in Westeros dışı kitapları da var (Wild Cards, Fevre Dream) —
      // yazar tabanlı tetikleyici YOK.
      kitaplar: [
        { baslik: 'Taht Oyunları',       yazar: 'George R.R. Martin', takmaAdlar: ['A Game of Thrones', 'Game of Thrones'] },
        { baslik: 'Kralların Çarpışması', yazar: 'George R.R. Martin', takmaAdlar: ['A Clash of Kings'] },
        { baslik: 'Kılıçların Fırtınası', yazar: 'George R.R. Martin', takmaAdlar: ['A Storm of Swords'] },
        { baslik: 'Kargaların Ziyafeti',  yazar: 'George R.R. Martin', takmaAdlar: ['A Feast for Crows'] },
        { baslik: 'Ejderhalarla Dans',    yazar: 'George R.R. Martin', takmaAdlar: ['A Dance with Dragons'] }
      ],
      seriler: ['Buz ve Ateşin Şarkısı', 'A Song of Ice and Fire', 'Taht Oyunları', 'Game of Thrones']
    }
  },

  {
    id: 'panem',
    ad: 'Panem',
    sahneler: [
      { dosya: 'hunger-games1.webp' },
      { dosya: 'hunger-games2.webp' },
      { dosya: 'hunger-games3.webp' }
    ],
    tetikleyiciler: {
      // Collins'in Yeraltı Günlükleri (Gregor) serisi de var — yazar tabanlı YOK.
      kitaplar: [
        { baslik: 'Açlık Oyunları',  yazar: 'Suzanne Collins', takmaAdlar: ['The Hunger Games'] },
        { baslik: 'Ateşi Yakalamak', yazar: 'Suzanne Collins', takmaAdlar: ['Catching Fire'] },
        { baslik: 'Alaycı Kuş',      yazar: 'Suzanne Collins', takmaAdlar: ['Mockingjay'] },
        { baslik: 'Kuşlar ve Yılanların Şarkısı', yazar: 'Suzanne Collins',
          takmaAdlar: ['The Ballad of Songbirds and Snakes'] }
      ],
      seriler: ['Açlık Oyunları', 'The Hunger Games']
    }
  },

  {
    id: 'cesur-yeni-dunya',
    ad: 'Cesur Yeni Dünya',
    sahneler: [
      { dosya: 'cesur-yeni-dunya.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Cesur Yeni Dünya', yazar: 'Aldous Huxley', takmaAdlar: ['Brave New World'] }
      ]
    }
  }

];

// Tarayıcıda global; Node testinde module olarak da okunabilsin.
if (typeof module !== 'undefined' && module.exports) module.exports = { DIYAR_KATALOG };
