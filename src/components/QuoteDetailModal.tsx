import React, { useState, useEffect, useMemo } from 'react';
import {
  Quote,
  COMPANIES,
  BRANCHES,
  BUSINESS_TYPES,
  BusinessType,
  CompanyOffer,
  AuthorizedCompany,
  USAGE_STYLES,
  FUEL_TYPES,
  CompanyOfferStatus,
  QuoteStage,
  QUOTE_STAGES,
  NON_CONVERSION_REASONS,
  Policy,
  PolicyEndorsement,
} from '../types/insurance';
import { formatCurrency, isStandardCompany, normalizeQuoteStage, addOneYear, subtractOneYear } from '../services/storage';
import { generateQuotesPdfReport } from '../services/quotePdfService';
import { TurkishNumberInput } from './TurkishNumberInput';
import {
  X,
  FileText,
  FileDown,
  Car,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  TrendingDown,
  Save,
  AlertCircle,
  Building2,
  Hash,
  Sparkles,
  XCircle,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onSave: (quote: Quote) => void;
  onConvertToPolicy?: (quote: Quote) => void;
  showToast: (msg: string) => void;
  policies?: Policy[];
  endorsements?: PolicyEndorsement[];
}

export const QuoteDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quote,
  onSave,
  onConvertToPolicy,
  showToast,
  policies = [],
  endorsements = [],
}) => {
  // Common vehicle and customer fields (14 standard fields)
  const [insured, setInsured] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Yenileme');
  const [branch, setBranch] = useState('Kasko');
  const [plate, setPlate] = useState('');
  const [licenseSerialNo, setLicenseSerialNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [usageStyle, setUsageStyle] = useState('OTOMOBİL');
  const [vehicleYear, setVehicleYear] = useState<number | string>('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleCode, setVehicleCode] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [vehicleValue, setVehicleValue] = useState<number | ''>('');
  const [stage, setStage] = useState<QuoteStage>('MÜŞTERİYE SUNULACAK');
  const [nonConversionReason, setNonConversionReason] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Company Offer records strictly belonging to this quote
  const [offers, setOffers] = useState<
    Array<{
      company: string;
      premium: number | '';
      quoteNumber: string;
      notes?: string;
      status: 'TEKLİF ALINDI' | 'TEKLİF ALINAMADI';
      noOffer: boolean;
    }>
  >([]);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Initialize form state when quote changes
  useEffect(() => {
    if (!quote) return;

    setInsured(quote.insured || '');
    setBusinessType(quote.businessType || 'Yenileme');
    setBranch(quote.branch || 'Kasko');
    setPlate(quote.plate || '');
    setLicenseSerialNo(quote.licenseSerialNo || '');
    setChassisNo(quote.chassisNo || '');
    setEngineNo(quote.engineNo || '');
    setUsageStyle(quote.usageStyle || 'OTOMOBİL');
    setVehicleYear(quote.vehicleYear || '');
    setVehicleBrand(quote.vehicleBrand || '');
    setVehicleModel(quote.vehicleModel || '');
    setVehicleCode(quote.vehicleCode || '');
    setFuelType(quote.fuelType || '');
    setVehicleValue(quote.vehicleValue !== undefined && quote.vehicleValue !== null ? quote.vehicleValue : '');
    setStage(normalizeQuoteStage(quote.stage));
    setNonConversionReason(quote.nonConversionReason || quote.rejectionReason || '');
    setNotes(quote.notes || '');
    const effEnd = quote.endDate || quote.validUntil || '';
    const effStart = quote.startDate || ((quote.businessType === 'Takip' && effEnd) ? subtractOneYear(effEnd) : (quote.issueDate || quote.quoteDate || ''));
    setIssueDate(quote.issueDate || quote.quoteDate || '');
    setStartDate(effStart);
    setEndDate(effEnd);

    // Setup company offer records ONLY for companies actually present in this quote
    const currentOffers: Array<{
      company: string;
      premium: number | '';
      quoteNumber: string;
      notes?: string;
      status: 'TEKLİF ALINDI' | 'TEKLİF ALINAMADI';
      noOffer: boolean;
    }> = [];

    // 1. Existing offers from quote.companyOffers
    if (Array.isArray(quote.companyOffers) && quote.companyOffers.length > 0) {
      quote.companyOffers.forEach((o) => {
        const isNoOffer = o.noOffer === true || o.status === 'TEKLİF ALINAMADI' || o.status === 'teklif_alinamadi';
        const hasPrem = !isNoOffer && typeof o.premium === 'number' && !isNaN(o.premium) && o.premium > 0;
        currentOffers.push({
          company: o.company || COMPANIES[0],
          premium: !isNoOffer && o.premium !== undefined && o.premium !== null ? o.premium : '',
          quoteNumber: o.quoteNumber || '',
          notes: o.notes || '',
          status: isNoOffer ? 'TEKLİF ALINAMADI' : 'TEKLİF ALINDI',
          noOffer: isNoOffer,
        });
      });
    } else {
      // 2. Fallback for legacy quote: only populate from quote.company and alternatives if present
      if (quote.company && (quote.premium !== undefined || quote.quoteNumber)) {
        const hasPrem = typeof quote.premium === 'number' && quote.premium > 0;
        currentOffers.push({
          company: quote.company,
          premium: hasPrem ? quote.premium : '',
          quoteNumber: quote.quoteNumber || '',
          notes: '',
          status: hasPrem ? 'TEKLİF ALINDI' : 'TEKLİF ALINAMADI',
          noOffer: !hasPrem,
        });
      }
      if (Array.isArray(quote.alternatives)) {
        quote.alternatives.forEach((alt) => {
          const altHasPrem = typeof alt.premium === 'number' && alt.premium > 0;
          currentOffers.push({
            company: alt.company,
            premium: altHasPrem ? alt.premium : '',
            quoteNumber: '',
            notes: alt.notes || '',
            status: altHasPrem ? 'TEKLİF ALINDI' : 'TEKLİF ALINAMADI',
            noOffer: !altHasPrem,
          });
        });
      }
    }

    setOffers(currentOffers);
  }, [quote, isOpen]);

  // Find lowest valid premium to highlight (TEKLİF ALINAMADI olanlar hesaba katılmaz)
  const minValidPremium = useMemo(() => {
    const validPremiums = offers
      .filter((o) => !o.noOffer && o.status === 'TEKLİF ALINDI')
      .map((o) => (typeof o.premium === 'number' && !isNaN(o.premium) && o.premium > 0 ? o.premium : null))
      .filter((p): p is number => p !== null);
    if (validPremiums.length === 0) return null;
    return Math.min(...validPremiums);
  }, [offers]);

  if (!isOpen || !quote) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField((prev) => (prev === fieldName ? null : prev));
    }, 2000);
  };

  const handleOfferChange = (
    index: number,
    field: 'company' | 'premium' | 'quoteNumber' | 'notes' | 'status',
    value: any
  ) => {
    setOffers((prev) => {
      const next = [...prev];
      const cur = { ...next[index] };
      if (field === 'status') {
        const s = value as 'TEKLİF ALINDI' | 'TEKLİF ALINAMADI';
        cur.status = s;
        cur.noOffer = s === 'TEKLİF ALINAMADI';
        if (s === 'TEKLİF ALINAMADI') {
          cur.premium = '';
        }
      } else if (field === 'premium') {
        cur.premium = value;
        if (typeof value === 'number' && value > 0) {
          cur.noOffer = false;
          cur.status = 'TEKLİF ALINDI';
        }
      } else {
        (cur as any)[field] = value;
      }
      next[index] = cur;
      return next;
    });
  };

  const handleAddOfferInDetail = () => {
    const used = new Set(offers.map((o) => o.company));
    const nextComp = COMPANIES.find((c) => !used.has(c)) || COMPANIES[0];
    setOffers((prev) => [
      ...prev,
      {
        company: nextComp,
        premium: '',
        quoteNumber: '',
        notes: '',
        status: 'TEKLİF ALINDI',
        noOffer: false,
      },
    ]);
  };

  const handleRemoveOfferInDetail = (index: number) => {
    setOffers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!insured.trim()) {
      showToast('Hata: Sigortalı adı boş bırakılamaz.');
      return;
    }

    setIsSaving(true);
    try {
      // Find the primary company & premium:
      // Prefer the first slot with TEKLİF ALINDI that has a valid positive premium
      const validOffers = offers.filter(
        (o) => !o.noOffer && o.status === 'TEKLİF ALINDI' && typeof o.premium === 'number' && o.premium > 0
      );

      // Validate mandatory quote number for active offers
      const missingQuoteNo = validOffers.find((o) => !o.quoteNumber?.trim());
      if (missingQuoteNo) {
        alert(`Lütfen ${missingQuoteNo.company} teklifi için Teklif Numarasını giriniz.`);
        setIsSaving(false);
        return;
      }

      // Determine main quote company & premium
      let primaryCompany = quote.company;
      let primaryPremium = quote.premium;
      let primaryQuoteNumber = quote.quoteNumber;

      if (validOffers.length > 0) {
        const firstFilled = validOffers[0];
        primaryCompany = firstFilled.company;
        primaryPremium = Number(firstFilled.premium);
        primaryQuoteNumber = firstFilled.quoteNumber || quote.quoteNumber;
      } else if (offers.length > 0) {
        primaryCompany = offers[0].company;
        primaryPremium = 0;
        primaryQuoteNumber = offers[0].quoteNumber || quote.quoteNumber;
      }

      const isConverted = quote.outcome === 'converted' || Boolean(quote.convertedPolicyId);
      const cleanReason = isConverted ? undefined : (nonConversionReason.trim() || undefined);
      const isNegative = !isConverted && Boolean(cleanReason);

      const updatedQuote: Quote = {
        ...quote,
        insured: insured.trim(),
        businessType: businessType,
        branch: branch,
        plate: plate.trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, ''),
        licenseSerialNo: licenseSerialNo.trim().toLocaleUpperCase('tr-TR'),
        chassisNo: chassisNo.trim().toLocaleUpperCase('tr-TR'),
        engineNo: engineNo.trim().toLocaleUpperCase('tr-TR'),
        usageStyle: usageStyle.trim() || '',
        vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
        vehicleBrand: vehicleBrand.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleCode: vehicleCode.trim(),
        fuelType: fuelType.trim(),
        vehicleValue: vehicleValue !== '' && !isNaN(Number(vehicleValue)) ? Number(vehicleValue) : undefined,
        stage: stage,
        outcome: isConverted ? 'converted' : (isNegative ? 'rejected' : undefined),
        status: (isConverted || isNegative) ? 'concluded' : 'active',
        quoteStatus: isConverted ? 'kabul_edildi' : (isNegative ? 'reddedildi' : 'beklemede'),
        rejectionReason: cleanReason,
        nonConversionReason: cleanReason,
        resultDate: (isConverted || isNegative) ? (quote.resultDate || new Date().toISOString().split('T')[0]) : undefined,
        notes: notes.trim(),
        company: primaryCompany,
        premium: primaryPremium,
        quoteNumber: primaryQuoteNumber,
        issueDate: issueDate.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        quoteDate: issueDate.trim() || quote.quoteDate,
        validUntil: endDate.trim() || quote.validUntil,
        companyOffers: offers.map((o) => {
          const isNo = o.noOffer || o.status === 'TEKLİF ALINAMADI';
          return {
            company: o.company,
            premium: !isNo && typeof o.premium === 'number' && !isNaN(o.premium) && o.premium > 0 ? o.premium : undefined,
            quoteNumber: o.quoteNumber.trim() || undefined,
            notes: o.notes?.trim() || undefined,
            status: isNo ? 'TEKLİF ALINAMADI' : 'TEKLİF ALINDI',
            noOffer: isNo,
          };
        }),
        updatedAt: new Date().toISOString(),
      };

      onSave(updatedQuote);
      showToast('Teklif detayları ve şirket teklifleri başarıyla kaydedildi.');
      onClose();
    } catch (err) {
      console.error('Kaydetme hatası:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!quote) return;
    try {
      setIsGeneratingPdf(true);
      showToast('PDF raporu oluşturuluyor, lütfen bekleyin...');

      const currentQuoteData: Quote = {
        ...quote,
        insured: insured.trim() || quote.insured,
        businessType: businessType,
        branch: branch,
        plate: plate.trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '') || quote.plate,
        licenseSerialNo: licenseSerialNo.trim().toLocaleUpperCase('tr-TR'),
        chassisNo: chassisNo.trim().toLocaleUpperCase('tr-TR'),
        engineNo: engineNo.trim().toLocaleUpperCase('tr-TR'),
        usageStyle: usageStyle.trim(),
        vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
        vehicleBrand: vehicleBrand.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleCode: vehicleCode.trim(),
        fuelType: fuelType.trim(),
        vehicleValue: vehicleValue !== '' && !isNaN(Number(vehicleValue)) ? Number(vehicleValue) : undefined,
        stage: stage,
        notes: notes.trim(),
        companyOffers: offers.map((o) => {
          const isNo = o.noOffer || o.status === 'TEKLİF ALINAMADI';
          return {
            company: o.company,
            premium: !isNo && typeof o.premium === 'number' && !isNaN(o.premium) && o.premium > 0 ? o.premium : undefined,
            quoteNumber: o.quoteNumber.trim() || undefined,
            notes: o.notes?.trim() || undefined,
            status: isNo ? 'TEKLİF ALINAMADI' : 'TEKLİF ALINDI',
            noOffer: isNo,
          };
        }),
      };

      const plateSafe = (currentQuoteData.plate || 'Teklif').replace(/[^A-Za-z0-9]/g, '_');
      await generateQuotesPdfReport([currentQuoteData], {
        policies: policies || [],
        endorsements: endorsements || [],
        filename: `Teklif_Raporu_${plateSafe}.pdf`,
        includeExecutiveSummary: false,
      });

      showToast('PDF raporu başarıyla indirildi.');
    } catch (err: any) {
      console.error('PDF hatası:', err);
      showToast('PDF raporu oluşturulurken hata: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSelectOfferToConvert = (offer: { company: string; premium: number | ''; quoteNumber: string }) => {
    if (!onConvertToPolicy) return;

    const updatedQuote: Quote = {
      ...quote,
      insured: insured.trim(),
      businessType: businessType,
      branch: branch,
      plate: plate.trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, ''),
      licenseSerialNo: licenseSerialNo.trim().toLocaleUpperCase('tr-TR'),
      chassisNo: chassisNo.trim().toLocaleUpperCase('tr-TR'),
      engineNo: engineNo.trim().toLocaleUpperCase('tr-TR'),
      usageStyle: usageStyle.trim(),
      vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
      vehicleBrand: vehicleBrand.trim(),
      vehicleModel: vehicleModel.trim(),
      vehicleCode: vehicleCode.trim(),
      fuelType: fuelType.trim(),
      vehicleValue: vehicleValue !== '' && !isNaN(Number(vehicleValue)) ? Number(vehicleValue) : undefined,
      stage: stage,
      company: offer.company,
      premium: typeof offer.premium === 'number' ? offer.premium : quote.premium,
      quoteNumber: offer.quoteNumber || quote.quoteNumber,
      issueDate: issueDate.trim() || quote.issueDate,
      startDate: startDate.trim() || quote.startDate,
      endDate: endDate.trim() || quote.endDate,
      quoteDate: issueDate.trim() || quote.quoteDate,
      validUntil: endDate.trim() || quote.validUntil,
    };

    onSave(updatedQuote);
    onClose();
    onConvertToPolicy(updatedQuote);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {insured || 'Teklif Detayı'}
                </h2>
                {plate && (
                  <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 border border-slate-300 text-slate-800">
                    {plate}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {businessType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Araç bilgileri ve 6 sigorta şirketi teklif karşılaştırma tablosu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Patron/yönetici için 6 şirket teklif karşılaştırmalı PDF raporu oluştur ve indir"
            >
              <FileDown className="w-4 h-4 text-rose-600" />
              <span>{isGeneratingPdf ? 'PDF Hazırlanıyor...' : 'PDF Raporu Oluştur'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TEKLİF AŞAMASI & SONUÇ BİLGİSİ BAR */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Teklif Aşaması (Yalnızca devam eden aktif tekliflerde gösterilir) */}
            {quote.status !== 'concluded' && (
              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Teklif Aşaması *
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as QuoteStage)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                >
                  {QUOTE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Teklif Sonucu / Poliçeleştirmeme Durumu */}
            <div className="flex-1">
              {quote.outcome === 'converted' || quote.convertedPolicyId ? (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                    Teklif Nihai Sonucu
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>POLİÇELEŞTİRİLDİ (OLUMLU)</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Teklif Sonucu / Poliçeleştirmeme Nedeni
                  </label>
                  <select
                    value={nonConversionReason}
                    onChange={(e) => setNonConversionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none cursor-pointer"
                  >
                    <option value="">⏳ Henüz Sonuçlanmadı (Süreçte / Beklemede)</option>
                    {NON_CONVERSION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        ❌ {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Olumsuz Sonuçlandırma & Ret Notu Bilgilendirme Kartı */}
          {(quote.rejectionNote || quote.rejectionReason || (quote.status === 'concluded' && quote.outcome === 'rejected')) && (
            <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Olumsuz Sonuçlandırma Bilgileri</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-rose-700/80 font-medium block">Poliçeleştirmeme / Sonuç Nedeni:</span>
                  <span className="font-bold text-rose-950 mt-0.5 block">
                    ❌ {quote.nonConversionReason || quote.rejectionReason || 'Belirtilmedi'}
                  </span>
                </div>
                <div>
                  <span className="text-rose-700/80 font-medium block">Olumsuz Sonuçlandırma Notu:</span>
                  <div className="p-2.5 mt-1 bg-white rounded-xl border border-rose-200 text-rose-950 font-semibold text-xs whitespace-pre-wrap">
                    {quote.rejectionNote ? quote.rejectionNote : 'Açıklama notu girilmemiş.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: ORTAK SİGORTALI & ARAÇ BİLGİLERİ */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ortak Araç ve Sigortalı Bilgileri
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ✓ KVKK Güvenli (TCKN Tutulmaz)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* 1. Sigortalı */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  1. Sigortalı (Müşteri Adı Soyadı / Şirket) *
                </label>
                <input
                  type="text"
                  required
                  value={insured}
                  onChange={(e) => setInsured(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 2. İş Türü */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  2. İş Türü *
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                >
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Branş */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  3. Branş *
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold text-indigo-900 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Plaka */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  4. Plaka
                </label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toLocaleUpperCase('tr-TR').replace(/[ .-]/g, ''))}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 5. Ruhsat Seri No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  5. Ruhsat Seri No
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={licenseSerialNo}
                    onChange={(e) => setLicenseSerialNo(e.target.value.toLocaleUpperCase('tr-TR'))}
                    placeholder=""
                    className="w-full px-3 py-1.5 pr-7 text-xs font-semibold uppercase border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                  {licenseSerialNo && (
                    <button
                      type="button"
                      onClick={() => handleCopy(licenseSerialNo, 'ruhsat')}
                      title="Kopyala"
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-700"
                    >
                      {copiedField === 'ruhsat' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* 6. Şasi No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  6. Şasi No (17 Hane)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={25}
                    value={chassisNo}
                    onChange={(e) => setChassisNo(e.target.value.toLocaleUpperCase('tr-TR'))}
                    placeholder=""
                    className="w-full px-3 py-1.5 pr-7 text-xs font-mono font-semibold uppercase border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                  {chassisNo && (
                    <button
                      type="button"
                      onClick={() => handleCopy(chassisNo, 'sasi')}
                      title="Şasi Numarasını Kopyala"
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {copiedField === 'sasi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* 7. Motor No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  7. Motor No
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={engineNo}
                    onChange={(e) => setEngineNo(e.target.value.toLocaleUpperCase('tr-TR'))}
                    placeholder=""
                    className="w-full px-3 py-1.5 pr-7 text-xs font-mono font-semibold uppercase border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                  {engineNo && (
                    <button
                      type="button"
                      onClick={() => handleCopy(engineNo, 'motor')}
                      title="Motor Numarasını Kopyala"
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {copiedField === 'motor' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* 8. Kullanım Tarzı (Açılır Liste - Alfabetik Büyük Harf) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  8. Kullanım Tarzı
                </label>
                <select
                  value={usageStyle}
                  onChange={(e) => setUsageStyle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="">Seçiniz</option>
                  {usageStyle && !USAGE_STYLES.includes(usageStyle as any) && (
                    <option value={usageStyle}>{usageStyle}</option>
                  )}
                  {USAGE_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              {/* 9. Model Yılı */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  9. Model Yılı
                </label>
                <input
                  type="number"
                  min="1980"
                  max="2035"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value ? Number(e.target.value) : '')}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 10. Araç Marka */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  10. Araç Marka
                </label>
                <input
                  type="text"
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 11. Araç Model */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  11. Araç Model
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 12. Araç Kodu */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  12. Araç Kodu (TSB)
                </label>
                <input
                  type="text"
                  value={vehicleCode}
                  onChange={(e) => setVehicleCode(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs font-semibold font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 13. Yakıt Türü */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  13. Yakıt Türü
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="">Seçiniz</option>
                  {fuelType && !FUEL_TYPES.includes(fuelType as any) && (
                    <option value={fuelType}>{fuelType}</option>
                  )}
                  {FUEL_TYPES.map((ft) => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </select>
              </div>

              {/* 14. Araç Bedeli */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  14. {quote.originPolicyId ? 'Geçen Sene Araç Bedeli' : 'Araç Kasko Bedeli (TL)'}
                </label>
                <TurkishNumberInput
                  value={vehicleValue !== '' ? vehicleValue : undefined}
                  onChange={(num) => setVehicleValue(num !== undefined ? num : '')}
                  placeholder=""
                  decimals={0}
                  className="!text-xs !py-1.5"
                />
              </div>

              {/* Tanzim, Başlangıç ve Bitiş Tarihleri */}
              <div className="sm:col-span-2 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 mt-1 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tanzim Tarihi</span>
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>Poliçe Başlangıç Tarihi</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const s = e.target.value;
                      setStartDate(s);
                      if (s && !endDate) setEndDate(addOneYear(s));
                    }}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Poliçe Bitiş Tarihi</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SİGORTA ŞİRKETİ TEKLİFLERİ TABLOSU */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sigorta Şirketi Teklifleri ({offers.length} Şirket)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {minValidPremium !== null && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> En Düşük Prim: {formatCurrency(minValidPremium)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAddOfferInDetail}
                  className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title="Teklife yeni bir sigorta şirketi teklifi ekle"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Şirket Ekle</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[170px]">Sigorta Şirketi</th>
                    <th className="py-3 px-3 min-w-[150px]">Teklif Durumu</th>
                    <th className="py-3 px-3 min-w-[140px]">Prim (TL)</th>
                    <th className="py-3 px-3 min-w-[140px]">Teklif Numarası *</th>
                    <th className="py-3 px-3 min-w-[170px]">Teklif Notları</th>
                    <th className="py-3 px-3 min-w-[130px]">Durum / Vurgu</th>
                    <th className="py-3 px-3 text-right min-w-[110px]">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <p className="text-xs font-semibold text-slate-500">
                          Bu teklife ait eklenmiş şirket kaydı bulunmuyor.
                        </p>
                        <button
                          type="button"
                          onClick={handleAddOfferInDetail}
                          className="mt-2 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 border border-blue-200 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Şirket Teklifi Ekle</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    offers.map((offer, idx) => {
                      const isNoOffer = offer.noOffer === true || offer.status === 'TEKLİF ALINAMADI';
                      const hasPremium =
                        !isNoOffer &&
                        typeof offer.premium === 'number' &&
                        !isNaN(offer.premium) &&
                        offer.premium > 0;
                      const isLowest = hasPremium && offer.premium === minValidPremium;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isNoOffer
                              ? 'bg-rose-50/20 hover:bg-rose-50/30'
                              : isLowest
                              ? 'bg-emerald-50/50 hover:bg-emerald-50'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Sıra No */}
                          <td className="py-3 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Sigorta Şirketi */}
                          <td className="py-3 px-3">
                            <select
                              value={offer.company}
                              onChange={(e) => handleOfferChange(idx, 'company', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                            >
                              {COMPANIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Teklif Durumu (Teklif Alındı / Teklif Alınamadı) */}
                          <td className="py-3 px-3">
                            <select
                              value={isNoOffer ? 'TEKLİF ALINAMADI' : 'TEKLİF ALINDI'}
                              onChange={(e) => handleOfferChange(idx, 'status', e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border outline-none cursor-pointer transition-colors ${
                                isNoOffer
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-black'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              }`}
                            >
                              <option value="TEKLİF ALINDI">✓ Teklif Alındı</option>
                              <option value="TEKLİF ALINAMADI">❌ Teklif Alınamadı</option>
                            </select>
                          </td>

                          {/* Prim (TL) */}
                          <td className="py-3 px-3">
                            {isNoOffer ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  disabled
                                  value=""
                                  placeholder="—"
                                  className="w-full px-3 py-1.5 text-xs font-bold text-center rounded-lg border border-rose-200 bg-rose-50/40 text-rose-600 outline-none cursor-not-allowed"
                                />
                              </div>
                            ) : (
                              <TurkishNumberInput
                                value={offer.premium !== '' ? offer.premium : undefined}
                                onChange={(num) =>
                                  handleOfferChange(
                                    idx,
                                    'premium',
                                    num !== undefined ? num : ''
                                  )
                                }
                                placeholder="0,00"
                                decimals={2}
                                className={`!text-xs !py-1.5 ${
                                  isLowest
                                    ? '!border-emerald-400 bg-white text-emerald-800 focus:ring-2 focus:ring-emerald-500/20'
                                    : '!border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20'
                                }`}
                              />
                            )}
                          </td>

                          {/* Teklif Numarası */}
                          <td className="py-3 px-3">
                            <div className="relative">
                              <input
                                type="text"
                                value={offer.quoteNumber}
                                onChange={(e) => handleOfferChange(idx, 'quoteNumber', e.target.value)}
                                placeholder={isNoOffer ? '—' : ''}
                                className={`w-full px-3 py-1.5 pr-7 text-xs font-mono font-semibold border rounded-lg outline-none ${
                                  isNoOffer
                                    ? 'border-slate-200 bg-slate-50/60 text-slate-600'
                                    : 'border-slate-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                              />
                              {offer.quoteNumber && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(offer.quoteNumber, `offer-quote-${idx}`)}
                                  title="Teklif No Kopyala"
                                  className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                  {copiedField === `offer-quote-${idx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Teklif Notları */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={offer.notes || ''}
                              onChange={(e) => handleOfferChange(idx, 'notes', e.target.value)}
                              placeholder=""
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                          </td>

                          {/* Durum / Vurgu */}
                          <td className="py-3 px-3">
                            {isNoOffer ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Teklif Alınamadı</span>
                              </span>
                            ) : isLowest ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                <TrendingDown className="w-3 h-3 text-emerald-600" />
                                <span>En Uygun Teklif</span>
                              </span>
                            ) : hasPremium ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Teklif Alındı</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">—</span>
                            )}
                          </td>

                          {/* İşlem (Şirketi Kaldır) */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleRemoveOfferInDetail(idx)}
                                title="Şirketi bu tekliften kaldır"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: İŞ NOTLARI */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Görüşme ve Teklif Notları
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder=""
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {minValidPremium !== null && (
              <span>
                En Uygun Teklif:{' '}
                <strong className="text-emerald-700 font-bold text-sm">
                  {formatCurrency(minValidPremium)}
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
