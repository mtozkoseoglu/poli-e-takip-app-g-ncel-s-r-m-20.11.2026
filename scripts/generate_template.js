import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// 1. Sheet: Ana_Teklifler
const anaTekliflerHeaders = [
  'Teklif_Sira_No*',
  'Musteri_Adi_Soyadi*',
  'Brans*',
  'Is_Turu*',
  'Oncelikli_Is',
  'Tanzim_Tarihi',
  'Baslangic_Tarihi',
  'Bitis_Tarihi',
  'Telefon',
  'E_Posta',
  'Plaka',
  'Ruhsat_Seri_No',
  'Sasi_No',
  'Motor_No',
  'Kullanim_Tarzi',
  'Model_Yili',
  'Arac_Markasi',
  'Arac_Modeli',
  'Arac_Kodu_TSB',
  'Yakit_Turu',
  'Arac_Kasko_Bedeli_TL',
  'Capraz_Satis_Durumu',
  'Diger_Police_Sirketi',
  'Diger_Police_Bitis_Tarihi',
  'Teklif_Genel_Notu',
];

const anaTekliflerRows = [
  [
    '1 (ÖRNEK SATIR - SİLİNEBİLİR)',
    'Ahmet Yılmaz',
    'Kasko',
    'Yenileme',
    'EVET',
    '28.10.2026',
    '15.11.2026',
    '15.11.2027',
    '05321234567',
    'ahmet.yilmaz@ornek.com',
    '34ABC123',
    'AS123456',
    'WVWZZZ3CZWE123456',
    'CAY123456',
    'OTOMOBİL',
    2022,
    'Volkswagen',
    'Golf 1.5 eTSI Style',
    '100234',
    'BENZİN',
    1250000,
    'TRAFİK BİZDE DEĞİL',
    'ALLIANZ SİGORTA',
    '15.11.2026',
    'Müşteri genişletilmiş kasko teklifi istedi, trafik poliçesi rakip acentede.',
  ],
  [
    '2 (ÖRNEK SATIR - SİLİNEBİLİR)',
    'ABC Mimarlık Mühendislik Ltd. Şti.',
    'Trafik',
    'Yeni İş',
    'HAYIR',
    '28.10.2026',
    '01.12.2026',
    '01.12.2027',
    '02129876543',
    'muhasebe@abcmimarlik.com',
    '06XYZ789',
    'BC654321',
    'VF1BB123456789012',
    'K9K789012',
    'KAMYONET',
    2021,
    'Renault',
    'Kangoo Maxi',
    '200567',
    'DİZEL',
    750000,
    'KASKO BİZDE DEĞİL',
    'TÜRKİYE SİGORTA',
    '01.12.2026',
    'Şirket aracı filosu için teklif istendi.',
  ],
];

// 2. Sheet: Sirket_Teklifleri (Çoklu şirket teklifleri ve Teklif Alınamadı kayıtları)
const sirketTeklifleriHeaders = [
  'Teklif_Sira_No*',
  'Sigorta_Sirketi*',
  'Durum*',
  'Teklif_Numarasi',
  'Prim_TL',
  'Sirket_Teklif_Notu',
];

const sirketTeklifleriRows = [
  [
    '1',
    'AK SİGORTA',
    'TEKLİF ALINDI',
    'AK-849201',
    18450.5,
    'Genişletilmiş Kasko, Yetkili Servis, Muafiyetsiz Cam',
  ],
  [
    '1',
    'ALLIANZ SİGORTA',
    'TEKLİF ALINDI',
    'ALZ-993120',
    21200.0,
    'Tam Kasko, Orijinal Parça, 15 Gün İkame Araç',
  ],
  [
    '1',
    'TÜRKİYE SİGORTA',
    'TEKLİF ALINDI',
    'TR-445102',
    17300.75,
    'Ekonomik Kasko Paketi',
  ],
  [
    '1',
    'RAY SİGORTA',
    'TEKLİF ALINAMADI',
    '',
    '',
    'Model yılı ve kullanım tarzı şirketin kasko kabul kriterleri dışındadır.',
  ],
  [
    '2',
    'ANADOLU SİGORTA',
    'TEKLİF ALINDI',
    'AND-102938',
    9850.0,
    'Zorunlu Trafik Sigortası, İMM 1.000.000 TL',
  ],
  [
    '2',
    'AXA SİGORTA',
    'TEKLİF ALINDI',
    'AXA-774910',
    10400.25,
    'Zorunlu Trafik Sigortası + Asistans Paketi',
  ],
  [
    '2',
    'SOMPO SİGORTA',
    'TEKLİF ALINAMADI',
    '',
    '',
    'Sistem ekranında tavan fiyat hatası nedeniyle onay alınamadı.',
  ],
];

