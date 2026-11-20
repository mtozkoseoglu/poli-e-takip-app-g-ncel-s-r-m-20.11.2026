import {
  AppData,
  Quote,
  Policy,
  RenewalRecord,
  CustomRule,
  QuoteStatus,
  QuoteStage,
  QUOTE_STAGES,
  COMPANIES,
  AuthorizedCompany,
  CompanyOffer,
  BusinessType,
  RuleCondition,
  NumericOperator,
  TextOperator,
  RuleField,
  NON_CONVERSION_REASONS,
  PolicyEndorsement,
} from '../types/insurance';

export const isStandardCompany = (name?: string): boolean => {
  if (!name) return false;
  return (COMPANIES as readonly string[]).includes(name.trim());
};

export const normalizeCompany = (
  rawName?: string
): { name: string; isStandard: boolean; wasNormalized: boolean } => {
  if (!rawName || !rawName.trim()) {
    return { name: COMPANIES[0], isStandard: true, wasNormalized: false };
  }
  const clean = rawName.trim();

  // 1. Exact match with the 13 authorized companies
  if ((COMPANIES as readonly string[]).includes(clean)) {
    return { name: clean, isStandard: true, wasNormalized: false };
  }

  // 2. Locale uppercase match
  const upper = clean.toLocaleUpperCase('tr-TR');
  if ((COMPANIES as readonly string[]).includes(upper)) {
    return { name: upper, isStandard: true, wasNormalized: true };
  }

  // 3. Known aliases and minor variations
  const simplified = upper
    .replace(/[\s\-_.]+/g, ' ')
    .replace(/SIGORTA/g, 'SİGORTA')
    .trim();

  if (simplified.includes('AK SİGORTA') || simplified === 'AK' || simplified === 'AKSIGORTA') {
    return { name: 'AK SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('ALLIANZ')) {
    return { name: 'ALLIANZ SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('ANADOLU')) {
    return { name: 'ANADOLU SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('AXA')) {
    return { name: 'AXA SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('DOĞA') || simplified.includes('DOGA')) {
    return { name: 'DOĞA SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('EUREKO')) {
    return { name: 'EUREKO SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('HDI')) {
    return { name: 'HDI SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('HEPIYI') || simplified.includes('HEPİYİ')) {
    return { name: 'HEPIYI SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('MAPFRE')) {
    return { name: 'MAPFRE SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('NEOVA')) {
    return { name: 'NEOVA SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('RAY SİGORTA') || simplified === 'RAY' || simplified === 'RAYSIGORTA') {
    return { name: 'RAY SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('SOMPO')) {
    return { name: 'SOMPO SİGORTA', isStandard: true, wasNormalized: true };
  }
  if (simplified.includes('TÜRKİYE') || simplified.includes('TURKIYE')) {
    return { name: 'TÜRKİYE SİGORTA', isStandard: true, wasNormalized: true };
  }

  // 4. Non-standard company name that cannot be matched to the 13 authorized companies.
  // DO NOT DELETE: return as-is with isStandard: false so user can be notified to manually edit!
  return { name: clean, isStandard: false, wasNormalized: false };
};

const STORAGE_KEY = 'sigorta_takip_pro_v2';
const LEGACY_KEY = 'policeYenilemeTakip_v1';

export const getTodayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addDays = (days: number, fromDate = new Date()): string => {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addOneYear = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && year >= 1970 && !isNaN(month) && !isNaN(day)) {
      let nextYear = year + 1;
      let nextDay = day;
      if (month === 2 && day === 29) {
        nextDay = 28;
      }
      return `${nextYear}-${String(month).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    }
  }
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const subtractOneYear = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && year >= 1970 && !isNaN(month) && !isNaN(day)) {
      let prevYear = year - 1;
      let prevDay = day;
      if (month === 2 && day === 29) {
        prevDay = 28;
      }
      return `${prevYear}-${String(month).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
    }
  }
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const calculateDaysLeft = (dateString?: string): number | null => {
  if (!dateString) return null;
  const target = new Date(dateString + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatCurrency = (val?: number | string | null): string => {
  if (val === undefined || val === null || val === '') return '0,00 ₺';
  const num = typeof val === 'number' ? val : parseNumberTr(val);
  if (num === null || isNaN(num)) return '0,00 ₺';
  return (
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' ₺'
  );
};

export const formatNumberTr = (val?: number | string | null, decimals = 2): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseNumberTr(val);
  if (num === null || isNaN(num)) return '';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatDateTr = (dateString?: string): string => {
  if (!dateString) return '—';
  const d = new Date(dateString + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

export const getEffectiveQuoteStatus = (q: Quote): QuoteStatus => {
  if (q.quoteStatus) return q.quoteStatus;
  if (q.outcome === 'converted') return 'kabul_edildi';
  if (q.outcome === 'rejected') return 'reddedildi';
  return 'beklemede';
};

export const getQuoteStatusMeta = (status: QuoteStatus) => {
  switch (status) {
    case 'kabul_edildi':
      return {
        label: 'Kabul Edildi',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        description: 'Müşteri teklifi onayladı ve poliçeleştirildi',
      };
    case 'reddedildi':
      return {
        label: 'Reddedildi',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        description: 'Teklif olumsuz sonuçlandı / yapılmadı',
      };
    case 'beklemede':
    default:
      return {
        label: 'Beklemede',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        description: 'Teklif değerlendirme sürecinde',
      };
  }
};

export const normalizeQuoteStage = (stage: any): QuoteStage => {
  if (
    stage === 'MÜŞTERİYE SUNULACAK' ||
    stage === 'İNDİRİM İSTENDİ' ||
    stage === 'MÜŞTERİDEN YANIT BEKLENİYOR'
  ) {
    return stage as QuoteStage;
  }
  // Mapping from old/removed stages:
  if (stage === 'İNDİRİMLİ PRİME REVİZE YAPILDI' || stage === 'İndirim Alındı') {
    return 'İNDİRİM İSTENDİ';
  }
  switch (stage) {
    case 'Teklif Hazırlanıyor':
      return 'MÜŞTERİYE SUNULACAK';
    case 'Müşteriye Sunuldu':
    case 'Fiyat Değerlendirmede':
    case 'Müşteri Onayı Bekleniyor':
      return 'MÜŞTERİDEN YANIT BEKLENİYOR';
    case 'İndirim İstendi':
      return 'İNDİRİM İSTENDİ';
    default:
      return 'MÜŞTERİYE SUNULACAK';
  }
};

export const normalizeNonConversionReason = (reason: any): string | undefined => {
  if (!reason) return undefined;
  const str = String(reason).trim();
  if (!str) return undefined;
  if ((NON_CONVERSION_REASONS as readonly string[]).includes(str)) return str;

  // Map legacy reasons
  if (str.includes('Fiyat yüksek') || str.includes('Başka acente') || str.includes('Rakip')) {
    return 'MÜŞTERİ BAŞKA YERDEN YAPTIRDI';
  }
  if (str.includes('satıldı') || str.includes('Araç')) {
    return 'ARAÇ SATILDI';
  }
  if (str.includes('vazgeçti') || str.includes('erteledi') || str.includes('ödeme')) {
    return 'MÜŞTERİ YAPTIRMADI';
  }
  if (str.includes('Ulaşılamadı') || str.includes('zaman aşımı')) {
    return 'MÜŞTERİYE ULAŞILAMADI';
  }
  return str;
};

// Çarpan = Prim / Araç Bedeli (Yalnızca Kasko için hesaplanır)
export const calculateMultiplier = (
  premium: number | undefined | null,
  vehicleValue: number | undefined | null,
  branch?: string
): number | null => {
  if (branch && branch.trim().toLocaleLowerCase('tr-TR') !== 'kasko') return null;
  if (premium === undefined || premium === null || isNaN(Number(premium))) return null;
  if (vehicleValue === undefined || vehicleValue === null || isNaN(Number(vehicleValue))) return null;
  const numPremium = Number(premium);
  const numValue = Number(vehicleValue);
  // Sıfıra bölme veya geçersiz değer kontrolü:
  if (numValue <= 0 || numPremium <= 0) return null;
  return numPremium / numValue;
};

// Readably formats Çarpan (e.g. 15.000 / 1.500.000 = 0,01)
export const formatMultiplier = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val) || val <= 0) return '—';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(val);
};

export const getQuoteProgressPercent = (q: Quote): number => {
  const status = getEffectiveQuoteStatus(q);
  if (status === 'kabul_edildi') return 100;
  if (status === 'reddedildi') return 0;

  const stage = normalizeQuoteStage(q.stage);
  switch (stage) {
    case 'MÜŞTERİYE SUNULACAK':
      return 33;
    case 'İNDİRİM İSTENDİ':
      return 66;
    case 'MÜŞTERİDEN YANIT BEKLENİYOR':
      return 90;
    default:
      return 33;
  }
};

export const parseNumberTr = (val: string | number | undefined | null): number | null => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  let str = String(val).trim().replace(/[₺TL\s]/gi, '');
  if (!str) return null;

  // 1. Both dot and comma present (e.g. 1.250.000,50 or 1,250,000.50)
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Turkish format: 1.250.000,50 -> dot is thousands, comma is decimal
      const cleaned = str.replace(/\./g, '').replace(/,/g, '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    } else {
      // English format: 1,250,000.50 -> comma is thousands, dot is decimal
      const cleaned = str.replace(/,/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    }
  }

  // 2. Only dot present (e.g. 500.000, 1.250.000, 18450.50)
  if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts.length > 2) {
      // Multiple dots: 1.250.000 -> all dots are thousand separators
      const cleaned = str.replace(/\./g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    }
    // Exactly one dot: e.g. 500.000 vs 18450.50
    if (parts[1].length === 3) {
      const cleaned = str.replace(/\./g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    }
    const n = parseFloat(str);
    return isNaN(n) ? null : n;
  }

  // 3. Only comma present (e.g. 500000,00 or 18450,50 or 1,250,000)
  if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length > 2) {
      const cleaned = str.replace(/,/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    }
    const cleaned = str.replace(/,/g, '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  const n = parseFloat(str);
  return isNaN(n) ? null : n;
};

export const evaluateNumericCondition = (
  actualValue: number | undefined | null,
  operator: NumericOperator,
  targetValue: number,
  targetValue2?: number
): boolean => {
  if (actualValue === undefined || actualValue === null || isNaN(actualValue)) return false;
  switch (operator) {
    case 'equals':
      return actualValue === targetValue;
    case 'not_equals':
      return actualValue !== targetValue;
    case 'greater_than':
      return actualValue > targetValue;
    case 'greater_than_or_equal':
      return actualValue >= targetValue;
    case 'less_than':
      return actualValue < targetValue;
    case 'less_than_or_equal':
      return actualValue <= targetValue;
    case 'between': {
      const min = Math.min(targetValue, targetValue2 ?? targetValue);
      const max = Math.max(targetValue, targetValue2 ?? targetValue);
      return actualValue >= min && actualValue <= max;
    }
    default:
      return true;
  }
};

export const evaluateTextCondition = (
  actualValue: string | undefined | null,
  operator: TextOperator,
  targetValue: string
): boolean => {
  const normActual = (actualValue || '').trim().toLocaleLowerCase('tr-TR');
  const normTarget = (targetValue || '').trim().toLocaleLowerCase('tr-TR');
  switch (operator) {
    case 'equals':
      return normActual === normTarget;
    case 'not_equals':
      return normActual !== normTarget;
    default:
      return true;
  }
};

export const evaluateRuleCondition = (
  condition: RuleCondition,
  target: {
    company?: string;
    branch?: string;
    insured?: string;
    vehicleYear?: number | string;
    usageStyle?: string;
    fuelType?: string;
    vehicleValue?: number | string;
  }
): boolean => {
  switch (condition.field) {
    case 'vehicleYear': {
      const actualYear = parseNumberTr(target.vehicleYear);
      const targetYear = parseNumberTr(condition.value);
      const targetYear2 = condition.value2 !== undefined ? parseNumberTr(condition.value2) ?? undefined : undefined;
      if (targetYear === null) return true;
      return evaluateNumericCondition(actualYear, condition.operator as NumericOperator, targetYear, targetYear2);
    }
    case 'vehicleValue': {
      const actualVal = parseNumberTr(target.vehicleValue);
      const targetVal = parseNumberTr(condition.value);
      const targetVal2 = condition.value2 !== undefined ? parseNumberTr(condition.value2) ?? undefined : undefined;
      if (targetVal === null) return true;
      return evaluateNumericCondition(actualVal, condition.operator as NumericOperator, targetVal, targetVal2);
    }
    case 'company':
      return evaluateTextCondition(target.company, condition.operator as TextOperator, String(condition.value));
    case 'branch':
      return evaluateTextCondition(target.branch, condition.operator as TextOperator, String(condition.value));
    case 'insured':
      return evaluateTextCondition(target.insured, condition.operator as TextOperator, String(condition.value));
    case 'usageStyle':
      return evaluateTextCondition(target.usageStyle, condition.operator as TextOperator, String(condition.value));
    case 'fuelType':
      return evaluateTextCondition(target.fuelType, condition.operator as TextOperator, String(condition.value));
    default:
      return true;
  }
};

export const isRuleMatch = (
  rule: CustomRule,
  target: {
    company?: string;
    branch?: string;
    insured?: string;
    vehicleYear?: number | string;
    usageStyle?: string;
    fuelType?: string;
    vehicleValue?: number | string;
    stage?: string;
  }
): boolean => {
  // Rule r-2 (Teknik Kontrol Listesi Zorunluluğu) is disabled as per user specification
  if (rule.id === 'r-2' || (rule as any).disabled) return false;

  // If rule has structured conditions list
  if (Array.isArray(rule.conditions) && rule.conditions.length > 0) {
    // All conditions must match (AND logic)
    return rule.conditions.every((c) => evaluateRuleCondition(c, target));
  }

  // Backward compatibility evaluation for older rules without conditions array:
  if (rule.company && rule.company !== target.company) return false;
  if (rule.branch && rule.branch !== target.branch) return false;
  if (rule.stage && target.stage && rule.stage !== target.stage) return false;
  if (rule.minAge !== undefined && rule.minAge !== '') {
    const age = target.vehicleYear ? new Date().getFullYear() - Number(target.vehicleYear) : null;
    if (age !== null && age < Number(rule.minAge)) return false;
  }
  return true;
};

export const formatConditionText = (c: RuleCondition): string => {
  const fieldLabels: Record<string, string> = {
    company: 'Şirket',
    branch: 'Branş',
    insured: 'Sigortalı',
    vehicleYear: 'Model Yılı',
    usageStyle: 'Kullanım Tarzı',
    fuelType: 'Yakıt Türü',
    vehicleValue: 'Araç Bedeli',
  };

  const opSymbols: Record<string, string> = {
    equals: '=',
    not_equals: '≠',
    greater_than: '>',
    greater_than_or_equal: '≥',
    less_than: '<',
    less_than_or_equal: '≤',
    between: 'arasında',
  };

  const fName = fieldLabels[c.field] || c.field;
  const op = opSymbols[c.operator] || c.operator;

  if (c.field === 'vehicleValue') {
    const v1 = parseNumberTr(c.value);
    const v2 = c.value2 !== undefined ? parseNumberTr(c.value2) : null;
    if (c.operator === 'between' && v1 !== null && v2 !== null) {
      return `${fName}: ${formatCurrency(v1)} - ${formatCurrency(v2)} arası`;
    }
    return `${fName} ${op} ${v1 !== null ? formatCurrency(v1) : c.value}`;
  }

  if (c.operator === 'between' && c.value2 !== undefined) {
    return `${fName}: ${c.value} ile ${c.value2} arası`;
  }

  return `${fName} ${op} ${c.value}`;
};

export const sanitizeQuoteData = (q: any): Quote => {
  const {
    tax,
    tckn,
    tc,
    tcKimlik,
    tcNo,
    kimlikNo,
    vkn,
    birthDate,
    birthdate,
    birth_date,
    dogumTarihi,
    dogum_tarihi,
    identityNumber,
    ...clean
  } = q || {};

  const normCo = normalizeCompany(clean.company);

  const cleanAlternatives = Array.isArray(clean.alternatives)
    ? clean.alternatives.map((alt: any) => ({
        ...alt,
        company: normalizeCompany(alt.company).name,
      }))
    : undefined;

  // Build / normalize companyOffers (up to 6 slots)
  let cleanOffers: CompanyOffer[] = [];
  if (Array.isArray(clean.companyOffers) && clean.companyOffers.length > 0) {
    cleanOffers = clean.companyOffers.slice(0, 6).map((offer: any) => {
      const isNoOffer = offer.noOffer === true || offer.status === 'teklif_alinamadi';
      return {
        company: normalizeCompany(offer.company).name,
        premium: !isNoOffer && offer.premium !== undefined && offer.premium !== '' ? Number(offer.premium) : undefined,
        quoteNumber: offer.quoteNumber ? String(offer.quoteNumber).trim() : '',
        notes: offer.notes ? String(offer.notes).trim() : undefined,
        status: isNoOffer ? 'teklif_alinamadi' : (offer.premium !== undefined && offer.premium !== '' && Number(offer.premium) > 0 ? 'teklif_alindi' : (offer.status || 'bekleniyor')),
        noOffer: isNoOffer,
      };
    });
  } else {
    // Graceful backward compatibility for existing quotes:
    // Slot 1: primary quote company & premium
    cleanOffers.push({
      company: normCo.name,
      premium: clean.premium !== undefined ? Number(clean.premium) : undefined,
      quoteNumber: clean.quoteNumber ? String(clean.quoteNumber).trim() : '',
      status: clean.premium !== undefined && Number(clean.premium) > 0 ? 'teklif_alindi' : 'bekleniyor',
      noOffer: false,
    });
    // Slots 2+: existing alternatives if any
    if (cleanAlternatives && cleanAlternatives.length > 0) {
      for (const alt of cleanAlternatives) {
        if (cleanOffers.length < 6) {
          cleanOffers.push({
            company: alt.company,
            premium: alt.premium !== undefined ? Number(alt.premium) : undefined,
            quoteNumber: '',
            notes: alt.notes,
            status: alt.premium !== undefined && Number(alt.premium) > 0 ? 'teklif_alindi' : 'bekleniyor',
            noOffer: false,
          });
        }
      }
    }
  }

  const isConverted = clean.outcome === 'converted';
  const rawRejection = isConverted ? undefined : (clean.rejectionReason || clean.nonConversionReason);
  const normalizedNonConversion = isConverted ? undefined : (clean.nonConversionReason || normalizeNonConversionReason(rawRejection));

  const prem = clean.premium !== undefined && clean.premium !== null && !isNaN(Number(clean.premium))
    ? Number(clean.premium)
    : (parseNumberTr(clean.premium) || 0);

  return {
    ...clean,
    id: clean.id || generateId(),
    type: 'quote',
    insured: clean.insured || '',
    businessType: (clean.businessType as BusinessType) || 'Yenileme',
    phone: clean.phone || '', // preserved from existing records if present, never required
    email: clean.email || '',
    company: normCo.name,
    plate: clean.plate ? String(clean.plate).toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '') : '',
    licenseSerialNo: clean.licenseSerialNo ? String(clean.licenseSerialNo).trim().toLocaleUpperCase('tr-TR') : '',
    chassisNo: clean.chassisNo ? String(clean.chassisNo).trim().toLocaleUpperCase('tr-TR') : '',
    engineNo: clean.engineNo ? String(clean.engineNo).trim().toLocaleUpperCase('tr-TR') : '',
    usageStyle: clean.usageStyle ? String(clean.usageStyle).trim() : '',
    vehicleBrand: clean.vehicleBrand || '',
    vehicleModel: clean.vehicleModel || '',
    vehicleYear: clean.vehicleYear || '',
    vehicleCode: clean.vehicleCode || '',
    fuelType: clean.fuelType ? String(clean.fuelType).trim() : '',
    vehicleValue: clean.vehicleValue !== undefined && clean.vehicleValue !== '' ? Number(clean.vehicleValue) : undefined,
    vehicleDetail: clean.vehicleDetail || '',
    quoteNumber: clean.quoteNumber ? String(clean.quoteNumber).trim() : undefined,
    startDate: clean.startDate || ((clean.businessType === 'Takip' && (clean.endDate || clean.validUntil)) ? subtractOneYear(clean.endDate || clean.validUntil) : undefined),
    quoteDate: (clean.businessType === 'Takip' && (clean.endDate || clean.validUntil))
      ? (clean.startDate || subtractOneYear(clean.endDate || clean.validUntil))
      : (clean.quoteDate || clean.createdAt?.split('T')?.[0] || getTodayIso()),
    validUntil: clean.validUntil || clean.endDate || addDays(15),
    endDate: clean.endDate || clean.validUntil || addDays(15),
    premium: prem,
    stage: normalizeQuoteStage(clean.stage),
    status: (clean.status === 'concluded' || clean.status === 'active') ? clean.status : (clean.outcome === 'converted' || clean.outcome === 'rejected' ? 'concluded' : 'active'),
    quoteStatus: clean.quoteStatus || (clean.outcome === 'converted' ? 'kabul_edildi' : clean.outcome === 'rejected' ? 'reddedildi' : 'beklemede'),
    outcome: clean.outcome,
    rejectionReason: rawRejection,
    nonConversionReason: normalizedNonConversion,
    companyOffers: cleanOffers,
    alternatives: cleanAlternatives,
    createdAt: clean.createdAt || new Date().toISOString(),
    updatedAt: clean.updatedAt || new Date().toISOString(),
  } as Quote;
};

export const sanitizePolicyData = (p: any): Policy => {
  const {
    tax,
    tckn,
    tc,
    tcKimlik,
    tcNo,
    kimlikNo,
    vkn,
    birthDate,
    birthdate,
    birth_date,
    dogumTarihi,
    dogum_tarihi,
    identityNumber,
    ...clean
  } = p || {};

  const normCo = normalizeCompany(clean.company);
  const vVal = clean.vehicleValue !== undefined && clean.vehicleValue !== '' && !isNaN(Number(clean.vehicleValue))
    ? Number(clean.vehicleValue)
    : (parseNumberTr(clean.vehicleValue) ?? undefined);
  const prem = clean.premium !== undefined && clean.premium !== null && !isNaN(Number(clean.premium))
    ? Number(clean.premium)
    : (parseNumberTr(clean.premium) || 0);

  // Separate Original Quote Premium and Endorsement-Adjusted Current Premium
  const rawOriginalPremium = clean.originalPremium !== undefined && clean.originalPremium !== null && !isNaN(Number(clean.originalPremium))
    ? Number(clean.originalPremium)
    : (clean.originalPremium ? parseNumberTr(clean.originalPremium) : null);

  const rawCurrentPremium = clean.currentPremium !== undefined && clean.currentPremium !== null && !isNaN(Number(clean.currentPremium))
    ? Number(clean.currentPremium)
    : (clean.currentPremium ? parseNumberTr(clean.currentPremium) : null);

  const totalAdditionalPremium = typeof clean.totalAdditionalPremium === 'number'
    ? clean.totalAdditionalPremium
    : (parseNumberTr(clean.totalAdditionalPremium) || 0);

  const totalRefundPremium = typeof clean.totalRefundPremium === 'number'
    ? clean.totalRefundPremium
    : (parseNumberTr(clean.totalRefundPremium) || 0);

  const originalPremium = rawOriginalPremium !== null ? rawOriginalPremium : prem;
  const currentPremium = rawCurrentPremium !== null
    ? rawCurrentPremium
    : (totalAdditionalPremium > 0 || totalRefundPremium > 0
        ? originalPremium + totalAdditionalPremium - totalRefundPremium
        : prem);

  const mult = calculateMultiplier(currentPremium, vVal, clean.branch);

  return {
    ...clean,
    id: clean.id || generateId(),
    type: 'policy',
    insured: clean.insured || '',
    phone: clean.phone || '', // preserved from existing records if present, never required
    email: clean.email || '',
    company: normCo.name,
    branch: clean.branch || 'Trafik',
    policyNumber: clean.policyNumber ? String(clean.policyNumber).trim() : (clean.number ? String(clean.number).trim() : ('POL-' + Math.floor(100000 + Math.random() * 900000))),
    startDate: clean.startDate || clean.quoteDate || getTodayIso(),
    endDate: clean.endDate || addDays(365),
    originalPremium,
    currentPremium,
    totalAdditionalPremium,
    totalRefundPremium,
    premium: currentPremium,
    status: clean.status || 'Portföyde',
    stage: clean.stage || 'Yürürlükte',
    plate: clean.plate ? String(clean.plate).toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '') : '',
    licenseSerialNo: clean.licenseSerialNo ? String(clean.licenseSerialNo).trim().toLocaleUpperCase('tr-TR') : '',
    chassisNo: clean.chassisNo ? String(clean.chassisNo).trim().toLocaleUpperCase('tr-TR') : '',
    engineNo: clean.engineNo ? String(clean.engineNo).trim().toLocaleUpperCase('tr-TR') : '',
    usageStyle: clean.usageStyle ? String(clean.usageStyle).trim() : '',
    vehicleBrand: clean.vehicleBrand || '',
    vehicleModel: clean.vehicleModel || '',
    vehicleCode: clean.vehicleCode ? String(clean.vehicleCode).trim() : '',
    fuelType: clean.fuelType ? String(clean.fuelType).trim() : '',
    vehicleYear: clean.vehicleYear || '',
    vehicleValue: vVal,
    multiplier: mult ?? undefined,
    vehicleDetail: clean.vehicleDetail || '',
    pastPlates: Array.isArray(clean.pastPlates)
      ? clean.pastPlates.map((pl: any) => String(pl).toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '')).filter(Boolean)
      : undefined,
    dainMurtehin: clean.dainMurtehin ? String(clean.dainMurtehin).trim() : undefined,
    coverages: Array.isArray(clean.coverages) ? clean.coverages.map((c: any) => String(c).trim()).filter(Boolean) : undefined,
    createdAt: clean.createdAt || new Date().toISOString(),
    updatedAt: clean.updatedAt || new Date().toISOString(),
  } as Policy;
};

export const sanitizeEndorsementData = (e: any): any => {
  if (!e) return null;
  return {
    id: e.id || generateId(),
    policyId: String(e.policyId || ''),
    policyNumber: String(e.policyNumber || '').trim(),
    endorsementNumber: String(e.endorsementNumber || '').trim(),
    endorsementType: e.endorsementType || 'AÇIKLAMA ZEYİLİ',
    issueDate: e.issueDate || getTodayIso(),
    description: e.description ? String(e.description).trim() : '',
    previousPremium: typeof e.previousPremium === 'number' ? e.previousPremium : (parseNumberTr(e.previousPremium) || 0),
    additionalPremium: typeof e.additionalPremium === 'number' ? e.additionalPremium : (parseNumberTr(e.additionalPremium) || 0),
    refundPremium: typeof e.refundPremium === 'number' ? e.refundPremium : (parseNumberTr(e.refundPremium) || 0),
    totalPremium: typeof e.totalPremium === 'number' ? e.totalPremium : (parseNumberTr(e.totalPremium) || 0),
    changedFields: Array.isArray(e.changedFields) ? e.changedFields : [],
    oldValues: e.oldValues && typeof e.oldValues === 'object' ? e.oldValues : {},
    newValues: e.newValues && typeof e.newValues === 'object' ? e.newValues : {},
    documents: Array.isArray(e.documents) ? e.documents : [],
    notary: e.notary ? String(e.notary).trim() : undefined,
    salesContractNo: e.salesContractNo ? String(e.salesContractNo).trim() : undefined,
    documentIssueDate: e.documentIssueDate ? String(e.documentIssueDate).trim() : undefined,
    createdAt: e.createdAt || new Date().toISOString(),
  };
};

export const deleteEndorsementAndRollbackPolicy = (
  endorsementId: string,
  policies: Policy[],
  endorsements: PolicyEndorsement[]
): { success: boolean; policies: Policy[]; endorsements: PolicyEndorsement[]; message?: string } => {
  const targetEndorsement = endorsements.find((e) => e.id === endorsementId);
  if (!targetEndorsement) {
    return {
      success: false,
      policies,
      endorsements,
      message: 'Silinecek zeyil kaydı bulunamadı.',
    };
  }

  const targetPolicy = policies.find((p) => p.id === targetEndorsement.policyId);
  if (!targetPolicy) {
    return {
      success: true,
      policies,
      endorsements: endorsements.filter((e) => e.id !== endorsementId),
    };
  }

  // Atomik geri alma için poliçe kopyası
  const updatedPolicy: Policy = { ...targetPolicy };

  // Bu poliçeye ait kalan aktif zeyiller (silinen hariç), eskisinden yenisine sıralı
  const remainingEndorsements = endorsements
    .filter((e) => e.id !== endorsementId && e.policyId === targetPolicy.id)
    .sort((a, b) => new Date(a.createdAt || a.issueDate).getTime() - new Date(b.createdAt || b.issueDate).getTime());

  // 1. Prim Etkisini Geri Alma
  const baseOrig = typeof updatedPolicy.originalPremium === 'number'
    ? updatedPolicy.originalPremium
    : (typeof targetEndorsement.oldValues.premium === 'number'
      ? targetEndorsement.oldValues.premium
      : updatedPolicy.premium);

  const totalAdd = remainingEndorsements.reduce((sum, e) => sum + (Number(e.additionalPremium) || 0), 0);
  const totalRef = remainingEndorsements.reduce((sum, e) => sum + (Number(e.refundPremium) || 0), 0);
  updatedPolicy.totalAdditionalPremium = totalAdd;
  updatedPolicy.totalRefundPremium = totalRef;
  updatedPolicy.currentPremium = baseOrig + totalAdd - totalRef;
  updatedPolicy.premium = updatedPolicy.currentPremium;

  // 2. Durum (İptal Zeyilleri) Geri Alma
  if (targetEndorsement.changedFields.includes('status')) {
    const hasOtherCancel = remainingEndorsements.some(
      (e) =>
        e.endorsementType === 'BAŞLANGICINDAN İPTAL ZEYİLİ' ||
        e.endorsementType === 'SATIŞ İPTAL ZEYİLİ' ||
        e.endorsementType === 'SİGORTALI TALEBİ İLE (KISMİ) İPTAL ZEYİLİ'
    );
    if (!hasOtherCancel) {
      updatedPolicy.status = (targetEndorsement.oldValues.status as any) || 'Portföyde';
      updatedPolicy.concludedReason = undefined;
    } else {
      const lastCancel = [...remainingEndorsements]
        .reverse()
        .find(
          (e) =>
            e.endorsementType === 'BAŞLANGICINDAN İPTAL ZEYİLİ' ||
            e.endorsementType === 'SATIŞ İPTAL ZEYİLİ' ||
            e.endorsementType === 'SİGORTALI TALEBİ İLE (KISMİ) İPTAL ZEYİLİ'
        );
      if (lastCancel) {
        updatedPolicy.status = 'İptal';
        updatedPolicy.concludedReason = `${lastCancel.endorsementType} (${lastCancel.endorsementNumber})`;
      }
    }
  }

  // 3. Plaka & Ruhsat Değişikliğini Geri Alma
  if (targetEndorsement.changedFields.includes('plate')) {
    const remainingPlateEndorsements = remainingEndorsements.filter((e) => e.changedFields.includes('plate'));
    if (remainingPlateEndorsements.length > 0) {
      const lastPlateEnd = remainingPlateEndorsements[remainingPlateEndorsements.length - 1];
      updatedPolicy.plate = lastPlateEnd.newValues.plate || updatedPolicy.plate;
      if (lastPlateEnd.newValues.licenseSerialNo) {
        updatedPolicy.licenseSerialNo = lastPlateEnd.newValues.licenseSerialNo;
      }
    } else {
      updatedPolicy.plate = targetEndorsement.oldValues.plate || updatedPolicy.plate;
      if (targetEndorsement.oldValues.licenseSerialNo !== undefined) {
        updatedPolicy.licenseSerialNo = targetEndorsement.oldValues.licenseSerialNo;
      }
    }

    const deletedNewPlate = targetEndorsement.newValues.plate;
    if (deletedNewPlate && Array.isArray(updatedPolicy.pastPlates)) {
      updatedPolicy.pastPlates = updatedPolicy.pastPlates.filter((p) => p !== deletedNewPlate);
    }
  }

  // 4. Dain-i Mürtehin Geri Alma
  if (targetEndorsement.changedFields.includes('dainMurtehin')) {
    const remainingDain = remainingEndorsements.filter((e) => e.changedFields.includes('dainMurtehin'));
    if (remainingDain.length > 0) {
      const lastDain = remainingDain[remainingDain.length - 1];
      updatedPolicy.dainMurtehin = lastDain.newValues.dainMurtehin;
    } else {
      updatedPolicy.dainMurtehin = targetEndorsement.oldValues.dainMurtehin || undefined;
    }
  }

  // 5. Açıklama Zeyli Geri Alma
  if (targetEndorsement.endorsementType === 'AÇIKLAMA ZEYİLİ' || targetEndorsement.changedFields.includes('notes')) {
    if (updatedPolicy.notes) {
      const escapedNum = targetEndorsement.endorsementNumber.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = new RegExp(`\\s*\\|?\\s*\\[Zeyil ${escapedNum}[^\\]]*\\]:[^|]*`, 'g');
      let cleaned = updatedPolicy.notes.replace(pattern, '').trim();
      cleaned = cleaned.replace(/^\|\s*|\s*\|$/g, '').trim();
      updatedPolicy.notes = cleaned || targetEndorsement.oldValues.notes || '';
    } else {
      updatedPolicy.notes = targetEndorsement.oldValues.notes || '';
    }
  }

  // 6. Araç Bilgileri Geri Alma
  const vehicleFields = [
    'vehicleBrand',
    'vehicleModel',
    'vehicleYear',
    'vehicleCode',
    'chassisNo',
    'engineNo',
    'usageStyle',
    'vehicleValue',
  ];
  vehicleFields.forEach((field) => {
    if (targetEndorsement.changedFields.includes(field)) {
      const remainingWithField = remainingEndorsements.filter((e) => e.changedFields.includes(field));
      if (remainingWithField.length > 0) {
        const lastWithField = remainingWithField[remainingWithField.length - 1];
        (updatedPolicy as any)[field] = lastWithField.newValues[field];
      } else {
        (updatedPolicy as any)[field] = targetEndorsement.oldValues[field];
      }
    }
  });

  // 7. Teminatlar Geri Alma
  if (targetEndorsement.changedFields.includes('coverages')) {
    const remainingCoverages = remainingEndorsements.filter((e) => e.changedFields.includes('coverages'));
    if (remainingCoverages.length > 0) {
      const lastCov = remainingCoverages[remainingCoverages.length - 1];
      updatedPolicy.coverages = lastCov.newValues.coverages;
    } else {
      updatedPolicy.coverages = targetEndorsement.oldValues.coverages || [];
    }
  }

  updatedPolicy.updatedAt = new Date().toISOString();

  const finalPolicies = policies.map((p) => (p.id === updatedPolicy.id ? updatedPolicy : p));
  const finalEndorsements = endorsements.filter((e) => e.id !== endorsementId);

  return {
    success: true,
    policies: finalPolicies,
    endorsements: finalEndorsements,
  };
};

export const sanitizeRenewalRecord = (r: any): RenewalRecord | null => {
  if (!r || !r.policyId) return null;
  return {
    id: r.id || `ren-${r.policyId}`,
    policyId: String(r.policyId),
    policyNumber: String(r.policyNumber || '').trim(),
    insured: String(r.insured || '').trim(),
    branch: String(r.branch || 'Trafik').trim(),
    company: normalizeCompany(r.company).name,
    plate: r.plate ? String(r.plate).toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '') : '',
    licenseSerialNo: r.licenseSerialNo ? String(r.licenseSerialNo).trim().toLocaleUpperCase('tr-TR') : '',
    chassisNo: r.chassisNo ? String(r.chassisNo).trim().toLocaleUpperCase('tr-TR') : '',
    engineNo: r.engineNo ? String(r.engineNo).trim().toLocaleUpperCase('tr-TR') : '',
    vehicleBrand: r.vehicleBrand ? String(r.vehicleBrand).trim() : '',
    vehicleModel: r.vehicleModel ? String(r.vehicleModel).trim() : '',
    vehicleYear: r.vehicleYear || '',
    vehicleCode: r.vehicleCode ? String(r.vehicleCode).trim() : '',
    vehicleValue: r.vehicleValue !== undefined && r.vehicleValue !== '' ? Number(r.vehicleValue) : undefined,
    startDate: r.startDate || getTodayIso(),
    endDate: r.endDate || addDays(365),
    premium: typeof r.premium === 'number' ? r.premium : (parseNumberTr(r.premium) || 0),
    status: r.status === 'cancelled' || r.status === 'renewed' ? r.status : 'active',
    notes: r.notes ? String(r.notes).trim() : undefined,
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || new Date().toISOString(),
  };
};

export const syncRenewalRecords = (
  policies: Policy[],
  existingRenewals: RenewalRecord[] = []
): RenewalRecord[] => {
  const existingMap = new Map<string, RenewalRecord>();
  existingRenewals.forEach((r) => {
    if (r.policyId) {
      existingMap.set(r.policyId, r);
    }
  });

  return policies.map((policy) => {
    const existing = existingMap.get(policy.id);
    const isCancelled = policy.status === 'İptal' || policy.outcome === 'cancelled';
    const isRenewed = policy.outcome === 'renewed';
    const currentStatus: 'active' | 'cancelled' | 'renewed' = isCancelled
      ? 'cancelled'
      : isRenewed
      ? 'renewed'
      : 'active';

    const currentPrem = typeof policy.currentPremium === 'number'
      ? policy.currentPremium
      : (policy.premium || 0);

    // Yenileme Dönemi Hesaplama:
    // Yenileme Başlangıç Tarihi = Ana Poliçenin Bitiş Tarihi
    // Yenileme Bitiş Tarihi = Yenileme Başlangıç Tarihinin 1 takvim yılı sonrası
    const renewalStartDate = policy.endDate || getTodayIso();
    const renewalEndDate = addOneYear(renewalStartDate);

    return {
      id: existing?.id || `ren-${policy.id}`,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      insured: policy.insured,
      branch: policy.branch,
      company: policy.company,
      plate: policy.plate || '',
      licenseSerialNo: policy.licenseSerialNo || '',
      chassisNo: policy.chassisNo || '',
      engineNo: policy.engineNo || '',
      vehicleBrand: policy.vehicleBrand || '',
      vehicleModel: policy.vehicleModel || '',
      vehicleYear: policy.vehicleYear || '',
      vehicleCode: policy.vehicleCode || '',
      vehicleValue: policy.vehicleValue,
      startDate: renewalStartDate,
      endDate: renewalEndDate,
      premium: currentPrem,
      status: currentStatus,
      notes: existing?.notes || policy.notes,
      createdAt: existing?.createdAt || policy.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
};

export const generateSampleData = (): AppData => {
  const todayStr = getTodayIso();

  const quotes: Quote[] = [
    {
      id: 'q-1',
      type: 'quote',
      insured: 'Ahmet Yılmaz',
      businessType: 'Yenileme',
      email: 'ahmet.yilmaz@gmail.com',
      plate: '34ABC99',
      licenseSerialNo: 'AS481923',
      chassisNo: 'WVWZZZCDZNE104928',
      engineNo: 'DFG204918',
      usageStyle: 'Hususi Otomobil',
      vehicleBrand: 'Volkswagen',
      vehicleModel: 'Golf 1.5 eTSI Style',
      vehicleYear: 2022,
      vehicleCode: '100234',
      vehicleValue: 1350000,
      vehicleDetail: '2022 Volkswagen Golf 1.5 eTSI',
      company: 'ALLIANZ SİGORTA',
      branch: 'Kasko',
      quoteNumber: 'TK-2026-081',
      issueDate: addDays(-2),
      startDate: addDays(5),
      endDate: addOneYear(addDays(5)),
      quoteDate: addDays(-2),
      validUntil: addDays(5),
      premium: 21900,
      stage: 'MÜŞTERİDEN YANIT BEKLENİYOR',
      status: 'active',
      quoteStatus: 'beklemede',
      notes: 'Genişletilmiş kasko teklifi verildi. 6 şirket karşılaştırması yapıldı.',
      companyOffers: [
        { company: 'ALLIANZ SİGORTA', premium: 22450, quoteNumber: 'ALZ-9921', notes: 'Yetkili servis teminatlı' },
        { company: 'AXA SİGORTA', premium: 23800, quoteNumber: 'AXA-4412', notes: 'Orijinal cam teminatlı' },
        { company: 'TÜRKİYE SİGORTA', premium: 20900, quoteNumber: 'TRK-1092', notes: 'Anlaşmalı özel servis' },
        { company: 'ANADOLU SİGORTA', premium: 21900, quoteNumber: 'AND-5541', notes: 'Genişletilmiş kasko' },
        { company: 'AK SİGORTA', premium: 24200, quoteNumber: 'AK-3391', notes: 'İkame araç 14 gün' },
        { company: 'SOMPO SİGORTA', premium: 21500, quoteNumber: 'SMP-8820', notes: 'Muafiyetsiz kasko' },
      ],
      createdAt: addDays(-2),
      updatedAt: addDays(-1),
      followDate: addDays(1),
    },
    {
      id: 'q-2',
      type: 'quote',
      insured: 'Selin Erdem',
      businessType: 'Yeni İş',
      email: 'selin.erdem@outlook.com',
      plate: '06BJR44',
      licenseSerialNo: 'BR819204',
      chassisNo: 'VF1RJA00465912384',
      engineNo: 'H4D450912',
      usageStyle: 'Hususi Otomobil',
      vehicleBrand: 'Renault',
      vehicleModel: 'Clio 1.0 TCe Touch',
      vehicleYear: 2020,
      vehicleCode: '100412',
      vehicleValue: 780000,
      vehicleDetail: '2020 Renault Clio',
      company: 'TÜRKİYE SİGORTA',
      branch: 'Trafik',
      quoteNumber: 'TK-2026-094',
      issueDate: addDays(-1),
      startDate: addDays(12),
      endDate: addOneYear(addDays(12)),
      quoteDate: addDays(-1),
      validUntil: addDays(12),
      premium: 9850,
      stage: 'MÜŞTERİYE SUNULACAK',
      status: 'active',
      quoteStatus: 'beklemede',
      notes: 'Trafik teklifleri karşılaştırıldı. Taksit seçenekleri inceleniyor.',
      companyOffers: [
        { company: 'TÜRKİYE SİGORTA', premium: 9850, quoteNumber: 'TRK-9810', notes: '3 taksit peşin fiyatına' },
        { company: 'HDI SİGORTA', premium: 10200, quoteNumber: 'HDI-4421', notes: 'Kredi kartına 4 taksit' },
        { company: 'MAPFRE SİGORTA', premium: 10650, quoteNumber: 'MAP-1102' },
        { company: 'DOĞA SİGORTA', premium: 9950, quoteNumber: 'DOG-7721' },
        { company: 'NEOVA SİGORTA', premium: 10400, quoteNumber: 'NEO-3390' },
        { company: 'RAY SİGORTA', premium: 10800, quoteNumber: 'RAY-5512' },
      ],
      createdAt: addDays(-1),
      updatedAt: addDays(-1),
    },
    {
      id: 'q-3',
      type: 'quote',
      insured: 'Mert Aksoy',
      businessType: 'Takip',
      email: 'mert.aksoy@sirket.com',
      company: 'ANADOLU SİGORTA',
      branch: 'Tamamlayıcı Sağlık (TSS)',
      quoteNumber: 'TK-2026-102',
      issueDate: todayStr,
      startDate: todayStr,
      endDate: addOneYear(todayStr),
      quoteDate: todayStr,
      validUntil: addDays(14),
      premium: 16500,
      stage: 'İNDİRİM İSTENDİ',
      status: 'active',
      quoteStatus: 'beklemede',
      notes: 'Aile TSS indirimi için genel müdürlükten onay bekleniyor.',
      createdAt: todayStr,
      updatedAt: todayStr,
      followDate: addDays(2),
    },
    // Concluded quotes (one converted, one rejected)
    {
      id: 'q-concluded-1',
      type: 'quote',
      insured: 'Kaya Mimarlık Ltd. Şti.',
      email: 'info@kayamimarlik.com',
      plate: '34KAY01',
      vehicleBrand: 'Mercedes-Benz',
      vehicleModel: 'C200 4MATIC AMG',
      vehicleYear: 2023,
      vehicleValue: 2800000,
      vehicleDetail: '2023 Mercedes C200',
      company: 'ALLIANZ SİGORTA',
      branch: 'Kasko',
      quoteNumber: 'TK-2026-050',
      quoteDate: addDays(-20),
      validUntil: addDays(-5),
      premium: 38500,
      stage: 'MÜŞTERİDEN YANIT BEKLENİYOR',
      status: 'concluded',
      quoteStatus: 'kabul_edildi',
      outcome: 'converted',
      convertedPolicyId: 'pol-conv-1',
      resultDate: addDays(-6),
      notes: 'Teklif onaylandı, poliçeye dönüştürüldü.',
      createdAt: addDays(-20),
      updatedAt: addDays(-6),
    },
    {
      id: 'q-concluded-2',
      type: 'quote',
      insured: 'Bora Demirtaş',
      email: 'bora.demirtas@gmail.com',
      plate: '35BOR88',
      vehicleBrand: 'Peugeot',
      vehicleModel: '3008 1.5 BlueHDi Allure',
      vehicleYear: 2019,
      vehicleValue: 1250000,
      vehicleDetail: '2019 Peugeot 3008',
      company: 'SOMPO SİGORTA',
      branch: 'Kasko',
      quoteNumber: 'TK-2026-062',
      quoteDate: addDays(-25),
      validUntil: addDays(-10),
      premium: 27500,
      stage: 'MÜŞTERİDEN YANIT BEKLENİYOR',
      status: 'concluded',
      quoteStatus: 'reddedildi',
      outcome: 'rejected',
      rejectionReason: 'MÜŞTERİ BAŞKA YERDEN YAPTIRDI',
      nonConversionReason: 'MÜŞTERİ BAŞKA YERDEN YAPTIRDI',
      rejectionNote: 'Başka kanaldan 24.000 TL teklif bulduğu için yaptırmadı.',
      resultDate: addDays(-11),
      notes: 'Fiyat yüksekliği nedeniyle iptal.',
      createdAt: addDays(-25),
      updatedAt: addDays(-11),
    },
  ];

  const policies: Policy[] = [
    {
      id: 'pol-conv-1',
      type: 'policy',
      insured: 'Kaya Mimarlık Ltd. Şti.',
      email: 'info@kayamimarlik.com',
      plate: '34KAY01',
      vehicleBrand: 'Mercedes-Benz',
      vehicleModel: 'C200 4MATIC AMG',
      vehicleYear: 2023,
      vehicleDetail: '2023 Mercedes C200',
      company: 'ALLIANZ SİGORTA',
      branch: 'Kasko',
      policyNumber: 'POL-348921-2026',
      startDate: addDays(-6),
      endDate: addDays(359),
      premium: 38500,
      status: 'Portföyde',
      stage: 'Yürürlükte',
      originQuoteId: 'q-concluded-1',
      doc: true,
      endorse: true,
      egm: true,
      notes: 'TK-2026-050 nolu tekliften otomatik dönüştürüldü.',
      createdAt: addDays(-6),
      updatedAt: addDays(-6),
    },
    {
      id: 'pol-1',
      type: 'policy',
      insured: 'Deniz Çetin',
      email: 'deniz.cetin@gmail.com',
      plate: '34DNZ92',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla 1.8 Hybrid Dream',
      vehicleYear: 2021,
      vehicleDetail: '2021 Toyota Corolla Hybrid',
      company: 'AXA SİGORTA',
      branch: 'Trafik',
      policyNumber: 'TRF-881920-2025',
      startDate: addDays(-360),
      endDate: addDays(5), // 5 days left -> CRITICAL
      premium: 10400,
      status: 'Portföyde',
      stage: 'Yenileme Bekliyor',
      doc: true,
      endorse: true,
      egm: true,
      notes: 'Yenileme zamanı geldi. Teklif hazırlanacak.',
      followDate: todayStr,
      createdAt: addDays(-360),
      updatedAt: todayStr,
    },
    {
      id: 'pol-2',
      type: 'policy',
      insured: 'Murat Arslan',
      plate: '16ARS77',
      vehicleBrand: 'Ford',
      vehicleModel: 'Focus 1.5 Ti-VCT Trend X',
      vehicleYear: 2018,
      vehicleDetail: '2018 Ford Focus',
      company: 'ANADOLU SİGORTA',
      branch: 'Kasko',
      policyNumber: 'KSK-401928-2025',
      startDate: addDays(-350),
      endDate: addDays(15), // 15 days left
      premium: 18900,
      status: 'Portföyde',
      stage: 'Yenileme Bekliyor',
      doc: true,
      endorse: false,
      egm: true,
      notes: 'Hasarsızlık kademesi 6. İndirimli teklif hazırlanacak.',
      createdAt: addDays(-350),
      updatedAt: addDays(-5),
    },
    {
      id: 'pol-3',
      type: 'policy',
      insured: 'Zeynep Işık',
      email: 'zeynep.isik@outlook.com',
      vehicleDetail: 'Kadıköy 3+1 Daire',
      company: 'DOĞA SİGORTA',
      branch: 'Konut',
      policyNumber: 'KNT-109283-2025',
      startDate: addDays(-340),
      endDate: addDays(25), // 25 days left
      premium: 5600,
      status: 'Portföyde',
      stage: 'Yürürlükte',
      notes: 'Kadıköy konut paketi + DASK birleşik yenileme.',
      createdAt: addDays(-340),
      updatedAt: addDays(-10),
    },
    {
      id: 'pol-4',
      type: 'policy',
      insured: 'Ömer Faruk Koç',
      plate: '07OFK40',
      vehicleBrand: 'Fiat',
      vehicleModel: 'Egea 1.4 Fire Urban',
      vehicleYear: 2021,
      company: 'TÜRKİYE SİGORTA',
      branch: 'Trafik',
      policyNumber: 'TRF-554433-2025',
      startDate: addDays(-370),
      endDate: addDays(-5), // 5 days overdue -> EXPIRED
      premium: 8900,
      status: 'Portföyde',
      stage: 'Süresi Doldu',
      doc: true,
      endorse: true,
      egm: true,
      notes: 'Bitiş tarihi geçti! Müşteriye bilgi verilecek.',
      createdAt: addDays(-370),
      updatedAt: todayStr,
    },
    // A concluded/completed policy
    {
      id: 'pol-concluded-1',
      type: 'policy',
      insured: 'Kemal Güler',
      email: 'kemal.guler@hotmail.com',
      plate: '34KML90',
      vehicleBrand: 'Renault',
      vehicleModel: 'Megane 1.3 TCe Joy',
      vehicleYear: 2019,
      company: 'RAY SİGORTA',
      branch: 'Kasko',
      policyNumber: 'KSK-990011-2024',
      startDate: addDays(-400),
      endDate: addDays(-35),
      premium: 17200,
      status: 'Sonuçlandı',
      stage: 'Süresi Doldu',
      outcome: 'completed',
      concludedReason: 'Poliçe süresi doldu ve başarıyla yenilendi.',
      resultDate: addDays(-30),
      doc: true,
      endorse: true,
      egm: true,
      notes: 'Portföyden süresi dolduğu için arşivlendi.',
      createdAt: addDays(-400),
      updatedAt: addDays(-30),
    },
  ];

  const rules: CustomRule[] = [
    {
      id: 'r-1',
      title: '10 Yaş Üzeri Kasko Yetkili Servis Kontrolü',
      branch: 'Kasko',
      minAge: 10,
      text: '10 yaş ve üzeri araçlarda bazı sigorta şirketleri yetkili servis teminatı vermez. Alternatif anlaşmalı servis maddesi kontrol edilmelidir.',
    },
    {
      id: 'r-2',
      title: 'Trafik Poliçesinde EGM ve Plaka Zeyli Zorunluluğu',
      branch: 'Trafik',
      text: 'Trafik tanzim edilmeden önce ruhsat, plaka zeyli ve EGM/TRAMER sorgusu eksiksiz yapılmalıdır.',
      disabled: true,
    },
    {
      id: 'r-3',
      title: 'Konut / DASK Birlikte Teklif Uyarısı',
      branch: 'Konut',
      text: 'Konut sigortası tanzim edilmeden önce güncel DASK poliçe numarasının sisteme işlendiğinden emin olunuz.',
    },
  ];

  return {
    quotes,
    policies,
    rules,
    settings: {
      reminderDays: [30, 15, 7, 3, 1],
    },
  };
};

export const loadAppData = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const quotes = Array.isArray(parsed.quotes) ? parsed.quotes.map(sanitizeQuoteData) : [];
      const endorsements = Array.isArray(parsed.endorsements)
        ? parsed.endorsements.map(sanitizeEndorsementData).filter(Boolean)
        : [];

      const policies = Array.isArray(parsed.policies)
        ? parsed.policies.map((p: any) => {
            const sanitized = sanitizePolicyData(p);
            // If originalPremium was not explicitly set on legacy record, check matched quote
            if (p.originalPremium === undefined || p.originalPremium === null) {
              const matchedQuote = sanitized.originQuoteId ? quotes.find((q: Quote) => q.id === sanitized.originQuoteId) : null;
              if (matchedQuote && typeof matchedQuote.premium === 'number' && matchedQuote.premium > 0) {
                sanitized.originalPremium = matchedQuote.premium;
              } else {
                sanitized.originalPremium = sanitized.premium;
              }
            }
            // Recalculate from endorsements linked to this policy
            const linkedEndorsements = endorsements.filter((e: any) => e.policyId === sanitized.id);
            const baseOrig = sanitized.originalPremium ?? sanitized.premium ?? 0;
            if (linkedEndorsements.length > 0) {
              const totalAdd = linkedEndorsements.reduce((sum: number, e: any) => sum + (Number(e.additionalPremium) || 0), 0);
              const totalRef = linkedEndorsements.reduce((sum: number, e: any) => sum + (Number(e.refundPremium) || 0), 0);
              sanitized.totalAdditionalPremium = totalAdd;
              sanitized.totalRefundPremium = totalRef;
              sanitized.currentPremium = baseOrig + totalAdd - totalRef;
              sanitized.premium = sanitized.currentPremium;
            } else {
              sanitized.totalAdditionalPremium = sanitized.totalAdditionalPremium || 0;
              sanitized.totalRefundPremium = sanitized.totalRefundPremium || 0;
              sanitized.currentPremium = sanitized.currentPremium ?? baseOrig;
              sanitized.premium = sanitized.currentPremium;
            }
            return sanitized;
          })
        : [];

      const parsedRenewals = Array.isArray(parsed.renewals)
        ? parsed.renewals.map(sanitizeRenewalRecord).filter(Boolean) as RenewalRecord[]
        : [];
      const renewals = syncRenewalRecords(policies, parsedRenewals);

      return {
        quotes,
        policies,
        endorsements,
        renewals,
        rules: Array.isArray(parsed.rules) ? parsed.rules : [],
        settings: {
          reminderDays: Array.isArray(parsed.settings?.reminderDays) ? parsed.settings.reminderDays : [30, 15, 7, 3, 1],
          concludedIncludeEndorsementPremium: !!parsed.settings?.concludedIncludeEndorsementPremium,
          policiesIncludeEndorsementPremium: parsed.settings?.policiesIncludeEndorsementPremium !== undefined
            ? !!parsed.settings.policiesIncludeEndorsementPremium
            : true,
        },
      };
    }

    // Check legacy key if user had previous version
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const legacyParsed = JSON.parse(legacy);
      const migratedPolicies: Policy[] = Array.isArray(legacyParsed.policies)
        ? legacyParsed.policies.map((p: any) =>
            sanitizePolicyData({
              id: p.id || generateId(),
              type: 'policy',
              insured: p.insured || '',
              email: p.email || '',
              plate: p.plate || '',
              company: p.company || 'ALLIANZ SİGORTA',
              branch: p.branch || 'Trafik',
              policyNumber: p.number || 'POL-' + Math.floor(100000 + Math.random() * 900000),
              startDate: p.startDate || getTodayIso(),
              endDate: p.endDate || addDays(365),
              premium: parseFloat(p.premium) || 0,
              status: p.status === 'Kapandı' ? 'Sonuçlandı' : 'Portföyde',
              stage: p.stage || 'Yürürlükte',
              outcome: p.status === 'Kapandı' ? 'completed' : undefined,
              resultDate: p.status === 'Kapandı' ? getTodayIso() : undefined,
              doc: !!p.doc,
              endorse: !!p.endorse,
              egm: !!p.egm,
              notes: p.notes || '',
              followDate: p.followDate || '',
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: p.updatedAt || new Date().toISOString(),
            })
          )
        : [];

      const initialData: AppData = {
        quotes: [],
        policies: migratedPolicies,
        endorsements: [],
        renewals: syncRenewalRecords(migratedPolicies),
        rules: Array.isArray(legacyParsed.rules) ? legacyParsed.rules : [],
        settings: legacyParsed.settings || { reminderDays: [30, 15, 7, 3, 1] },
      };
      saveAppData(initialData);
      return initialData;
    }
  } catch (e) {
    console.error('Failed to parse stored data:', e);
  }

  // First time initialization: start with an empty database.
  // Demo data is available only via the deliberate "Load Demo Data"
  // action in the Backup view — it is never auto-inserted.
  const emptyData: AppData = {
    quotes: [],
    policies: [],
    endorsements: [],
    renewals: [],
    rules: [],
    settings: { reminderDays: [30, 15, 7, 3, 1] },
  };
  saveAppData(emptyData);
  return emptyData;
};

export const saveAppData = (data: AppData): void => {
  try {
    // Sanitize before saving to guarantee clean data and company normalization
    const cleanRenewals = syncRenewalRecords(data.policies, data.renewals || []);
    const sanitized: AppData = {
      quotes: data.quotes.map(sanitizeQuoteData),
      policies: data.policies.map(sanitizePolicyData),
      endorsements: (data.endorsements || []).map(sanitizeEndorsementData).filter(Boolean),
      renewals: cleanRenewals,
      rules: data.rules,
      settings: data.settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Storage save error:', e);
  }
};

export const exportToJsonString = (data: AppData): string => {
  const cleanRenewals = syncRenewalRecords(data.policies, data.renewals || []);
  const cleanData: AppData = {
    quotes: data.quotes.map(sanitizeQuoteData),
    policies: data.policies.map(sanitizePolicyData),
    endorsements: (data.endorsements || []).map(sanitizeEndorsementData).filter(Boolean),
    renewals: cleanRenewals,
    rules: data.rules,
    settings: data.settings,
  };
  return JSON.stringify(
    {
      ...cleanData,
      exportedAt: new Date().toISOString(),
      appVersion: '2.2.0',
      compliance: 'Authorized 13 Companies · Privacy Preserved (No TCKN / No Phone)',
    },
    null,
    2
  );
};

export const downloadFile = (filename: string, content: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const escapeCsvCell = (val: any): string => {
  const s = String(val ?? '');
  return '"' + s.replace(/"/g, '""') + '"';
};

export const exportPoliciesToCsv = (policies: Policy[]): void => {
  const headers = [
    'Müşteri / Sigortalı',
    'E-posta',
    'Araç Plakası',
    'Araç Markası',
    'Modeli',
    'Model Yılı',
    'Araç Bedeli TL',
    'Çarpan (Prim / Araç Bedeli)',
    'Detay / Adres',
    'Şirket',
    'Branş',
    'Poliçe Numarası',
    'Başlangıç Tarihi',
    'Bitiş Tarihi',
    'Kalan Gün',
    'Prim TL',
    'Yenileme Durumu',
    'İş Aşaması',
    'Ruhsat Kontrol',
    'Plaka Zeyli',
    'EGM/TRAMER',
    'İş Notları',
  ];

  const rows = policies.map((p) => {
    const mult = calculateMultiplier(p.premium, p.vehicleValue);
    return [
      escapeCsvCell(p.insured),
      escapeCsvCell(p.email),
      escapeCsvCell(p.plate),
      escapeCsvCell(p.vehicleBrand),
      escapeCsvCell(p.vehicleModel),
      escapeCsvCell(p.vehicleYear),
      escapeCsvCell(p.vehicleValue || ''),
      escapeCsvCell(formatMultiplier(mult)),
      escapeCsvCell(p.vehicleDetail),
      escapeCsvCell(p.company),
      escapeCsvCell(p.branch),
      escapeCsvCell(p.policyNumber),
      escapeCsvCell(p.startDate),
      escapeCsvCell(p.endDate),
      escapeCsvCell(calculateDaysLeft(p.endDate)),
      escapeCsvCell(p.premium),
      escapeCsvCell(p.status),
      escapeCsvCell(p.stage),
      escapeCsvCell(p.doc ? 'Evet' : 'Hayır'),
      escapeCsvCell(p.endorse ? 'Evet' : 'Hayır'),
      escapeCsvCell(p.egm ? 'Evet' : 'Hayır'),
      escapeCsvCell(p.notes),
    ];
  });

  const csvContent = '\ufeff' + [headers.map(escapeCsvCell).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  downloadFile(`policeler-${getTodayIso()}.csv`, csvContent, 'text/csv;charset=utf-8');
};

export const exportQuotesToCsv = (quotes: Quote[]): void => {
  const headers = [
    'Sigortalı',
    'İş Türü',
    'Branş',
    'Plaka',
    'Ruhsat Belge Seri No',
    'Şasi No',
    'Motor No',
    'Kullanım Tarzı',
    'Model Yılı',
    'Araç Marka',
    'Araç Model',
    'Araç Kodu',
    'Yakıt Türü',
    'Araç Bedeli TL',
    'E-posta',
    'Şirket',
    'Teklif Numarası',
    'Teklif Tarihi',
    'Son Geçerlilik',
    'Prim TL',
    'Teklif Durumu',
    'İş Aşaması',
    'Sonuç',
    'Sonuçlanma Nedeni',
    'İş Notları',
  ];

  const rows = quotes.map((q) => [
    escapeCsvCell(q.insured),
    escapeCsvCell(q.businessType || 'Yenileme'),
    escapeCsvCell(q.branch || 'Kasko'),
    escapeCsvCell(q.plate || ''),
    escapeCsvCell(q.licenseSerialNo || ''),
    escapeCsvCell(q.chassisNo || ''),
    escapeCsvCell(q.engineNo || ''),
    escapeCsvCell(q.usageStyle || ''),
    escapeCsvCell(q.vehicleYear || ''),
    escapeCsvCell(q.vehicleBrand || ''),
    escapeCsvCell(q.vehicleModel || ''),
    escapeCsvCell(q.vehicleCode || ''),
    escapeCsvCell(q.fuelType || ''),
    escapeCsvCell(q.vehicleValue || ''),
    escapeCsvCell(q.email || ''),
    escapeCsvCell(q.company),
    escapeCsvCell(q.quoteNumber),
    escapeCsvCell(q.quoteDate),
    escapeCsvCell(q.validUntil),
    escapeCsvCell(q.premium),
    escapeCsvCell(
      getEffectiveQuoteStatus(q) === 'kabul_edildi'
        ? 'Kabul Edildi'
        : getEffectiveQuoteStatus(q) === 'reddedildi'
        ? 'Reddedildi'
        : 'Beklemede'
    ),
    escapeCsvCell(q.stage),
    escapeCsvCell(
      q.outcome === 'converted' ? 'Olumlu (Poliçeleşti)' : q.outcome === 'rejected' ? 'Olumsuz (Yapılmadı)' : 'Beklemede'
    ),
    escapeCsvCell(q.rejectionReason || ''),
    escapeCsvCell(q.notes),
  ]);

  const csvContent = '\ufeff' + [headers.map(escapeCsvCell).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  downloadFile(`teklifler-${getTodayIso()}.csv`, csvContent, 'text/csv;charset=utf-8');
};

export const exportRenewalsToCsv = (renewals: RenewalRecord[]): void => {
  const headers = [
    'PLAKA',
    'Branş',
    'Sigorta Şirketi',
    'Sigortalı',
    'Poliçe No',
    'Başlama Tarihi',
    'Bitiş Tarihi',
    'Brüt Prim TL',
    'ARAÇ MARKA',
    'ARAÇ MODEL',
    'Model Yılı',
    'Ruhsat No',
    'Motor No',
    'Şasi No',
    'Araç Bedeli',
    'Araç Kodu',
  ];

  const rows = renewals.map((r) => [
    escapeCsvCell(r.plate || ''),
    escapeCsvCell(r.branch),
    escapeCsvCell(r.company),
    escapeCsvCell(r.insured),
    escapeCsvCell(r.policyNumber),
    escapeCsvCell(r.startDate),
    escapeCsvCell(r.endDate),
    escapeCsvCell(r.premium),
    escapeCsvCell(r.vehicleBrand || ''),
    escapeCsvCell(r.vehicleModel || ''),
    escapeCsvCell(r.vehicleYear || ''),
    escapeCsvCell(r.licenseSerialNo || ''),
    escapeCsvCell(r.engineNo || ''),
    escapeCsvCell(r.chassisNo || ''),
    escapeCsvCell(r.vehicleValue !== undefined && r.vehicleValue !== null ? r.vehicleValue : ''),
    escapeCsvCell(r.vehicleCode || ''),
  ]);

  const csvContent = '\ufeff' + [headers.map(escapeCsvCell).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  downloadFile(`yenilemeler-${getTodayIso()}.csv`, csvContent, 'text/csv;charset=utf-8');
};

// Sync follow-up quote for two-way cross-sell (Kasko -> Trafik or Trafik -> Kasko)
export const syncCrossSellFollowUp = (
  item: Policy | Quote,
  currentQuotes: Quote[]
): { updatedItem: Policy | Quote; updatedQuotes: Quote[] } => {
  let updatedQuotes = [...currentQuotes];
  let updatedItem = { ...item };

  const isKaskoWithNoTrafik =
    updatedItem.branch === 'Kasko' && updatedItem.trafficStatus === 'TRAFİK BİZDE DEĞİL';
  const isTrafikWithNoKasko =
    updatedItem.branch === 'Trafik' && updatedItem.kaskoStatus === 'KASKO BİZDE DEĞİL';

  if (!isKaskoWithNoTrafik && !isTrafikWithNoKasko) {
    return { updatedItem, updatedQuotes };
  }

  const cleanPlate = (pl?: string) => (pl ? pl.replace(/\s+/g, '').toLocaleUpperCase('tr-TR') : '');
  const srcPlate = cleanPlate(updatedItem.plate);
  const srcInsured = updatedItem.insured.trim().toLocaleLowerCase('tr-TR');
  const nowIso = new Date().toISOString();

  if (isKaskoWithNoTrafik) {
    let existingIdx = -1;
    const followUpId = 'trafficFollowUpQuoteId' in updatedItem ? updatedItem.trafficFollowUpQuoteId : undefined;
    if (followUpId) {
      existingIdx = updatedQuotes.findIndex((q) => q.id === followUpId);
    }
    if (existingIdx === -1) {
      existingIdx = updatedQuotes.findIndex((q) => {
        const qPlate = cleanPlate(q.plate);
        const qInsured = q.insured.trim().toLocaleLowerCase('tr-TR');
        const isMatch = srcPlate && qPlate ? srcPlate === qPlate : srcInsured === qInsured;
        return isMatch && q.branch === 'Trafik' && q.businessType === 'Takip' && q.status !== 'concluded';
      });
    }

    const targetDate = updatedItem.trafficEndDate || ('endDate' in updatedItem ? updatedItem.endDate : updatedItem.validUntil) || addDays(30);
    const targetCompany = updatedItem.trafficCompany || 'TÜRKİYE SİGORTA';
    const calcStartDate = subtractOneYear(targetDate);

    if (existingIdx >= 0) {
      const existing = updatedQuotes[existingIdx];
      const updated: Quote = {
        ...existing,
        insured: updatedItem.insured,
        phone: updatedItem.phone || existing.phone,
        email: updatedItem.email || existing.email,
        plate: updatedItem.plate || existing.plate,
        licenseSerialNo: updatedItem.licenseSerialNo || existing.licenseSerialNo,
        chassisNo: updatedItem.chassisNo || existing.chassisNo,
        engineNo: updatedItem.engineNo || existing.engineNo,
        usageStyle: updatedItem.usageStyle || existing.usageStyle,
        vehicleBrand: updatedItem.vehicleBrand || existing.vehicleBrand,
        vehicleModel: updatedItem.vehicleModel || existing.vehicleModel,
        vehicleYear: updatedItem.vehicleYear || existing.vehicleYear,
        vehicleCode: updatedItem.vehicleCode || existing.vehicleCode,
        fuelType: updatedItem.fuelType || existing.fuelType,
        vehicleValue: updatedItem.vehicleValue || existing.vehicleValue,
        vehicleDetail: updatedItem.vehicleDetail || existing.vehicleDetail,
        company: (existing.companyOffers && existing.companyOffers.length > 0 && existing.company) ? existing.company : targetCompany,
        startDate: calcStartDate,
        quoteDate: calcStartDate,
        validUntil: targetDate,
        endDate: targetDate,
        followDate: targetDate,
        trafficStatus: 'TRAFİK BİZDE DEĞİL',
        trafficCompany: targetCompany,
        trafficEndDate: targetDate,
        originQuoteId: 'quoteDate' in updatedItem ? updatedItem.id : existing.originQuoteId,
        originPolicyId: 'policyNumber' in updatedItem ? updatedItem.id : existing.originPolicyId,
        updatedAt: nowIso,
      };
      updatedQuotes[existingIdx] = updated;
      (updatedItem as any).trafficFollowUpQuoteId = updated.id;
    } else {
      const newId = generateId();
      const refNum = 'policyNumber' in updatedItem ? updatedItem.policyNumber : updatedItem.quoteNumber;
      const newQuote: Quote = {
        id: newId,
        type: 'quote',
        quoteNumber: 'TKP-' + Math.floor(100000 + Math.random() * 900000),
        insured: updatedItem.insured,
        phone: updatedItem.phone || '',
        email: updatedItem.email || '',
        plate: updatedItem.plate || '',
        licenseSerialNo: updatedItem.licenseSerialNo || '',
        chassisNo: updatedItem.chassisNo || '',
        engineNo: updatedItem.engineNo || '',
        usageStyle: updatedItem.usageStyle || '',
        vehicleBrand: updatedItem.vehicleBrand || '',
        vehicleModel: updatedItem.vehicleModel || '',
        vehicleYear: updatedItem.vehicleYear,
        vehicleCode: updatedItem.vehicleCode || '',
        fuelType: updatedItem.fuelType || '',
        vehicleValue: updatedItem.vehicleValue,
        vehicleDetail: updatedItem.vehicleDetail,
        businessType: 'Takip',
        branch: 'Trafik',
        company: targetCompany,
        startDate: calcStartDate,
        quoteDate: calcStartDate,
        validUntil: targetDate,
        endDate: targetDate,
        followDate: targetDate,
        premium: 0,
        stage: 'MÜŞTERİYE SUNULACAK',
        status: 'active',
        quoteStatus: 'beklemede',
        crossSellOrigin: 'kasko_cross_sell',
        notes: `Kasko kaydından (${refNum || ''}) oluşturulan Trafik çapraz satış takibi.`,
        trafficStatus: 'TRAFİK BİZDE DEĞİL',
        trafficCompany: targetCompany,
        trafficEndDate: targetDate,
        originPolicyId: 'policyNumber' in updatedItem ? updatedItem.id : undefined,
        originQuoteId: 'quoteDate' in updatedItem ? updatedItem.id : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        companyOffers: [],
      };
      updatedQuotes = [newQuote, ...updatedQuotes];
      (updatedItem as any).trafficFollowUpQuoteId = newId;
    }
  }

  if (isTrafikWithNoKasko) {
    let existingIdx = -1;
    const followUpId = 'kaskoFollowUpQuoteId' in updatedItem ? updatedItem.kaskoFollowUpQuoteId : undefined;
    if (followUpId) {
      existingIdx = updatedQuotes.findIndex((q) => q.id === followUpId);
    }
    if (existingIdx === -1) {
      existingIdx = updatedQuotes.findIndex((q) => {
        const qPlate = cleanPlate(q.plate);
        const qInsured = q.insured.trim().toLocaleLowerCase('tr-TR');
        const isMatch = srcPlate && qPlate ? srcPlate === qPlate : srcInsured === qInsured;
        return isMatch && q.branch === 'Kasko' && q.businessType === 'Takip' && q.status !== 'concluded';
      });
    }

    const targetDate = updatedItem.kaskoEndDate || ('endDate' in updatedItem ? updatedItem.endDate : updatedItem.validUntil) || addDays(30);
    const targetCompany = updatedItem.kaskoCompany || 'TÜRKİYE SİGORTA';
    const calcStartDate = subtractOneYear(targetDate);

    if (existingIdx >= 0) {
      const existing = updatedQuotes[existingIdx];
      const updated: Quote = {
        ...existing,
        insured: updatedItem.insured,
        phone: updatedItem.phone || existing.phone,
        email: updatedItem.email || existing.email,
        plate: updatedItem.plate || existing.plate,
        licenseSerialNo: updatedItem.licenseSerialNo || existing.licenseSerialNo,
        chassisNo: updatedItem.chassisNo || existing.chassisNo,
        engineNo: updatedItem.engineNo || existing.engineNo,
        usageStyle: updatedItem.usageStyle || existing.usageStyle,
        vehicleBrand: updatedItem.vehicleBrand || existing.vehicleBrand,
        vehicleModel: updatedItem.vehicleModel || existing.vehicleModel,
        vehicleYear: updatedItem.vehicleYear || existing.vehicleYear,
        vehicleCode: updatedItem.vehicleCode || existing.vehicleCode,
        fuelType: updatedItem.fuelType || existing.fuelType,
        vehicleValue: updatedItem.vehicleValue || existing.vehicleValue,
        vehicleDetail: updatedItem.vehicleDetail || existing.vehicleDetail,
        company: (existing.companyOffers && existing.companyOffers.length > 0 && existing.company) ? existing.company : targetCompany,
        startDate: calcStartDate,
        quoteDate: calcStartDate,
        validUntil: targetDate,
        endDate: targetDate,
        followDate: targetDate,
        kaskoStatus: 'KASKO BİZDE DEĞİL',
        kaskoCompany: targetCompany,
        kaskoEndDate: targetDate,
        originQuoteId: 'quoteDate' in updatedItem ? updatedItem.id : existing.originQuoteId,
        originPolicyId: 'policyNumber' in updatedItem ? updatedItem.id : existing.originPolicyId,
        updatedAt: nowIso,
      };
      updatedQuotes[existingIdx] = updated;
      (updatedItem as any).kaskoFollowUpQuoteId = updated.id;
    } else {
      const newId = generateId();
      const refNum = 'policyNumber' in updatedItem ? updatedItem.policyNumber : updatedItem.quoteNumber;
      const newQuote: Quote = {
        id: newId,
        type: 'quote',
        quoteNumber: 'TKP-' + Math.floor(100000 + Math.random() * 900000),
        insured: updatedItem.insured,
        phone: updatedItem.phone || '',
        email: updatedItem.email || '',
        plate: updatedItem.plate || '',
        licenseSerialNo: updatedItem.licenseSerialNo || '',
        chassisNo: updatedItem.chassisNo || '',
        engineNo: updatedItem.engineNo || '',
        usageStyle: updatedItem.usageStyle || '',
        vehicleBrand: updatedItem.vehicleBrand || '',
        vehicleModel: updatedItem.vehicleModel || '',
        vehicleYear: updatedItem.vehicleYear,
        vehicleCode: updatedItem.vehicleCode || '',
        fuelType: updatedItem.fuelType || '',
        vehicleValue: updatedItem.vehicleValue,
        vehicleDetail: updatedItem.vehicleDetail,
        businessType: 'Takip',
        branch: 'Kasko',
        company: targetCompany,
        startDate: calcStartDate,
        quoteDate: calcStartDate,
        validUntil: targetDate,
        endDate: targetDate,
        followDate: targetDate,
        premium: 0,
        stage: 'MÜŞTERİYE SUNULACAK',
        status: 'active',
        quoteStatus: 'beklemede',
        crossSellOrigin: 'trafik_cross_sell',
        notes: `Trafik kaydından (${refNum || ''}) oluşturulan Kasko çapraz satış takibi.`,
        kaskoStatus: 'KASKO BİZDE DEĞİL',
        kaskoCompany: targetCompany,
        kaskoEndDate: targetDate,
        originPolicyId: 'policyNumber' in updatedItem ? updatedItem.id : undefined,
        originQuoteId: 'quoteDate' in updatedItem ? updatedItem.id : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        companyOffers: [],
      };
      updatedQuotes = [newQuote, ...updatedQuotes];
      (updatedItem as any).kaskoFollowUpQuoteId = newId;
    }
  }

  return { updatedItem, updatedQuotes };
};
