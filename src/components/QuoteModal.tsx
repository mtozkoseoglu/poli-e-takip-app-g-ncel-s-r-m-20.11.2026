import React, { useState, useEffect, useMemo } from 'react';
import {
  Quote,
  Policy,
  COMPANIES,
  BRANCHES,
  AlternativeQuote,
  BUSINESS_TYPES,
  BusinessType,
  USAGE_STYLES,
  FUEL_TYPES,
  NON_CONVERSION_REASONS,
  CompanyOffer,
} from '../types/insurance';
import {
  getTodayIso,
  addDays,
  addOneYear,
  subtractOneYear,
  generateId,
  isStandardCompany,
  normalizeQuoteStage,
  formatNumberTr,
  parseNumberTr,
  calculateMultiplier,
  formatMultiplier,
  formatCurrency,
  formatDateTr,
} from '../services/storage';
import { X, Plus, Trash2, Shield, FileText, AlertTriangle, Check, Edit2, XCircle, Calendar, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { parseDoganiumText } from '../services/doganiumParser';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => void;
  onDelete?: (id: string) => void;
  onConvertToPolicy?: (quote: Quote) => void;
  onConcludeNegative?: (quote: Quote) => void;
  initialQuote?: Quote | null;
  quotes?: Quote[];
  policies?: Policy[];
  isFollowUpView?: boolean;
}

interface AccumulatedOfferItem {
  company: string;
  quoteNumber: string;
  premium: number | null;
  notes?: string;
  status: 'TEKLİF ALINDI' | 'TEKLİF ALINAMADI';
}