// 3. Sheet: Aciklamalar_ve_Rehber
const rehberData = [
  ['ALAN ADI', 'ZORUNLU MU?', 'AÇIKLAMA VE GEÇERLİ DEĞERLER', 'ÖRNEK'],
  ['Teklif_Sira_No', 'EVET', 'Ana Teklif ve Şirket Teklifleri sayfalarını bağlayan anahtardır (1, 2, 3 vb.)', '1'],
  ['Musteri_Adi_Soyadi', 'EVET', 'Sigortalının adı soyadı veya şirket unvanı', 'Ahmet Yılmaz'],
  ['Brans', 'EVET', 'Geçerli Branşlar: Kasko, Trafik, Konut, DASK, İşyeri, Sağlık (ÖSS), Tamamlayıcı Sağlık (TSS), Ferdi Kaza, Nakliyat, Sorumluluk, Seyahat Sağlık, Diğer', 'Kasko'],
  ['Is_Turu', 'EVET', 'Geçerli İş Türleri: Yenileme, Yeni İş, Takip', 'Yenileme'],
  ['Oncelikli_Is', 'HAYIR', 'Yalnızca Kasko branşı için Genel Bakış sayfasında gösterilecek öncelikli iş ise EVET, değilse HAYIR', 'EVET'],
  ['Tanzim_Tarihi', 'HAYIR', 'Teklifin hazırlandığı tarih (GG.AA.YYYY formatında)', '28.10.2026'],
  ['Baslangic_Tarihi', 'HAYIR', 'Poliçe başlangıç tarihi (GG.AA.YYYY formatında)', '15.11.2026'],
  ['Bitis_Tarihi', 'HAYIR', 'Poliçe bitiş tarihi (GG.AA.YYYY formatında). Boş bırakılırsa başlangıçtan +1 yıl hesaplanır.', '15.11.2027'],
  ['Plaka', 'HAYIR', 'Araç plakası (Boşluksuz ve büyük harflerle)', '34ABC123'],
  ['Ruhsat_Seri_No', 'HAYIR', 'Ruhsat Belge Seri Numarası', 'AS123456'],
  ['Sasi_No', 'HAYIR', '17 Haneli Araç Şasi Numarası', 'WVWZZZ3CZWE123456'],
  ['Motor_No', 'HAYIR', 'Araç Motor Numarası', 'CAY123456'],
  ['Kullanim_Tarzi', 'HAYIR', 'OTOMOBİL, KAMYONET, KAMYON, ÇEKİCİ, MİNİBÜS, OTOBÜS, MOTOSİKLET, TAKSİ, TRAKTÖR, İŞ MAKİNESİ, RÖMORK', 'OTOMOBİL'],
  ['Model_Yili', 'HAYIR', 'Aracın model yılı', '2022'],
  ['Arac_Markasi', 'HAYIR', 'Aracın markası', 'Volkswagen'],
  ['Arac_Modeli', 'HAYIR', 'Aracın model ve donanım paketi', 'Golf 1.5 eTSI Style'],
  ['Arac_Kodu_TSB', 'HAYIR', 'TSB Araç Kodu', '100234'],
  ['Yakit_Turu', 'HAYIR', 'BENZİN, DİZEL, LPG, HİBRİT, ELEKTRİK, BENZİN + LPG, DİĞER', 'BENZİN'],
  ['Arac_Kasko_Bedeli_TL', 'HAYIR', 'Kasko çarpanı hesabı için araç piyasa kasko bedeli', '1250000'],
  ['Capraz_Satis_Durumu', 'HAYIR', 'Kasko teklifi ise Trafik durumu (TRAFİK BİZDE / TRAFİK BİZDE DEĞİL); Trafik ise Kasko durumu', 'TRAFİK BİZDE DEĞİL'],
  ['Diger_Police_Sirketi', 'HAYIR', 'Başka acente/şirkette olan diğer poliçenin şirketi', 'ALLIANZ SİGORTA'],
  ['Diger_Police_Bitis_Tarihi', 'HAYIR', 'Diğer poliçenin bitiş tarihi (GG.AA.YYYY)', '15.11.2026'],
  ['Teklif_Genel_Notu', 'HAYIR', 'Teklif hakkında acente notları', 'Özel müşteri notları'],
  ['---', '---', '---', '---'],
  ['ŞİRKET TEKLİFLERİ SAYFASI ALANLARI', 'ZORUNLU MU?', 'AÇIKLAMA VE GEÇERLİ DEĞERLER', 'ÖRNEK'],
  ['Teklif_Sira_No', 'EVET', 'Ana Teklifler sayfasındaki Teklif_Sira_No ile birebir aynı olmalıdır', '1'],
  ['Sigorta_Sirketi', 'EVET', 'Onaylı Şirketler: AK SİGORTA, ALLIANZ SİGORTA, ANADOLU SİGORTA, AXA SİGORTA, DOĞA SİGORTA, EUREKO SİGORTA, HDI SİGORTA, HEPIYI SİGORTA, MAPFRE SİGORTA, NEOVA SİGORTA, RAY SİGORTA, SOMPO SİGORTA, TÜRKİYE SİGORTA', 'AK SİGORTA'],
  ['Durum', 'EVET', 'TEKLİF ALINDI veya TEKLİF ALINAMADI', 'TEKLİF ALINDI'],
  ['Teklif_Numarasi', 'ŞARTLI', 'Teklif Alındı ise girilmelidir; Teklif Alınamadı ise boş bırakılabilir', 'AK-849201'],
  ['Prim_TL', 'ŞARTLI', 'Teklif Alındı ise sayısal prim girilmelidir (Örn: 18450.50); Teklif Alınamadı ise boş bırakılır', '18450.50'],
  ['Sirket_Teklif_Notu', 'HAYIR', 'Şirkete özel teklif notu veya teminat detayları', 'Genişletilmiş Kasko'],
  ['---', '---', '---', '---'],
  ['ÖNEMLİ KURALLAR', 'KURAL DETAYI', '', ''],
  ['Teklif Aşaması', 'Yeni oluşturulan tüm teklifler sistem kuralı gereğince varsayılan olarak "MÜŞTERİYE SUNULACAK" aşamasıyla başlar.', '', ''],
  ['Tarih Formatı', 'Tarihler mutlaka GG.AA.YYYY biçiminde olmalıdır (Örn: 28.10.2026).', '', ''],
  ['Sayı / Prim Formatı', 'Primler tam sayı veya virgüllü/noktalı ondalık sayı olarak girilebilir. Para birimi sembolü (₺) yazmayınız.', '', ''],
  ['Metin Alanları', 'Plaka, Şasi No, Vergi/TC No gibi alanlarda baştaki sıfırların veya harflerin kaybolmaması için hücreler Metin olarak tutulmalıdır.', '', ''],
  ['Çoklu Şirket Mantığı', 'Aynı Teklif_Sira_No ile Şirket Teklifleri sayfasına istediğiniz kadar şirket ekleyebilirsiniz. İlk TEKLİF ALINDI kaydı ana prim olarak seçilir.', '', ''],
];

