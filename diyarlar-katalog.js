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
//  7. AYNI MEKANDA GEÇEN HER KİTAP O DİYARI AÇAR. (Gökşin'in kuralı, 02.09.2026.)
//     Yeni diyar eklerken "bu mekanda geçen başka eser var mı?" diye sor ve
//     hepsini yaz — sonradan eklemek, baştan yazmaktan zahmetli. Macondo bu
//     yüzden dört eserle açılıyor. ⚠️ Ama YAZARIN her kitabı demek DEĞİL:
//     ölçüt mekan, yazar değil. Márquez'in Kırmızı Pazartesi'si Macondo'da
//     geçmediği için listede yok.
//  8. Bir kitap İKİ diyar açmasın. Aynı kitabın iki mekanı varsa (Lilliput ve
//     Blefuscu gibi) tek diyar + iki SAHNE yap — yoksa tek kitap haritada iki
//     altıgen birden açar ve keşif hissi ucuzlar.
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
      { dosya: 'hp1.webp', ad: 'Hogwarts' },
      { dosya: 'hp2.webp', ad: 'Hogwarts' },
      { dosya: 'hp3.webp', ad: '9¾ Peronu' },
      { dosya: 'hp5.webp', ad: 'Hogwarts' }
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
    // 2026-08-13: iki sahne eklendi (gemi + dolap).
    not: 'Gardırobun arkasında, kar altında bir lamba direği.',
    sahneler: [
      { dosya: 'narnia.webp' },
      { dosya: 'narnia2.webp', ad: 'Şafak Yıldızı' },
      { dosya: 'narnia3.webp', ad: 'Dolap' }
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
      { dosya: 'wonderland1.webp' },
      { dosya: 'wonderland2.webp' },
      { dosya: 'wonderland3.webp' },
      { dosya: 'wonderland4.webp' },
      { dosya: 'wonderland5.webp' },
      { dosya: 'wonderland6.webp' }
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
    id: 'yarim-kan-kampi',
    ad: 'Yarım Kan Kampı',
    not: 'Yunan tanrılarının çocukları için tek güvenli yer.',
    sahneler: [
      { dosya: 'percy-jackson1.webp' },
      { dosya: 'percy-jackson2.webp' },
      { dosya: 'percy-jackson3.webp' }
    ],
    tetikleyiciler: {
      // Riordan'ın Kane Günlükleri (Mısır) ve Magnus Chase (İskandinav)
      // serileri başka dünyalarda geçiyor — yazar tabanlı tetikleyici YOK.
      baslikIcerir: [
        { yazar: 'Rick Riordan', baslikIcerir: 'Percy Jackson' }
      ],
      kitaplar: [
        { baslik: 'Şimşek Hırsızı',    yazar: 'Rick Riordan', takmaAdlar: ['The Lightning Thief'] },
        { baslik: 'Canavarlar Denizi', yazar: 'Rick Riordan', takmaAdlar: ['The Sea of Monsters'] },
        { baslik: 'Titan\'ın Laneti',  yazar: 'Rick Riordan', takmaAdlar: ["The Titan's Curse"] },
        { baslik: 'Labirent Savaşı',   yazar: 'Rick Riordan', takmaAdlar: ['The Battle of the Labyrinth'] },
        { baslik: 'Son Olimposlu',     yazar: 'Rick Riordan', takmaAdlar: ['The Last Olympian'] }
      ],
      seriler: ['Percy Jackson', 'Percy Jackson ve Olimposlular']
    }
  },

  {
    id: 'karanlik-cevherler',
    ad: 'Lyra\'nın Dünyası',
    not: 'Herkesin ruhu yanında yürür.',
    sahneler: [
      { dosya: 'altin-pusula1.webp' },
      { dosya: 'altin-pusula2.webp' },
      { dosya: 'altin-pusula3.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Altın Pusula',    yazar: 'Philip Pullman', takmaAdlar: ['Northern Lights', 'The Golden Compass'] },
        { baslik: 'Kehanet Bıçağı',  yazar: 'Philip Pullman', takmaAdlar: ['The Subtle Knife'] },
        { baslik: 'Amber Dürbün',    yazar: 'Philip Pullman', takmaAdlar: ['The Amber Spyglass'] }
      ],
      seriler: ['Karanlık Cevherler', 'His Dark Materials', 'Altın Pusula']
    }
  },

  {
    id: 'kita',
    ad: 'Kıta',
    not: 'Canavar avcısının yolu buradan geçer.',
    sahneler: [
      { dosya: 'witcher1.webp' },
      { dosya: 'witcher2.webp' },
      { dosya: 'witcher3.webp' }
    ],
    tetikleyiciler: {
      // ⚠️ Eskiden `yazarlar: ['Andrzej Sapkowski']` idi ve yorumda "kitaplarının
      // tamamı bu dünyada geçiyor" yazıyordu — bu DOĞRU DEĞİL: Hussite Üçlemesi
      // 15. yüzyıl Bohemyası'nda geçen tarihî bir seri, Witcher evreniyle ilgisi yok.
      // Sapkowski yaşıyor ve yazmaya devam ediyor, yani liste ileride de büyüyebilir.
      // KURAL: `yazarlar` yalnızca külliyatı kapanmış ve tek dünyada geçen
      // yazarlar için (Tolkien, Baum). Yaşayan yazara asla.
      //
      // Türkçe baskıların adları ortak bir kelime paylaşmadığı için Narnia'daki
      // gibi tek tek yazıldı. baslikIcerir 'Witcher' ise İngilizce baskıları ve
      // "The Witcher: ..." biçimindeki adları yakalıyor.
      // Türkçe adlar Gökşin'in doğruladığı listeden (2026-08-13). Takma adlarda
      // hem İngilizce özgün adlar hem de olası alternatif çeviriler duruyor —
      // yazar koşulu zorunlu olduğu için fazladan takma ad yanlış eşleşme yaratmaz.
      kitaplar: [
        { baslik: 'Son Dilek',        yazar: 'Andrzej Sapkowski', takmaAdlar: ['The Last Wish'] },
        { baslik: 'Kader Kılıcı',     yazar: 'Andrzej Sapkowski', takmaAdlar: ['Sword of Destiny'] },
        { baslik: 'Elflerin Kanı',    yazar: 'Andrzej Sapkowski', takmaAdlar: ['Blood of Elves', 'Elf Kanı'] },
        { baslik: 'Nefret Çağı',      yazar: 'Andrzej Sapkowski', takmaAdlar: ['Time of Contempt', 'Küçümseme Zamanı', 'Hor Görme Zamanı'] },
        { baslik: 'Ateşle İmtihan',   yazar: 'Andrzej Sapkowski', takmaAdlar: ['Baptism of Fire', 'Ateşin Vaftizi'] },
        { baslik: 'Kırlangıç Kulesi', yazar: 'Andrzej Sapkowski', takmaAdlar: ['The Tower of the Swallow'] },
        { baslik: 'Gölün Hanımı',     yazar: 'Andrzej Sapkowski', takmaAdlar: ['The Lady of the Lake', 'Göl Leydisi', 'Gölün Leydisi'] },
        { baslik: 'Fırtına Sezonu',   yazar: 'Andrzej Sapkowski', takmaAdlar: ['Season of Storms', 'Fırtına Mevsimi'] }
      ],
      baslikIcerir: [
        { yazar: 'Andrzej Sapkowski', baslikIcerir: 'Witcher' }
      ],
      seriler: ['The Witcher', 'Witcher']
    }
  },

  {
    id: 'fantasya',
    ad: 'Fantasya',
    not: 'Hiçliğin yuttuğu ülke — bir okuyucu adını koyana kadar.',
    sahneler: [
      { dosya: 'fantasya1.webp' },
      { dosya: 'fantasya2.webp' }
    ],
    tetikleyiciler: {
      // Ende'nin Momo'su başka bir dünyada — yazar tabanlı tetikleyici YOK.
      kitaplar: [
        { baslik: 'Bitmeyecek Öykü', yazar: 'Michael Ende',
          takmaAdlar: ['The Neverending Story', 'Bitmeyen Öykü', 'Die unendliche Geschichte'] }
      ]
    }
  },

  {
    id: 'kara-kule',
    ad: 'Kara Kule',
    not: 'Bütün dünyaların ekseni.',
    sahneler: [
      { dosya: 'kara-kule1.webp' },
      { dosya: 'kara-kule2.webp' },
      { dosya: 'kara-kule3.webp' }
    ],
    tetikleyiciler: {
      // King'in Derry kitaplarından ayrı bir dünya; ikisi çakışmıyor.
      kitaplar: [
        { baslik: 'Silahşor',              yazar: 'Stephen King', takmaAdlar: ['The Gunslinger', 'Kara Kule 1'] },
        { baslik: 'Üçün Çekilişi',         yazar: 'Stephen King', takmaAdlar: ['The Drawing of the Three'] },
        { baslik: 'Kayıp Diyarlar',        yazar: 'Stephen King', takmaAdlar: ['The Waste Lands'] },
        { baslik: 'Büyücü ve Cam Küre',    yazar: 'Stephen King', takmaAdlar: ['Wizard and Glass'] },
        { baslik: 'Calla\'nın Kurtları',   yazar: 'Stephen King', takmaAdlar: ['Wolves of the Calla'] },
        { baslik: 'Susannah\'ın Şarkısı',  yazar: 'Stephen King', takmaAdlar: ["Song of Susannah"] },
        { baslik: 'Kara Kule',             yazar: 'Stephen King', takmaAdlar: ['The Dark Tower'] }
      ],
      seriler: ['Kara Kule', 'The Dark Tower']
    }
  },

  {
    id: 'cesur-yeni-dunya',
    ad: 'Cesur Yeni Dünya',
    sahneler: [
      { dosya: 'cesur-yeni-dunya.webp', ad: 'Vahşi Bölge' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Cesur Yeni Dünya', yazar: 'Aldous Huxley', takmaAdlar: ['Brave New World'] }
      ]
    }
  },

  // ══════════════════════════════════════════════════════════════════
  // 2026-08-13'te eklenen dokuz diyar.
  // Hepsinde tetikleyici BAŞLIK KOŞULLU (kitaplar / baslikIcerir), hiçbirinde
  // `yazarlar` yok — bu yazarların her kitabı aynı dünyada geçmiyor:
  // Gaiman'dan iki ayrı diyar çıkıyor (Düşlem, Duvar'ın Ardı), Wells'ten iki
  // ayrı diyar (Eloi Ülkesi, Dr. Moreau'nun Adası), King'in Empis'i Derry ve
  // Kara Kule'den bağımsız.
  // ══════════════════════════════════════════════════════════════════

  {
    id: 'duslem',
    ad: 'Düşlem',
    sahneler: [
      { dosya: 'duslem1.webp', ad: 'Düş Sarayı' },
      { dosya: 'duslem2.webp', ad: 'Boynuz ve Fildişi Kapılar' },
      { dosya: 'duslem3.webp', ad: 'Kütüphane' },
      { dosya: 'duslem4.webp', ad: 'Galeri' }
    ],
    tetikleyiciler: {
      // ⚠️ 02.09.2026 — "Bütün ciltler adında Sandman taşıyor" YANLIŞTI.
      // Türkçe baskılar cilt adıyla basılıyor: Gökşin'in kütüphanesindeki
      // "Prelüdler ve Noktürnler" ile "Bebek Evi" hiç eşleşmiyordu, yani
      // Düşlem diyarı ona hiç açılmamıştı. baslikIcerir duruyor (İngilizce
      // baskıları ve "Sandman: ..." biçimini yakalıyor), altına ciltler eklendi.
      baslikIcerir: [
        { yazar: 'Neil Gaiman', baslikIcerir: 'Sandman' }
      ],
      kitaplar: [
        { baslik: 'Prelüdler ve Noktürnler', yazar: 'Neil Gaiman',
          takmaAdlar: ['Preludes & Nocturnes', 'Preludes and Nocturnes'] },
        { baslik: 'Bebek Evi', yazar: 'Neil Gaiman',
          takmaAdlar: ['The Doll\'s House', 'Oyuncak Bebek Evi'] },
        { baslik: 'Düşler Diyarı', yazar: 'Neil Gaiman',
          takmaAdlar: ['Dream Country', 'Düş Ülkesi', 'Düşler Ülkesi'] },
        { baslik: 'Sis Mevsimi', yazar: 'Neil Gaiman',
          takmaAdlar: ['Season of Mists', 'Sisler Mevsimi'] },
        { baslik: 'Senin Gibi Bir Oyun', yazar: 'Neil Gaiman',
          takmaAdlar: ['A Game of You', 'Bir Oyun Sensin', 'Senden Bir Oyun'] },
        { baslik: 'Fabller ve Yansımalar', yazar: 'Neil Gaiman',
          takmaAdlar: ['Fables & Reflections', 'Fables and Reflections', 'Masallar ve Yansımalar'] },
        { baslik: 'Kısa Yaşamlar', yazar: 'Neil Gaiman',
          takmaAdlar: ['Brief Lives', 'Kısa Hayatlar'] },
        { baslik: 'Dünyanın Sonu', yazar: 'Neil Gaiman',
          takmaAdlar: ['Worlds\' End', 'Worlds End', 'Dünyaların Sonu'] },
        { baslik: 'İyi Yürekliler', yazar: 'Neil Gaiman',
          takmaAdlar: ['The Kindly Ones', 'Zarif Varlıklar', 'İyicil Olanlar'] },
        { baslik: 'Uyanış', yazar: 'Neil Gaiman', takmaAdlar: ['The Wake'] },
        { baslik: 'Düş Avcıları', yazar: 'Neil Gaiman', takmaAdlar: ['The Dream Hunters'] },
        { baslik: 'Sonsuz Geceler', yazar: 'Neil Gaiman', takmaAdlar: ['Endless Nights'] }
      ],
      // Seri alanı Gökşin'in kayıtlarında dolu. Tek başına yeterli değil —
      // ölçüldü: 244 kitabın yalnızca 48'inde (%20) bu alan dolu.
      seriler: ['Sandman', 'The Sandman']
    }
  },

  {
    id: 'duvarin-ardi',
    ad: 'Duvar\'ın Ardı',
    not: 'Duvardaki gedikten geçilir; ötesi Faerie\'dir.',
    sahneler: [
      { dosya: 'duvarin-ardi1.webp', ad: 'Duvardaki Gedik' },
      { dosya: 'duvarin-ardi2.webp', ad: 'Stormhold' },
      { dosya: 'duvarin-ardi3.webp', ad: 'Panayır' },
      { dosya: 'duvarin-ardi4.webp', ad: 'Çukur' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Yıldız Tozu', yazar: 'Neil Gaiman', takmaAdlar: ['Stardust'] }
      ]
    }
  },

  {
    id: 'empis',
    ad: 'Empis',
    sahneler: [
      { dosya: 'empis1.webp' },
      { dosya: 'empis2.webp' },
      { dosya: 'empis3.webp' },
      { dosya: 'empis4.webp' },
      { dosya: 'empis5.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Peri Masalı', yazar: 'Stephen King', takmaAdlar: ['Fairy Tale'] }
      ]
    }
  },

  {
    id: 'trisolaris',
    ad: 'Trisolaris',
    sahneler: [
      { dosya: 'trisolaris1.webp', ad: 'Kaotik Çağ' },
      { dosya: 'trisolaris2.webp', ad: 'Üç Cisim Oyunu' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Üç Cisim Problemi', yazar: 'Cixin Liu',
          takmaAdlar: ['The Three-Body Problem', 'Üç Cisim'] }
      ]
    }
  },

  {
    id: 'babil-kitapligi',
    ad: 'Babil Kitaplığı',
    sahneler: [
      { dosya: 'babil-kitapligi.webp', ad: 'Cehennem' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Cehenneme Kısa Bir Ziyaret', yazar: 'Steven L. Peck',
          takmaAdlar: ['A Short Stay in Hell'] }
      ]
    }
  },

  {
    id: 'preservation',
    ad: 'Preservation',
    sahneler: [
      { dosya: 'preservation.webp' }
    ],
    tetikleyiciler: {
      // Martha Wells — H.G. Wells DEĞİL. Başlık koşulu olduğu için ikisi
      // birbirine karışmıyor.
      // ⚠️ 02.09.2026 — baslikIcerir TEK BAŞINA YETMİYORDU. Ne Türkçe ne
      // İngilizce cilt adlarında "Katilbot"/"Murderbot" geçiyor; seri adı
      // kapakta, kitap adında değil. Gökşin'in üç Katilbot kitabı da
      // ıskalanıyordu — Preservation ona hiç açılmamıştı.
      baslikIcerir: [
        { yazar: 'Martha Wells', baslikIcerir: 'Katilbot' },
        { yazar: 'Martha Wells', baslikIcerir: 'Murderbot' }
      ],
      kitaplar: [
        { baslik: 'Tüm Sistemler Kırmızı', yazar: 'Martha Wells', takmaAdlar: ['All Systems Red'] },
        { baslik: 'Yapay Koşullanma',      yazar: 'Martha Wells', takmaAdlar: ['Artificial Condition'] },
        { baslik: 'Kaçak Protokol',        yazar: 'Martha Wells', takmaAdlar: ['Rogue Protocol'] },
        { baslik: 'Çıkış Stratejisi',      yazar: 'Martha Wells', takmaAdlar: ['Exit Strategy'] },
        { baslik: 'Ağ Etkisi',             yazar: 'Martha Wells', takmaAdlar: ['Network Effect'] },
        { baslik: 'Kaçak Telemetri',       yazar: 'Martha Wells', takmaAdlar: ['Fugitive Telemetry'] },
        { baslik: 'Tüm Sistemler Çöktü',   yazar: 'Martha Wells', takmaAdlar: ['System Collapse'] }
      ],
      seriler: ['Katilbot Günlükleri', 'The Murderbot Diaries', 'Murderbot Günlükleri', 'Katilbot']
    }
  },

  {
    id: 'moreau-adasi',
    ad: 'Dr. Moreau\'nun Adası',
    not: 'Güney Pasifik; yaklaşık 5° güney enlemi, 105° batı boylamı civarı.',
    sahneler: [
      { dosya: 'moreau.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Dr. Moreau\'nun Adası', yazar: 'H.G. Wells',
          takmaAdlar: ['The Island of Doctor Moreau', 'The Island of Dr. Moreau',
                       'Doktor Moreau\'nun Adası'] }
      ]
    }
  },

  {
    id: 'magrathea',
    ad: 'Magrathea',
    not: 'Gezegen üreten gezegen.',
    sahneler: [
      { dosya: 'magrathea.webp' }
    ],
    tetikleyiciler: {
      baslikIcerir: [
        { yazar: 'Douglas Adams', baslikIcerir: 'Otostopçu' },
        { yazar: 'Douglas Adams', baslikIcerir: 'Hitchhiker' }
      ]
    }
  },

  {
    id: 'eloi-ulkesi',
    ad: 'Eloi Ülkesi',
    not: '802.701 yılı. Londra\'dan geriye hiçbir şey kalmamış.',
    sahneler: [
      { dosya: 'eloi.webp' }
    ],
    tetikleyiciler: {
      kitaplar: [
        { baslik: 'Zaman Makinesi', yazar: 'H.G. Wells',
          takmaAdlar: ['The Time Machine', 'Zaman Makinası'] }
      ]
    }
  }

];

// Tarayıcıda global; Node testinde module olarak da okunabilsin.
if (typeof module !== 'undefined' && module.exports) module.exports = { DIYAR_KATALOG };
