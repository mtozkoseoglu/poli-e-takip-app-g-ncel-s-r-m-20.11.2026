export type QuoteStage =
  | 'MÜŞTERİYE SUNULACAK'
  | 'İNDİRİM İSTENDİ'
  | 'MÜŞTERİDEN YANIT BEKLENİYOR';

export const NON_CONVERSION_REASONS = [
  'MÜŞTERİ BAŞKA YERDEN YAPTIRDI',
  'MÜŞTERİ YAPTIRMADI',
  'MÜŞTERİYE ULAŞILAMADI',
  'ARAÇ SATILDI',
] as const;

export type NonConversionReason = (typeof NON_CONVERSION_REASONS)[number];

export type QuoteStatus = 'beklemede' | 'kabul_edildi' | 'reddedildi';

export interface QuoteProgressLog {
  id: string;
  stage: string;
  status: QuoteStatus;
  timestamp: string;
  note?: string;
}

export type PolicyStage =
  | 'Yenileme Bekliyor'
  | 'Poliçe Düzenlendi'
  | 'Zeyil Aşamasında'
  | 'Yürürlükte'
  | 'Süresi Doldu';

export type QuoteOutcome = 'converted' | 'rejected'; // converted = Olumlu (Poliçeleşti), rejected = Olumsuz (Yapılmadı)
export type PolicyOutcome = 'completed' | 'cancelled' | 'renewed';

export interface AlternativeQuote {
  company: string;
  premium: number;
  notes?: string;
}

export type BusinessType = 'Yenileme' | 'Yeni İş' | 'Takip';

export const BUSINESS_TYPES: BusinessType[] = ['Yenileme', 'Yeni İş', 'Takip'];

export const USAGE_STYLES = [
  'ÇEKİCİ',
  'İŞ MAKİNESİ',
  'KAMYON',
  'KAMYONET',
  'MİNİBÜS',
  'MOTOSİKLET',
  'OTOBÜS',
  'OTOMOBİL',
  'RÖMORK',
  'TAKSİ',
  'TRAKTÖR',
] as const;

export type UsageStyle = (typeof USAGE_STYLES)[number];