// Create workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Ana_Teklifler
const ws1Data = [anaTekliflerHeaders, ...anaTekliflerRows];
const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

// Set column widths for Sheet 1
ws1['!cols'] = [
  { wch: 18 }, // Teklif_Sira_No
  { wch: 28 }, // Musteri_Adi_Soyadi
  { wch: 15 }, // Brans
  { wch: 14 }, // Is_Turu
  { wch: 14 }, // Oncelikli_Is
  { wch: 15 }, // Tanzim_Tarihi
  { wch: 16 }, // Baslangic_Tarihi
  { wch: 16 }, // Bitis_Tarihi
  { wch: 15 }, // Telefon
  { wch: 26 }, // E_Posta
  { wch: 14 }, // Plaka
  { wch: 16 }, // Ruhsat_Seri_No
  { wch: 22 }, // Sasi_No
  { wch: 16 }, // Motor_No
  { wch: 16 }, // Kullanim_Tarzi
  { wch: 12 }, // Model_Yili
  { wch: 18 }, // Arac_Markasi
  { wch: 22 }, // Arac_Modeli
  { wch: 15 }, // Arac_Kodu_TSB
  { wch: 14 }, // Yakit_Turu
  { wch: 22 }, // Arac_Kasko_Bedeli_TL
  { wch: 22 }, // Capraz_Satis_Durumu
  { wch: 22 }, // Diger_Police_Sirketi
  { wch: 24 }, // Diger_Police_Bitis_Tarihi
  { wch: 45 }, // Teklif_Genel_Notu
];

// Sheet 2: Sirket_Teklifleri
const ws2Data = [sirketTeklifleriHeaders, ...sirketTeklifleriRows];
const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);

// Set column widths for Sheet 2
ws2['!cols'] = [
  { wch: 18 }, // Teklif_Sira_No
  { wch: 22 }, // Sigorta_Sirketi
  { wch: 18 }, // Durum
  { wch: 18 }, // Teklif_Numarasi
  { wch: 16 }, // Prim_TL
  { wch: 55 }, // Sirket_Teklif_Notu
];

// Sheet 3: Aciklamalar_ve_Rehber
const ws3 = XLSX.utils.aoa_to_sheet(rehberData);
ws3['!cols'] = [
  { wch: 28 },
  { wch: 16 },
  { wch: 75 },
  { wch: 25 },
];

XLSX.utils.book_append_sheet(wb, ws1, 'Ana_Teklifler');
XLSX.utils.book_append_sheet(wb, ws2, 'Sirket_Teklifleri');
XLSX.utils.book_append_sheet(wb, ws3, 'Aciklamalar_ve_Rehber');

// Ensure public directory exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPathPublic = path.join(publicDir, 'teklif_aktarim_sablonu.xlsx');
const outputPathRoot = path.resolve('teklif_aktarim_sablonu.xlsx');

XLSX.writeFile(wb, outputPathPublic);
XLSX.writeFile(wb, outputPathRoot);

console.log('Template generated successfully at:', outputPathPublic, 'and', outputPathRoot);
