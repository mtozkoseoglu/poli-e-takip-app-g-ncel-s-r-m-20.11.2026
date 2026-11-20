import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const DOGANIUM_TEMPLATE_HEADERS = [
  'Plaka',
  'Ruhsat Seri No',
  'Şasi No',
  'Motor No',
  'Kullanım Tarzı',
  'Model Yılı',
  'Marka',
  'Model',
  'Marka Kodu',
  'Model Kodu',
  'Kasko Değeri',
  'İsim - Ünvan',
  'İş Türü',
  'Yakıt Türü',
  'Öncelikli İş',
  'Başlangıç Tarihi',
  'Bitiş Tarihi',
  'Tanzim Tarihi',
  'Doğa Sigorta',
  'Axa Sigorta',
  'Hepiyi Sigorta',
  'Allianz Sigorta',
  'HDI Sigorta',
  'Ray Sigorta',
  'Doğanium Teklif Metni',
];

const DOGANIUM_SAMPLE_DATA = [
  [
    '34ABC123',
    'AS123456',
    'WVWZZZ3CZWE123456',
    'CAY123456',
    'OTOMOBİL',
    2022,
    'Volkswagen',
    'Passat 1.5 TSI Elegance',
    '100234',
    '05',
    '1.850.000 TL',
    'Neoloji Otomotiv San. ve Tic. Ltd. Şti.',
    'Yenileme',
    'BENZİN',
    'Evet',
    '14.11.2027',
    '14.11.2028',
    '06.11.2026',
    '24.850,00 ₺ Teklif No: 71829401',
    '26.200,50 ₺ Teklif No: 948201',
    '22.450,00 ₺ Teklif No: 5549102',
    '27.100,00 ₺ Teklif No: 385912832/1',
    '23.900,00 ₺ Teklif No: 88391023',
    '25.350,00 ₺ 1650725178 - 0',
    'Doğa: 24.850 TL | Axa: 26.200 TL | Hepiyi: 22.450 TL | Allianz: 27.100 TL | HDI: 23.900 TL | Ray: 25.350 TL',
  ],
  [
    '06XYZ789',
    'BC654321',
    'VF1BB123456789012',
    'K9K789012',
    'KAMYONET',
    2021,
    'Renault',
    'Kangoo Maxi 1.5 dCi',
    '200567',
    '12',
    '920.000 TL',
    'ABC Mimarlık ve Mühendislik A.Ş.',
    'Yeni İş',
    'DİZEL',
    'Hayır',
    '01.12.2026',
    '01.12.2027',
    '06.11.2026',
    '14.250,00 ₺ Teklif No: 62049182',
    '15.100,00 ₺ Teklif No: 492810',
    '13.800,00 ₺ Teklif No: 8492014',
    '16.400,00 ₺ Teklif No: 409128472/1',
    '14.950,00 ₺ Teklif No: 7729104',
    '15.600,00 ₺ 1709283419 - 0',
    'Doğa: 14.250 TL | Axa: 15.100 TL | Hepiyi: 13.800 TL | Allianz: 16.400 TL | HDI: 14.950 TL | Ray: 15.600 TL',
  ],
  [
    '35DEF456',
    'DE987654',
    'WBA31AY08NFP12345',
    'B48B20A9876',
    'OTOMOBİL',
    2023,
    'BMW',
    '320i Sedan M Sport',
    '300890',
    '01',
    '3.250.000 TL',
    'Demir Danışmanlık ve Ticaret Ltd.',
    'Yenileme',
    'BENZİN',
    'Evet',
    '20.11.2026',
    '20.11.2027',
    '06.11.2026',
    '38.500,00 ₺ Teklif No: 91827402',
    '39.800,00 ₺ Teklif No: 819203',
    '36.900,00 ₺ Teklif No: 6619283',
    '41.200,00 ₺ Teklif No: 519283012/1',
    '37.400,00 ₺ Teklif No: 9028194',
    '39.100,00 ₺ 1829304910 - 0',
    'Doğa: 38.500 TL | Axa: 39.800 TL | Hepiyi: 36.900 TL | Allianz: 41.200 TL | HDI: 37.400 TL | Ray: 39.100 TL',
  ],
];

