import * as XLSX from 'xlsx';

export const DOGANIUM_TEMPLATE_HEADERS = [
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
] as const;

export const DOGANIUM_SAMPLE_DATA = [
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

/**
 * Builds a 100% standard, clean OpenXML XLSX Workbook using SheetJS
 */
export const buildDoganiumTemplateWorkbook = (): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();

  // 1. Data Sheet: Kasko-Sorgulamalari
  const sheetData: any[][] = [
    ['DOĞANİUM KASKO SORGULAMA VE TOPLU AKTARIM ŞABLONU'],
    [...DOGANIUM_TEMPLATE_HEADERS],
    ...DOGANIUM_SAMPLE_DATA,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // Plaka
    { wch: 16 }, // Ruhsat Seri No
    { wch: 22 }, // Şasi No
    { wch: 16 }, // Motor No
    { wch: 16 }, // Kullanım Tarzı
    { wch: 12 }, // Model Yılı
    { wch: 16 }, // Marka
    { wch: 24 }, // Model
    { wch: 14 }, // Marka Kodu
    { wch: 14 }, // Model Kodu
    { wch: 18 }, // Kasko Değeri
    { wch: 32 }, // İsim - Ünvan
    { wch: 14 }, // İş Türü
    { wch: 14 }, // Yakıt Türü
    { wch: 14 }, // Öncelikli İş
    { wch: 16 }, // Başlangıç Tarihi
    { wch: 16 }, // Bitiş Tarihi
    { wch: 16 }, // Tanzim Tarihi
    { wch: 28 }, // Doğa Sigorta
    { wch: 28 }, // Axa Sigorta
    { wch: 28 }, // Hepiyi Sigorta
    { wch: 30 }, // Allianz Sigorta
    { wch: 28 }, // HDI Sigorta
    { wch: 28 }, // Ray Sigorta
    { wch: 55 }, // Doğanium Teklif Metni
  ];

  // Merge title banner over 25 columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 24 } },
  ];

  // 2. Guide Sheet: Kullanim_Rehberi
  const wsGuide = XLSX.utils.aoa_to_sheet(GUIDE_ROWS);
  wsGuide['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 65 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Kasko-Sorgulamalari');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Kullanim_Rehberi');

  return wb;
};

/**
 * Generates an in-memory binary Blob containing the exact XLSX file
 */
export const generateDoganiumTemplateBlob = (): Blob => {
  const wb = buildDoganiumTemplateWorkbook();
  const wbout = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
  });

  return new Blob([wbout as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

/**
 * Client-side direct download of the Doganium template without server roundtrips
 */
export const downloadDoganiumTemplateFile = (
  filename: string = 'Doganium_Aktarim_Sablonu.xlsx'
): void => {
  try {
    const blob = generateDoganiumTemplateBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    console.error('Doğanium şablonu tarayıcıda oluşturulurken hata:', err);
    // Direct static link fallback if DOM manipulation fails
    const fallbackLink = document.createElement('a');
    fallbackLink.href = `/${filename}`;
    fallbackLink.setAttribute('download', filename);
    fallbackLink.click();
  }
};
