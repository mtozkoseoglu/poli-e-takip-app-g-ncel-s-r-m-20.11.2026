import React, { useState, useEffect, useMemo } from 'react';
import { Quote, Policy, COMPANIES, BRANCHES, NON_CONVERSION_REASONS } from '../types/insurance';
import {
  formatCurrency,
  formatDateTr,
  calculateDaysLeft,
  calculateMultiplier,
  formatMultiplier,
  downloadFile,
  getTodayIso,
} from '../services/storage';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Archive,
  Download,
  FileText,
  Shield,
  RotateCcw,
  ArrowRight,
  Plus,
  RefreshCw,
  Trash2,
  SlidersHorizontal,
  Info,
  Car,
  Phone,
  Calendar,
  AlertTriangle,
  Eye,
  Layers,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface Props {
  quotes: Quote[];
  policies: Policy[];
  onOpenNewPolicy: () => void;
  onEditPolicy: (policy: Policy) => void;
  onDeletePolicy: (id: string) => void;
  onViewQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onReopenQuote: (quoteId: string) => void;
  onCreateRenewalQuote: (policy: Policy) => void;
  onNewEndorsement?: (policy: Policy) => void;
  initialStatusFilter?: ConcludedStatusFilter;
  includeEndorsementPremium?: boolean;
  onToggleIncludeEndorsementPremium?: (val: boolean) => void;
}

export type ConcludedStatusFilter = 'all' | 'converted' | 'rejected';

export interface UnifiedConcludedItem {
  id: string;
  sourceType: 'policy' | 'quote';
  status: 'converted' | 'rejected'; // 'converted' = Poliçeleşti, 'rejected' = Poliçeleşmedi
  statusLabel: string;
  insured: string;
  businessType?: 'Yeni İş' | 'Yenileme' | 'Takip';
  phone?: string;
  email?: string;
  plate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number | string;
  vehicleValue?: number;
  multiplier?: number | null;
  company: string;
  branch: string;
  originalPremium: number;
  currentPremium: number;
  totalAdditionalPremium?: number;
  totalRefundPremium?: number;
  premium: number;
  referenceNumber: string; // Poliçe No veya Teklif No
  startDate?: string;
  endDate?: string;
  resultDate?: string;
  nonConversionReason?: string;
  rejectionNote?: string;
  notes?: string;
  doc?: boolean;
  endorse?: boolean;
  egm?: boolean;
  originQuoteId?: string;
  policyStatus?: string;
  originalPolicy?: Policy;
  originalQuote?: Quote;
}

