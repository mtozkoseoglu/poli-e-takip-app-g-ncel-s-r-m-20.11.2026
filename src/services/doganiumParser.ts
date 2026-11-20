import * as XLSX from 'xlsx';
import {
  COMPANIES,
  BusinessType,
  USAGE_STYLES,
  FUEL_TYPES,
  CompanyOffer,
  Quote,
} from '../types/insurance';
import {
  parseNumberTr,
  generateId,
  addOneYear,
  getTodayIso,
} from './storage';

export interface DoganiumParsedOffer {
  company: string;
  premium: number | null;
  quoteNumber: string;
  status: 'TEKLİF ALINDI' | 'TEKLİF ALINAMADI';
  extraDescription?: string;
  noOffer?: boolean;
}

export interface DoganiumParsedVehicle {
  tempId: string;
  rowNumber: number; // 1-indexed row number in Excel
  insured: string;
  plate: string;
  licenseSerialNo: string;
  chassisNo: string;
  engineNo: string;
  usageStyle: string;
  vehicleYear?: number | string;
  vehicleBrand: string;
  vehicleModel: string;
  markaKodu?: string;
  modelKodu?: string;
  vehicleCode: string;
  vehicleValue?: number;
  businessType: BusinessType;
  fuelType?: string;
  isPriority: boolean;
  branch: string;
  startDate?: string;
  endDate?: string;
  issueDate?: string;
  previousStartDate?: string; // Excel'deki orijinal Başlangıç Tarihi
  previousEndDate?: string; // Excel'deki orijinal Bitiş Tarihi
  doganiumText?: string;
  offers: DoganiumParsedOffer[];
  hasExistingQuote?: boolean;
  existingQuoteNumber?: string;
  errors: string[];
  warnings: string[];
}

export interface DoganiumParseResult {
  vehicles: DoganiumParsedVehicle[];
  detectedBranch: 'Kasko' | 'Trafik' | null;
  sheetName: string;
  totalRows: number;
  headerRowIndex: number;
}

// Normalize strings for matching across Turkish characters and case variations
export const normalizeTurkishForMatch = (s?: string): string => {
  if (!s) return '';
  return s
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/Ö/g, 'O')
    .replace(/Ü/g, 'U')
    .replace(/[\s\-_–—.]+/g, ' ')
    .trim();
};

// Doğanium aktarımında YALNIZCA aşağıdaki 6 şirket geçerlidir:
export const DOGANIUM_AUTHORIZED_COMPANIES = [
  'DOĞA SİGORTA',
  'AXA SİGORTA',
  'HEPIYI SİGORTA',
  'ALLIANZ SİGORTA',
  'HDI SİGORTA',
  'RAY SİGORTA',
] as const;

export const matchCompanyFromText = (str?: string): string | null => {
  if (!str) return null;
  const norm = normalizeTurkishForMatch(str);

  // Exact word boundary checks for ONLY the 6 authorized companies
  if (/\b(DOGA|DOĞA)\b/i.test(norm)) return 'DOĞA SİGORTA';
  if (/\bAXA\b/i.test(norm)) return 'AXA SİGORTA';
  if (/\b(HEPIYI|HEPİYİ)\b/i.test(norm)) return 'HEPIYI SİGORTA';
  if (/\b(ALLIANZ|ALLİANZ)\b/i.test(norm)) return 'ALLIANZ SİGORTA';
  if (/\bHDI\b/i.test(norm)) return 'HDI SİGORTA';
  if (/\bRAY\b/i.test(norm)) return 'RAY SİGORTA';

  return null;
};

// Date parser: handles Excel serial numbers, DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
export const parseDoganiumDate = (val: any): string => {
  if (val === undefined || val === null || val === '') return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }
  if (typeof val === 'number') {
    // Excel serial date number - use SSF to avoid any timezone/leap-year discrepancies
    if (val > 20000 && val < 60000) {
      try {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const y = parsed.y;
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch {
        const ms = Math.round((val - 25569) * 86400 * 1000);
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        }
      }
    }
  }
  const str = String(val).trim();
  // Match DD.MM.YYYY or DD/MM/YYYY with optional time component
  const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Match YYYY-MM-DD with optional time component
  const ymdMatch = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
};