const GUIDE_ROWS = [
  ['SÜTUN BAŞLIĞI', 'ZORUNLU MU?', 'AÇIKLAMA VE GEÇERLİ DEĞERLER', 'ÖRNEK DEĞER'],
  ['Plaka', 'Evet', 'Araç plakası (Büyük harf ve boşluksuz)', '34ABC123'],
  ['Ruhsat Seri No', 'Hayır', 'Araç tescil belge seri numarası', 'AS123456'],
  ['Şasi No', 'Hayır', '17 haneli şasi / VIN numarası', 'WVWZZZ3CZWE123456'],
  ['Motor No', 'Hayır', 'Araç motor numarası', 'CAY123456'],
  ['Kullanım Tarzı', 'Hayır', 'OTOMOBİL, KAMYONET, KAMYON, ÇEKİCİ, MİNİBÜS, vb.', 'OTOMOBİL'],
  ['Model Yılı', 'Hayır', 'Aracın model yılı', '2022'],
  ['Marka', 'Hayır', 'Aracın markası', 'Volkswagen'],
  ['Model', 'Hayır', 'Aracın modeli ve donanım paketi', 'Passat 1.5 TSI Elegance'],
  ['Marka Kodu', 'Hayır', 'TSB Marka Kodu', '100234'],
  ['Model Kodu', 'Hayır', 'TSB Model Kodu', '05'],
  ['Kasko Değeri', 'Hayır', 'Araç bedeli (Sayısal veya 1.850.000 TL biçiminde)', '1.850.000 TL'],
  ['İsim - Ünvan', 'Evet', 'Sigortalı kişi adı soyadı veya tüzel kişi unvanı', 'Neoloji Otomotiv San. ve Tic. Ltd. Şti.'],
  ['İş Türü', 'Evet', 'Yenileme veya Yeni İş', 'Yenileme'],
  ['Yakıt Türü', 'Hayır', 'BENZİN, DİZEL, LPG, HİBRİT, ELEKTRİK', 'BENZİN'],
  ['Öncelikli İş', 'Hayır', 'Genel Bakışta öncelikli iş olarak takip edilsin mi? (Evet / Hayır)', 'Evet'],
  ['Başlangıç Tarihi', 'Hayır', 'Poliçe başlangıç tarihi (GG.AA.YYYY formatında)', '14.11.2027'],
  ['Bitiş Tarihi', 'Hayır', 'Poliçe bitiş tarihi (GG.AA.YYYY formatında). Boşsa başlangıçtan +1 yıl hesaplanır.', '14.11.2028'],
  ['Tanzim Tarihi', 'Hayır', 'Teklifin sorgulandığı tarih (GG.AA.YYYY formatında)', '06.11.2026'],
  ['Doğa Sigorta', 'Hayır', 'Doğa Sigorta prim tutarı ve teklif numarası', '24.850,00 ₺ Teklif No: 71829401'],
  ['Axa Sigorta', 'Hayır', 'Axa Sigorta prim tutarı ve teklif numarası', '26.200,50 ₺ Teklif No: 948201'],
  ['Hepiyi Sigorta', 'Hayır', 'Hepiyi Sigorta prim tutarı ve teklif numarası', '22.450,00 ₺ Teklif No: 5549102'],
  ['Allianz Sigorta', 'Hayır', 'Allianz Sigorta prim tutarı ve teklif numarası', '27.100,00 ₺ Teklif No: 385912832/1'],
  ['HDI Sigorta', 'Hayır', 'HDI Sigorta prim tutarı ve teklif numarası', '23.900,00 ₺ Teklif No: 88391023'],
  ['Ray Sigorta', 'Hayır', 'Ray Sigorta prim tutarı ve teklif numarası', '25.350,00 ₺ 1650725178 - 0'],
  ['Doğanium Teklif Metni', 'Hayır', 'Doğanium tarafından üretilen toplu sorgulama metni', 'Doğa: 24.850 TL | Axa: 26.200 TL | ...'],
];

export function generateTemplate() {
  const wb = XLSX.utils.book_new();

  const sheetData = [
    ['DOĞANİUM KASKO SORGULAMA VE TOPLU AKTARIM ŞABLONU'],
    DOGANIUM_TEMPLATE_HEADERS,
    ...DOGANIUM_SAMPLE_DATA,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 32 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 30 },
    { wch: 28 },
    { wch: 28 },
    { wch: 55 },
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 24 } },
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(GUIDE_ROWS);
  wsGuide['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 65 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Kasko-Sorgulamalari');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Kullanim_Rehberi');

  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicFile = path.join(publicDir, 'Doganium_Aktarim_Sablonu.xlsx');
  const rootFile = path.resolve('Doganium_Aktarim_Sablonu.xlsx');

  XLSX.writeFile(wb, publicFile);
  XLSX.writeFile(wb, rootFile);

  console.log('SUCCESS: Doganium template successfully written with SheetJS:');
  console.log('Public:', publicFile);
  console.log('Root:', rootFile);
}

generateTemplate();