export const FUEL_TYPES = [
  'BENZİN',
  'DİZEL',
  'LPG',
  'HİBRİT',
  'ELEKTRİK',
  'BENZİN + LPG',
  'DİĞER',
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export type CompanyOfferStatus =
  | 'TEKLİF ALINDI'
  | 'TEKLİF ALINAMADI'
  | 'teklif_alindi'
  | 'teklif_alinamadi'
  | 'bekleniyor';

export interface CompanyOffer {
  company: string; // 13 onaylı şirketten biri
  premium?: number;
  quoteNumber?: string;
  notes?: string;
  status?: CompanyOfferStatus;
  noOffer?: boolean; // Teklif alınamadı bayrağı
}

export interface Quote {
  id: string;
  type: 'quote';
  insured: string; // Müşteri adı soyadı veya şirket unvanı
  businessType?: BusinessType; // Yenileme, Yeni İş, Takip
  phone?: string; // İsteğe bağlı telefon
  email?: string; // İsteğe bağlı e-posta
  plate?: string; // Araç plakası
  licenseSerialNo?: string; // Ruhsat Belge Seri No
  chassisNo?: string; // Şasi No
  engineNo?: string; // Motor No
  usageStyle?: string; // Araç Kullanım Tarzı
  vehicleYear?: number | string; // Model yılı
  vehicleBrand?: string; // Araç markası
  vehicleModel?: string; // Araç modeli
  vehicleCode?: string; // Araç Kodu
  fuelType?: string; // Yakıt Türü (Benzin, Dizel, Hibrit vb.)
  vehicleValue?: number; // Araç Bedeli TL
  vehicleDetail?: string; // Araç / Varlık detay özeti
  company: string; // Sigorta şirketi
  branch: string; // Poliçe branşı
  quoteNumber?: string; // Teklif No
  quoteDate: string; // Teklif tarihi
  validUntil: string; // Bitiş / Son geçerlilik tarihi
  issueDate?: string; // Tanzim tarihi (YYYY-MM-DD)
  startDate?: string; // Poliçe başlangıç tarihi (YYYY-MM-DD)
  endDate?: string; // Poliçe bitiş tarihi (YYYY-MM-DD)
  premium: number; // Prim TL
  stage: QuoteStage;
  status: 'active' | 'concluded';
  quoteStatus?: QuoteStatus; // 'beklemede' | 'kabul_edildi' | 'reddedildi'
  outcome?: QuoteOutcome;
  convertedPolicyId?: string; // Oluşan poliçe ID'si
  resultDate?: string; // Sonuçlanma tarihi
  rejectionReason?: string; // Sonuçlanma / poliçeleştirmeme nedeni
  nonConversionReason?: NonConversionReason | string; // Teklif Sonucu / Poliçeleştirmeme Nedeni
  rejectionNote?: string;
  progressLogs?: QuoteProgressLog[]; // İlerleme ve aşama geçmişi
  companyOffers?: CompanyOffer[]; // 6 sigorta şirketi teklif satırı
  alternatives?: AlternativeQuote[];
  notes?: string; // İş notları
  followDate?: string; // Takip / Arama tarihi
  isPriority?: boolean; // Öncelikli İş (Kasko teklifleri için Genel Bakışta gösterim)
  // Çapraz Satış Portföy Durumu (Yeni Teklif Kaydı Alırken)
  trafficStatus?: 'TRAFİK BİZDE' | 'TRAFİK BİZDE DEĞİL';
  trafficEndDate?: string;
  trafficCompany?: string;
  kaskoStatus?: 'KASKO BİZDE' | 'KASKO BİZDE DEĞİL';
  kaskoEndDate?: string;
  kaskoCompany?: string;
  followUpStatus?: 'active' | 'completed' | 'passive';
  crossSellOrigin?: 'kasko_cross_sell' | 'trafik_cross_sell' | 'manual';
  trafficFollowUpQuoteId?: string;
  kaskoFollowUpQuoteId?: string;
  originQuoteId?: string;
  originPolicyId?: string;
  previousCompany?: string;
  previousPolicyNumber?: string;
  previousPremium?: number;
  previousPolicyNotes?: string;
  previousStartDate?: string; // Excel'den aktarılan veya önceki dönemin başlangıç tarihi (YYYY-MM-DD)
  previousEndDate?: string; // Excel'den aktarılan veya önceki dönemin bitiş tarihi (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
}

export interface Policy {
  id: string;
  type: 'policy';
  insured: string; // Müşteri adı soyadı veya şirket unvanı
  phone?: string; // İsteğe bağlı telefon
  email?: string; // İsteğe bağlı e-posta
  plate?: string; // Araç plakası
  licenseSerialNo?: string; // Ruhsat Belge Seri No
  chassisNo?: string; // Şasi No
  engineNo?: string; // Motor No
  usageStyle?: string; // Araç Kullanım Tarzı
  vehicleBrand?: string; // Araç markası
  vehicleModel?: string; // Araç modeli
  vehicleCode?: string; // Araç Kodu
  fuelType?: string; // Yakıt Türü
  vehicleYear?: number | string; // Model yılı
  vehicleValue?: number; // Araç Bedeli TL
  multiplier?: number; // Çarpan = Prim / Araç Bedeli (Yalnızca Kasko)
  vehicleDetail?: string; // Araç / Varlık detay özeti
  businessType?: BusinessType; // Yenileme, Yeni İş, Takip
  company: string; // Sigorta şirketi
  branch: string; // Poliçe branşı
  policyNumber: string; // Poliçe numarası
  issueDate?: string; // Tanzim tarihi (YYYY-MM-DD)
  startDate: string; // Poliçe başlangıç tarihi
  endDate: string; // Poliçe bitiş / yenileme tarihi
  originalPremium?: number; // İlk teklif/poliçeleştirme primi (Orijinal Poliçe Primi - kesinlikle değişmez)
  currentPremium?: number; // Zeyil Sonrası Güncel Prim (Zeyiller uygulandıktan sonra oluşan toplam prim)
  totalAdditionalPremium?: number; // Zeyiller nedeniyle oluşan toplam ek prim
  totalRefundPremium?: number; // Zeyiller nedeniyle oluşan toplam iade prim
  premium: number; // Prim TL (Geriye dönük uyumluluk: varsayılan olarak currentPremium || originalPremium)
  status: 'Portföyde' | 'Yenileme Takibinde' | 'Sonuçlandı' | 'İptal'; // Yenileme durumu
  stage: PolicyStage;
  outcome?: PolicyOutcome;
  resultDate?: string; // Sonuçlanma tarihi
  originQuoteId?: string; // Eğer bir tekliften türetildiyse
  concludedReason?: string;
  // Kasko - Trafik İki Yönlü Çapraz Satış Portföy Durumu
  trafficStatus?: 'TRAFİK BİZDE' | 'TRAFİK BİZDE DEĞİL';
  trafficEndDate?: string;
  trafficCompany?: string;
  trafficFollowUpQuoteId?: string; // İlişkili takip teklif ID'si
  kaskoStatus?: 'KASKO BİZDE' | 'KASKO BİZDE DEĞİL';
  kaskoEndDate?: string;
  kaskoCompany?: string;
  kaskoFollowUpQuoteId?: string;
  followUpStatus?: 'active' | 'completed' | 'passive';
  pastPlates?: string[]; // Zeyillerle değişen eski plakalar geçmişi
  dainMurtehin?: string; // Dain-i mürtehin bilgisi
  coverages?: string[]; // Teminatlar
  // Kontrol listesi
  doc?: boolean; // Ruhsat kontrolü yapıldı
  endorse?: boolean; // Plaka zeyli yapıldı
  egm?: boolean; // EGM / TRAMER kontrol edildi
  notes?: string; // İş notları
  followDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const ENDORSEMENT_TYPES = [
  'PLAKA DEĞİŞİKLİĞİ ZEYİLİ',
  'BAŞLANGICINDAN İPTAL ZEYİLİ',
  'SATIŞ İPTAL ZEYİLİ',
  'DAİN VE MÜRTEHİN ZEYİLİ',
  'AÇIKLAMA ZEYİLİ',
  'ARAÇ VE BİLGİ DEĞİŞİKLİĞİ ZEYİLİ',
  'SİGORTALI TALEBİ İLE (KISMİ) İPTAL ZEYİLİ',
  'TEMİNAT DEĞİŞİKLİĞİ ZEYİLİ',
] as const;

export type EndorsementType = (typeof ENDORSEMENT_TYPES)[number];

export interface EndorsementDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // Base64 data for local storage persistence
  uploadedAt: string;
}

export interface PolicyEndorsement {
  id: string; // Benzersiz zeyil hareket ID'si
  policyId: string; // Ana poliçe değişmeyen ID'si
  policyNumber: string; // Ana poliçe numarası
  endorsementNumber: string; // Zeyil numarası (örn: 11111111-1)
  endorsementType: EndorsementType; // 8 zeyil türünden biri
  issueDate: string; // Yalnızca Tanzim Tarihi (YYYY-MM-DD)
  description?: string; // Açıklama
  previousPremium: number; // Önceki poliçe primi
  additionalPremium: number; // Ek prim
  refundPremium: number; // İade prim
  totalPremium: number; // Zeyil sonrası toplam poliçe primi
  changedFields: string[]; // Değiştirilen alan adları listesi
  oldValues: Record<string, any>; // Eski değerler sözlüğü
  newValues: Record<string, any>; // Yeni değerler sözlüğü
  documents?: EndorsementDocument[]; // İlgili belge yüklemeleri
  // Satış İptal Zeyili özel alanları
  notary?: string; // Noter
  salesContractNo?: string; // Satış Senedi Numarası
  documentIssueDate?: string; // Belge Düzenlenme Tarihi (YYYY-MM-DD, zeyil tanzim tarihinden bağımsız)
  createdAt: string; // Oluşturulma ISO zaman damgası
}

export type NumericOperator =
  | 'equals' // Eşittir (=)
  | 'not_equals' // Eşit değildir (≠)
  | 'greater_than' // Büyüktür (>)
  | 'greater_than_or_equal' // Büyüktür veya eşittir (≥)
  | 'less_than' // Küçüktür (<)
  | 'less_than_or_equal' // Küçüktür veya eşittir (≤)
  | 'between'; // Arasındadır

export type TextOperator =
  | 'equals' // Eşittir (=)
  | 'not_equals'; // Eşit değildir (≠)

export type RuleField =
  | 'company'
  | 'branch'
  | 'insured'
  | 'vehicleYear'
  | 'usageStyle'
  | 'fuelType'
  | 'vehicleValue';

export interface RuleCondition {
  field: RuleField;
  operator: NumericOperator | TextOperator;
  value: string | number;
  value2?: string | number; // Arasındadır için ikinci değer (max)
}

export interface CustomRule {
  id: string;
  title: string;
  text: string;
  conditions?: RuleCondition[];
  // Eski kayıtların korunması için geriye dönük uyumluluk alanları:
  company?: string;
  branch?: string;
  minAge?: number | string;
  stage?: string;
  disabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RenewalRecord {
  id: string; // 'ren-' + policy.id
  policyId: string;
  policyNumber: string;
  insured: string;
  branch: string;
  company: string;
  plate?: string;
  licenseSerialNo?: string;
  chassisNo?: string;
  engineNo?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number | string;
  vehicleCode?: string;
  vehicleValue?: number;
  startDate: string;
  endDate: string;
  premium: number; // Brüt Prim TL (currentPremium || premium)
  status: 'active' | 'cancelled' | 'renewed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  reminderDays: number[];
  concludedIncludeEndorsementPremium?: boolean;
  policiesIncludeEndorsementPremium?: boolean;
}

export interface AppData {
  quotes: Quote[];
  policies: Policy[];
  endorsements?: PolicyEndorsement[];
  renewals?: RenewalRecord[];
  rules: CustomRule[];
  settings: AppSettings;
}

export const COMPANIES = [
  'AK SİGORTA',
  'ALLIANZ SİGORTA',
  'ANADOLU SİGORTA',
  'AXA SİGORTA',
  'DOĞA SİGORTA',
  'EUREKO SİGORTA',
  'HDI SİGORTA',
  'HEPIYI SİGORTA',
  'MAPFRE SİGORTA',
  'NEOVA SİGORTA',
  'RAY SİGORTA',
  'SOMPO SİGORTA',
  'TÜRKİYE SİGORTA',
] as const;

export type AuthorizedCompany = (typeof COMPANIES)[number];

export const BRANCHES = [
  'Kasko',
  'Trafik',
  'Konut',
  'DASK',
  'İşyeri',
  'Sağlık (ÖSS)',
  'Tamamlayıcı Sağlık (TSS)',
  'Ferdi Kaza',
  'Nakliyat',
  'Sorumluluk',
  'Seyahat Sağlık',
  'Diğer',
];

export const QUOTE_STAGES: QuoteStage[] = [
  'MÜŞTERİYE SUNULACAK',
  'İNDİRİM İSTENDİ',
  'MÜŞTERİDEN YANIT BEKLENİYOR',
];

export const POLICY_STAGES: PolicyStage[] = [
  'Yürürlükte',
  'Yenileme Bekliyor',
  'Poliçe Düzenlendi',
  'Zeyil Aşamasında',
  'Süresi Doldu',
];

export const REJECTION_REASONS = [
  'MÜŞTERİ BAŞKA YERDEN YAPTIRDI',
  'MÜŞTERİ YAPTIRMADI',
  'MÜŞTERİYE ULAŞILAMADI',
  'ARAÇ SATILDI',
];