export const QuoteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onConvertToPolicy,
  onConcludeNegative,
  initialQuote,
  quotes,
  policies,
  isFollowUpView,
}) => {
  const [formData, setFormData] = useState<Partial<Quote>>({
    insured: '',
    branch: 'Kasko',
    businessType: 'Yenileme',
    phone: '',
    email: '',
    plate: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleDetail: '',
    quoteDate: getTodayIso(),
    validUntil: addDays(15),
    stage: 'MÜŞTERİYE SUNULACAK',
    notes: '',
    followDate: '',
  });

  // Turkish formatted string states for vehicle value input
  const [vehicleValueStr, setVehicleValueStr] = useState<string>('');

  // Multi-company offers accumulated state
  const [accumulatedOffers, setAccumulatedOffers] = useState<AccumulatedOfferItem[]>([]);

  // The 4 input fields for company offer entry
  const [offerCompany, setOfferCompany] = useState<string>(COMPANIES[0]);
  const [offerQuoteNumber, setOfferQuoteNumber] = useState<string>('');
  const [offerPremiumStr, setOfferPremiumStr] = useState<string>('');
  const [offerNotes, setOfferNotes] = useState<string>('');
  const [editingOfferIndex, setEditingOfferIndex] = useState<number | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Doğanium text paste state (only used in Takip detail)
  const [doganiumPasteText, setDoganiumPasteText] = useState<string>('');
  const [doganiumParseMessage, setDoganiumParseMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Cross-sell states
  const [trafficStatus, setTrafficStatus] = useState<'TRAFİK BİZDE' | 'TRAFİK BİZDE DEĞİL'>('TRAFİK BİZDE');
  const [trafficEndDate, setTrafficEndDate] = useState<string>('');
  const [trafficCompany, setTrafficCompany] = useState<string>(COMPANIES[0]);

  const [kaskoStatus, setKaskoStatus] = useState<'KASKO BİZDE' | 'KASKO BİZDE DEĞİL'>('KASKO BİZDE');
  const [kaskoEndDate, setKaskoEndDate] = useState<string>('');
  const [kaskoCompany, setKaskoCompany] = useState<string>(COMPANIES[0]);

  // Section 1: Date states (Tanzim, Başlangıç, Bitiş Tarihi)
  const [issueDate, setIssueDate] = useState<string>(getTodayIso());
  const [startDate, setStartDate] = useState<string>(getTodayIso());
  const [endDate, setEndDate] = useState<string>(addOneYear(getTodayIso()));
  const [isEndDateManual, setIsEndDateManual] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialQuote) {
      setFormData({
        ...initialQuote,
        stage: normalizeQuoteStage(initialQuote.stage),
        branch: initialQuote.branch || 'Kasko',
        isPriority: initialQuote.branch === 'Kasko' ? Boolean(initialQuote.isPriority) : false,
      });
      setVehicleValueStr(
        initialQuote.vehicleValue !== undefined && initialQuote.vehicleValue !== null
          ? formatNumberTr(initialQuote.vehicleValue, 0)
          : ''
      );
      setTrafficStatus(initialQuote.trafficStatus || 'TRAFİK BİZDE');
      setTrafficEndDate(initialQuote.trafficEndDate || '');
      setTrafficCompany(initialQuote.trafficCompany || COMPANIES[0]);
      setKaskoStatus(initialQuote.kaskoStatus || 'KASKO BİZDE');
      setKaskoEndDate(initialQuote.kaskoEndDate || '');
      setKaskoCompany(initialQuote.kaskoCompany || COMPANIES[0]);

      // Initialize Section 1 date fields
      const isTakipQuote = initialQuote.businessType === 'Takip';
      const initEnd = initialQuote.endDate || initialQuote.validUntil || '';
      const initStart = initialQuote.startDate || (isTakipQuote && initEnd ? subtractOneYear(initEnd) : getTodayIso());
      const initIssue = initialQuote.issueDate || initialQuote.quoteDate || (isTakipQuote && initStart ? initStart : getTodayIso());
      const resolvedEnd = initEnd || (initStart ? addOneYear(initStart) : '');
      setIssueDate(initIssue);
      setStartDate(initStart);
      setEndDate(resolvedEnd);
      setIsEndDateManual(Boolean(resolvedEnd && initStart && addOneYear(initStart) !== resolvedEnd));
      setDateError(null);

      // Populate accumulatedOffers from companyOffers or main quote + alternatives
      const initialOffers: AccumulatedOfferItem[] = [];
      if (Array.isArray(initialQuote.companyOffers) && initialQuote.companyOffers.length > 0) {
        initialQuote.companyOffers.forEach((co) => {
          const isNoOffer = co.noOffer === true || co.status === 'TEKLİF ALINAMADI' || co.status === 'teklif_alinamadi';
          const hasPrem = !isNoOffer && typeof co.premium === 'number' && !isNaN(co.premium) && co.premium > 0;

          // For Takip quotes: filter out legacy auto-generated pseudo-offers for the existing company
          // An existing company should only be in offers if it has a real positive premium or real quoteNumber
          if (isTakipQuote && !hasPrem) {
            const isExistingCompany =
              (initialQuote.trafficCompany && co.company === initialQuote.trafficCompany) ||
              (initialQuote.kaskoCompany && co.company === initialQuote.kaskoCompany) ||
              (initialQuote.previousCompany && co.company === initialQuote.previousCompany) ||
              (initialQuote.company && co.company === initialQuote.company);
            if (isExistingCompany && (!co.quoteNumber || co.quoteNumber.startsWith('TKP-'))) {
              return; // Do NOT add existing company as pseudo-offer
            }
          }

          initialOffers.push({
            company: co.company || COMPANIES[0],
            quoteNumber: co.quoteNumber || '',
            premium: hasPrem ? Number(co.premium) : null,
            notes: co.notes || '',
            status: isNoOffer ? 'TEKLİF ALINAMADI' : 'TEKLİF ALINDI',
          });
        });
      }
      // Check if this is a renewal quote from an existing policy
      const isRenewalFromPolicy =
        initialQuote.businessType === 'Yenileme' &&
        (Boolean(initialQuote.originPolicyId) || Boolean(initialQuote.previousPolicyNumber) || !initialQuote.company);

      // Fallback: If no companyOffers yet, read main quote + alternatives (only for non-renewal or legacy quotes; NEVER for Takip!)
      if (initialOffers.length === 0 && !isRenewalFromPolicy && !isTakipQuote && initialQuote.company) {
        const hasPrem = typeof initialQuote.premium === 'number' && initialQuote.premium > 0;
        initialOffers.push({
          company: initialQuote.company,
          quoteNumber: initialQuote.quoteNumber || '',
          premium: hasPrem ? Number(initialQuote.premium) : null,
          notes: initialQuote.notes || '',
          status: hasPrem ? 'TEKLİF ALINDI' : 'TEKLİF ALINAMADI',
        });
        if (Array.isArray(initialQuote.alternatives)) {
          initialQuote.alternatives.forEach((alt) => {
            const altHasPrem = typeof alt.premium === 'number' && alt.premium > 0;
            initialOffers.push({
              company: alt.company,
              quoteNumber: '',
              premium: altHasPrem ? Number(alt.premium) : null,
              notes: alt.notes || '',
              status: altHasPrem ? 'TEKLİF ALINDI' : 'TEKLİF ALINAMADI',
            });
          });
        }
      }

      setAccumulatedOffers(initialOffers);
      if ((isRenewalFromPolicy || isTakipQuote) && initialOffers.length === 0) {
        setOfferCompany(COMPANIES[0]);
        setOfferQuoteNumber('');
        setOfferPremiumStr('');
        setOfferNotes('');
      } else {
        const firstValid = initialOffers.find((o) => o.status === 'TEKLİF ALINDI' && o.premium !== null) || initialOffers[0];
        setOfferCompany(firstValid ? firstValid.company : (initialQuote.company || COMPANIES[0]));
        setOfferQuoteNumber(firstValid ? firstValid.quoteNumber : (initialQuote.quoteNumber || ''));
        setOfferPremiumStr(
          firstValid && firstValid.premium !== null && firstValid.premium > 0
            ? formatNumberTr(firstValid.premium, 2)
            : (typeof initialQuote.premium === 'number' && initialQuote.premium > 0 && !isRenewalFromPolicy && !isTakipQuote
              ? formatNumberTr(initialQuote.premium, 2)
              : '')
        );
        setOfferNotes(firstValid ? (firstValid.notes || '') : (!isTakipQuote ? (initialQuote.notes || '') : ''));
      }
      setEditingOfferIndex(null);
      setOfferError(null);
    } else {
      setFormData({
        id: generateId(),
        type: 'quote',
        insured: '',
        branch: 'Kasko',
        businessType: 'Yenileme',
        phone: '',
        email: '',
        plate: '',
        licenseSerialNo: '',
        chassisNo: '',
        engineNo: '',
        usageStyle: 'OTOMOBİL',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleCode: '',
        fuelType: '',
        vehicleValue: undefined,
        vehicleDetail: '',
        quoteDate: getTodayIso(),
        validUntil: addDays(15),
        stage: 'MÜŞTERİYE SUNULACAK',
        status: 'active',
        notes: '',
        followDate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setVehicleValueStr('');
      setTrafficStatus('TRAFİK BİZDE');
      setTrafficEndDate('');
      setTrafficCompany(COMPANIES[0]);
      setKaskoStatus('KASKO BİZDE');
      setKaskoEndDate('');
      setKaskoCompany(COMPANIES[0]);
      setAccumulatedOffers([]);
      setOfferCompany(COMPANIES[0]);
      setOfferQuoteNumber('');
      setOfferPremiumStr('');
      setOfferNotes('');
      setEditingOfferIndex(null);
      setOfferError(null);

      // Section 1 date defaults for new quote
      const today = getTodayIso();
      setIssueDate(today);
      setStartDate(today);
      setEndDate(addOneYear(today));
      setIsEndDateManual(false);
      setDateError(null);
    }
  }, [initialQuote, isOpen]);

  // Handle start date changes: automatically recalculate end date to +1 year unless user manually edited it
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDateError(null);
    if (!val) {
      if (!isEndDateManual) {
        setEndDate('');
      }
      return;
    }
    if (!isEndDateManual) {
      setEndDate(addOneYear(val));
    } else if (endDate && endDate < val) {
      setDateError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
    }
  };

  // Handle end date changes: mark as manual edit and validate
  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setIsEndDateManual(true);
    if (formData.businessType === 'Takip' && val) {
      const calcStart = subtractOneYear(val);
      setStartDate(calcStart);
      setIssueDate(calcStart);
      setDateError(null);
      return;
    }
    if (val && startDate && val < startDate) {
      setDateError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
    } else {
      setDateError(null);
    }
  };

  // Explicitly reset end date to 1 year after start date
  const handleResetEndDateToOneYear = () => {
    if (startDate) {
      setEndDate(addOneYear(startDate));
      setIsEndDateManual(false);
      setDateError(null);
    }
  };

  // Is this modal representing a Takip item?
  const isTakip =
    Boolean(isFollowUpView) ||
    formData.businessType === 'Takip' ||
    initialQuote?.businessType === 'Takip' ||
    (formData.businessType as any) === 'TAKİP' ||
    (initialQuote?.businessType as any) === 'TAKİP';

  // Resolve linked parent quote or policy if this is a follow-up item
  const linkedParentQuote = useMemo(() => {
    if (!isTakip || !quotes) return null;
    return (
      quotes.find(
        (q) =>
          q.id !== initialQuote?.id &&
          (q.trafficFollowUpQuoteId === initialQuote?.id ||
            q.kaskoFollowUpQuoteId === initialQuote?.id ||
            (initialQuote?.originQuoteId && q.id === initialQuote.originQuoteId))
      ) ||
      (initialQuote?.plate
        ? quotes.find(
            (q) =>
              q.id !== initialQuote?.id &&
              q.plate &&
              q.plate.replace(/\s+/g, '') === initialQuote.plate!.replace(/\s+/g, '') &&
              (q.trafficStatus === 'TRAFİK BİZDE DEĞİL' || q.kaskoStatus === 'KASKO BİZDE DEĞİL')
          )
        : null)
    );
  }, [isTakip, quotes, initialQuote]);

  const linkedParentPolicy = useMemo(() => {
    if (!isTakip || !policies) return null;
    return (
      policies.find(
        (p) =>
          p.trafficFollowUpQuoteId === initialQuote?.id ||
          p.kaskoFollowUpQuoteId === initialQuote?.id ||
          (initialQuote?.originPolicyId && p.id === initialQuote.originPolicyId)
      ) ||
      (initialQuote?.plate
        ? policies.find(
            (p) =>
              p.plate &&
              p.plate.replace(/\s+/g, '') === initialQuote.plate!.replace(/\s+/g, '') &&
              (p.trafficStatus === 'TRAFİK BİZDE DEĞİL' || p.kaskoStatus === 'KASKO BİZDE DEĞİL')
          )
        : null)
    );
  }, [isTakip, policies, initialQuote]);

  // Resolve previous year policy info for Renewal quotes
  const linkedRenewalPolicy = useMemo(() => {
    if (!policies) return null;
    const originId = formData.originPolicyId || initialQuote?.originPolicyId;
    if (originId) {
      const match = policies.find((p) => p.id === originId);
      if (match) return match;
    }
    const prevNo = formData.previousPolicyNumber || initialQuote?.previousPolicyNumber;
    if (prevNo) {
      const match = policies.find((p) => p.policyNumber === prevNo);
      if (match) return match;
    }
    return null;
  }, [policies, formData.originPolicyId, formData.previousPolicyNumber, initialQuote]);

  // Distinguish renewal quote linked to an existing policy from regular renewal quote
  const isLinkedRenewal = Boolean(
    (formData.originPolicyId || initialQuote?.originPolicyId) &&
    !isTakip &&
    (formData.businessType === 'Yenileme' || initialQuote?.businessType === 'Yenileme')
  );

  const prevCompany = formData.previousCompany || initialQuote?.previousCompany || linkedRenewalPolicy?.company || '';
  const prevPolicyNo = formData.previousPolicyNumber || initialQuote?.previousPolicyNumber || linkedRenewalPolicy?.policyNumber || '';
  const prevPremium = typeof formData.previousPremium === 'number'
    ? formData.previousPremium
    : (typeof initialQuote?.previousPremium === 'number'
      ? initialQuote.previousPremium
      : (linkedRenewalPolicy ? (typeof linkedRenewalPolicy.currentPremium === 'number' ? linkedRenewalPolicy.currentPremium : linkedRenewalPolicy.premium) : null));
  const prevNotes = formData.previousPolicyNotes || initialQuote?.previousPolicyNotes || linkedRenewalPolicy?.notes || '';

  // Build the list of existing policies ("Mevcut Poliçe Bilgileri") for Takip detail
  const existingPoliciesList = useMemo(() => {
    if (!isTakip) return [];
    const list: Array<{ branch: 'Trafik' | 'Kasko'; company: string; endDate: string }> = [];

    // 1. TRAFİK BİZDE DEĞİL check
    const isTrafikNotWithUs =
      trafficStatus === 'TRAFİK BİZDE DEĞİL' ||
      initialQuote?.trafficStatus === 'TRAFİK BİZDE DEĞİL' ||
      linkedParentQuote?.trafficStatus === 'TRAFİK BİZDE DEĞİL' ||
      linkedParentPolicy?.trafficStatus === 'TRAFİK BİZDE DEĞİL' ||
      initialQuote?.crossSellOrigin === 'kasko_cross_sell' ||
      (initialQuote?.branch === 'Trafik' &&
        (initialQuote?.notes?.includes('Trafik çapraz') || initialQuote?.notes?.includes('Kasko kaydından')));

    const effectiveTrafikCompany =
      trafficCompany ||
      initialQuote?.trafficCompany ||
      linkedParentQuote?.trafficCompany ||
      linkedParentPolicy?.trafficCompany ||
      initialQuote?.previousCompany ||
      formData.previousCompany ||
      (initialQuote?.branch === 'Trafik' ? initialQuote?.company : undefined);

    const effectiveTrafikEndDate =
      trafficEndDate ||
      initialQuote?.trafficEndDate ||
      linkedParentQuote?.trafficEndDate ||
      linkedParentPolicy?.trafficEndDate ||
      (initialQuote?.branch === 'Trafik' ? (initialQuote?.validUntil || initialQuote?.followDate) : undefined);

    if (isTrafikNotWithUs && (effectiveTrafikCompany || effectiveTrafikEndDate)) {
      list.push({
        branch: 'Trafik',
        company: effectiveTrafikCompany || 'Belirtilmedi',
        endDate: effectiveTrafikEndDate || '',
      });
    }

    // 2. KASKO BİZDE DEĞİL check
    const isKaskoNotWithUs =
      kaskoStatus === 'KASKO BİZDE DEĞİL' ||
      initialQuote?.kaskoStatus === 'KASKO BİZDE DEĞİL' ||
      linkedParentQuote?.kaskoStatus === 'KASKO BİZDE DEĞİL' ||
      linkedParentPolicy?.kaskoStatus === 'KASKO BİZDE DEĞİL' ||
      initialQuote?.crossSellOrigin === 'trafik_cross_sell' ||
      (initialQuote?.branch === 'Kasko' &&
        (initialQuote?.notes?.includes('Kasko çapraz') || initialQuote?.notes?.includes('Trafik kaydından')));

    const effectiveKaskoCompany =
      kaskoCompany ||
      initialQuote?.kaskoCompany ||
      linkedParentQuote?.kaskoCompany ||
      linkedParentPolicy?.kaskoCompany ||
      initialQuote?.previousCompany ||
      formData.previousCompany ||
      (initialQuote?.branch === 'Kasko' ? initialQuote?.company : undefined);

    const effectiveKaskoEndDate =
      kaskoEndDate ||
      initialQuote?.kaskoEndDate ||
      linkedParentQuote?.kaskoEndDate ||
      linkedParentPolicy?.kaskoEndDate ||
      (initialQuote?.branch === 'Kasko' ? (initialQuote?.validUntil || initialQuote?.followDate) : undefined);

    if (isKaskoNotWithUs && (effectiveKaskoCompany || effectiveKaskoEndDate)) {
      list.push({
        branch: 'Kasko',
        company: effectiveKaskoCompany || 'Belirtilmedi',
        endDate: effectiveKaskoEndDate || '',
      });
    }

    // 3. Fallback for any Takip quote where list is still empty:
    // Every Takip item represents an existing policy to follow up on.
    if (isTakip && list.length === 0) {
      const targetB = (formData.branch || initialQuote?.branch || 'Kasko') as 'Trafik' | 'Kasko';
      const comp =
        (targetB === 'Trafik' ? (trafficCompany || initialQuote?.trafficCompany) : (kaskoCompany || initialQuote?.kaskoCompany)) ||
        initialQuote?.previousCompany ||
        formData.previousCompany ||
        initialQuote?.company ||
        'Belirtilmedi';
      const endD =
        (targetB === 'Trafik' ? (trafficEndDate || initialQuote?.trafficEndDate) : (kaskoEndDate || initialQuote?.kaskoEndDate)) ||
        formData.endDate ||
        initialQuote?.endDate ||
        initialQuote?.validUntil ||
        initialQuote?.followDate ||
        '';
      list.push({
        branch: targetB,
        company: comp,
        endDate: endD,
      });
    }

    return list;
  }, [
    isTakip,
    trafficStatus,
    trafficCompany,
    trafficEndDate,
    kaskoStatus,
    kaskoCompany,
    kaskoEndDate,
    initialQuote,
    linkedParentQuote,
    linkedParentPolicy,
  ]);

  if (!isOpen) return null;

  // 1. Handle adding or updating an individual company offer with status "TEKLİF ALINDI"
  const handleAddOrUpdateOffer = () => {
    setOfferError(null);
    if (!offerCompany) {
      setOfferError('Lütfen bir sigorta şirketi seçiniz.');
      return;
    }

    if (!offerQuoteNumber.trim()) {
      setOfferError('Lütfen sigorta şirketine ait Teklif Numarasını giriniz.');
      return;
    }

    const parsedPrem = parseNumberTr(offerPremiumStr);
    if (parsedPrem === null || isNaN(parsedPrem) || parsedPrem <= 0) {
      setOfferError('Lütfen geçerli bir prim tutarı giriniz.');
      return;
    }

    const newOffer: AccumulatedOfferItem = {
      company: offerCompany,
      quoteNumber: offerQuoteNumber.trim(),
      premium: parsedPrem,
      notes: offerNotes.trim() || undefined,
      status: 'TEKLİF ALINDI',
    };

    if (editingOfferIndex !== null && editingOfferIndex >= 0 && editingOfferIndex < accumulatedOffers.length) {
      // Editing existing accumulated offer
      setAccumulatedOffers((prev) => {
        const next = [...prev];
        next[editingOfferIndex] = newOffer;
        return next;
      });
      setEditingOfferIndex(null);
    } else {
      // Adding new accumulated offer - prevent duplicate company by updating if already exists
      setAccumulatedOffers((prev) => {
        const existingIdx = prev.findIndex((o) => o.company === offerCompany);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = newOffer;
          return next;
        }
        return [...prev, newOffer];
      });
    }

    // Prepare inputs for the next company offer
    const usedCompanies = new Set([...accumulatedOffers.map((o) => o.company), newOffer.company]);
    const nextCompany = COMPANIES.find((c) => !usedCompanies.has(c)) || COMPANIES[0];
    setOfferCompany(nextCompany);
    setOfferQuoteNumber('');
    setOfferPremiumStr('');
    setOfferNotes('');
    setOfferError(null);
  };

  // 2. Handle adding or updating a company offer with status "TEKLİF ALINAMADI"
  const handleMarkNoOffer = () => {
    setOfferError(null);
    if (!offerCompany) {
      setOfferError('Lütfen bir sigorta şirketi seçiniz.');
      return;
    }

    const newOffer: AccumulatedOfferItem = {
      company: offerCompany,
      quoteNumber: offerQuoteNumber.trim(),
      premium: null, // Prim yok
      notes: offerNotes.trim() || undefined,
      status: 'TEKLİF ALINAMADI',
    };

    if (editingOfferIndex !== null && editingOfferIndex >= 0 && editingOfferIndex < accumulatedOffers.length) {
      // Editing existing accumulated offer
      setAccumulatedOffers((prev) => {
        const next = [...prev];
        next[editingOfferIndex] = newOffer;
        return next;
      });
      setEditingOfferIndex(null);
    } else {
      // Adding new accumulated offer - prevent duplicate company by updating if already exists
      setAccumulatedOffers((prev) => {
        const existingIdx = prev.findIndex((o) => o.company === offerCompany);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = newOffer;
          return next;
        }
        return [...prev, newOffer];
      });
    }

    // Prepare inputs for next unused company
    const usedCompanies = new Set([...accumulatedOffers.map((o) => o.company), newOffer.company]);
    const nextCompany = COMPANIES.find((c) => !usedCompanies.has(c)) || COMPANIES[0];
    setOfferCompany(nextCompany);
    setOfferQuoteNumber('');
    setOfferPremiumStr('');
    setOfferNotes('');
    setOfferError(null);
  };

  const handleEditOffer = (index: number) => {
    const item = accumulatedOffers[index];
    if (!item) return;
    setOfferCompany(item.company);
    setOfferQuoteNumber(item.quoteNumber || '');
    setOfferPremiumStr(item.premium !== null && item.premium !== undefined ? formatNumberTr(item.premium, 2) : '');
    setOfferNotes(item.notes || '');
    setEditingOfferIndex(index);
    setOfferError(null);
  };

  const handleCancelEditOffer = () => {
    setEditingOfferIndex(null);
    setOfferCompany(COMPANIES[0]);
    setOfferQuoteNumber('');
    setOfferPremiumStr('');
    setOfferNotes('');
    setOfferError(null);
  };

  const handleRemoveOffer = (index: number) => {
    if (editingOfferIndex === index) {
      handleCancelEditOffer();
    } else if (editingOfferIndex !== null && editingOfferIndex > index) {
      setEditingOfferIndex(editingOfferIndex - 1);
    }
    setAccumulatedOffers((prev) => prev.filter((_, i) => i !== index));
  };

  // Doğanium text parser handler (used specifically for Takip detail)
  const handleParseDoganiumText = () => {
    if (!doganiumPasteText.trim()) {
      setDoganiumParseMessage({
        type: 'error',
        text: 'Lütfen önce Doğanium teklif metnini yapıştırınız.',
      });
      return;
    }

    const parsed = parseDoganiumText(doganiumPasteText);
    if (!parsed || parsed.length === 0) {
      setDoganiumParseMessage({
        type: 'warning',
        text: 'Metinde desteklenen 6 sigorta şirketine (Allianz, Axa, Doğa, Hepiyi, Ray, HDI) ait geçerli teklif bulunamadı.',
      });
      return;
    }

    // Map each parsed offer to AccumulatedOfferItem
    const newOffers: AccumulatedOfferItem[] = parsed.map((item) => {
      const hasPrem = typeof item.premium === 'number' && !isNaN(item.premium) && item.premium > 0;
      return {
        company: item.company,
        quoteNumber: item.quoteNumber ? item.quoteNumber.trim() : '',
        premium: hasPrem ? Number(item.premium) : null,
        notes: item.extraDescription || '',
        status: hasPrem ? 'TEKLİF ALINDI' : 'TEKLİF ALINAMADI',
      };
    });

    // Merge into accumulatedOffers (replace existing company if present, or add)
    setAccumulatedOffers((prev) => {
      const list = [...prev];
      newOffers.forEach((no) => {
        const existIdx = list.findIndex((ex) => ex.company === no.company);
        if (existIdx >= 0) {
          list[existIdx] = no;
        } else {
          list.push(no);
        }
      });
      return list;
    });

    // Populate primary offer form fields with best (lowest positive premium) offer
    const positiveOffers = newOffers.filter((o) => o.status === 'TEKLİF ALINDI' && typeof o.premium === 'number' && o.premium > 0);
    const bestOffer = positiveOffers.length > 0
      ? positiveOffers.reduce((min, o) => ((o.premium as number) < (min.premium as number) ? o : min), positiveOffers[0])
      : newOffers[0];

    if (bestOffer) {
      setOfferCompany(bestOffer.company);
      setOfferQuoteNumber(bestOffer.quoteNumber || '');
      setOfferPremiumStr(bestOffer.premium ? formatNumberTr(bestOffer.premium, 2) : '');
      setOfferNotes(bestOffer.notes || '');
    }

    // Do NOT alter formData.notes ("Görüşme ve Teklif Notları alanına hiçbir metin aktarılmamalı. Bu alan boş kalmalı.")
    setOfferError(null);
    setDoganiumParseMessage({
      type: 'success',
      text: `${newOffers.length} sigorta şirketi teklifi başarıyla ayrıştırıldı ve teklif listesine aktarıldı.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.insured?.trim()) {
      alert('Lütfen müşteri adını giriniz.');
      return;
    }

    const currentBranch = formData.branch || 'Kasko';

    // Validation for cross-sell if not with us
    if (currentBranch === 'Kasko' && trafficStatus === 'TRAFİK BİZDE DEĞİL') {
      if (!trafficEndDate || !trafficCompany) {
        alert('Lütfen Trafik poliçesi bitiş tarihini ve sigorta şirketini eksiksiz giriniz.');
        return;
      }
    }

    if (currentBranch === 'Trafik' && kaskoStatus === 'KASKO BİZDE DEĞİL') {
      if (!kaskoEndDate || !kaskoCompany) {
        alert('Lütfen Kasko poliçesi bitiş tarihini ve sigorta şirketini eksiksiz giriniz.');
        return;
      }
    }

    // Check if user has an unsubmitted offer in the inputs; automatically include it if valid
    let finalOffers = [...accumulatedOffers];
    const pendingPremium = parseNumberTr(offerPremiumStr);
    if (pendingPremium !== null && pendingPremium > 0 && offerCompany) {
      if (!offerQuoteNumber.trim()) {
        setOfferError('Lütfen sigorta şirketine ait Teklif Numarasını giriniz.');
        alert('Lütfen sigorta şirketine ait Teklif Numarasını giriniz.');
        return;
      }
      const pendingOffer: AccumulatedOfferItem = {
        company: offerCompany,
        quoteNumber: offerQuoteNumber.trim(),
        premium: pendingPremium,
        notes: offerNotes.trim() || undefined,
        status: 'TEKLİF ALINDI',
      };
      if (editingOfferIndex !== null && editingOfferIndex >= 0 && editingOfferIndex < finalOffers.length) {
        finalOffers[editingOfferIndex] = pendingOffer;
      } else {
        const existIdx = finalOffers.findIndex((o) => o.company === offerCompany);
        if (existIdx >= 0) {
          finalOffers[existIdx] = pendingOffer;
        } else {
          finalOffers.push(pendingOffer);
        }
      }
    }

    if (finalOffers.length === 0 && !isTakip) {
      alert('Lütfen en az bir sigorta şirketi kaydı ekleyiniz ("Teklif Ekle" veya "Teklif Alınamadı" butonuna basınız).');
      return;
    }

    // Ensure all received offers have a quoteNumber (for non-takip quotes)
    const missingQuoteNumberOffer = finalOffers.find(
      (o) => o.status === 'TEKLİF ALINDI' && (!o.quoteNumber || !o.quoteNumber.trim())
    );
    if (missingQuoteNumberOffer && !isTakip) {
      setOfferError(`Lütfen ${missingQuoteNumberOffer.company} teklifi için Teklif Numarasını giriniz.`);
      alert(`Lütfen ${missingQuoteNumberOffer.company} teklifi için Teklif Numarasını giriniz.`);
      return;
    }

    const parsedVal = parseNumberTr(vehicleValueStr) ?? (formData.vehicleValue !== undefined ? Number(formData.vehicleValue) : undefined);

    // Primary offer: prefer first TEKLİF ALINDI with valid premium, otherwise first offer if any
    const firstReceivedOffer = finalOffers.find((o) => o.status === 'TEKLİF ALINDI' && typeof o.premium === 'number' && o.premium > 0);
    const primaryOffer = firstReceivedOffer || finalOffers[0] || null;
    const primaryPremium = firstReceivedOffer && typeof firstReceivedOffer.premium === 'number' ? firstReceivedOffer.premium : 0;

    const companyOffers: CompanyOffer[] = finalOffers.map((o) => ({
      company: o.company,
      premium: o.status === 'TEKLİF ALINAMADI' ? undefined : (typeof o.premium === 'number' ? o.premium : undefined),
      quoteNumber: o.quoteNumber || undefined,
      notes: o.notes || undefined,
      status: o.status,
      noOffer: o.status === 'TEKLİF ALINAMADI',
    }));

    // Build backward-compatible alternative quotes list for any legacy consumer
    const alternatives: AlternativeQuote[] = finalOffers
      .filter((o) => o !== primaryOffer && o.status === 'TEKLİF ALINDI' && typeof o.premium === 'number')
      .map((o) => ({
        company: o.company,
        premium: o.premium || 0,
        notes: [o.quoteNumber ? `No: ${o.quoteNumber}` : '', o.notes || ''].filter(Boolean).join(' - ') || undefined,
      }));

    if (startDate && endDate && endDate < startDate) {
      alert('Bitiş tarihi başlangıç tarihinden önce olamaz. Lütfen geçerli bir tarih aralığı giriniz.');
      return;
    }

    const finalQuote: Quote = {
      id: initialQuote?.id || formData.id || generateId(),
      type: 'quote',
      insured: formData.insured.trim(),
      businessType: (formData.businessType as BusinessType) || 'Yenileme',
      phone: formData.phone?.trim() || '',
      email: formData.email?.trim() || '',
      plate: formData.plate?.trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '') || '',
      licenseSerialNo: formData.licenseSerialNo?.trim().toLocaleUpperCase('tr-TR') || '',
      chassisNo: formData.chassisNo?.trim().toLocaleUpperCase('tr-TR') || '',
      engineNo: formData.engineNo?.trim().toLocaleUpperCase('tr-TR') || '',
      usageStyle: formData.usageStyle?.trim() || '',
      vehicleBrand: formData.vehicleBrand?.trim() || '',
      vehicleModel: formData.vehicleModel?.trim() || '',
      vehicleYear: formData.vehicleYear ? Number(formData.vehicleYear) : undefined,
      vehicleCode: formData.vehicleCode?.trim() || '',
      fuelType: formData.fuelType?.trim() || '',
      vehicleValue: parsedVal,
      vehicleDetail: isTakip ? '' : (formData.vehicleDetail?.trim() || ''),
      company: primaryOffer ? primaryOffer.company : (initialQuote?.company || ''),
      branch: currentBranch,
      isPriority: currentBranch === 'Kasko' ? Boolean(formData.isPriority) : false,
      quoteNumber: primaryOffer?.quoteNumber || formData.quoteNumber?.trim() || initialQuote?.quoteNumber || '',
      issueDate: issueDate.trim() || undefined,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
      quoteDate: issueDate.trim() || formData.quoteDate || getTodayIso(),
      validUntil: endDate.trim() || initialQuote?.validUntil || formData.validUntil || addDays(15),
      premium: primaryPremium,
      stage: initialQuote ? normalizeQuoteStage(initialQuote.stage || formData.stage) : 'MÜŞTERİYE SUNULACAK',
      status: formData.quoteStatus === 'reddedildi' ? 'concluded' : (initialQuote?.status || 'active'),
      quoteStatus: formData.quoteStatus || initialQuote?.quoteStatus || 'beklemede',
      outcome: formData.quoteStatus === 'reddedildi' ? 'rejected' : initialQuote?.outcome,
      convertedPolicyId: initialQuote?.convertedPolicyId,
      resultDate: formData.quoteStatus === 'reddedildi' ? (initialQuote?.resultDate || new Date().toISOString().split('T')[0]) : initialQuote?.resultDate,
      rejectionReason: formData.quoteStatus === 'reddedildi' ? (formData.nonConversionReason || formData.rejectionReason || NON_CONVERSION_REASONS[0]) : (initialQuote?.outcome === 'converted' ? undefined : initialQuote?.rejectionReason),
      nonConversionReason: formData.quoteStatus === 'reddedildi' ? (formData.nonConversionReason || formData.rejectionReason || NON_CONVERSION_REASONS[0]) : (initialQuote?.outcome === 'converted' ? undefined : initialQuote?.nonConversionReason),
      rejectionNote: initialQuote?.rejectionNote,
      progressLogs: initialQuote?.progressLogs || [
        {
          id: generateId(),
          stage: 'MÜŞTERİYE SUNULACAK',
          status: formData.quoteStatus || 'beklemede',
          timestamp: new Date().toISOString(),
          note: `${finalOffers.length} şirket teklifi ile teklif kaydı oluşturuldu.`,
        },
      ],
      companyOffers,
      alternatives,
      notes: formData.notes?.trim() || '',
      followDate: initialQuote?.followDate || formData.followDate || '',
      trafficStatus:
        initialQuote?.trafficStatus ||
        (isTakip && existingPoliciesList.some((p) => p.branch === 'Trafik')
          ? 'TRAFİK BİZDE DEĞİL'
          : currentBranch === 'Kasko'
          ? trafficStatus
          : undefined),
      trafficEndDate:
        initialQuote?.trafficEndDate ||
        (isTakip && existingPoliciesList.find((p) => p.branch === 'Trafik')?.endDate) ||
        (currentBranch === 'Kasko' && trafficStatus === 'TRAFİK BİZDE DEĞİL' ? trafficEndDate : undefined),
      trafficCompany:
        initialQuote?.trafficCompany ||
        (isTakip && existingPoliciesList.find((p) => p.branch === 'Trafik')?.company) ||
        (currentBranch === 'Kasko' && trafficStatus === 'TRAFİK BİZDE DEĞİL' ? trafficCompany : undefined),
      kaskoStatus:
        initialQuote?.kaskoStatus ||
        (isTakip && existingPoliciesList.some((p) => p.branch === 'Kasko')
          ? 'KASKO BİZDE DEĞİL'
          : currentBranch === 'Trafik'
          ? kaskoStatus
          : undefined),
      kaskoEndDate:
        initialQuote?.kaskoEndDate ||
        (isTakip && existingPoliciesList.find((p) => p.branch === 'Kasko')?.endDate) ||
        (currentBranch === 'Trafik' && kaskoStatus === 'KASKO BİZDE DEĞİL' ? kaskoEndDate : undefined),
      kaskoCompany:
        initialQuote?.kaskoCompany ||
        (isTakip && existingPoliciesList.find((p) => p.branch === 'Kasko')?.company) ||
        (currentBranch === 'Trafik' && kaskoStatus === 'KASKO BİZDE DEĞİL' ? kaskoCompany : undefined),
      originQuoteId: initialQuote?.originQuoteId,
      originPolicyId: initialQuote?.originPolicyId || formData.originPolicyId,
      previousCompany: initialQuote?.previousCompany || formData.previousCompany || (prevCompany || undefined),
      previousPolicyNumber: initialQuote?.previousPolicyNumber || formData.previousPolicyNumber || (prevPolicyNo || undefined),
      previousPremium: typeof initialQuote?.previousPremium === 'number'
        ? initialQuote.previousPremium
        : (typeof formData.previousPremium === 'number' ? formData.previousPremium : (prevPremium ?? undefined)),
      previousPolicyNotes: initialQuote?.previousPolicyNotes || formData.previousPolicyNotes || (prevNotes || undefined),
      createdAt: initialQuote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(finalQuote);
    onClose();
  };

  const isEditing = !!initialQuote;

  // Active premium for multiplier calculation preview (Teklif Alınamadı olanlar hariç)
  const currentPreviewPremium =
    parseNumberTr(offerPremiumStr) ??
    (accumulatedOffers.find((o) => o.status === 'TEKLİF ALINDI' && typeof o.premium === 'number')?.premium ?? 0);
  const parsedVehicleVal = parseNumberTr(vehicleValueStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing
                  ? isTakip
                    ? 'Takip Kaydı Detayı & Düzenleme'
                    : 'Teklifi Düzenle'
                  : isTakip
                  ? 'Yeni Takip Kaydı'
                  : 'Yeni Teklif Kaydı'}
              </h2>
              <p className="text-xs text-slate-500">
                {isTakip
                  ? 'Takipteki iş detayı, mevcut poliçe ve teklif bilgileri'
                  : 'Çoklu sigorta şirketi teklif karşılaştırması ve portföy takibi'}
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

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Olumsuz Sonuçlandırma & Ret Notu Bilgilendirme Kartı */}
            {(initialQuote?.rejectionNote || initialQuote?.rejectionReason || (initialQuote?.status === 'concluded' && initialQuote?.outcome === 'rejected')) && (
              <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Olumsuz Sonuçlandırma Bilgileri</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-rose-700/80 font-medium block">Poliçeleştirmeme / Sonuç Nedeni:</span>
                    <span className="font-bold text-rose-950 mt-0.5 block">
                      ❌ {initialQuote.nonConversionReason || initialQuote.rejectionReason || 'Belirtilmedi'}
                    </span>
                  </div>
                  <div>
                    <span className="text-rose-700/80 font-medium block">Olumsuz Sonuçlandırma Notu:</span>
                    <div className="p-2.5 mt-1 bg-white rounded-xl border border-rose-200 text-rose-950 font-semibold text-xs whitespace-pre-wrap">
                      {initialQuote.rejectionNote ? initialQuote.rejectionNote : 'Açıklama notu girilmemiş.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Müşteri & Teklif Bilgileri */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Müşteri & Teklif Bilgileri
                </h3>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  ✓ KVKK Uyumlu
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1.1 BRANŞ: Replaces E-posta Adresi and sits in the first section */}
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>Branş *</span>
                  </label>
                  <select
                    value={formData.branch || 'Kasko'}
                    onChange={(e) => {
                      const newBranch = e.target.value;
                      setFormData({
                        ...formData,
                        branch: newBranch,
                        isPriority: newBranch === 'Kasko' ? formData.isPriority : false,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm font-bold text-blue-950 border-2 border-blue-200 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  {/* Kasko branşı için Öncelikli İş seçimi */}
                  {formData.branch === 'Kasko' && (
                    <div className="mt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.isPriority)}
                          onChange={(e) => setFormData({ ...formData, isPriority: e.target.checked })}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                        />
                        <span>⭐ Öncelikli İş (Genel Bakışta Göster)</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 1.2 MÜŞTERİ ADI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Müşteri Adı Soyadı veya Şirket Unvanı *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.insured || ''}
                    onChange={(e) => setFormData({ ...formData, insured: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* 1.3 İŞ TÜRÜ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    İş Türü *
                  </label>
                  <select
                    value={formData.businessType || 'Yenileme'}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value as BusinessType })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer font-medium"
                  >
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 1.4, 1.5, 1.6: Tanzim Tarihi, Başlangıç Tarihi, Bitiş Tarihi */}
                <div className="md:col-span-3 pt-3 mt-1 border-t border-slate-200/80">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tanzim Tarihi */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tanzim Tarihi</span>
                      </label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>

                    {/* Başlangıç Tarihi */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>Başlangıç Tarihi</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>

                    {/* Bitiş Tarihi */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Bitiş Tarihi</span>
                        </label>
                        {isEndDateManual ? (
                          <button
                            type="button"
                            onClick={handleResetEndDateToOneYear}
                            title="Başlangıç tarihine göre otomatik 1 yıl yap"
                            className="text-[10px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded font-semibold border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>1 Yıl Eşitle</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                            Otomatik 1 Yıl
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white outline-none transition-all ${
                          dateError
                            ? 'border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                            : 'border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Validation Error banner if end date is before start date */}
                  {dateError && (
                    <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-medium">{dateError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Araç & Varlık Bilgileri */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Araç & Varlık Bilgileri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Plakası</label>
                  <input
                    type="text"
                    value={formData.plate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plate: e.target.value.toLocaleUpperCase('tr-TR').replace(/[ .-]/g, ''),
                      })
                    }
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-semibold uppercase tracking-wider border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ruhsat Belge Seri No</label>
                  <input
                    type="text"
                    value={formData.licenseSerialNo || ''}
                    onChange={(e) => setFormData({ ...formData, licenseSerialNo: e.target.value.toLocaleUpperCase('tr-TR') })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Şasi No (17 Hane)</label>
                  <input
                    type="text"
                    maxLength={25}
                    value={formData.chassisNo || ''}
                    onChange={(e) => setFormData({ ...formData, chassisNo: e.target.value.toLocaleUpperCase('tr-TR') })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motor No</label>
                  <input
                    type="text"
                    value={formData.engineNo || ''}
                    onChange={(e) => setFormData({ ...formData, engineNo: e.target.value.toLocaleUpperCase('tr-TR') })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Araç Kullanım Tarzı
                  </label>
                  <select
                    value={formData.usageStyle || ''}
                    onChange={(e) => setFormData({ ...formData, usageStyle: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">Seçiniz</option>
                    {formData.usageStyle && !USAGE_STYLES.includes(formData.usageStyle as any) && (
                      <option value={formData.usageStyle}>{formData.usageStyle}</option>
                    )}
                    {USAGE_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model Yılı</label>
                  <input
                    type="number"
                    min="1970"
                    max="2035"
                    value={formData.vehicleYear || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value ? Number(e.target.value) : '' })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Markası</label>
                  <input
                    type="text"
                    value={formData.vehicleBrand || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleBrand: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Modeli</label>
                  <input
                    type="text"
                    value={formData.vehicleModel || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Kodu (TSB)</label>
                  <input
                    type="text"
                    value={formData.vehicleCode || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleCode: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yakıt Türü</label>
                  <select
                    value={formData.fuelType || ''}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">Seçiniz</option>
                    {formData.fuelType && !FUEL_TYPES.includes(formData.fuelType as any) && (
                      <option value={formData.fuelType}>{formData.fuelType}</option>
                    )}
                    {FUEL_TYPES.map((ft) => (
                      <option key={ft} value={ft}>
                        {ft}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isLinkedRenewal ? 'Geçen Sene Araç Bedeli' : 'Araç Kasko Bedeli (TL)'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={vehicleValueStr}
                      onChange={(e) => setVehicleValueStr(e.target.value)}
                      onBlur={() => {
                        const parsed = parseNumberTr(vehicleValueStr);
                        if (parsed !== null && !isNaN(parsed)) {
                          setVehicleValueStr(formatNumberTr(parsed, 2));
                        }
                      }}
                      placeholder=""
                      className="w-full px-3 py-2 pl-8 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₺</span>
                  </div>
                  {(() => {
                    const parsed = parseNumberTr(vehicleValueStr);
                    if (parsed !== null && parsed > 0) {
                      return (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1 px-1">
                          <span className="text-slate-400">Görünen:</span>
                          <span className="text-blue-700 font-bold font-mono">{formatCurrency(parsed)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Multiplier is STRICTLY shown for Kasko only */}
                {formData.branch === 'Kasko' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isLinkedRenewal ? 'Geçen Sene Çarpanı' : 'Kasko Çarpanı'}
                    </label>
                    <div className="flex items-center gap-2 h-[38px] px-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                      {(() => {
                        const mult = calculateMultiplier(currentPreviewPremium, parsedVehicleVal, 'Kasko');
                        if (mult !== null) {
                          return (
                            <span className="font-mono font-black text-blue-700 text-sm">
                              {formatMultiplier(mult)}
                            </span>
                          );
                        }
                        return (
                          <span className="text-xs text-slate-400 font-medium">
                            —
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mevcut Poliçe Bilgileri (Takip Detayında Gösterilir) */}
            {isTakip && existingPoliciesList.length > 0 && (
              <div className="p-5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-2">
                        <span>Mevcut Poliçe Bilgileri</span>
                      </h3>
                      <p className="text-xs text-purple-700/80 mt-0.5">
                        Başka sigorta şirketinde bulunan ve takibi yapılan mevcut poliçe detayları
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-200 text-purple-900 border border-purple-300">
                    {existingPoliciesList.length} Poliçe
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {existingPoliciesList.map((pol, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-600" />
                          <span>Branş:</span>
                          <span className="text-purple-700 font-extrabold">{pol.branch}</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                          {pol.branch === 'Trafik' ? 'TRAFİK BİZDE DEĞİL' : 'KASKO BİZDE DEĞİL'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-[11px] font-medium text-slate-500">Sigorta Şirketi</div>
                          <div className="font-bold text-slate-900 mt-0.5 truncate" title={pol.company}>
                            {pol.company || '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-slate-500">Poliçe Bitiş Tarihi</div>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {pol.endDate ? formatDateTr(pol.endDate) : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ÖNCEKİ YILIN POLİÇE BİLGİLERİ (Salt Okunur Bilgilendirme Bloğu - Yalnızca Yenilemeler Sayfasından Açılan Tekliflerde) */}
            {isLinkedRenewal && (Boolean(prevCompany) || Boolean(prevPolicyNo) || Boolean(linkedRenewalPolicy)) && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200/90 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
                      ÖNCEKİ YILIN POLİÇE BİLGİLERİ
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Bilgilendirme Amaçlı (Salt Okunur)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white/95 p-3.5 rounded-xl border border-amber-200/70 shadow-2xs">
                  {/* Geçen Seneki Sigorta Şirketi */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Geçen Seneki Sigorta Şirketi
                    </label>
                    <div className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 truncate" title={prevCompany || undefined}>
                      {prevCompany || '—'}
                    </div>
                  </div>

                  {/* Geçen Seneki Poliçe No */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Geçen Seneki Poliçe No
                    </label>
                    <div className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 truncate" title={prevPolicyNo || undefined}>
                      {prevPolicyNo || '—'}
                    </div>
                  </div>

                  {/* Geçen Seneki Prim */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Geçen Seneki Prim
                    </label>
                    <div className="text-xs font-mono font-black text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      {prevPremium !== null && prevPremium !== undefined && prevPremium > 0 ? formatCurrency(prevPremium) : '—'}
                    </div>
                  </div>

                  {/* Geçen Seneki Poliçe Notu */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Geçen Seneki Poliçe Notu
                    </label>
                    <div className="text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 truncate" title={prevNotes || undefined}>
                      {prevNotes || '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Sigorta Şirketi & Fiyat Bilgileri (Sadece 4 Alan + Teklif Ekle + Birikmiş Teklifler) */}
            <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span>2. Sigorta Şirketi & Fiyat Bilgileri</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aşağıdaki 4 alanı doldurup "Teklif Ekle" ile birden fazla sigorta şirketinin teklifini biriktirin.
                  </p>
                </div>
                {editingOfferIndex !== null && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    Düzenleme Modu
                  </span>
                )}
              </div>

              {/* SADECE TAKİP İŞLERİNDE GÖSTERİLEN: Doğanium Teklif Metnini Yapıştır & Ayrıştır */}
              {isTakip && (
                <div className="p-4 bg-gradient-to-br from-indigo-50/90 via-blue-50/70 to-purple-50/70 border border-indigo-200 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Doğanium Teklif Metnini Yapıştır
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Doğanium portalında "Teklifi Kopyala" ile aldığınız metnin tamamını buraya yapıştırıp ayrıştırabilirsiniz.
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                      6 Şirket Desteklenir (Allianz, Axa, Doğa, Hepiyi, Ray, HDI)
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={3}
                      value={doganiumPasteText}
                      onChange={(e) => {
                        setDoganiumPasteText(e.target.value);
                        setDoganiumParseMessage(null);
                      }}
                      placeholder="Doğanium teklif metnini buraya yapıştırınız (Ctrl + V)...&#10;Örn: DOĞA SİGORTA 24.850,00 ₺ - Onaylı ✔️ - 71829401&#10;AXA SİGORTA 26.200,50 ₺ - Onaylı ✔️ - Fiyat Çalışması No: 948201"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 placeholder:text-slate-400 resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {doganiumParseMessage ? (
                      <div
                        className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                          doganiumParseMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : doganiumParseMessage.type === 'warning'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {doganiumParseMessage.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{doganiumParseMessage.text}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">
                        * Ayrıştırma işlemi Doğanium metnindeki prim, teklif no ve ek açıklamaları 6 şirketle eşleştirir.
                      </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      {doganiumPasteText && (
                        <button
                          type="button"
                          onClick={() => {
                            setDoganiumPasteText('');
                            setDoganiumParseMessage(null);
                          }}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                        >
                          Temizle
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleParseDoganiumText}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                        <span>Teklifleri Ayrıştır</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* The Exactly 4 Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                {/* 1. Sigorta Şirketi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">1. Sigorta Şirketi *</label>
                  <select
                    value={offerCompany}
                    onChange={(e) => setOfferCompany(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white font-medium"
                  >
                    {COMPANIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Teklif Numarası (Zorunlu) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">2. Teklif Numarası *</label>
                  <input
                    type="text"
                    value={offerQuoteNumber}
                    onChange={(e) => {
                      setOfferQuoteNumber(e.target.value);
                      if (offerError?.includes('Teklif Numarası')) {
                        setOfferError(null);
                      }
                    }}
                    placeholder=""
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none font-medium transition-all ${
                      offerError?.includes('Teklif Numarası')
                        ? 'border-rose-500 bg-rose-50/40 text-rose-950 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                </div>

                {/* 3. Prim (Türkçe Format Destekli) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">3. Prim (TL) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={offerPremiumStr}
                      onChange={(e) => setOfferPremiumStr(e.target.value)}
                      onBlur={() => {
                        const parsed = parseNumberTr(offerPremiumStr);
                        if (parsed !== null && !isNaN(parsed)) {
                          setOfferPremiumStr(formatNumberTr(parsed, 2));
                        }
                      }}
                      placeholder=""
                      className="w-full px-3 py-2 pl-7 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                    <span className="absolute left-2.5 top-2.5 text-slate-400 font-bold text-xs">₺</span>
                  </div>
                  {(() => {
                    const parsed = parseNumberTr(offerPremiumStr);
                    if (parsed !== null && parsed > 0) {
                      return (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1 px-1">
                          <span className="text-slate-400">Görünen:</span>
                          <span className="text-blue-700 font-bold font-mono">{formatCurrency(parsed)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* 4. Teklif Notları */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">4. Teklif Notları</label>
                  <input
                    type="text"
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Action buttons & error banner */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                {offerError ? (
                  <div className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{offerError}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    * Şirket seçip prim girerek <strong>Teklif Ekle</strong> veya prim alamadıysanız <strong>Teklif Alınamadı</strong> butonunu kullanınız.
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  {editingOfferIndex !== null && (
                    <button
                      type="button"
                      onClick={handleCancelEditOffer}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    >
                      Vazgeç
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleMarkNoOffer}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300"
                    title="Bu sigorta şirketinden teklif alınamadı olarak kaydet"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Teklif Alınamadı</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddOrUpdateOffer}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors ${
                      editingOfferIndex !== null
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {editingOfferIndex !== null ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Teklifi Güncelle</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Teklif Ekle</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Formun Altında Biriken Şirket Teklifleri Listesi */}
              {(!isTakip || accumulatedOffers.length > 0) && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Eklenen Şirket Teklifleri
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800">
                        {accumulatedOffers.length} Şirket
                      </span>
                    </div>
                    {(() => {
                      const validPrems = accumulatedOffers
                        .filter((o) => o.status === 'TEKLİF ALINDI' && typeof o.premium === 'number' && o.premium > 0)
                        .map((o) => o.premium as number);
                      if (validPrems.length > 1) {
                        return (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            En Uygun Prim: {formatCurrency(Math.min(...validPrems))}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {accumulatedOffers.length === 0 ? (
                    <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center">
                      <p className="text-xs text-slate-500 font-semibold">
                        Henüz eklenmiş şirket teklifi bulunmuyor.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Yukarıdaki alanları doldurup <strong>"Teklif Ekle"</strong> veya teklif alamadıysanız <strong>"Teklif Alınamadı"</strong> butonuna basarak şirketleri burada biriktirebilirsiniz.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {accumulatedOffers.map((offer, idx) => {
                        const isEditingThis = editingOfferIndex === idx;
                        const isNoOffer = offer.status === 'TEKLİF ALINAMADI';
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              isEditingThis
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
                                : isNoOffer
                                ? 'bg-rose-50/30 border-rose-200'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">{offer.company}</span>

                                {/* Teklif Durumu Rozeti */}
                                {isNoOffer ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>TEKLİF ALINAMADI</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>TEKLİF ALINDI</span>
                                  </span>
                                )}

                                {offer.quoteNumber ? (
                                  <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    No: {offer.quoteNumber}
                                  </span>
                                ) : isNoOffer ? (
                                  <span className="text-xs text-slate-400 font-mono">—</span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No girilmedi</span>
                                )}

                                {isNoOffer ? (
                                  <span className="font-semibold text-xs text-rose-600 italic ml-auto sm:ml-2">
                                    Prim Yok (—)
                                  </span>
                                ) : (
                                  <span className="font-black text-sm text-blue-700 ml-auto sm:ml-2">
                                    {formatCurrency(offer.premium || 0)}
                                  </span>
                                )}

                                {!isNoOffer && formData.branch === 'Kasko' && parsedVehicleVal && offer.premium && (
                                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    Çarpan: {formatMultiplier(calculateMultiplier(offer.premium, parsedVehicleVal, 'Kasko'))}
                                  </span>
                                )}
                              </div>
                              {offer.notes && (
                                <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                                  <span className="font-semibold text-slate-500">Not:</span> {offer.notes}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditOffer(idx)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Düzenle</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveOffer(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Kaldır"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Cross-Sell for Kasko (TRAFİK ÇAPRAZ SATIŞ - Takip Detayında Gizlenir) */}
              {!isTakip && formData.branch === 'Kasko' && (
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Portföy Durumu (Trafik Çapraz Satış) *
                    </label>
                    <div className="flex items-center gap-3">
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          trafficStatus === 'TRAFİK BİZDE'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quoteTrafficStatus"
                          value="TRAFİK BİZDE"
                          checked={trafficStatus === 'TRAFİK BİZDE'}
                          onChange={() => setTrafficStatus('TRAFİK BİZDE')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>✓ TRAFİK BİZDE</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          trafficStatus === 'TRAFİK BİZDE DEĞİL'
                            ? 'bg-amber-50 border-amber-500 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quoteTrafficStatus"
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
                    <div className="pt-2 border-t border-blue-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Trafik Poliçesi Bitiş Tarihi *
                        </label>
                        <input
                          type="date"
                          required
                          value={trafficEndDate}
                          onChange={(e) => setTrafficEndDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
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
                          className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
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

              {/* Conditional Cross-Sell for Trafik (KASKO ÇAPRAZ SATIŞ - Takip Detayında Gizlenir) */}
              {!isTakip && formData.branch === 'Trafik' && (
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Portföy Durumu (Kasko Çapraz Satış) *
                    </label>
                    <div className="flex items-center gap-3">
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          kaskoStatus === 'KASKO BİZDE'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quoteKaskoStatus"
                          value="KASKO BİZDE"
                          checked={kaskoStatus === 'KASKO BİZDE'}
                          onChange={() => setKaskoStatus('KASKO BİZDE')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>✓ KASKO BİZDE</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          kaskoStatus === 'KASKO BİZDE DEĞİL'
                            ? 'bg-amber-50 border-amber-500 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quoteKaskoStatus"
                          value="KASKO BİZDE DEĞİL"
                          checked={kaskoStatus === 'KASKO BİZDE DEĞİL'}
                          onChange={() => setKaskoStatus('KASKO BİZDE DEĞİL')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>⚠️ KASKO BİZDE DEĞİL</span>
                      </label>
                    </div>
                  </div>

                  {kaskoStatus === 'KASKO BİZDE DEĞİL' && (
                    <div className="pt-2 border-t border-blue-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Kasko Poliçesi Bitiş Tarihi *
                        </label>
                        <input
                          type="date"
                          required
                          value={kaskoEndDate}
                          onChange={(e) => setKaskoEndDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Kasko Sigorta Şirketi *
                        </label>
                        <select
                          required
                          value={kaskoCompany}
                          onChange={(e) => setKaskoCompany(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
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
            </div>

            {/* 4. Notlar (Görüşme & Teklif Notları - Korundu) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Görüşme & Teklif Notları</label>
              <textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder=""
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Footer - Tek bir Teklifi Kaydet Butonu */}
          <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Teklifi Sil
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {isEditing ? 'Teklifi Güncelle' : 'Teklifi Kaydet'}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            if (onDelete && initialQuote) {
              onDelete(initialQuote.id);
              onClose();
            }
          }}
          title="Teklif Silme Onayı"
          recordType="Teklif"
          recordDetails={
            initialQuote
              ? [
                  { label: 'Müşteri', value: initialQuote.insured },
                  { label: 'Teklif No', value: initialQuote.quoteNumber || '—' },
                  { label: 'Branş', value: initialQuote.branch },
                  { label: 'Plaka', value: initialQuote.plate || '—' },
                ]
              : []
          }
        />
      </div>
    </div>
  );
};