export const ConcludedView: React.FC<Props> = ({
  quotes,
  policies,
  onOpenNewPolicy,
  onEditPolicy,
  onDeletePolicy,
  onViewQuote,
  onDeleteQuote,
  onReopenQuote,
  onCreateRenewalQuote,
  onNewEndorsement,
  initialStatusFilter,
  includeEndorsementPremium = false,
  onToggleIncludeEndorsementPremium,
}) => {
  const [statusFilter, setStatusFilter] = useState<ConcludedStatusFilter>(initialStatusFilter || 'all');
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [itemToDelete, setItemToDelete] = useState<UnifiedConcludedItem | null>(null);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // 1. Build unified, deduplicated list of concluded items
  const allItems: UnifiedConcludedItem[] = useMemo(() => {
    const list: UnifiedConcludedItem[] = [];

    // Track origin quotes that correspond to policies in the list to avoid duplicate records
    const policyOriginQuoteIds = new Set<string>();
    policies.forEach((p) => {
      if (p.originQuoteId) {
        policyOriginQuoteIds.add(p.originQuoteId);
      }
    });

    const quoteConvertedPolicyIds = new Set<string>();
    quotes.forEach((q) => {
      if (q.convertedPolicyId) {
        quoteConvertedPolicyIds.add(q.convertedPolicyId);
      }
    });

    // A. POLİÇELEŞEN KAYITLAR (Tüm Poliçeler)
    // Her poliçe "Poliçeleşti: Teklif kabul edilmiş ve poliçe oluşturulmuş" statüsünü temsil eder.
    policies.forEach((p) => {
      const origPrem = p.originalPremium ?? p.premium ?? 0;
      const currPrem = p.currentPremium ?? p.premium ?? 0;
      const mult = calculateMultiplier(currPrem, p.vehicleValue, p.branch);
      list.push({
        id: `pol-${p.id}`,
        sourceType: 'policy',
        status: 'converted',
        statusLabel: 'Poliçeleşti',
        insured: p.insured,
        businessType: p.businessType || 'Yenileme',
        phone: p.phone,
        email: p.email,
        plate: p.plate,
        vehicleBrand: p.vehicleBrand,
        vehicleModel: p.vehicleModel,
        vehicleYear: p.vehicleYear,
        vehicleValue: p.vehicleValue,
        multiplier: mult,
        company: p.company,
        branch: p.branch,
        originalPremium: origPrem,
        currentPremium: currPrem,
        totalAdditionalPremium: p.totalAdditionalPremium || 0,
        totalRefundPremium: p.totalRefundPremium || 0,
        premium: includeEndorsementPremium ? currPrem : origPrem,
        referenceNumber: p.policyNumber || 'Poliçe No Yok',
        startDate: p.startDate,
        endDate: p.endDate,
        resultDate: p.resultDate || p.startDate,
        notes: p.notes,
        originQuoteId: p.originQuoteId,
        policyStatus: p.status,
        originalPolicy: p,
      });
    });

    // B. Converted quotes that may not have a matching policy in policies list (Safety net against data loss)
    quotes
      .filter((q) => q.status === 'concluded' && q.outcome === 'converted')
      .forEach((q) => {
        const hasMatchingPolicy =
          (q.convertedPolicyId && policies.some((p) => p.id === q.convertedPolicyId)) ||
          policyOriginQuoteIds.has(q.id);

        if (!hasMatchingPolicy) {
          const qPrem = q.premium || 0;
          const mult = calculateMultiplier(qPrem, q.vehicleValue, q.branch);
          list.push({
            id: `quote-conv-${q.id}`,
            sourceType: 'quote',
            status: 'converted',
            statusLabel: 'Poliçeleşti',
            insured: q.insured,
            businessType: q.businessType || 'Yenileme',
            phone: q.phone,
            email: q.email,
            plate: q.plate,
            vehicleBrand: q.vehicleBrand,
            vehicleModel: q.vehicleModel,
            vehicleYear: q.vehicleYear,
            vehicleValue: q.vehicleValue,
            multiplier: mult,
            company: q.company,
            branch: q.branch,
            originalPremium: qPrem,
            currentPremium: qPrem,
            totalAdditionalPremium: 0,
            totalRefundPremium: 0,
            premium: qPrem,
            referenceNumber: q.quoteNumber || 'Tekliften Tanzim',
            startDate: q.quoteDate,
            endDate: q.validUntil,
            resultDate: q.resultDate || q.updatedAt,
            notes: q.notes,
            originQuoteId: q.id,
            originalQuote: q,
          });
        }
      });

    // C. POLİÇELEŞMEYEN KAYITLAR (Teklif sonuçlanmış ancak poliçe oluşturulmamış)
    // Sadece sonuçlanan ve poliçeleşmemiş teklifler buraya dahil edilir.
    // Devam eden (status === 'active') teklifler ASLA buraya eklenmez.
    quotes
      .filter((q) => q.status === 'concluded' && q.outcome !== 'converted')
      .forEach((q) => {
        const qPrem = q.premium || 0;
        list.push({
          id: `quote-rej-${q.id}`,
          sourceType: 'quote',
          status: 'rejected',
          statusLabel: 'Poliçeleşmedi',
          insured: q.insured,
          businessType: q.businessType || 'Yenileme',
          phone: q.phone,
          email: q.email,
          plate: q.plate,
          vehicleBrand: q.vehicleBrand,
          vehicleModel: q.vehicleModel,
          vehicleYear: q.vehicleYear,
          vehicleValue: q.vehicleValue,
          multiplier: null,
          company: q.company,
          branch: q.branch,
          originalPremium: qPrem,
          currentPremium: qPrem,
          totalAdditionalPremium: 0,
          totalRefundPremium: 0,
          premium: qPrem,
          referenceNumber: q.quoteNumber || 'Teklif No Yok',
          startDate: q.quoteDate,
          endDate: q.validUntil,
          resultDate: q.resultDate || q.updatedAt,
          nonConversionReason: q.nonConversionReason || q.rejectionReason || undefined,
          rejectionNote: q.rejectionNote || q.notes,
          notes: q.notes,
          originalQuote: q,
        });
      });

    // Sort by resultDate / startDate descending (most recent first)
    return list.sort((a, b) => {
      const dateA = a.resultDate || a.startDate ? new Date(a.resultDate || a.startDate || '').getTime() : 0;
      const dateB = b.resultDate || b.startDate ? new Date(b.resultDate || b.startDate || '').getTime() : 0;
      return dateB - dateA;
    });
  }, [quotes, policies, includeEndorsementPremium]);

  // 2. Metrics (Separated clearly: Poliçeleşen vs Poliçeleşmeyen)
  const convertedCount = useMemo(() => allItems.filter((x) => x.status === 'converted').length, [allItems]);
  const rejectedCount = useMemo(() => allItems.filter((x) => x.status === 'rejected').length, [allItems]);
  const totalCount = allItems.length;

  const conversionRate = totalCount > 0 ? Math.round((convertedCount / totalCount) * 100) : 0;

  const convertedPremiumTotal = useMemo(
    () =>
      allItems
        .filter((x) => x.status === 'converted')
        .reduce((sum, item) => sum + (item.premium || 0), 0),
    [allItems]
  );

  const rejectedPremiumTotal = useMemo(
    () =>
      allItems
        .filter((x) => x.status === 'rejected')
        .reduce((sum, item) => sum + (item.premium || 0), 0),
    [allItems]
  );

  // 3. Filtered items based on statusFilter, company, branch, reason and search
  const filteredItems = useMemo(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();

    return allItems.filter((item) => {
      // Status filter
      if (statusFilter === 'converted' && item.status !== 'converted') return false;
      if (statusFilter === 'rejected' && item.status !== 'rejected') return false;

      // Non-conversion reason filter
      if (filterReason && item.status === 'rejected' && item.nonConversionReason !== filterReason) {
        return false;
      }

      // Company & Branch filter
      if (filterCompany && item.company !== filterCompany) return false;
      if (filterBranch && item.branch !== filterBranch) return false;

      // Search query
      if (q) {
        const matchesSearch =
          item.insured.toLocaleLowerCase('tr-TR').includes(q) ||
          (item.plate && item.plate.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.originalPolicy?.pastPlates && item.originalPolicy.pastPlates.some((pp) => pp.toLocaleLowerCase('tr-TR').includes(q))) ||
          (item.referenceNumber && item.referenceNumber.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.vehicleBrand && item.vehicleBrand.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.vehicleModel && item.vehicleModel.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.phone && item.phone.includes(q)) ||
          (item.email && item.email.toLocaleLowerCase('tr-TR').includes(q)) ||
          item.company.toLocaleLowerCase('tr-TR').includes(q) ||
          item.branch.toLocaleLowerCase('tr-TR').includes(q) ||
          (item.nonConversionReason && item.nonConversionReason.toLocaleLowerCase('tr-TR').includes(q));

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [allItems, statusFilter, filterReason, filterCompany, filterBranch, search]);

  // 4. Export CSV handler
  const handleExportCsv = () => {
    const headers = [
      'Sonuç Durumu',
      'Sigortalı',
      'İş Türü',
      'Telefon',
      'E-posta',
      'Plaka',
      'Araç Marka Model',
      'Araç Bedeli (TL)',
      'Prim (TL)',
      'Çarpan (Prim/Bedel)',
      'Sigorta Şirketi',
      'Branş',
      'Poliçe / Teklif No',
      'Başlangıç / Tanzim Tarihi',
      'Bitiş Tarihi',
      'Poliçeleştirmeme Nedeni / Açıklama',
    ];

    const rows = filteredItems.map((item) => [
      `"${item.statusLabel}"`,
      `"${item.insured}"`,
      `"${item.businessType || 'Yenileme'}"`,
      `"${item.phone || ''}"`,
      `"${item.email || ''}"`,
      `"${item.plate || ''}"`,
      `"${[item.vehicleYear, item.vehicleBrand, item.vehicleModel].filter(Boolean).join(' ')}"`,
      `"${item.vehicleValue ? item.vehicleValue : ''}"`,
      `"${item.premium || 0}"`,
      `"${item.multiplier !== null && item.multiplier !== undefined ? formatMultiplier(item.multiplier) : ''}"`,
      `"${item.company}"`,
      `"${item.branch}"`,
      `"${item.referenceNumber}"`,
      `"${item.startDate || ''}"`,
      `"${item.endDate || ''}"`,
      `"${item.status === 'rejected' ? item.nonConversionReason || '' : item.notes || ''}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    downloadFile(`sonuclanan-isler-${getTodayIso()}.csv`, csvContent, 'text/csv;charset=utf-8;');
  };

  const getDaysBadge = (endDate?: string) => {
    if (!endDate) return null;
    const days = calculateDaysLeft(endDate);
    if (days === null) return null;

    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Süresi Doldu ({Math.abs(days)} gün önce)</span>
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span>Bugün Bitiyor</span>
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span>{days} gün kaldı</span>
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span>{days} gün kaldı</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
        <span>{days} gün kaldı</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span>Sonuçlananlar</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 text-slate-800">
              {totalCount} Kayıt
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tek bir merkezden poliçeleşen portföy kayıtları ve poliçeleşmeyen sonuçlanmış teklifler.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Excel / CSV</span>
          </button>
          <button
            onClick={onOpenNewPolicy}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Yeni Poliçe Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Poliçeleşenler vs Poliçeleşmeyenler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Concluded */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Toplam Sonuçlanan</span>
            <Archive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Portföy + Sonuçlanan Teklifler
          </div>
        </div>

        {/* Poliçeleşen (Poliçeler) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'converted' ? 'all' : 'converted')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'converted'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Poliçeleşen (Poliçeler)</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
              Portföy
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2">{convertedCount}</div>
          <div className="text-xs text-emerald-700 font-medium mt-0.5">
            Toplam Prim: <strong>{formatCurrency(convertedPremiumTotal)}</strong>
          </div>
        </div>

        {/* Poliçeleşmeyen (Yapılmayan Teklifler) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'rejected'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Poliçeleşmeyen</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
              Yapılmadı
            </span>
          </div>
          <div className="text-2xl font-black text-rose-800 mt-2">{rejectedCount}</div>
          <div className="text-xs text-rose-700 font-medium mt-0.5">
            Kaçan Tutar: <strong>{formatCurrency(rejectedPremiumTotal)}</strong>
          </div>
        </div>

        {/* Dönüşüm / Başarı Oranı */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Dönüşüm / Başarı Oranı</span>
            <span className="text-xs font-bold text-slate-400">%</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">%{conversionRate}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {convertedCount} / {totalCount} işlem poliçeleşti
          </div>
        </div>
      </div>

      {/* Status Tabs & Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        {/* Sonuç Durumu Filtresi (All, Converted, Rejected) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tüm Sonuçlar ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('converted')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'converted'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Yalnızca Poliçeleşenler ({convertedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Yalnızca Poliçeleşmeyenler ({rejectedCount})</span>
          </button>
        </div>

        {/* Search & Dynamic Select Filters */}
        <div className="flex flex-col md:flex-row gap-3 pt-1">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sigortalı adı, plaka, poliçe / teklif no veya neden ara..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Şirket */}
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="">Tüm Şirketler</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Branş */}
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="">Tüm Branşlar</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Poliçeleştirmeme Nedeni Filtresi */}
            {statusFilter !== 'converted' && (
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer text-rose-700 font-medium"
              >
                <option value="">Tüm Poliçeleştirmeme Nedenleri</option>
                {NON_CONVERSION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            {/* Zeyil Dahil Prim Gösterim Ayarı */}
            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs select-none transition-colors shrink-0">
              <input
                type="checkbox"
                checked={includeEndorsementPremium}
                onChange={(e) => {
                  onToggleIncludeEndorsementPremium?.(e.target.checked);
                }}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-bold text-slate-700">Zeyil Dahil Prim</span>
            </label>

            {/* Reset Filter Button */}
            {(search || filterCompany || filterBranch || filterReason || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterCompany('');
                  setFilterBranch('');
                  setFilterReason('');
                  setStatusFilter('all');
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Unified Concluded Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Sonuç</th>
                <th className="py-3.5 px-4 text-center w-28">İşlem</th>
                <th className="py-3.5 px-4">Sigortalı</th>
                <th className="py-3.5 px-4">İş Türü</th>
                <th className="py-3.5 px-4">Plaka</th>
                <th className="py-3.5 px-4">Şirket</th>
                <th className="py-3.5 px-4">Branş</th>
                <th className="py-3.5 px-4">Poliçe / Teklif No</th>
                <th className="py-3.5 px-4">Bitiş Tarihi / Kalan Gün</th>
                <th className="py-3.5 px-4 text-right">Araç Bedeli</th>
                <th className="py-3.5 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span>Prim (TL)</span>
                    <span className="text-[9px] font-normal text-slate-400 lowercase">
                      {includeEndorsementPremium ? '(zeyil dahil güncel)' : '(orijinal teklif)'}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Çarpan (Prim/Bedel)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isConverted = item.status === 'converted';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. Sonuç Rozeti */}
                      <td className="py-3.5 px-4">
                        {isConverted ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Poliçeleşti</span>
                          </div>
                        ) : (
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Poliçeleşmedi</span>
                            </div>
                            {item.nonConversionReason && (
                              <div className="text-[11px] font-semibold text-rose-700 mt-1 max-w-[200px] truncate" title={item.nonConversionReason}>
                                {item.nonConversionReason}
                              </div>
                            )}
                            {item.rejectionNote && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-[220px] truncate" title={`Olumsuz Sonuç Notu: ${item.rejectionNote}`}>
                                💬 {item.rejectionNote}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 2. İşlem Butonları (Sonuç'tan hemen sonra 2. sütun) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isConverted ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const targetPolicy =
                                    item.originalPolicy ||
                                    policies.find(
                                      (p) =>
                                        p.id === item.originalQuote?.convertedPolicyId ||
                                        (item.originalQuote && p.originQuoteId === item.originalQuote.id)
                                    );
                                  if (targetPolicy) {
                                    onEditPolicy(targetPolicy);
                                  } else if (item.originalQuote) {
                                    onViewQuote(item.originalQuote);
                                  }
                                }}
                                className="p-1.5 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Poliçe Detayını Görüntüle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {onNewEndorsement && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetPolicy =
                                      item.originalPolicy ||
                                      policies.find(
                                        (p) =>
                                          p.id === item.originalQuote?.convertedPolicyId ||
                                          (item.originalQuote && p.originQuoteId === item.originalQuote.id)
                                      );
                                    if (targetPolicy) {
                                      onNewEndorsement(targetPolicy);
                                    }
                                  }}
                                  className="p-1.5 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                                  title="Bu Poliçeye Zeyil Gir"
                                >
                                  <Layers className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setItemToDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Poliçeyi Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : item.originalQuote ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onViewQuote(item.originalQuote!)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Teklif Detayını Görüntüle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onReopenQuote(item.originalQuote!.id)}
                                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Tekrar Aktif Tekliflere Al (Yeniden Aç)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Teklifi Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* 3. Sigortalı */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.insured}</div>
                      </td>

                      {/* 4. İş Türü */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            item.businessType === 'Yeni İş'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.businessType === 'Takip'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {item.businessType || 'Yenileme'}
                        </span>
                      </td>

                      {/* 5. Plaka */}
                      <td className="py-3.5 px-4">
                        {item.plate ? (
                          <span className="inline-block px-2.5 py-1 font-mono font-bold text-xs bg-slate-100 border border-slate-300 rounded text-slate-900 tracking-wider shadow-2xs">
                            {item.plate}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* 6. Şirket */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.company}</div>
                      </td>

                      {/* 7. Branş */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.branch}
                        </span>
                      </td>

                      {/* 8. Poliçe / Teklif No */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-semibold text-xs inline-block">
                          {item.referenceNumber}
                        </span>
                      </td>

                      {/* 9. Bitiş Tarihi / Kalan Gün */}
                      <td className="py-3.5 px-4">
                        {item.endDate ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800 text-xs">
                              {formatDateTr(item.endDate)}
                            </div>
                            <div>{getDaysBadge(item.endDate)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 10. Araç Bedeli */}
                      <td className="py-3.5 px-4 text-right">
                        {item.vehicleValue && item.vehicleValue > 0 ? (
                          <div className="font-bold text-slate-800 text-xs">
                            {formatCurrency(item.vehicleValue)}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 11. Prim (TL) */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className={`font-black text-sm ${
                            isConverted ? 'text-slate-900' : 'text-rose-700'
                          }`}
                        >
                          {formatCurrency(includeEndorsementPremium ? item.currentPremium : item.originalPremium)}
                        </div>
                        {isConverted && item.currentPremium !== item.originalPremium && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {includeEndorsementPremium ? (
                              <span>İlk: {formatCurrency(item.originalPremium)}</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Güncel: {formatCurrency(item.currentPremium)}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 12. Çarpan (Prim / Araç Bedeli - Yalnızca Kasko) */}
                      <td className="py-3.5 px-4 text-center">
                        {isConverted && item.branch === 'Kasko' && item.multiplier !== null && item.multiplier !== undefined ? (
                          <span
                            className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200 inline-block shadow-2xs"
                            title={`Çarpan = Prim / Araç Bedeli (${formatCurrency(item.premium)} / ${formatCurrency(item.vehicleValue || 0)})`}
                          >
                            {formatMultiplier(item.multiplier)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Archive className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <div className="font-semibold text-slate-600 text-sm">Eşleşen sonuç bulunamadı</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Arama terimlerinizi veya filtrelerinizi değiştirmeyi deneyebilirsiniz.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (!itemToDelete) return;
          if (itemToDelete.sourceType === 'policy') {
            const targetPolicyId =
              itemToDelete.originalPolicy?.id ||
              policies.find(
                (p) =>
                  p.id === itemToDelete.originalQuote?.convertedPolicyId ||
                  (itemToDelete.originalQuote && p.originQuoteId === itemToDelete.originalQuote.id)
              )?.id;
            if (targetPolicyId) {
              onDeletePolicy(targetPolicyId);
            }
          } else if (itemToDelete.sourceType === 'quote' && itemToDelete.originalQuote) {
            onDeleteQuote(itemToDelete.originalQuote.id);
          }
          setItemToDelete(null);
        }}
        title={itemToDelete?.sourceType === 'policy' ? 'Poliçe Silme Onayı' : 'Teklif Silme Onayı'}
        recordType={itemToDelete?.sourceType === 'policy' ? 'Poliçe' : 'Teklif'}
        recordDetails={
          itemToDelete
            ? [
                { label: 'Müşteri', value: itemToDelete.insured },
                {
                  label: itemToDelete.sourceType === 'policy' ? 'Poliçe No' : 'Teklif No',
                  value: itemToDelete.referenceNumber,
                },
                { label: 'Branş', value: itemToDelete.branch },
                { label: 'Plaka', value: itemToDelete.plate || '—' },
              ]
            : []
        }
      />
    </div>
  );
};
