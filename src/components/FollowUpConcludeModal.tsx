import React, { useState, useEffect, useMemo } from 'react';
import { Quote, Policy, COMPANIES } from '../types/insurance';
import {
  getTodayIso,
  addOneYear,
  formatDateTr,
  parseNumberTr,
  formatNumberTr,
  formatCurrency,
} from '../services/storage';
import {
  X,
  CheckCircle2,
  XCircle,
  Calendar,
  Building2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ArrowRight,
  Shield,
  FileCheck,
  FileText,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  followUpQuote: Quote | null;
  quotes: Quote[];
  onConfirmPositive: (quoteId: string, createdPolicy: Policy) => void;
  onDropFollowUp: (quoteId: string) => void;
  onRescheduleFollowUp: (quoteId: string, newCompany: string, newEndDate: string) => void;
  onStartQuoteForFollowUp?: (followUpQuote: Quote) => void;
}

export type FollowUpConcludeTab = 'select' | 'positive' | 'reschedule';

export interface WorkedOfferOption {
  id: string;
  quoteId: string;
  quoteNumber: string;
  company: string;
  premium: number;
  quoteDate?: string;
  notes?: string;
}

export const FollowUpConcludeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  followUpQuote,
  quotes,
  onConfirmPositive,
  onDropFollowUp,
  onRescheduleFollowUp,
  onStartQuoteForFollowUp,
}) => {
  const [tab, setTab] = useState<FollowUpConcludeTab>('select');

  // Selected worked offer
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');

  // Positive Conclusion State
  const [positiveCompany, setPositiveCompany] = useState<string>(COMPANIES[0]);
  const [policyNumber, setPolicyNumber] = useState('');
  const [premiumStr, setPremiumStr] = useState('');
  const [issueDate, setIssueDate] = useState(getTodayIso());
  const [startDate, setStartDate] = useState(getTodayIso());
  const [endDate, setEndDate] = useState(addOneYear(getTodayIso()));
  const [positiveNotes, setPositiveNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Negative Conclusion -> Reschedule (Takibe Al) State
  const [rescheduleCompany, setRescheduleCompany] = useState<string>(COMPANIES[0]);
  const [rescheduleEndDate, setRescheduleEndDate] = useState('');

  // Drop confirmation dialog state
  const [showDropConfirm, setShowDropConfirm] = useState(false);

  // Extract all worked offers/quotes linked to this follow-up item
  const availableWorkedOffers: WorkedOfferOption[] = useMemo(() => {
    if (!followUpQuote) return [];

    const cleanFollowPlate = followUpQuote.plate
      ? followUpQuote.plate.replace(/\s+/g, '').toLocaleUpperCase('tr-TR')
      : '';
    const followInsured = followUpQuote.insured.trim().toLocaleLowerCase('tr-TR');
    const followBranch = followUpQuote.branch.trim().toLocaleLowerCase('tr-TR');

    const options: WorkedOfferOption[] = [];

    // 1. Check if followUpQuote itself has worked offers
    if (Array.isArray(followUpQuote.companyOffers) && followUpQuote.companyOffers.length > 0) {
      followUpQuote.companyOffers.forEach((o, idx) => {
        const isNoOffer = o.noOffer === true || o.status === 'TEKLİF ALINAMADI' || o.status === 'teklif_alinamadi';
        if (!isNoOffer && typeof o.premium === 'number' && o.premium > 0) {
          options.push({
            id: `self-offer-${idx}`,
            quoteId: followUpQuote.id,
            quoteNumber: o.quoteNumber || followUpQuote.quoteNumber || `TK-${followUpQuote.id}`,
            company: o.company,
            premium: o.premium,
            quoteDate: followUpQuote.quoteDate,
            notes: o.notes || followUpQuote.notes,
          });
        }
      });
    } else if (followUpQuote.premium && Number(followUpQuote.premium) > 0) {
      options.push({
        id: `self-main`,
        quoteId: followUpQuote.id,
        quoteNumber: followUpQuote.quoteNumber || `TK-${followUpQuote.id}`,
        company: followUpQuote.company,
        premium: Number(followUpQuote.premium),
        quoteDate: followUpQuote.quoteDate,
        notes: followUpQuote.notes,
      });
    }

    // 2. Search other quotes that link to this follow-up
    quotes.forEach((q) => {
      if (q.id === followUpQuote.id) return; // already checked

      const isDirectChild = q.originQuoteId === followUpQuote.id;
      const isDirectParent = followUpQuote.originQuoteId && q.id === followUpQuote.originQuoteId;
      const qPlate = q.plate ? q.plate.replace(/\s+/g, '').toLocaleUpperCase('tr-TR') : '';
      const isPlateMatch = cleanFollowPlate && qPlate && cleanFollowPlate === qPlate && q.branch.trim().toLocaleLowerCase('tr-TR') === followBranch;
      const isInsuredMatch = !cleanFollowPlate && q.insured.trim().toLocaleLowerCase('tr-TR') === followInsured && q.branch.trim().toLocaleLowerCase('tr-TR') === followBranch;

      const isEligible = (isDirectChild || isDirectParent || isPlateMatch || isInsuredMatch) && q.businessType !== 'Takip';

      if (isEligible) {
        // Collect from company offers
        if (Array.isArray(q.companyOffers) && q.companyOffers.length > 0) {
          q.companyOffers.forEach((o, idx) => {
            const isNoOffer = o.noOffer === true || o.status === 'TEKLİF ALINAMADI' || o.status === 'teklif_alinamadi';
            if (!isNoOffer && typeof o.premium === 'number' && o.premium > 0) {
              options.push({
                id: `q-${q.id}-offer-${idx}`,
                quoteId: q.id,
                quoteNumber: o.quoteNumber || q.quoteNumber || `TK-${q.id}`,
                company: o.company,
                premium: o.premium,
                quoteDate: q.quoteDate,
                notes: o.notes || q.notes,
              });
            }
          });
        }

        // If no offers array, but primary premium exists
        if (q.premium && Number(q.premium) > 0) {
          const alreadyAdded = options.some((opt) => opt.quoteId === q.id && opt.company === q.company);
          if (!alreadyAdded) {
            options.push({
              id: `q-${q.id}-main`,
              quoteId: q.id,
              quoteNumber: q.quoteNumber || `TK-${q.id}`,
              company: q.company,
              premium: Number(q.premium),
              quoteDate: q.quoteDate,
              notes: q.notes,
            });
          }
        }
      }
    });

    return options;
  }, [followUpQuote, quotes]);

  useEffect(() => {
    if (followUpQuote) {
      setTab('select');
      setShowDropConfirm(false);
      setFormError(null);

      // Default values for Positive Conclusion
      const branchPrefix = (followUpQuote.branch || 'POL').substring(0, 3).toUpperCase();
      setPolicyNumber(`${branchPrefix}-${Math.floor(100000 + Math.random() * 900000)}-${new Date().getFullYear()}`);
      setIssueDate(getTodayIso());

      // If available worked offers exist, select the first one by default
      if (availableWorkedOffers.length > 0) {
        const first = availableWorkedOffers[0];
        setSelectedOfferId(first.id);
        setPositiveCompany(first.company);
        setPremiumStr(formatNumberTr(first.premium, 2));
      } else {
        setSelectedOfferId('');
        setPositiveCompany(followUpQuote.company || COMPANIES[0]);
        setPremiumStr(followUpQuote.premium ? formatNumberTr(followUpQuote.premium, 2) : '');
      }

      const initStart = followUpQuote.startDate || getTodayIso();
      const initEnd = followUpQuote.endDate || followUpQuote.validUntil || addOneYear(initStart);
      setStartDate(initStart);
      setEndDate(initEnd);
      setPositiveNotes(`Takip kaydından (${followUpQuote.quoteNumber || 'TKP'}) olumlu sonuçlanarak tanzim edildi.`);

      // Default values for Reschedule (Takibe Al)
      setRescheduleCompany(followUpQuote.company || COMPANIES[0]);
      const prevEnd = followUpQuote.endDate || followUpQuote.validUntil;
      const suggestedNextEnd = prevEnd ? addOneYear(prevEnd) : addOneYear(getTodayIso());
      setRescheduleEndDate(suggestedNextEnd);
    }
  }, [followUpQuote, isOpen, availableWorkedOffers]);

  if (!isOpen || !followUpQuote) return null;

  // Select an offer from the worked offers list
  const handleSelectOffer = (offer: WorkedOfferOption) => {
    setSelectedOfferId(offer.id);
    setPositiveCompany(offer.company);
    setPremiumStr(formatNumberTr(offer.premium, 2));
    setFormError(null);
  };

  // Handle positive submission (Create Policy)
  const handlePositiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (availableWorkedOffers.length === 0) {
      setFormError('Bu takip kaydına ait çalışılmış teklif bulunmamaktadır. Poliçeleştirme yapabilmek için önce teklif çalışmalısınız.');
      return;
    }

    const selectedOffer = availableWorkedOffers.find((o) => o.id === selectedOfferId) || availableWorkedOffers[0];
    if (!selectedOffer) {
      setFormError('Lütfen poliçeleştirilecek çalışılmış teklifi seçiniz.');
      return;
    }

    if (!policyNumber.trim()) {
      setFormError('Lütfen poliçe numarasını giriniz.');
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setFormError('Poliçe bitiş tarihi, başlangıç tarihinden önce olamaz.');
      return;
    }

    const parsedPrem = parseNumberTr(premiumStr) ?? selectedOffer.premium ?? 0;

    const newPolicy: Policy = {
      id: 'pol-' + Math.floor(100000 + Math.random() * 900000) + '-' + Date.now().toString(36),
      type: 'policy',
      insured: followUpQuote.insured,
      phone: followUpQuote.phone,
      email: followUpQuote.email,
      plate: followUpQuote.plate,
      licenseSerialNo: followUpQuote.licenseSerialNo,
      chassisNo: followUpQuote.chassisNo,
      engineNo: followUpQuote.engineNo,
      usageStyle: followUpQuote.usageStyle,
      vehicleBrand: followUpQuote.vehicleBrand,
      vehicleModel: followUpQuote.vehicleModel,
      vehicleYear: followUpQuote.vehicleYear,
      vehicleCode: followUpQuote.vehicleCode,
      fuelType: followUpQuote.fuelType,
      vehicleValue: followUpQuote.vehicleValue,
      company: positiveCompany || selectedOffer.company,
      branch: followUpQuote.branch || 'Trafik',
      policyNumber: policyNumber.trim(),
      issueDate: issueDate || getTodayIso(),
      startDate,
      endDate,
      originalPremium: parsedPrem,
      currentPremium: parsedPrem,
      totalAdditionalPremium: 0,
      totalRefundPremium: 0,
      premium: parsedPrem,
      status: 'Portföyde',
      stage: 'Yürürlükte',
      businessType: 'Takip',
      notes: positiveNotes,
      originQuoteId: selectedOffer.quoteId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onConfirmPositive(followUpQuote.id, newPolicy);
    onClose();
  };

  // Handle negative: Takibe Al (Reschedule)
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!rescheduleEndDate) {
      setFormError('Lütfen yeni poliçe bitiş tarihini giriniz.');
      return;
    }

    onRescheduleFollowUp(followUpQuote.id, rescheduleCompany, rescheduleEndDate);
    onClose();
  };

  // Handle negative: Takibi Bırak (Drop/Delete)
  const handleDropConfirm = () => {
    onDropFollowUp(followUpQuote.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Takip İşini Sonuçlandır</h2>
              <p className="text-xs text-slate-500">
                {followUpQuote.insured} {followUpQuote.plate ? `· ${followUpQuote.plate}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 pt-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs flex-wrap gap-2">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Müşteri & Branş</span>
              <span className="font-bold text-slate-900">
                {followUpQuote.insured} ({followUpQuote.branch})
              </span>
            </div>
            {followUpQuote.plate && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Plaka</span>
                <span className="font-mono font-bold text-slate-800">{followUpQuote.plate}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mevcut Vade</span>
              <span className="font-bold text-amber-700">
                {formatDateTr(followUpQuote.endDate || followUpQuote.validUntil || '')}
              </span>
            </div>
          </div>
        </div>

        {/* Tab 1: Selection View */}
        {tab === 'select' && !showDropConfirm && (
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 font-medium">
              Bu takip işi için sonuçlandırma türünü seçiniz:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Olumlu Sonuçlandır (Poliçeleştir) */}
              <button
                type="button"
                onClick={() => setTab('positive')}
                className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-950 group-hover:text-emerald-700 transition-colors">
                    Olumlu Sonuçlandır (Poliçeleştir)
                  </h3>
                  <p className="text-xs text-emerald-800/80 mt-1">
                    Müşteri teklifi kabul etti. Çalışılmış tekliflerden biri seçilerek poliçeye dönüştürülür.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <span>Teklif Seç & Poliçeleştir</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option B: Olumsuz Sonuçlandır */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold mb-3">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Olumsuz Sonuçlandır
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Müşteri poliçeyi bizden yaptırmadı. Gelecek yıla takibe alabilir veya takibi bırakabilirsiniz.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                  <button
                    type="button"
                    onClick={() => setTab('reschedule')}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Takibe Al (Gelecek Yıl)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDropConfirm(true)}
                    className="w-full px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Takibi Bırak (Kayıt Sil)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Positive Form (Poliçeleştir with Worked Quotes Picker) */}
        {tab === 'positive' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Çalışılmış Teklif Seçimi ve Poliçeleştirme</span>
              </span>
              <button
                type="button"
                onClick={() => setTab('select')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Geri Dön
              </button>
            </div>

            {/* CASE 1: No worked quotes exist for this follow-up */}
            {availableWorkedOffers.length === 0 ? (
              <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-950">Çalışılmış Teklif Bulunamadı</h4>
                    <p className="text-xs text-amber-900/90 mt-1.5 leading-relaxed">
                      Bu takip kaydına ait henüz çalışılmış bir teklif bulunmamaktadır.
                      Poliçeleştirme işlemine devam edebilmek için lütfen önce bu iş için sigorta şirketlerinden teklif çalışması yapınız.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setTab('select')}
                    className="text-xs font-semibold text-amber-800 hover:text-amber-950 cursor-pointer"
                  >
                    ← Geri Dön
                  </button>
                  {onStartQuoteForFollowUp && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onStartQuoteForFollowUp(followUpQuote);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Bu Takip İçin Teklif Çalış</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* CASE 2: Worked quotes exist -> User selects one to convert */
              <form onSubmit={handlePositiveSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Worked Offers List */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    Kabul Edilen / Çalışılmış Teklifi Seçiniz ({availableWorkedOffers.length} Teklif Mevcut) *
                  </label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {availableWorkedOffers.map((offer) => {
                      const isSelected = selectedOfferId === offer.id;
                      return (
                        <div
                          key={offer.id}
                          onClick={() => handleSelectOffer(offer)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{offer.company}</span>
                                {offer.quoteNumber && (
                                  <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {offer.quoteNumber}
                                  </span>
                                )}
                              </div>
                              {offer.notes && (
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{offer.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-black text-sm text-emerald-700">
                              {formatCurrency(offer.premium)}
                            </div>
                            {offer.quoteDate && (
                              <div className="text-[10px] text-slate-400">
                                {formatDateTr(offer.quoteDate)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Policy Conversion Fields */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">Düzenlenecek Poliçe Bilgileri</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Sigorta Şirketi */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sigorta Şirketi *</label>
                      <select
                        value={positiveCompany}
                        onChange={(e) => setPositiveCompany(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none font-semibold cursor-pointer"
                      >
                        {COMPANIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Poliçe Numarası */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Poliçe Numarası *</label>
                      <input
                        type="text"
                        required
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl outline-none"
                      />
                    </div>

                    {/* Tanzim Tarihi */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Tanzim Tarihi *</label>
                      <input
                        type="date"
                        required
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                      />
                    </div>

                    {/* Prim TL */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Poliçe Primi (TL) *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={premiumStr}
                          onChange={(e) => setPremiumStr(e.target.value)}
                          onBlur={() => {
                            const parsed = parseNumberTr(premiumStr);
                            if (parsed !== null && !isNaN(parsed)) {
                              setPremiumStr(formatNumberTr(parsed, 2));
                            }
                          }}
                          placeholder="0,00"
                          className="w-full px-3 py-2 pl-7 text-xs font-bold text-slate-900 border border-slate-300 rounded-xl outline-none"
                        />
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₺</span>
                      </div>
                    </div>

                    {/* Başlangıç Tarihi */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Başlangıç Tarihi *</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setStartDate(newStart);
                          if (newStart) {
                            setEndDate(addOneYear(newStart));
                          }
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                      />
                    </div>

                    {/* Bitiş Tarihi */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bitiş Tarihi *</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                      />
                    </div>

                    {/* Notlar */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Poliçe Notu (İsteğe bağlı)</label>
                      <textarea
                        rows={2}
                        value={positiveNotes}
                        onChange={(e) => setPositiveNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTab('select')}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Poliçeyi Kaydet ve Sonuçlandır</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Negative -> Reschedule Form (Takibe Al) */}
        {tab === 'reschedule' && (
          <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-blue-600" />
                <span>Yeniden Takibe Al (Gelecek Dönem)</span>
              </span>
              <button
                type="button"
                onClick={() => setTab('select')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Geri Dön
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Müşteri bu poliçeyi başka yerden yaptırdıysa, bir sonraki vade için takibi sürdürmek amacıyla sigorta şirketini ve yeni poliçe bitiş tarihini giriniz:
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Müşterinin Yaptırdığı Şirket</label>
                <select
                  value={rescheduleCompany}
                  onChange={(e) => setRescheduleCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none font-medium cursor-pointer"
                >
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Yeni Bitiş (Takip) Tarihi *</label>
                <input
                  type="date"
                  required
                  value={rescheduleEndDate}
                  onChange={(e) => setRescheduleEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Önerilen tarih: Önceki vadenin 1 yıl sonrasıdır ({formatDateTr(rescheduleEndDate)}).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTab('select')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Gelecek Yıla Takip Oluştur</span>
              </button>
            </div>
          </form>
        )}

        {/* Drop Confirmation Dialog */}
        {showDropConfirm && (
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Takibi Bırakmak İstiyor Musunuz?</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                "{followUpQuote.insured}" müşterisine ait {followUpQuote.branch} takip kaydı silinecek ve aktif takipten çıkarılacaktır. Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDropConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                İptal Et
              </button>
              <button
                type="button"
                onClick={handleDropConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Evet, Takibi Bırak ve Sil</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
