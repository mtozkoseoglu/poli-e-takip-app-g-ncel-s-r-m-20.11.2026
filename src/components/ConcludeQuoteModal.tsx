import React, { useState, useEffect, useMemo } from 'react';
import { Quote, Policy, CompanyOffer, NON_CONVERSION_REASONS, COMPANIES } from '../types/insurance';
import {
  formatCurrency,
  getTodayIso,
  addDays,
  addOneYear,
  generateId,
  calculateMultiplier,
  formatMultiplier,
} from '../services/storage';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Shield,
  FileText,
  Calendar,
  Car,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onConfirmPositive: (quoteId: string, createdPolicy: Policy) => void;
  onConfirmNegative: (
    quoteId: string,
    reason: string,
    note: string,
    followUpData?: { createFollowUp: boolean; targetDate?: string }
  ) => void;
}

export type ConcludeMode = 'positive' | 'negative';

export const ConcludeQuoteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quote,
  onConfirmPositive,
  onConfirmNegative,
}) => {
  const [concludeMode, setConcludeMode] = useState<ConcludeMode>('positive');

  // Positive result state
  const [selectedOfferIndex, setSelectedOfferIndex] = useState<number>(0);
  const [policyNumber, setPolicyNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [startDate, setStartDate] = useState(getTodayIso());
  const [endDate, setEndDate] = useState(addOneYear(getTodayIso()));
  const [policyNotes, setPolicyNotes] = useState('');
  const [trafficStatus, setTrafficStatus] = useState<'TRAFİK BİZDE' | 'TRAFİK BİZDE DEĞİL'>('TRAFİK BİZDE');
  const [trafficEndDate, setTrafficEndDate] = useState('');
  const [trafficCompany, setTrafficCompany] = useState<string>(COMPANIES[0]);

  // Negative result state
  const [rejectionReason, setRejectionReason] = useState<string>(NON_CONVERSION_REASONS[0]);
  const [rejectionNote, setRejectionNote] = useState('');
  const [createNextYearFollowUp, setCreateNextYearFollowUp] = useState<boolean>(true);
  const [followUpTargetDate, setFollowUpTargetDate] = useState<string>('');

  // 1. Extract valid, real company offers for this specific quote record
  const availableOffers = useMemo(() => {
    if (!quote) return [];

    const offers: Array<{
      company: string;
      premium?: number;
      quoteNumber: string;
      notes?: string;
      isValid: boolean;
      status?: string;
    }> = [];

    // Check quote.companyOffers
    if (Array.isArray(quote.companyOffers) && quote.companyOffers.length > 0) {
      quote.companyOffers.forEach((o) => {
        const isNo = o.noOffer === true || o.status === 'teklif_alinamadi';
        const hasValidPrem = !isNo && typeof o.premium === 'number' && !isNaN(o.premium) && o.premium > 0;
        const qNum = o.quoteNumber ? String(o.quoteNumber).trim() : '';

        // If at least company is set and has some data
        if (o.company) {
          offers.push({
            company: o.company,
            premium: hasValidPrem ? Number(o.premium) : undefined,
            quoteNumber: qNum,
            notes: o.notes?.trim() || undefined,
            isValid: hasValidPrem,
            status: isNo ? 'Teklif Alınamadı' : (hasValidPrem ? 'Teklif Alındı' : 'Fiyat Belirtilmemiş'),
          });
        }
      });
    }

    // If companyOffers was empty or primary quote company is missing from offers, add primary quote
    if (offers.length === 0) {
      const hasPrem = typeof quote.premium === 'number' && quote.premium > 0;
      offers.push({
        company: quote.company,
        premium: hasPrem ? quote.premium : undefined,
        quoteNumber: quote.quoteNumber ? String(quote.quoteNumber).trim() : '',
        notes: quote.notes?.trim() || undefined,
        isValid: hasPrem,
        status: hasPrem ? 'Teklif Alındı' : 'Fiyat Belirtilmemiş',
      });
    }

    return offers;
  }, [quote]);

  // Find lowest price among valid offers to highlight
  const lowestValidPremium = useMemo(() => {
    const validPrems = availableOffers
      .filter((o) => o.isValid && typeof o.premium === 'number')
      .map((o) => o.premium as number);
    if (validPrems.length === 0) return null;
    return Math.min(...validPrems);
  }, [availableOffers]);

  const isAllianzCompany = (companyName?: string): boolean => {
    if (!companyName) return false;
    return companyName.toLocaleUpperCase('tr-TR').includes('ALLIANZ');
  };

  // Reset form when quote changes or modal opens
  useEffect(() => {
    if (quote && isOpen) {
      setConcludeMode('positive');
      const today = getTodayIso();
      const qIssue = quote.issueDate || quote.quoteDate || today;
      const qStart = quote.startDate || quote.quoteDate || today;
      const qEnd = quote.endDate || quote.validUntil || (qStart ? addOneYear(qStart) : addOneYear(today));
      setIssueDate(qIssue);
      setStartDate(qStart);
      setEndDate(qEnd);

      setTrafficStatus('TRAFİK BİZDE');
      setTrafficEndDate('');
      setTrafficCompany(COMPANIES[0]);

      // Default negative reason & follow-up options
      setRejectionReason(NON_CONVERSION_REASONS[0]);
      setRejectionNote('');
      setCreateNextYearFollowUp(true);
      const defaultNextYear = quote.endDate || quote.validUntil
        ? addOneYear(quote.endDate || quote.validUntil)
        : (quote.quoteDate ? addOneYear(quote.quoteDate) : addOneYear(today));
      setFollowUpTargetDate(defaultNextYear);

      // Find first valid offer index
      const firstValidIdx = availableOffers.findIndex((o) => o.isValid);
      const chosenIdx = firstValidIdx >= 0 ? firstValidIdx : 0;
      setSelectedOfferIndex(chosenIdx);

      const chosenOffer = availableOffers[chosenIdx];
      if (chosenOffer) {
        if (isAllianzCompany(chosenOffer.company)) {
          // Allianz exception: do NOT auto-assign quoteNumber as policy number
          setPolicyNumber('');
        } else {
          // Non-Allianz: auto-assign quoteNumber to policyNumber
          setPolicyNumber(chosenOffer.quoteNumber ? chosenOffer.quoteNumber.trim() : '');
        }
      } else {
        setPolicyNumber('');
      }

      const initialNotes = chosenOffer?.quoteNumber
        ? `${chosenOffer.quoteNumber} nolu teklif üzerinden onaylanarak tanzim edildi.`
        : `${quote.quoteNumber || 'Teklif'} üzerinden olumlu sonuçlanarak tanzim edildi.`;
      setPolicyNotes(initialNotes);
    }
  }, [quote, isOpen, availableOffers]);

  // Update policy note and policy number when user chooses another offer
  const handleSelectOffer = (idx: number) => {
    setSelectedOfferIndex(idx);
    const chosen = availableOffers[idx];
    if (chosen) {
      if (isAllianzCompany(chosen.company)) {
        // Allianz exception: do NOT auto-assign quoteNumber as policy number
        setPolicyNumber('');
      } else {
        // Non-Allianz: auto-assign quoteNumber to policyNumber
        setPolicyNumber(chosen.quoteNumber ? chosen.quoteNumber.trim() : '');
      }

      const newNote = chosen.quoteNumber
        ? `${chosen.quoteNumber} nolu teklif üzerinden onaylanarak tanzim edildi.`
        : `${quote?.quoteNumber || 'Teklif'} üzerinden onaylanarak tanzim edildi.`;
      setPolicyNotes(newNote);
    }
  };

  if (!isOpen || !quote) return null;

  // Selected company offer for policy creation
  const selectedOffer = availableOffers[selectedOfferIndex];
  const hasValidSelectedOffer = selectedOffer && selectedOffer.isValid && typeof selectedOffer.premium === 'number';

  // Live Multiplier for selected offer
  const liveMultiplier = hasValidSelectedOffer
    ? calculateMultiplier(selectedOffer.premium, quote.vehicleValue)
    : null;

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (concludeMode === 'positive') {
      // Validation for positive result
      if (!hasValidSelectedOffer || !selectedOffer) {
        alert('Lütfen geçerli bir prim tutarına sahip şirket teklifi seçiniz.');
        return;
      }
      if (!policyNumber.trim()) {
        alert('Lütfen poliçe numarasını giriniz.');
        return;
      }

      if (quote.branch === 'Kasko' && trafficStatus === 'TRAFİK BİZDE DEĞİL') {
        if (!trafficEndDate || !trafficCompany) {
          alert('Lütfen Trafik poliçesi bitiş tarihini ve sigorta şirketini eksiksiz giriniz.');
          return;
        }
      }

      if (startDate && endDate && endDate < startDate) {
        alert('Poliçe bitiş tarihi başlangıç tarihinden önce olamaz. Lütfen geçerli bir tarih aralığı giriniz.');
        return;
      }

      const vValue =
        quote.vehicleValue !== undefined && !isNaN(Number(quote.vehicleValue))
          ? Number(quote.vehicleValue)
          : undefined;

      const mult = calculateMultiplier(selectedOffer.premium, vValue);

      // Create new Policy
      const newPolicy: Policy = {
        id: generateId(),
        type: 'policy',
        insured: quote.insured.trim(),
        phone: quote.phone || '',
        email: quote.email || '',
        plate: quote.plate || '',
        licenseSerialNo: quote.licenseSerialNo || '',
        chassisNo: quote.chassisNo || '',
        engineNo: quote.engineNo || '',
        usageStyle: quote.usageStyle || '',
        vehicleBrand: quote.vehicleBrand || '',
        vehicleModel: quote.vehicleModel || '',
        vehicleCode: quote.vehicleCode || '',
        fuelType: quote.fuelType || '',
        vehicleYear: quote.vehicleYear,
        vehicleValue: vValue,
        multiplier: mult ?? undefined,
        businessType: quote.businessType || 'Yeni İş',
        company: selectedOffer.company,
        branch: quote.branch,
        policyNumber: policyNumber.trim(),
        issueDate: issueDate.trim() || undefined,
        startDate: startDate.trim() || getTodayIso(),
        endDate: endDate.trim() || addOneYear(startDate || getTodayIso()),
        originalPremium: Number(selectedOffer.premium),
        currentPremium: Number(selectedOffer.premium),
        totalAdditionalPremium: 0,
        totalRefundPremium: 0,
        premium: Number(selectedOffer.premium),
        status: 'Portföyde',
        stage: 'Yürürlükte',
        originQuoteId: quote.id,
        trafficStatus: quote.branch === 'Kasko' ? trafficStatus : undefined,
        trafficEndDate: quote.branch === 'Kasko' && trafficStatus === 'TRAFİK BİZDE DEĞİL' ? trafficEndDate : undefined,
        trafficCompany: quote.branch === 'Kasko' && trafficStatus === 'TRAFİK BİZDE DEĞİL' ? trafficCompany : undefined,
        notes: policyNotes.trim(),
        followDate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onConfirmPositive(quote.id, newPolicy);
      onClose();
    } else {
      // Validation for negative result
      if (!rejectionReason.trim()) {
        alert('Lütfen teklifin poliçeleştirmeme nedenini seçiniz.');
        return;
      }

      onConfirmNegative(quote.id, rejectionReason, rejectionNote.trim(), {
        createFollowUp: createNextYearFollowUp,
        targetDate: followUpTargetDate.trim() || undefined,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 text-white transition-colors ${
            concludeMode === 'positive' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              {concludeMode === 'positive' ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <XCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">Teklifi Sonuçlandır</h2>
              <p className="text-xs text-white/90">
                {concludeMode === 'positive'
                  ? 'Teklifi şirket seçimiyle onaylayıp poliçeye dönüştürün'
                  : 'Poliçeleştirilmeyen teklif için sonuç nedenini belirterek arşivleyin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Quote & Vehicle Summary Identification Box */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sonuçlandırılan Müşteri & Araç:
              </div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <span>{quote.insured}</span>
                {quote.plate && (
                  <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                    {quote.plate}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2 mt-1 flex-wrap">
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {quote.branch}
                </span>
                {(quote.vehicleBrand || quote.vehicleModel) && (
                  <span>
                    {[quote.vehicleYear, quote.vehicleBrand, quote.vehicleModel].filter(Boolean).join(' ')}
                  </span>
                )}
                {quote.quoteNumber && (
                  <span className="text-slate-400 font-mono">({quote.quoteNumber})</span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              {quote.vehicleValue && quote.vehicleValue > 0 ? (
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Araç Bedeli: </span>
                  <span className="font-bold text-slate-800 text-xs">
                    {formatCurrency(quote.vehicleValue)}
                  </span>
                </div>
              ) : null}
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Önerilen Prim: </span>
                <span className="font-black text-slate-900 text-sm">
                  {formatCurrency(quote.premium)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Decision Mode Selection (Olumlu / Olumsuz) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Sonuç Türü *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Olumlu — Poliçeleştir */}
              <button
                type="button"
                onClick={() => setConcludeMode('positive')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  concludeMode === 'positive'
                    ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    concludeMode === 'positive' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Olumlu — Poliçeleştir
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Müşteri teklifi kabul etti. Şirket teklifini seçerek poliçeyi tanzim edin.
                  </div>
                </div>
              </button>

              {/* Option 2: Olumsuz — Poliçeleştirmeden Sonuçlandır */}
              <button
                type="button"
                onClick={() => setConcludeMode('negative')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  concludeMode === 'negative'
                    ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    concludeMode === 'negative' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Olumsuz — Poliçeleştirmeden Sonuçlandır
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Poliçe oluşturulmayacak; neden belirtilerek Sonuçlananlar'a aktarılacak.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION A: OLUMLU SONUÇ (POLİÇELEŞTİR)                                    */}
          {/* ========================================================================= */}
          {concludeMode === 'positive' && (
            <div className="space-y-6">
              {/* Şirket Teklifleri Karşılaştırma & Seçim */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>1. Poliçeleştirilecek Şirket Teklifini Seçin *</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bu araç için girilen şirket teklifleri. Poliçeleştirmek istediğiniz teklifi işaretleyiniz.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {availableOffers.filter((o) => o.isValid).length} Geçerli Teklif
                  </span>
                </div>

                {/* Warning if no valid offers exist */}
                {availableOffers.filter((o) => o.isValid).length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">Bu teklif kaydında henüz geçerli şirket teklifi bulunamadı!</div>
                      <div className="text-xs mt-1 text-amber-800">
                        Poliçe oluşturabilmek için en az bir şirketin prim ve teklif numarasının girilmiş olması gerekir.
                        Lütfen bu pencereyi kapatıp Teklif Detayı ekranından şirket tekliflerini doldurunuz.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {availableOffers.map((offer, idx) => {
                      const isSelected = selectedOfferIndex === idx;
                      const isLowest = lowestValidPremium !== null && offer.premium === lowestValidPremium;

                      return (
                        <div
                          key={`${offer.company}-${idx}`}
                          onClick={() => {
                            if (offer.isValid) handleSelectOffer(idx);
                          }}
                          className={`p-3.5 rounded-xl border transition-all relative ${
                            !offer.isValid
                              ? 'opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-500/20 shadow-xs cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="selectedCompanyOffer"
                                checked={isSelected}
                                disabled={!offer.isValid}
                                onChange={() => handleSelectOffer(idx)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div>
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{offer.company}</span>
                                  {isLowest && offer.isValid && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      EN UYGUN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {offer.quoteNumber ? `Teklif No: ${offer.quoteNumber}` : 'Teklif No: Belirtilmemiş'}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              {offer.isValid && typeof offer.premium === 'number' ? (
                                <div className="text-sm font-black text-slate-900">
                                  {formatCurrency(offer.premium)}
                                </div>
                              ) : (
                                <div className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {offer.status || 'Teklif Yok'}
                                </div>
                              )}
                            </div>
                          </div>

                          {offer.notes && (
                            <div className="text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100 truncate" title={offer.notes}>
                              Not: {offer.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Poliçe Tanzim Detayları */}
              {hasValidSelectedOffer && selectedOffer && (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>2. Poliçe Tanzim Bilgileri</span>
                  </h3>

                  {/* Auto-filled Summary Bar */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Seçilen Şirket
                      </div>
                      <div className="text-sm font-bold text-slate-900">{selectedOffer.company}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {selectedOffer.quoteNumber ? `Ref Teklif: ${selectedOffer.quoteNumber}` : 'Teklif No Belirtilmedi'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      {liveMultiplier !== null ? (
                        <div className="bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                          <div className="text-[10px] font-bold text-emerald-800">Çarpan (Prim / Bedel)</div>
                          <div className="font-mono font-black text-emerald-900 text-sm">
                            {formatMultiplier(liveMultiplier)}
                          </div>
                        </div>
                      ) : null}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Poliçe Primi
                        </div>
                        <div className="text-lg font-black text-emerald-700">
                          {formatCurrency(selectedOffer.premium || 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form fields: Poliçe No, Tanzim Tarihi, Başlangıç Tarihi, Bitiş Tarihi */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className={selectedOffer && isAllianzCompany(selectedOffer.company) ? 'md:col-span-4' : 'md:col-span-1'}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Poliçe Numarası *
                        </label>
                        {selectedOffer && !isAllianzCompany(selectedOffer.company) && selectedOffer.quoteNumber && (
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            ✓ Teklif no aktarıldı
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value)}
                        placeholder={
                          selectedOffer && isAllianzCompany(selectedOffer.company)
                            ? 'Örn: Allianz Poliçe No giriniz...'
                            : (selectedOffer?.quoteNumber ? selectedOffer.quoteNumber : 'Örn: Poliçe No giriniz...')
                        }
                        className={`w-full px-3 py-2 text-xs font-mono font-bold border rounded-xl outline-none transition-all ${
                          selectedOffer && isAllianzCompany(selectedOffer.company)
                            ? 'border-amber-400 bg-amber-50/20 text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                            : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                        }`}
                      />

                      {/* Allianz Sigorta İstisnası Bilgilendirme Mesajı */}
                      {selectedOffer && isAllianzCompany(selectedOffer.company) && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-2.5 shadow-2xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-bold text-amber-900 block">
                              Allianz Sigorta Bilgilendirmesi:
                            </span>
                            Allianz Sigorta'da teklif numarası ile poliçe numarası farklı olabilir. Lütfen poliçe numarasını kontrol ederek güncelleyin.
                            {selectedOffer.quoteNumber && (
                              <span className="block mt-0.5 text-amber-800 text-[11px] font-mono">
                                (Kayıtlı Allianz Teklif No: {selectedOffer.quoteNumber})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tanzim Tarihi</span>
                      </label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>Başlangıç Tarihi *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => {
                          const s = e.target.value;
                          setStartDate(s);
                          if (s) setEndDate(addOneYear(s));
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Bitiş Tarihi *</span>
                        </label>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                          1 Yıl
                        </span>
                      </div>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-slate-800 bg-emerald-50/20"
                      />
                    </div>
                  </div>

                  {/* Kasko Çapraz Satış / Portföy Durumu */}
                  {quote.branch === 'Kasko' && (
                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Portföy Durumu (Trafik Çapraz Satış) *
                        </label>
                        <div className="flex items-center gap-3">
                          <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                            trafficStatus === 'TRAFİK BİZDE'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="concludeTrafficStatus"
                              value="TRAFİK BİZDE"
                              checked={trafficStatus === 'TRAFİK BİZDE'}
                              onChange={() => setTrafficStatus('TRAFİK BİZDE')}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>✓ TRAFİK BİZDE</span>
                          </label>
                          <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                            trafficStatus === 'TRAFİK BİZDE DEĞİL'
                              ? 'bg-amber-50 border-amber-500 text-amber-900'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}>
                            <input
                              type="radio"
                              name="concludeTrafficStatus"
                              value="TRAFİK BİZDE DEĞİL"
                              checked={trafficStatus === 'TRAFİK BİZDE DEĞİL'}
                              onChange={() => setTrafficStatus('TRAFİK BİZDE DEĞİL')}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>⚠️ TRAFİK BİZDE DEĞİL</span>
                          </label>
                        </div>
                      </div>

                      {trafficStatus === 'TRAFİK BİZDE DEĞİL' && (
                        <div className="pt-2 border-t border-indigo-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Trafik Poliçesi Bitiş Tarihi *
                            </label>
                            <input
                              type="date"
                              required
                              value={trafficEndDate}
                              onChange={(e) => setTrafficEndDate(e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Trafik Sigorta Şirketi *
                            </label>
                            <select
                              required
                              value={trafficCompany}
                              onChange={(e) => setTrafficCompany(e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                            >
                              {COMPANIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Poliçe Notu */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Poliçe Notu
                    </label>
                    <textarea
                      rows={2}
                      value={policyNotes}
                      onChange={(e) => setPolicyNotes(e.target.value)}
                      placeholder="Poliçe ile ilgili acente notları..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION B: OLUMSUZ SONUÇ (POLİÇELEŞTİRMEDEN SONUÇLANDIR)                  */}
          {/* ========================================================================= */}
          {concludeMode === 'negative' && (
            <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  Poliçeleştirmeme Bilgileri
                </h3>
              </div>

              {/* Poliçeleştirmeme Nedeni (ZORUNLU) */}
              <div>
                <label className="block text-xs font-bold text-rose-900 mb-1">
                  Poliçeleştirmeme Nedeni *
                </label>
                <select
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-bold border border-rose-300 rounded-xl bg-white text-rose-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none cursor-pointer"
                >
                  {NON_CONVERSION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      ❌ {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Açıklama / Müşteri Geri Bildirimi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Açıklama / Müşteri Geri Bildirimi
                </label>
                <textarea
                  rows={3}
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none bg-white"
                />
              </div>

              {/* Gelecek Yıl İçin Takip Seçeneği */}
              <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>Bu teklifi gelecek yıl için takibe almak ister misiniz?</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        createNextYearFollowUp
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="nextYearFollowUp"
                        checked={createNextYearFollowUp}
                        onChange={() => setCreateNextYearFollowUp(true)}
                        className="sr-only"
                      />
                      <span>✓ Evet, takibe al</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        !createNextYearFollowUp
                          ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="nextYearFollowUp"
                        checked={!createNextYearFollowUp}
                        onChange={() => setCreateNextYearFollowUp(false)}
                        className="sr-only"
                      />
                      <span>✕ Hayır</span>
                    </label>
                  </div>
                </div>

                {createNextYearFollowUp && (
                  <div className="pt-2 border-t border-purple-200/60">
                    <label className="block text-xs font-semibold text-purple-900 mb-1">
                      Hedef Takip Tarihi *
                    </label>
                    <input
                      type="date"
                      required={createNextYearFollowUp}
                      value={followUpTargetDate}
                      onChange={(e) => setFollowUpTargetDate(e.target.value)}
                      className="w-full sm:w-60 px-3 py-2 text-xs border border-purple-300 bg-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none font-bold text-slate-800"
                    />
                    <p className="text-[11px] text-purple-700 mt-1">
                      Müşteri, plaka ve araç bilgileri korunarak belirtilen tarihte Takiptekiler listesine yenileme takibi olarak kaydedilecektir.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  Bu teklif için <strong>hiçbir poliçe oluşturulmayacak</strong>, kayıt Sonuçlananlar
                  sekmesinde "Poliçeleşmedi" olarak arşivlenecektir. Mevcut şirket teklifleri ve geçmiş prim
                  bilgileri kesinlikle silinmez.
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>

            {concludeMode === 'positive' ? (
              <button
                type="submit"
                disabled={!hasValidSelectedOffer || !policyNumber.trim()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Poliçeyi Oluştur ve Sonuçlandır</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!rejectionReason.trim()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Olumsuz Olarak Sonuçlandır</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