// Numeric price parser: converts Turkish format like "23.773,57 ₺" to 23773.57
export const parseDoganiumPrice = (val: any): number | null => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) || val <= 0 ? null : val;
  }
  const parsed = parseNumberTr(String(val));
  return parsed !== null && parsed > 0 ? parsed : null;
};

// Rule-based parser for Doğanium Teklif Metni
export const parseDoganiumText = (
  rawText?: string
): Array<{ company: string; premium: number | null; quoteNumber: string; extraDescription?: string }> => {
  if (!rawText || !rawText.trim()) return [];
  // Support both line breaks and pipe (|) separated chunks
  const lines = rawText.split(/\r?\n|\|/).map((l) => l.trim()).filter(Boolean);
  const results: Array<{ company: string; premium: number | null; quoteNumber: string; extraDescription?: string }> = [];

  for (const line of lines) {
    const matchedCompany = matchCompanyFromText(line);
    if (!matchedCompany) continue;

    // 1. Extract first price in the line (e.g. 23.773,57 ₺, 24.850 TL, or 29115.60)
    const priceMatch = line.match(/(\d{1,3}(?:\.\d{3})+,\d{2}|\d{1,3}(?:\.\d{3})+|\d+,\d{2}|\d+(?:\.\d{2})?)\s*(?:₺|TL)?/i);
    let premium: number | null = null;
    let afterPrice = line;
    if (priceMatch) {
      let pStr = priceMatch[1];
      if (pStr.includes(',') && pStr.includes('.')) {
        pStr = pStr.replace(/\./g, '').replace(',', '.');
      } else if (pStr.includes(',')) {
        pStr = pStr.replace(',', '.');
      } else if (pStr.includes('.')) {
        if (/^\d{1,3}(?:\.\d{3})+$/.test(pStr)) {
          pStr = pStr.replace(/\./g, '');
        }
      }
      const parsedP = parseFloat(pStr);
      if (!isNaN(parsedP) && parsedP > 0) {
        premium = parsedP;
      }
      const pIdx = line.indexOf(priceMatch[0]);
      afterPrice = line.substring(pIdx + priceMatch[0].length).trim();
    }

    // 2. Clean status indicators like "- Onaylı ✔️ -", "Onaylı", etc.
    let remaining = afterPrice
      .replace(/^[\s\-_–—]+/, '')
      .replace(/^(?:Onaylı|Onayli|Teklif Alındı|Teklif Alindi|✔️|✅|\*|[-_–—\s])+/gi, '')
      .replace(/^[\s\-_–—]+/, '')
      .trim();

    // 3. Extract Teklif No
    let quoteNumber = '';

    // Specific Pattern 1: Fiyat Çalışması No: 724770053 (e.g. Axa)
    const fiyatCalismasiMatch = remaining.match(/Fiyat\s+Çalışması\s+No:\s*([A-Za-z0-9_\-/]+)/i);
    if (fiyatCalismasiMatch) {
      quoteNumber = fiyatCalismasiMatch[1].trim();
      remaining = remaining.replace(fiyatCalismasiMatch[0], '').trim();
    } else {
      // Specific Pattern 2: Teklif No: 123456 or Poliçe No: 123456
      const teklifNoMatch = remaining.match(/(?:Teklif|Poliçe)\s+No:\s*([A-Za-z0-9_\-/]+)/i);
      if (teklifNoMatch) {
        quoteNumber = teklifNoMatch[1].trim();
        remaining = remaining.replace(teklifNoMatch[0], '').trim();
      } else {
        // Pattern 3: Number with slash: 385912832/1 (e.g. Allianz)
        const slashNumMatch = remaining.match(/\b(\d{6,16}\/\d+)\b/);
        if (slashNumMatch) {
          quoteNumber = slashNumMatch[1].trim();
          remaining = remaining.replace(slashNumMatch[0], '').trim();
        } else {
          // Pattern 4: Number with hyphen/dash: 1650725178 - 0 (e.g. Ray)
          // Extract only the leading digits without the trailing "- 0"
          const dashNumMatch = remaining.match(/\b(\d{7,16})\s*-\s*\d+\b/);
          if (dashNumMatch) {
            quoteNumber = dashNumMatch[1].trim();
            remaining = remaining.replace(dashNumMatch[0], '').trim();
          } else {
            // Pattern 5: Plain 7-18 digit number (e.g. Doğa, HDI, Hepiyi)
            const plainNumMatch = remaining.match(/\b(\d{7,18})\b/);
            if (plainNumMatch) {
              quoteNumber = plainNumMatch[1].trim();
              remaining = remaining.replace(plainNumMatch[0], '').trim();
            }
          }
        }
      }
    }

    // Safety rule for Ray Sigorta: if quoteNumber contains trailing dash with status/digits, remove it
    if (matchedCompany === 'RAY SİGORTA' && quoteNumber) {
      quoteNumber = quoteNumber.replace(/\s*-\s*\d+$/, '').trim();
    }

    // 4. Clean disclaimer text from remaining to get extraDescription (alternative products, notes)
    let extra = remaining
      .replace(/\(Kesin\s+onay\s+için\s+teyit\s+alınız\.?\)/gi, '')
      .replace(/Kesin\s+Onay\s+için\s+lütfen\s+teklif\s+numarasıyla\s+teyit\s+alınız\.?/gi, '')
      .replace(/Kesin\s+onay\s+için\s+lütfen\s+teyit\s+alınız\.?/gi, '')
      .replace(/[\s\-_–—()]+/g, ' ')
      .replace(/✔️/g, '')
      .trim();

    results.push({
      company: matchedCompany,
      premium,
      quoteNumber,
      extraDescription: extra || undefined,
    });
  }

  return results;
};

