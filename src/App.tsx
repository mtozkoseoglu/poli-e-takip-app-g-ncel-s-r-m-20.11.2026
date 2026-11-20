import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppData, Quote, Policy, CustomRule, PolicyEndorsement, RenewalRecord } from './types/insurance';
import {
  loadAppData,
  saveAppData,
  generateSampleData,
  getTodayIso,
  addDays,
  addOneYear,
  subtractOneYear,
  syncRenewalRecords,
  generateId,
  calculateDaysLeft,
  calculateMultiplier,
  deleteEndorsementAndRollbackPolicy,
} from './services/storage';
import { Sidebar, TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { QuotesView } from './components/QuotesView';
import { FollowUpsView } from './components/FollowUpsView';
import { ConcludedView } from './components/ConcludedView';
import { PoliciesView } from './components/PoliciesView';
import { RenewalsView } from './components/RenewalsView';
import { EndorsementsView } from './components/EndorsementsView';
import { AnalyticsView } from './components/AnalyticsView';
import { EndorsementModal } from './components/EndorsementModal';
import { CalendarView } from './components/CalendarView';
import { RemindersView } from './components/RemindersView';
import { RulesView } from './components/RulesView';
import { BackupView } from './components/BackupView';
import { QuoteModal } from './components/QuoteModal';
import { PolicyModal } from './components/PolicyModal';
import { ConvertToPolicyModal } from './components/ConvertToPolicyModal';
import { ConcludeQuoteModal } from './components/ConcludeQuoteModal';
import { ConcludePolicyModal } from './components/ConcludePolicyModal';
import { QuoteProgressModal } from './components/QuoteProgressModal';
import { DoganiumImportModal } from './components/DoganiumImportModal';
import { DoganiumCrossSellModal } from './components/DoganiumCrossSellModal';
import { Toast } from './components/Toast';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [concludedInitialFilter, setConcludedInitialFilter] = useState<'all' | 'converted' | 'rejected'>('all');
  const [remindersInitialFilter, setRemindersInitialFilter] = useState<'all' | 'urgent'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Independent "Zeyil Dahil Prim" view settings for ConcludedView and PoliciesView
  const [concludedIncludeEndorsementPremium, setConcludedIncludeEndorsementPremium] = useState<boolean>(() => {
    return !!appData.settings.concludedIncludeEndorsementPremium;
  });

  const [policiesIncludeEndorsementPremium, setPoliciesIncludeEndorsementPremium] = useState<boolean>(() => {
    return appData.settings.policiesIncludeEndorsementPremium !== undefined
      ? !!appData.settings.policiesIncludeEndorsementPremium
      : true;
  });

  const handleNavigateTab = useCallback((tab: TabType, filterOption?: string) => {
    if (tab === 'concluded') {
      setConcludedInitialFilter(filterOption === 'converted' ? 'converted' : 'all');
      setCurrentTab('concluded');
      return;
    }
    if (tab === 'policies') {
      setCurrentTab('policies');
      return;
    }
    if (tab === 'reminders') {
      setRemindersInitialFilter(filterOption === 'urgent' ? 'urgent' : 'all');
    }
    setCurrentTab(tab);
  }, []);

  const handleSelectMenuTab = useCallback((tab: TabType) => {
    setConcludedInitialFilter('all');
    setRemindersInitialFilter('all');
    setCurrentTab(tab);
  }, []);

  // Modals state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);

  const [isConcludeQuoteModalOpen, setIsConcludeQuoteModalOpen] = useState(false);
  const [concludingQuote, setConcludingQuote] = useState<Quote | null>(null);

  const [isConcludePolicyModalOpen, setIsConcludePolicyModalOpen] = useState(false);
  const [concludingPolicy, setConcludingPolicy] = useState<Policy | null>(null);

  const [isEndorsementModalOpen, setIsEndorsementModalOpen] = useState(false);
  const [endorsementInitialPolicy, setEndorsementInitialPolicy] = useState<Policy | null>(null);
  const [editingEndorsement, setEditingEndorsement] = useState<PolicyEndorsement | null>(null);

  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressModalQuote, setProgressModalQuote] = useState<Quote | null>(null);

  // Doğanium Excel Import & Cross-sell Modals
  const [isDoganiumImportModalOpen, setIsDoganiumImportModalOpen] = useState(false);
  const [isDoganiumCrossSellModalOpen, setIsDoganiumCrossSellModalOpen] = useState(false);
  const [pendingDoganiumQuotes, setPendingDoganiumQuotes] = useState<Quote[] | null>(() => {
    try {
      const raw = localStorage.getItem('doganium_pending_cross_sell_batch');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-dismiss toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Update storage whenever appData changes
  const updateData = useCallback((newData: AppData | ((prev: AppData) => AppData)) => {
    setAppData((prev) => {
      const next = typeof newData === 'function' ? newData(prev) : newData;
      const syncedRenewals = syncRenewalRecords(next.policies, next.renewals || []);
      const completeNext: AppData = {
        ...next,
        renewals: syncedRenewals,
      };
      saveAppData(completeNext);
      return completeNext;
    });
  }, []);

  // Handlers for Quotes
  const handleOpenNewQuote = () => {
    setEditingQuote(null);
    setIsQuoteModalOpen(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setIsQuoteModalOpen(true);
  };

  // Doğanium import & cross-sell callbacks
  const handleDoganiumImportConfirmed = (createdQuotes: Quote[]) => {
    setIsDoganiumImportModalOpen(false);
    setPendingDoganiumQuotes(createdQuotes);
    try {
      localStorage.setItem('doganium_pending_cross_sell_batch', JSON.stringify(createdQuotes));
    } catch (e) {
      console.error('Failed to save pending Doğanium batch to localStorage:', e);
    }
    setIsDoganiumCrossSellModalOpen(true);
  };

  const handleDoganiumCrossSellConfirmed = (finalQuotes: Quote[]) => {
    setIsDoganiumCrossSellModalOpen(false);
    try {
      localStorage.removeItem('doganium_pending_cross_sell_batch');
    } catch (e) {
      console.error(e);
    }
    setPendingDoganiumQuotes(null);

    let followUpCount = 0;
    updateData((prev) => {
      let currentQuotesList = [...prev.quotes];

      for (const quote of finalQuotes) {
        const existingIdx = currentQuotesList.findIndex((q) => q.id === quote.id);
        if (existingIdx >= 0) {
          currentQuotesList[existingIdx] = quote;
        } else {
          currentQuotesList = [quote, ...currentQuotesList];
        }

        const isKaskoWithoutTrafik =
          quote.branch === 'Kasko' && quote.trafficStatus === 'TRAFİK BİZDE DEĞİL';
        const isTrafikWithoutKasko =
          quote.branch === 'Trafik' && quote.kaskoStatus === 'KASKO BİZDE DEĞİL';

        if (isKaskoWithoutTrafik || isTrafikWithoutKasko) {
          const syncResult = syncCrossSellFollowUp(quote, currentQuotesList);
          currentQuotesList = syncResult.updatedQuotes;
          const qIdx = currentQuotesList.findIndex((q) => q.id === quote.id);
          if (qIdx >= 0) {
            currentQuotesList[qIdx] = syncResult.updatedItem as Quote;
          }
          followUpCount++;
        }
      }

      return {
        ...prev,
        quotes: currentQuotesList,
      };
    });

    showToast(
      `✓ ${finalQuotes.length} Doğanium teklifi başarıyla aktarıldı.${
        followUpCount > 0 ? ` ${followUpCount} araç için Takipteki İşler kaydı oluşturuldu.` : ''
      }`
    );
  };

  const handleClearPendingDoganiumBatch = () => {
    try {
      localStorage.removeItem('doganium_pending_cross_sell_batch');
    } catch (e) {
      console.error(e);
    }
    setPendingDoganiumQuotes(null);
    showToast('Bekleyen Doğanium çapraz satış kontrolü iptal edildi.');
  };

  // Sync follow-up quote for two-way cross-sell (Kasko -> Trafik or Trafik -> Kasko)
  const syncCrossSellFollowUp = (
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

  const handleSaveQuote = (quote: Quote) => {
    updateData((prev) => {
      const { updatedItem, updatedQuotes } = syncCrossSellFollowUp(quote, prev.quotes);
      const finalQuote = updatedItem as Quote;
      const index = updatedQuotes.findIndex((q) => q.id === finalQuote.id);
      let quotesList: Quote[];
      if (index >= 0) {
        quotesList = [...updatedQuotes];
        quotesList[index] = finalQuote;
      } else {
        quotesList = [finalQuote, ...updatedQuotes];
      }
      return { ...prev, quotes: quotesList };
    });
    showToast('Teklif başarıyla kaydedildi.');
  };

  const handleDeleteQuote = (id: string) => {
    updateData((prev) => ({
      ...prev,
      quotes: prev.quotes.filter((q) => q.id !== id),
    }));
    showToast('Teklif kaydı silindi.');
  };

  const handleOpenProgressModal = (quote: Quote) => {
    setProgressModalQuote(quote);
    setIsProgressModalOpen(true);
  };

  const handleUpdateQuote = (quote: Quote) => {
    handleSaveQuote(quote);
    setProgressModalQuote(quote);
  };

  // Handlers for Policies
  const handleOpenNewPolicy = () => {
    setEditingPolicy(null);
    setIsPolicyModalOpen(true);
  };

  const handleEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = (policy: Policy) => {
    updateData((prev) => {
      const { updatedItem, updatedQuotes } = syncCrossSellFollowUp(policy, prev.quotes);
      const finalPolicy = updatedItem as Policy;
      const index = prev.policies.findIndex((p) => p.id === finalPolicy.id);
      let updatedPolicies: Policy[];
      if (index >= 0) {
        updatedPolicies = [...prev.policies];
        updatedPolicies[index] = finalPolicy;
      } else {
        updatedPolicies = [finalPolicy, ...prev.policies];
      }
      return { ...prev, policies: updatedPolicies, quotes: updatedQuotes };
    });
    showToast('Poliçe başarıyla kaydedildi.');
  };

  const handleToggleFollowUpStatus = (quoteId: string, currentStatus?: 'active' | 'completed' | 'passive') => {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    updateData((prev) => ({
      ...prev,
      quotes: prev.quotes.map((q) =>
        q.id === quoteId
          ? {
              ...q,
              followUpStatus: newStatus,
              followUpCompletedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            }
          : q
      ),
    }));
    showToast(newStatus === 'completed' ? 'Takip işi tamamlandı olarak işaretlendi.' : 'Takip işi tekrar aktif takibe alındı.');
  };

  const handleDeletePolicy = (id: string) => {
    updateData((prev) => ({
      ...prev,
      policies: prev.policies.filter((p) => p.id !== id),
    }));
    showToast('Poliçe kaydı silindi.');
  };

  const handleRescheduleFollowUp = (
    quoteId: string,
    newCompany: string,
    newEndDate: string
  ) => {
    updateData((prev) => {
      const updatedQuotes = prev.quotes.map((q) => {
        if (q.id === quoteId) {
          return {
            ...q,
            company: newCompany,
            validUntil: newEndDate,
            endDate: newEndDate,
            followDate: newEndDate,
            trafficCompany: q.branch === 'Trafik' ? newCompany : q.trafficCompany,
            trafficEndDate: q.branch === 'Trafik' ? newEndDate : q.trafficEndDate,
            kaskoCompany: q.branch === 'Kasko' ? newCompany : q.kaskoCompany,
            kaskoEndDate: q.branch === 'Kasko' ? newEndDate : q.kaskoEndDate,
            status: 'active' as const,
            followUpStatus: 'active' as const,
            notes: (q.notes ? q.notes + ' | ' : '') + `Takibe alındı (${newCompany}, yeni vade: ${newEndDate})`,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });
      return { ...prev, quotes: updatedQuotes };
    });
    showToast('Takip kaydı yeni şirket ve bitiş tarihiyle takibe alındı.');
  };

  // Convert Quote to Policy (Olumlu Sonuç)
  const handleStartConvertToPolicy = (quote: Quote) => {
    setConvertingQuote(quote);
    setIsConvertModalOpen(true);
  };

  const handleConfirmConvertToPolicy = (quoteId: string, createdPolicy: Policy) => {
    const todayStr = getTodayIso();
    updateData((prev) => {
      // 1. Mark quote as converted and concluded
      const updatedQuotes = prev.quotes.map((q) => {
        if (q.id === quoteId || (createdPolicy.originQuoteId && q.id === createdPolicy.originQuoteId)) {
          return {
            ...q,
            status: 'concluded' as const,
            quoteStatus: 'kabul_edildi' as const,
            outcome: 'converted' as const,
            followUpStatus: 'completed' as const,
            convertedPolicyId: createdPolicy.id,
            rejectionReason: undefined,
            nonConversionReason: undefined,
            resultDate: todayStr,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });

      // 2. Mark previous policy for this vehicle/insured & branch as renewed/concluded
      const cleanPlate = (pl?: string) => (pl ? pl.replace(/\s+/g, '').toLocaleUpperCase('tr-TR') : '');
      const newPlate = cleanPlate(createdPolicy.plate);
      const newInsured = createdPolicy.insured.trim().toLocaleLowerCase('tr-TR');
      const newBranch = createdPolicy.branch.trim().toLocaleLowerCase('tr-TR');

      const updatedPoliciesList = prev.policies.map((p) => {
        const oldPlate = cleanPlate(p.plate);
        const oldInsured = p.insured.trim().toLocaleLowerCase('tr-TR');
        const oldBranch = p.branch.trim().toLocaleLowerCase('tr-TR');

        const isSameTarget = newPlate && oldPlate
          ? newPlate === oldPlate
          : newInsured === oldInsured && newBranch === oldBranch;

        if (isSameTarget && p.id !== createdPolicy.id && p.status !== 'Sonuçlandı') {
          return {
            ...p,
            status: 'Sonuçlandı' as const,
            outcome: 'renewed' as const,
            concludedReason: `Yenilendi - Yeni Poliçe No: ${createdPolicy.policyNumber}`,
            resultDate: todayStr,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });

      // 3. Sync cross-sell follow-up quote if applicable
      const { updatedItem: finalCreatedPolicy, updatedQuotes: syncedQuotes } = syncCrossSellFollowUp(
        createdPolicy,
        updatedQuotes
      );

      // 4. Add newly created policy
      const updatedPolicies = [finalCreatedPolicy as Policy, ...updatedPoliciesList];

      return {
        ...prev,
        quotes: syncedQuotes,
        policies: updatedPolicies,
      };
    });

    showToast('🎉 Teklif poliçeye dönüştürüldü! "Sonuçlananlar" sekmesine aktarıldı.');
  };

  // Conclude Quote Negatively (Yapılmadı / Reddedildi)
  const handleStartConcludeNegative = (quote: Quote) => {
    setConcludingQuote(quote);
    setIsConcludeQuoteModalOpen(true);
  };

  const handleConfirmConcludeNegative = (
    quoteId: string,
    reason: string,
    note: string,
    followUpData?: { createFollowUp: boolean; targetDate?: string }
  ) => {
    const todayStr = getTodayIso();
    updateData((prev) => {
      let createdFollowUpQuote: Quote | null = null;
      const targetQuote = prev.quotes.find((q) => q.id === quoteId);

      if (targetQuote && followUpData?.createFollowUp) {
        const targetDate =
          followUpData.targetDate ||
          (targetQuote.endDate || targetQuote.validUntil
            ? addOneYear(targetQuote.endDate || targetQuote.validUntil)
            : addOneYear(todayStr));

        const cleanPlate = (pl?: string) => (pl ? pl.replace(/\s+/g, '').toLocaleUpperCase('tr-TR') : '');
        const targetPlate = cleanPlate(targetQuote.plate);
        const targetInsured = targetQuote.insured.trim().toLocaleLowerCase('tr-TR');
        const targetBranch = targetQuote.branch;

        // Check for duplicate in active quotes
        const hasExistingFollowUp = prev.quotes.some((q) => {
          if (q.id === quoteId || q.status === 'concluded') return false;
          const qPlate = cleanPlate(q.plate);
          const qInsured = q.insured.trim().toLocaleLowerCase('tr-TR');
          const isMatch = targetPlate && qPlate ? targetPlate === qPlate : targetInsured === qInsured;
          return isMatch && q.branch === targetBranch && q.businessType === 'Takip';
        });

        if (!hasExistingFollowUp) {
          const newFollowUpId = generateId();
          createdFollowUpQuote = {
            id: newFollowUpId,
            type: 'quote',
            quoteNumber: 'TKP-' + Math.floor(100000 + Math.random() * 900000),
            insured: targetQuote.insured,
            phone: targetQuote.phone || '',
            email: targetQuote.email || '',
            plate: targetQuote.plate || '',
            licenseSerialNo: targetQuote.licenseSerialNo || '',
            chassisNo: targetQuote.chassisNo || '',
            engineNo: targetQuote.engineNo || '',
            usageStyle: targetQuote.usageStyle || '',
            vehicleBrand: targetQuote.vehicleBrand || '',
            vehicleModel: targetQuote.vehicleModel || '',
            vehicleYear: targetQuote.vehicleYear,
            vehicleCode: targetQuote.vehicleCode || '',
            fuelType: targetQuote.fuelType || '',
            vehicleValue: targetQuote.vehicleValue,
            vehicleDetail: targetQuote.vehicleDetail,
            businessType: 'Takip',
            branch: targetQuote.branch,
            company: targetQuote.company || 'TÜRKİYE SİGORTA',
            quoteDate: todayStr,
            validUntil: targetDate,
            followDate: targetDate,
            premium: 0,
            stage: 'MÜŞTERİYE SUNULACAK',
            status: 'active',
            quoteStatus: 'beklemede',
            originQuoteId: targetQuote.id,
            notes: `Gelecek yıl yenileme takibi (Önceki Teklif: ${targetQuote.quoteNumber || targetQuote.id} - Olumsuz Neden: ${reason}${note ? ' - Not: ' + note : ''})`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      }

      const updatedQuotes = prev.quotes.map((q) => {
        if (q.id === quoteId) {
          return {
            ...q,
            status: 'concluded' as const,
            quoteStatus: 'reddedildi' as const,
            outcome: 'rejected' as const,
            rejectionReason: reason,
            nonConversionReason: reason,
            rejectionNote: note,
            resultDate: todayStr,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });

      const finalQuotes = createdFollowUpQuote ? [createdFollowUpQuote, ...updatedQuotes] : updatedQuotes;
      return { ...prev, quotes: finalQuotes };
    });

    if (followUpData?.createFollowUp) {
      showToast('Teklif "Sonuçlananlar" sekmesine aktarıldı ve gelecek yıl için takibe alındı.');
    } else {
      showToast('Teklif "Sonuçlananlar" sekmesine "Yapılmadı" olarak aktarıldı.');
    }
  };

  // Conclude Active Policy (Süresi Doldu / Arşivlendi)
  const handleStartConcludePolicy = (policy: Policy) => {
    setConcludingPolicy(policy);
    setIsConcludePolicyModalOpen(true);
  };

  const handleConfirmConcludePolicy = (
    policyId: string,
    outcome: 'completed' | 'cancelled' | 'renewed',
    reason: string
  ) => {
    const todayStr = getTodayIso();
    updateData((prev) => {
      const updatedPolicies = prev.policies.map((p) => {
        if (p.id === policyId) {
          return {
            ...p,
            status: 'Sonuçlandı' as const,
            outcome,
            concludedReason: reason,
            resultDate: todayStr,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      return { ...prev, policies: updatedPolicies };
    });

    showToast('Poliçe sonuçlandırıldı ve "Sonuçlananlar" sekmesine aktarıldı.');
  };

  // Re-open concluded items
  const handleReopenQuote = (quoteId: string) => {
    updateData((prev) => {
      const updatedQuotes = prev.quotes.map((q) => {
        if (q.id === quoteId) {
          return {
            ...q,
            status: 'active' as const,
            quoteStatus: 'beklemede' as const,
            stage: 'MÜŞTERİYE SUNULACAK' as const,
            outcome: undefined,
            resultDate: undefined,
            rejectionReason: undefined,
            nonConversionReason: undefined,
            rejectionNote: undefined,
            convertedPolicyId: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });
      return { ...prev, quotes: updatedQuotes };
    });
    showToast('Teklif tekrar aktif listeye alındı.');
  };

  const handleReopenPolicy = (policyId: string) => {
    updateData((prev) => {
      const updatedPolicies = prev.policies.map((p) => {
        if (p.id === policyId) {
          return {
            ...p,
            status: 'Portföyde' as const,
            outcome: undefined,
            resultDate: undefined,
            concludedReason: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      return { ...prev, policies: updatedPolicies };
    });
    showToast('Poliçe tekrar aktif portföye alındı.');
  };

  // Create renewal quote from existing policy
  const handleCreateRenewalQuote = (policy: Policy) => {
    // Yenileme Tarih Mantığı:
    // Yenileme Başlangıç Tarihi = Ana Poliçenin Bitiş Tarihi
    // Yenileme Bitiş Tarihi = Yenileme Başlangıç Tarihinin 1 takvim yılı sonrası
    const renewalStart = policy.endDate || getTodayIso();
    const renewalEnd = addOneYear(renewalStart);

    const prevPrem = typeof policy.currentPremium === 'number'
      ? policy.currentPremium
      : (policy.premium || 0);

    const newQuote: Quote = {
      id: generateId(),
      type: 'quote',
      insured: policy.insured,
      phone: policy.phone || '',
      email: policy.email || '',
      plate: policy.plate || '',
      licenseSerialNo: policy.licenseSerialNo || '',
      chassisNo: policy.chassisNo || '',
      engineNo: policy.engineNo || '',
      usageStyle: policy.usageStyle || '',
      vehicleBrand: policy.vehicleBrand || '',
      vehicleModel: policy.vehicleModel || '',
      vehicleCode: policy.vehicleCode || '',
      fuelType: policy.fuelType || '',
      vehicleYear: policy.vehicleYear,
      vehicleValue: policy.vehicleValue,
      vehicleDetail: policy.vehicleDetail || '',
      businessType: 'Yenileme',
      // Yeni dönem teklifi henüz çalışılmadı: Şirket boş, prim 0, eklenen teklifler boş
      company: '',
      branch: policy.branch,
      quoteNumber: 'TK-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      quoteDate: getTodayIso(),
      startDate: renewalStart,
      endDate: renewalEnd,
      validUntil: renewalStart,
      premium: 0,
      stage: 'MÜŞTERİYE SUNULACAK',
      status: 'active',
      notes: `${policy.policyNumber} nolu poliçenin yenileme teklifidir.`,
      companyOffers: [],
      originPolicyId: policy.id,
      // Önceki Yılın Poliçe Bilgileri (Teklif ekranında bilgilendirme bloğu için)
      previousCompany: policy.company,
      previousPolicyNumber: policy.policyNumber,
      previousPremium: prevPrem,
      previousPolicyNotes: policy.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingQuote(newQuote);
    setIsQuoteModalOpen(true);
  };

  const handleNavigateToPolicy = (policyId: string) => {
    const pol = appData.policies.find((p) => p.id === policyId);
    if (pol) {
      handleNavigateTab('policies');
      handleEditPolicy(pol);
    }
  };

  const handleToggleConcludedPremiumDisplay = useCallback((val: boolean) => {
    setConcludedIncludeEndorsementPremium(val);
    updateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        concludedIncludeEndorsementPremium: val,
      },
    }));
  }, [updateData]);

  const handleTogglePoliciesPremiumDisplay = useCallback((val: boolean) => {
    setPoliciesIncludeEndorsementPremium(val);
    updateData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        policiesIncludeEndorsementPremium: val,
      },
    }));
  }, [updateData]);

  // Rules & Settings Handlers
  const handleSaveReminderDays = (days: number[]) => {
    updateData((prev) => ({
      ...prev,
      settings: { ...prev.settings, reminderDays: days },
    }));
    showToast('Hatırlatma günleri güncellendi.');
  };

  const handleSaveRule = (rule: CustomRule) => {
    updateData((prev) => {
      const idx = prev.rules.findIndex((r) => r.id === rule.id);
      let updated: CustomRule[];
      if (idx >= 0) {
        updated = [...prev.rules];
        updated[idx] = rule;
      } else {
        updated = [rule, ...prev.rules];
      }
      return { ...prev, rules: updated };
    });
    showToast('Kontrol kuralı kaydedildi.');
  };

  const handleDeleteRule = (id: string) => {
    updateData((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== id),
    }));
    showToast('Kural silindi.');
  };

  // Backup & Reset Handlers
  const handleRestoreData = (restored: AppData) => {
    updateData(restored);
  };

  const handleResetToSample = () => {
    const sample = generateSampleData();
    updateData(sample);
  };

  // Endorsement Handlers
  const handleOpenNewEndorsement = (policy?: Policy) => {
    setEndorsementInitialPolicy(policy || null);
    setEditingEndorsement(null);
    setIsEndorsementModalOpen(true);
  };

  const handleOpenEditEndorsement = (endorsement: PolicyEndorsement) => {
    const parentPolicy = appData.policies.find((p) => p.id === endorsement.policyId || p.policyNumber.trim() === endorsement.policyNumber.trim());
    setEndorsementInitialPolicy(parentPolicy || null);
    setEditingEndorsement(endorsement);
    setIsEndorsementModalOpen(true);
  };

  const handleDeleteEndorsement = (endorsement: PolicyEndorsement) => {
    updateData((prev) => {
      const res = deleteEndorsementAndRollbackPolicy(endorsement.id, prev.policies, prev.endorsements || []);
      if (!res.success) {
        showToast(res.message || 'Zeyil silinemedi.');
        return prev;
      }
      return {
        ...prev,
        policies: res.policies,
        endorsements: res.endorsements,
      };
    });
    showToast(`✓ ${endorsement.endorsementNumber} nolu zeyil silindi ve ana poliçe önceki durumuna geri yüklendi.`);
  };

  const handleSaveEndorsement = (endorsement: PolicyEndorsement, updatedPolicy: Policy) => {
    updateData((prev) => {
      // 1. Update policy in policies list
      const updatedPolicies = prev.policies.map((p) => (p.id === updatedPolicy.id ? updatedPolicy : p));
      const finalPolicies = updatedPolicies.some((p) => p.id === updatedPolicy.id)
        ? updatedPolicies
        : [updatedPolicy, ...prev.policies];

      // 2. Prepend or update endorsement in endorsements list
      const existingEndorsements = prev.endorsements || [];
      const exists = existingEndorsements.some((e) => e.id === endorsement.id);
      const updatedEndorsements = exists
        ? existingEndorsements.map((e) => (e.id === endorsement.id ? endorsement : e))
        : [endorsement, ...existingEndorsements];

      return {
        ...prev,
        policies: finalPolicies,
        endorsements: updatedEndorsements,
      };
    });

    setEditingEndorsement(null);
    showToast(`✓ ${endorsement.endorsementNumber} zeyli kaydedildi ve ${updatedPolicy.policyNumber} poliçesi güncellendi.`);
  };

  // Live badge counts (Teklifler sekmesi sayacı yalnızca normal teklifleri sayar)
  const activeQuotesCount = useMemo(() => {
    return appData.quotes.filter(
      (q) => q.status === 'active' && q.businessType !== 'Takip' && (q.businessType as any) !== 'TAKİP'
    ).length;
  }, [appData.quotes]);

  const activePoliciesCount = useMemo(() => {
    return appData.policies.length;
  }, [appData.policies]);

  const rejectedQuotesCount = useMemo(() => {
    return appData.quotes.filter((q) => q.status === 'concluded' && q.outcome !== 'converted').length;
  }, [appData.quotes]);

  const followUpsCount = useMemo(() => {
    return appData.quotes.filter(
      (q) => q.businessType === 'Takip' && q.followUpStatus !== 'completed' && q.status !== 'concluded'
    ).length;
  }, [appData.quotes]);

  const concludedCount = useMemo(() => {
    // Total distinct concluded records: all policies (Poliçeleşenler) + rejected quotes (Poliçeleşmeyenler)
    // Converted quotes are represented by their policy record and therefore never counted twice!
    return activePoliciesCount + rejectedQuotesCount;
  }, [activePoliciesCount, rejectedQuotesCount]);

  const urgentRemindersCount = useMemo(() => {
    return appData.policies.filter((p) => {
      if (p.status === 'Sonuçlandı') return false;
      const days = calculateDaysLeft(p.endDate);
      return days !== null && days <= 7;
    }).length;
  }, [appData.policies]);

  const endorsementsCount = useMemo(() => {
    return (appData.endorsements || []).length;
  }, [appData.endorsements]);

  const renewalsCount = useMemo(() => {
    return (appData.renewals || []).filter((r) => r.status !== 'cancelled').length;
  }, [appData.renewals]);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectMenuTab}
          activeQuotesCount={activeQuotesCount}
          activePoliciesCount={activePoliciesCount}
          renewalsCount={renewalsCount}
          followUpsCount={followUpsCount}
          concludedCount={concludedCount}
          urgentRemindersCount={urgentRemindersCount}
          endorsementsCount={endorsementsCount}
        />
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-50 flex">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                handleSelectMenuTab(tab);
                setMobileMenuOpen(false);
              }}
              activeQuotesCount={activeQuotesCount}
              activePoliciesCount={activePoliciesCount}
              renewalsCount={renewalsCount}
              followUpsCount={followUpsCount}
              concludedCount={concludedCount}
              urgentRemindersCount={urgentRemindersCount}
              endorsementsCount={endorsementsCount}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentTab={currentTab}
          onOpenNewQuote={handleOpenNewQuote}
          onOpenNewPolicy={handleOpenNewPolicy}
          onOpenNewEndorsement={() => handleOpenNewEndorsement()}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                quotes={appData.quotes}
                policies={appData.policies}
                onOpenNewQuote={handleOpenNewQuote}
                onOpenNewPolicy={handleOpenNewPolicy}
                onViewQuote={handleEditQuote}
                onViewPolicy={handleEditPolicy}
                onConvertToPolicy={handleStartConvertToPolicy}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {currentTab === 'quotes' && (
              <QuotesView
                quotes={appData.quotes}
                policies={appData.policies}
                endorsements={appData.endorsements}
                onOpenNewQuote={handleOpenNewQuote}
                onEditQuote={handleEditQuote}
                onOpenConcludeModal={(quote) => {
                  setConcludingQuote(quote);
                  setIsConcludeQuoteModalOpen(true);
                }}
                onConvertToPolicy={handleStartConvertToPolicy}
                onConcludeNegative={handleStartConcludeNegative}
                onOpenProgressModal={handleOpenProgressModal}
                onUpdateQuote={handleUpdateQuote}
                onDeleteQuote={handleDeleteQuote}
                showToast={showToast}
                onOpenDoganiumImport={() => setIsDoganiumImportModalOpen(true)}
                pendingDoganiumBatch={pendingDoganiumQuotes}
                onOpenPendingDoganiumCrossSell={() => setIsDoganiumCrossSellModalOpen(true)}
                onClearPendingDoganiumBatch={handleClearPendingDoganiumBatch}
              />
            )}

            {currentTab === 'followups' && (
              <FollowUpsView
                quotes={appData.quotes}
                policies={appData.policies}
                onOpenNewQuote={(defaultBt) => {
                  setEditingQuote(null);
                  setIsQuoteModalOpen(true);
                }}
                onEditQuote={handleEditQuote}
                onConvertToPolicy={handleConfirmConvertToPolicy}
                onDropFollowUp={handleDeleteQuote}
                onRescheduleFollowUp={handleRescheduleFollowUp}
                onDeleteFollowUp={handleDeleteQuote}
                onToggleFollowUpStatus={handleToggleFollowUpStatus}
              />
            )}

            {currentTab === 'policies' && (
              <PoliciesView
                policies={appData.policies}
                onOpenNewPolicy={handleOpenNewPolicy}
                onEditPolicy={handleEditPolicy}
                onDeletePolicy={handleDeletePolicy}
                onCreateRenewalQuote={handleCreateRenewalQuote}
                onNewEndorsement={(policy) => handleOpenNewEndorsement(policy)}
                includeEndorsementPremium={policiesIncludeEndorsementPremium}
                onToggleIncludeEndorsementPremium={handleTogglePoliciesPremiumDisplay}
              />
            )}

            {currentTab === 'renewals' && (
              <RenewalsView
                renewals={appData.renewals || []}
                policies={appData.policies}
                onCreateRenewalQuote={handleCreateRenewalQuote}
                onViewPolicy={handleEditPolicy}
              />
            )}

            {currentTab === 'concluded' && (
              <ConcludedView
                quotes={appData.quotes}
                policies={appData.policies}
                onOpenNewPolicy={handleOpenNewPolicy}
                onEditPolicy={handleEditPolicy}
                onDeletePolicy={handleDeletePolicy}
                onViewQuote={handleEditQuote}
                onDeleteQuote={handleDeleteQuote}
                onReopenQuote={handleReopenQuote}
                onCreateRenewalQuote={handleCreateRenewalQuote}
                onNewEndorsement={(policy) => handleOpenNewEndorsement(policy)}
                initialStatusFilter={concludedInitialFilter}
                includeEndorsementPremium={concludedIncludeEndorsementPremium}
                onToggleIncludeEndorsementPremium={handleToggleConcludedPremiumDisplay}
              />
            )}

            {currentTab === 'endorsements' && (
              <EndorsementsView
                endorsements={appData.endorsements || []}
                policies={appData.policies}
                onOpenNewEndorsement={() => handleOpenNewEndorsement()}
                onViewPolicy={handleEditPolicy}
                onDeleteEndorsement={handleDeleteEndorsement}
                onEditEndorsement={handleOpenEditEndorsement}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView
                policies={appData.policies}
                quotes={appData.quotes}
                endorsements={appData.endorsements}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {currentTab === 'calendar' && (
              <CalendarView
                quotes={appData.quotes}
                policies={appData.policies}
                onViewQuote={handleEditQuote}
                onViewPolicy={handleEditPolicy}
              />
            )}

            {currentTab === 'reminders' && (
              <RemindersView
                quotes={appData.quotes}
                policies={appData.policies}
                reminderDays={appData.settings.reminderDays}
                onViewQuote={handleEditQuote}
                onViewPolicy={handleEditPolicy}
                onConvertToPolicy={handleStartConvertToPolicy}
                onOpenConcludeModal={(quote) => {
                  setConcludingQuote(quote);
                  setIsConcludeQuoteModalOpen(true);
                }}
                initialFilter={remindersInitialFilter}
              />
            )}

            {currentTab === 'rules' && (
              <RulesView
                rules={appData.rules}
                reminderDays={appData.settings.reminderDays}
                onSaveReminderDays={handleSaveReminderDays}
                onSaveRule={handleSaveRule}
                onDeleteRule={handleDeleteRule}
              />
            )}

            {currentTab === 'backup' && (
              <BackupView
                appData={appData}
                onRestoreData={handleRestoreData}
                onResetToSample={handleResetToSample}
                showToast={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Quote Modal */}
      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        onSave={handleSaveQuote}
        onDelete={handleDeleteQuote}
        onConvertToPolicy={handleStartConvertToPolicy}
        onConcludeNegative={handleStartConcludeNegative}
        initialQuote={editingQuote}
        quotes={appData.quotes}
        policies={appData.policies}
        isFollowUpView={currentTab === 'followups'}
      />

      {/* Policy Modal */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onSave={handleSavePolicy}
        onDelete={handleDeletePolicy}
        onConclude={handleStartConcludePolicy}
        onCreateRenewalQuote={handleCreateRenewalQuote}
        initialPolicy={editingPolicy}
        rules={appData.rules}
      />

      {/* Convert Quote to Policy Modal */}
      <ConvertToPolicyModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        quote={convertingQuote}
        onConfirm={handleConfirmConvertToPolicy}
      />

      {/* Unified Conclude Quote Modal (Positive with Company Offers & Negative with Reason) */}
      <ConcludeQuoteModal
        isOpen={isConcludeQuoteModalOpen}
        onClose={() => setIsConcludeQuoteModalOpen(false)}
        quote={concludingQuote}
        onConfirmPositive={handleConfirmConvertToPolicy}
        onConfirmNegative={handleConfirmConcludeNegative}
      />

      {/* Conclude Active Policy Modal */}
      <ConcludePolicyModal
        isOpen={isConcludePolicyModalOpen}
        onClose={() => setIsConcludePolicyModalOpen(false)}
        policy={concludingPolicy}
        onConfirm={handleConfirmConcludePolicy}
      />

      {/* Quote Progress Tracking Modal */}
      <QuoteProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        quote={progressModalQuote}
        onUpdateQuote={handleUpdateQuote}
        onConvertToPolicy={handleStartConvertToPolicy}
        onConcludeNegative={handleStartConcludeNegative}
      />

      {/* Endorsement Modal */}
      <EndorsementModal
        isOpen={isEndorsementModalOpen}
        onClose={() => {
          setIsEndorsementModalOpen(false);
          setEditingEndorsement(null);
        }}
        policies={appData.policies}
        endorsements={appData.endorsements || []}
        initialPolicy={endorsementInitialPolicy}
        initialEndorsement={editingEndorsement}
        onSaveEndorsement={handleSaveEndorsement}
      />

      {/* Doğanium Bulk Import Modal */}
      <DoganiumImportModal
        isOpen={isDoganiumImportModalOpen}
        onClose={() => setIsDoganiumImportModalOpen(false)}
        existingQuotes={appData.quotes}
        onConfirmImport={handleDoganiumImportConfirmed}
        showToast={showToast}
      />

      {/* Doğanium Post-Import Cross-Sell Modal */}
      <DoganiumCrossSellModal
        isOpen={isDoganiumCrossSellModalOpen}
        onClose={() => setIsDoganiumCrossSellModalOpen(false)}
        importedQuotes={pendingDoganiumQuotes || []}
        onConfirm={handleDoganiumCrossSellConfirmed}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