// Detect branch from file name
export const detectBranchFromFileName = (fileName: string): 'Kasko' | 'Trafik' | null => {
  const norm = normalizeTurkishForMatch(fileName);
  if (norm.includes('KASKO')) return 'Kasko';
  if (norm.includes('TRAFIK') || norm.includes('TRAFİK')) return 'Trafik';
  return null;
};

// Parse an entire Excel workbook
export const parseDoganiumWorkbook = (
  workbook: XLSX.WorkBook,
  fileName: string,
  explicitBranch?: 'Kasko' | 'Trafik' | null,
  existingQuotes?: Quote[]
): DoganiumParseResult => {
  // 1. Determine sheet: prefer 'Kasko-Sorgulamalari', otherwise first sheet
  const targetSheetName =
    workbook.SheetNames.find(
      (name) => normalizeTurkishForMatch(name).includes('KASKO') || normalizeTurkishForMatch(name).includes('SORGULA')
    ) || workbook.SheetNames[0];

  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) {
    throw new Error('Excel dosyasında geçerli bir çalışma sayfası bulunamadı.');
  }

  // 2. Read raw rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Seçilen Excel sayfası boş.');
  }

  // 3. Detect header row (scan first 6 rows)
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
    const row = rawRows[r];
    const joined = row.map((cell) => normalizeTurkishForMatch(String(cell))).join(' ');
    if (joined.includes('PLAKA') || (joined.includes('SASI') && joined.includes('MARKA'))) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Fallback: assume row index 1 (Excel row 2)
    headerRowIndex = rawRows.length > 1 ? 1 : 0;
  }

  const headerRow = rawRows[headerRowIndex] || [];

  // 4. Map columns
  const colMap: Record<string, number> = {};
  const companyCols: Array<{ index: number; company: string }> = [];

  headerRow.forEach((colHeader, idx) => {
    const raw = String(colHeader || '').trim();
    const norm = normalizeTurkishForMatch(raw);

    if (norm.includes('PLAKA')) colMap.plate = idx;
    else if (norm.includes('RUHSAT') || norm.includes('BELGE SERI') || norm.includes('SERI NO')) colMap.ruhsat = idx;
    else if (norm.includes('SASI') || norm.includes('CHASSIS') || norm.includes('VIN')) colMap.chassis = idx;
    else if (norm.includes('MOTOR') || norm.includes('ENGINE')) colMap.engine = idx;
    else if (norm.includes('CINS') || norm.includes('KULLANIM TARZ')) colMap.usageStyle = idx;
    else if (norm === 'YIL' || norm.includes('MODEL YIL') || norm.includes('ARAC YIL')) colMap.year = idx;
    else if (norm === 'MARKA KODU' || norm === 'MARKA KOD') colMap.markaKodu = idx;
    else if (norm === 'MODEL KODU' || norm === 'MODEL KOD') colMap.modelKodu = idx;
    else if (norm === 'MARKA') colMap.brand = idx;
    else if (norm === 'MODEL') colMap.model = idx;
    else if (norm.includes('KASKO DEGER') || norm.includes('ARAC DEGER') || norm.includes('ARAC BEDEL') || norm.includes('KASKO BEDEL') || norm === 'BEDEL' || norm.includes('BEDEL')) colMap.vehicleValue = idx;
    else if (norm.includes('ISIM') || norm.includes('UNVAN') || norm.includes('MUSTERI') || norm.includes('SIGORTALI')) colMap.insured = idx;
    else if (norm.includes('IS TUR') || norm.includes('ISTUR') || norm.includes('IS TIPI')) colMap.businessType = idx;
    else if (norm.includes('YAKIT')) colMap.fuelType = idx;
    else if (norm.includes('ONCELIK')) colMap.isPriority = idx;
    else if (norm.includes('BASLANGIC')) colMap.startDate = idx;
    else if (norm.includes('BITIS')) colMap.endDate = idx;
    else if (norm.includes('SORGU ZAMAN') || norm.includes('TANZIM')) colMap.issueDate = idx;
    else if (norm.includes('TEKLIF METN') || norm.includes('DOGANIUM') || norm.includes('METIN')) colMap.doganiumText = idx;
    else {
      // Check if header is one of the 6 authorized companies (Doğa, Axa, Hepiyi, Allianz, HDI, Ray)
      const matchedCompany = matchCompanyFromText(raw);
      if (matchedCompany) {
        companyCols.push({ index: idx, company: matchedCompany });
      }
    }
  });

  // Determine branch
  const detectedBranch = explicitBranch || detectBranchFromFileName(fileName) || 'Kasko';

  const vehicles: DoganiumParsedVehicle[] = [];

  // Existing active quotes lookup to detect duplicate plates
  const existingActiveQuotesMap = new Map<string, Quote>();
  if (Array.isArray(existingQuotes)) {
    existingQuotes.forEach((q) => {
      if (q.plate && q.status !== 'concluded') {
        const cleanPl = q.plate.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
        existingActiveQuotesMap.set(cleanPl, q);
      }
    });
  }

  // 5. Parse data rows
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Read cells
    const getCell = (key: string) => {
      const idx = colMap[key];
      return idx !== undefined && idx < row.length ? row[idx] : '';
    };

    const rawInsured = String(getCell('insured') || '').trim();
    const rawPlate = String(getCell('plate') || '').trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '');

    // Skip completely empty spacer rows
    if (!rawInsured && !rawPlate && row.every((c) => String(c || '').trim() === '')) {
      continue;
    }

    const rawLicense = String(getCell('ruhsat') || '').trim().toLocaleUpperCase('tr-TR');
    const rawChassis = String(getCell('chassis') || '').trim().toLocaleUpperCase('tr-TR');
    const rawEngine = String(getCell('engine') || '').trim().toLocaleUpperCase('tr-TR');
    const rawUsage = String(getCell('usageStyle') || '').trim().toLocaleUpperCase('tr-TR');
    const rawYear = getCell('year');
    const rawBrand = String(getCell('brand') || '').trim();
    const rawModel = String(getCell('model') || '').trim();
    const rawMarkaKodu = String(getCell('markaKodu') || '').trim();
    const rawModelKodu = String(getCell('modelKodu') || '').trim();
    const rawVehicleValue = getCell('vehicleValue');
    const rawBusinessType = String(getCell('businessType') || '').trim();
    const rawFuelType = String(getCell('fuelType') || '').trim().toLocaleUpperCase('tr-TR');
    const rawPriority = String(getCell('isPriority') || '').trim().toLocaleUpperCase('tr-TR');
    const rawStartDate = getCell('startDate');
    const rawEndDate = getCell('endDate');
    const rawIssueDate = getCell('issueDate');
    const rawDoganiumText = String(getCell('doganiumText') || '').trim();

    // Combine Marka Kodu + Model Kodu as vehicleCode (preserving leading zeros, direct concatenation)
    let vehicleCode = '';
    if (rawMarkaKodu || rawModelKodu) {
      vehicleCode = `${rawMarkaKodu}${rawModelKodu}`;
    }

    // BusinessType validation: 'Yeni İş' or 'Yenileme'
    let businessType: BusinessType = 'Yeni İş'; // Default if empty/unknown
    let btWarning = false;
    const cleanBT = rawBusinessType.trim();
    const normBT = normalizeTurkishForMatch(cleanBT);

    if (normBT === 'YENILEME' || normBT.includes('YENILEME')) {
      businessType = 'Yenileme';
    } else if (
      normBT === 'YENI IS' ||
      normBT === 'YENI' ||
      /\bYENI\s*IS\b/.test(normBT) ||
      /\bYENI\b/.test(normBT)
    ) {
      businessType = 'Yeni İş';
    } else if (cleanBT) {
      // Unrecognized non-empty value: preserve default 'Yeni İş' and add a warning
      businessType = 'Yeni İş';
      btWarning = true;
    }

    // Priority
    const isPriority = /EVET|TRUE|1|VAR/i.test(rawPriority);

    // Dates
    // Excel'deki 'Başlangıç Tarihi' ve 'Bitiş Tarihi' sütunları önceki/mevcut poliçenin tarihleridir!
    const excelStartDate = parseDoganiumDate(rawStartDate);
    const excelEndDate = parseDoganiumDate(rawEndDate);
    const previousStartDate = excelStartDate || undefined;
    const previousEndDate = excelEndDate || undefined;

    // Yeni teklif dönemi oluşturma kuralları:
    // - Yeni teklif başlangıç tarihi = Excel'deki önceki poliçenin bitiş tarihi (yoksa önceki başlangıç tarihi)
    // - Yeni teklif bitiş tarihi = Yeni başlangıç tarihine 1 takvim yılı eklenmiş tarih
    // - Excel tarihleri tamamen boşsa otomatik uydurma tarih üretilmez; boş bırakılır.
    let newStartDate = '';
    let newEndDate = '';
    if (excelEndDate) {
      newStartDate = excelEndDate;
      newEndDate = addOneYear(excelEndDate);
    } else if (excelStartDate) {
      newStartDate = excelStartDate;
      newEndDate = addOneYear(excelStartDate);
    }

    const parsedIssueDate = parseDoganiumDate(rawIssueDate) || (newStartDate ? newStartDate : getTodayIso());

    // Numeric vehicle value
    const parsedVehicleVal = parseDoganiumPrice(rawVehicleValue);

    // Usage style normalizer
    let matchedUsage = rawUsage;
    if (rawUsage) {
      const matchStyle = USAGE_STYLES.find((s) => normalizeTurkishForMatch(s) === normalizeTurkishForMatch(rawUsage));
      if (matchStyle) matchedUsage = matchStyle;
    }

    // Fuel type normalizer
    let matchedFuel = rawFuelType;
    if (rawFuelType) {
      const matchFuel = FUEL_TYPES.find((f) => normalizeTurkishForMatch(f) === normalizeTurkishForMatch(rawFuelType));
      if (matchFuel) matchedFuel = matchFuel;
    }

    // 6. Parse and Reconcile Company Offers:
    // A) Offers from Doğanium Teklif Metni
    const parsedTextOffers = parseDoganiumText(rawDoganiumText);
    const textOfferMap = new Map<string, { premium: number | null; quoteNumber: string; extraDescription?: string }>();
    parsedTextOffers.forEach((to) => {
      textOfferMap.set(to.company, to);
    });

    // B) Offers from Excel columns
    const colOfferMap = new Map<string, { premium: number | null }>();
    companyCols.forEach(({ index, company }) => {
      const rawCellVal = index < row.length ? row[index] : '';
      const cellPrice = parseDoganiumPrice(rawCellVal);
      colOfferMap.set(company, { premium: cellPrice });
    });

    // C) YALNIZCA 6 ONAYLI ŞİRKET (Doğa, Axa, Hepiyi, Allianz, HDI, Ray)
    // 6 şirketin tamamı her araç için oluşturulur.
    // Prim varsa TEKLİF ALINDI, prim hücresi boşsa TEKLİF ALINAMADI durumunda oluşturulur.
    // Ak Sigorta veya başka bir şirket kesinlikle oluşturulmaz.
    const offersList: DoganiumParsedOffer[] = DOGANIUM_AUTHORIZED_COMPANIES.map((companyName) => {
      const colOffer = colOfferMap.get(companyName);
      const textOffer = textOfferMap.get(companyName);

      const cellPrice = colOffer?.premium ?? null;
      const textPrice = textOffer?.premium ?? null;
      const resolvedPremium = cellPrice !== null ? cellPrice : textPrice;
      const hasPrice = resolvedPremium !== null && resolvedPremium > 0;
      const resolvedQuoteNo = textOffer?.quoteNumber || '';
      const resolvedExtra = textOffer?.extraDescription;

      return {
        company: companyName,
        premium: hasPrice ? resolvedPremium : null,
        quoteNumber: resolvedQuoteNo,
        status: hasPrice ? 'TEKLİF ALINDI' : 'TEKLİF ALINAMADI',
        extraDescription: resolvedExtra,
        noOffer: !hasPrice,
      };
    });

    // 7. Validation errors and warnings
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawInsured) {
      errors.push('Sigortalı adı / unvanı boş.');
    }
    if (!rawPlate) {
      warnings.push('Araç plakası belirtilmemiş.');
    }
    if (btWarning) {
      warnings.push(`İş Türü değeri ('${rawBusinessType}') standart dışı; 'Yeni İş' olarak ayarlandı.`);
    }

    // Check if active offers are missing quoteNumber
    const activeOffersWithoutNo = offersList.filter(
      (o) => o.status === 'TEKLİF ALINDI' && (!o.quoteNumber || !o.quoteNumber.trim())
    );
    if (activeOffersWithoutNo.length > 0) {
      warnings.push(
        `${activeOffersWithoutNo.map((o) => o.company).join(', ')} için teklif numarası metinden ayrıştırılamadı. Lütfen kontrol ediniz.`
      );
    }

    // Check existing active quote duplicate
    let hasExistingQuote = false;
    let existingQuoteNumber: string | undefined;
    if (rawPlate && existingActiveQuotesMap.has(rawPlate)) {
      const existing = existingActiveQuotesMap.get(rawPlate)!;
      hasExistingQuote = true;
      existingQuoteNumber = existing.quoteNumber;
      warnings.push(
        `Bu plaka için sistemde zaten aktif bir teklif var (${existing.quoteNumber || 'No yok'} - ${existing.insured}).`
      );
    }

    vehicles.push({
      tempId: generateId(),
      rowNumber: r + 1,
      insured: rawInsured,
      plate: rawPlate,
      licenseSerialNo: rawLicense,
      chassisNo: rawChassis,
      engineNo: rawEngine,
      usageStyle: matchedUsage,
      vehicleYear: rawYear ? Number(rawYear) || rawYear : undefined,
      vehicleBrand: rawBrand,
      vehicleModel: rawModel,
      markaKodu: rawMarkaKodu,
      modelKodu: rawModelKodu,
      vehicleCode,
      vehicleValue: parsedVehicleVal ?? undefined,
      businessType,
      fuelType: matchedFuel,
      isPriority,
      branch: detectedBranch,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
      issueDate: parsedIssueDate,
      previousStartDate,
      previousEndDate,
      doganiumText: rawDoganiumText,
      offers: offersList,
      hasExistingQuote,
      existingQuoteNumber,
      errors,
      warnings,
    });
  }

  return {
    vehicles,
    detectedBranch,
    sheetName: targetSheetName,
    totalRows: vehicles.length,
    headerRowIndex,
  };
};
