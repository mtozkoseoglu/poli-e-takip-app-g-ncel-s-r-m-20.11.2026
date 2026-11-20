import React, { useState, useMemo } from 'react';
import { Quote, Policy, COMPANIES, BRANCHES } from '../types/insurance';
import {
  calculateDaysLeft,
  formatCurrency,
  formatDateTr,
  downloadFile,
  getTodayIso,
  subtractOneYear,
  normalizeQuoteStage,
} from '../services/storage';
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  AlertTriangle,
  Car,
  Shield,
  RotateCcw,
  Check,
  Calendar,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  Filter,
  Trash2,
  Eye,
} from 'lucide-react';
import { FollowUpConcludeModal } from './FollowUpConcludeModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface Props {
  quotes: Quote[];
  policies: Policy[];
  onOpenNewQuote: (defaultBusinessType?: 'Takip') => void;
  onEditQuote: (quote: Quote) => void;
  onConvertToPolicy: (quoteId: string, createdPolicy: Policy) => void;
  onDropFollowUp?: (quoteId: string) => void;
  onRescheduleFollowUp?: (quoteId: string, newCompany: string, newEndDate: string) => void;
  onDeleteFollowUp?: (quoteId: string) => void;
  onToggleFollowUpStatus?: (quoteId: string, currentStatus?: 'active' | 'completed' | 'passive') => void;
}

export interface UnifiedFollowUpItem {
  id: string;
  quoteId: string;
  sourceType: 'kasko_cross_sell' | 'trafik_cross_sell' | 'quote_takip';
  sourceLabel: string;
  insured: string;
  plate?: string;
  licenseSerialNo?: string;
  usageStyle?: string;
  vehicleValue?: number;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number | string;
  businessType: 'Takip';
  targetBranch: string; // Takip edilen branş (Trafik, Kasko vb.)
  company: string; // Takip edilen sigorta şirketi
  targetEndDate: string; // Bitiş / Takip tarihi
  followDate?: string;
  stage: string;
  isCompleted: boolean;
  notes?: string;
  originPolicyNumber?: string;
  originalQuote: Quote;
}

export const FollowUpsView: React.FC<Props> = ({
  quotes,
  policies,
  onOpenNewQuote,
  onEditQuote,
  onConvertToPolicy,
  onDropFollowUp,
  onRescheduleFollowUp,
  onDeleteFollowUp,
  onToggleFollowUpStatus,
}) => {
  const [concludingQuote, setConcludingQuote] = useState<Quote | null>(null);
  const [itemToDelete, setItemToDelete] = useState<UnifiedFollowUpItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Build unified follow-up list from Takip quotes & linked policies
  const followUpItems: UnifiedFollowUpItem[] = useMemo(() => {
    const list: UnifiedFollowUpItem[] = [];

    // Filter quotes where businessType === 'Takip'
    const takipQuotes = quotes.filter((q) => q.businessType === 'Takip');

    takipQuotes.forEach((q) => {
      // Determine origin from notes or metadata
      let sourceType: 'kasko_cross_sell' | 'trafik_cross_sell' | 'quote_takip' = 'quote_takip';
      let sourceLabel = 'Doğrudan Takip Teklifi';
      let originPolicyNumber: string | undefined = undefined;

      if (q.notes?.includes('Kasko') || q.crossSellOrigin === 'kasko_cross_sell') {
        sourceType = 'kasko_cross_sell';
        sourceLabel = 'Kasko Portföyü (Trafik Takibi)';
      } else if (q.notes?.includes('Trafik') || q.crossSellOrigin === 'trafik_cross_sell') {
        sourceType = 'trafik_cross_sell';
        sourceLabel = 'Trafik Portföyü (Kasko Takibi)';
      }

      // Check linked policy if any
      const matchingPolicy = policies.find(
        (p) =>
          p.trafficFollowUpQuoteId === q.id ||
          p.kaskoFollowUpQuoteId === q.id ||
          (p.plate && q.plate && p.plate.replace(/\s+/g, '') === q.plate.replace(/\s+/g, ''))
      );

      if (matchingPolicy) {
        originPolicyNumber = matchingPolicy.policyNumber;
        if (matchingPolicy.branch === 'Kasko') {
          sourceType = 'kasko_cross_sell';
          sourceLabel = `Kasko Poliçesi (${matchingPolicy.policyNumber})`;
        } else if (matchingPolicy.branch === 'Trafik') {
          sourceType = 'trafik_cross_sell';
          sourceLabel = `Trafik Poliçesi (${matchingPolicy.policyNumber})`;
        }
      }

      const isCompleted = q.followUpStatus === 'completed' || q.status === 'concluded';

      list.push({
        id: q.id,
        quoteId: q.id,
        sourceType,
        sourceLabel,
        insured: q.insured,
        plate: q.plate,
        licenseSerialNo: q.licenseSerialNo || matchingPolicy?.licenseSerialNo,
        usageStyle: q.usageStyle || matchingPolicy?.usageStyle,
        vehicleValue: q.vehicleValue || matchingPolicy?.vehicleValue,
        vehicleBrand: q.vehicleBrand,
        vehicleModel: q.vehicleModel,
        vehicleYear: q.vehicleYear,
        businessType: 'Takip',
        targetBranch: q.branch,
        company:
          q.branch === 'Trafik'
            ? (q.trafficCompany || q.previousCompany || q.company)
            : (q.kaskoCompany || q.previousCompany || q.company),
        targetEndDate:
          q.branch === 'Trafik'
            ? (q.trafficEndDate || q.validUntil || q.followDate || '')
            : (q.kaskoEndDate || q.validUntil || q.followDate || ''),
        followDate: q.followDate,
        stage: normalizeQuoteStage(q.stage),
        isCompleted,
        notes: q.notes,
        originPolicyNumber,
        originalQuote: q,
      });
    });

    // Also look for policies that have cross-sell set to BİZDE DEĞİL but might not have a quote linked yet
    policies.forEach((p) => {
      if (p.branch === 'Kasko' && p.trafficStatus === 'TRAFİK BİZDE DEĞİL' && p.trafficEndDate) {
        // Only if not already present in list
        const alreadyInList = list.some(
          (item) =>
            item.originalQuote.id === p.trafficFollowUpQuoteId ||
            (item.plate && p.plate && item.plate.replace(/\s+/g, '') === p.plate.replace(/\s+/g, '') && item.targetBranch === 'Trafik')
        );

        if (!alreadyInList) {
          // Virtual or standalone follow-up item
          // Will be materialized as quote upon interaction
          const dummyQuote: Quote = {
            id: p.trafficFollowUpQuoteId || `cross-trafik-${p.id}`,
            type: 'quote',
            insured: p.insured,
            plate: p.plate,
            licenseSerialNo: p.licenseSerialNo,
            chassisNo: p.chassisNo,
            engineNo: p.engineNo,
            usageStyle: p.usageStyle,
            vehicleValue: p.vehicleValue,
            vehicleDetail: p.vehicleDetail,
            vehicleBrand: p.vehicleBrand,
            vehicleModel: p.vehicleModel,
            vehicleYear: p.vehicleYear,
            businessType: 'Takip',
            branch: 'Trafik',
            company: p.trafficCompany || 'TÜRKİYE SİGORTA',
            startDate: p.trafficEndDate ? subtractOneYear(p.trafficEndDate) : undefined,
            quoteDate: p.trafficEndDate ? subtractOneYear(p.trafficEndDate) : getTodayIso(),
            validUntil: p.trafficEndDate,
            endDate: p.trafficEndDate,
            followDate: p.trafficEndDate,
            premium: 0,
            stage: 'MÜŞTERİYE SUNULACAK',
            status: 'active',
            quoteStatus: 'beklemede',
            notes: `Kasko poliçesi (${p.policyNumber}) kaydından oluşturulan Trafik çapraz satış takibi.`,
            trafficStatus: 'TRAFİK BİZDE DEĞİL',
            trafficCompany: p.trafficCompany || 'TÜRKİYE SİGORTA',
            trafficEndDate: p.trafficEndDate,
            originPolicyId: p.id,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            companyOffers: [],
          };

          list.push({
            id: dummyQuote.id,
            quoteId: dummyQuote.id,
            sourceType: 'kasko_cross_sell',
            sourceLabel: `Kasko Poliçesi (${p.policyNumber})`,
            insured: p.insured,
            plate: p.plate,
            licenseSerialNo: p.licenseSerialNo,
            usageStyle: p.usageStyle,
            vehicleValue: p.vehicleValue,
            vehicleBrand: p.vehicleBrand,
            vehicleModel: p.vehicleModel,
            vehicleYear: p.vehicleYear,
            businessType: 'Takip',
            targetBranch: 'Trafik',
            company: p.trafficCompany || 'TÜRKİYE SİGORTA',
            targetEndDate: p.trafficEndDate,
            followDate: p.trafficEndDate,
            stage: 'MÜŞTERİYE SUNULACAK',
            isCompleted: p.status === 'Sonuçlandı' || p.followUpStatus === 'completed',
            notes: `Kasko poliçesi (${p.policyNumber}) kaydından gelen Trafik takibi.`,
            originPolicyNumber: p.policyNumber,
            originalQuote: dummyQuote,
          });
        }
      }

      if (p.branch === 'Trafik' && p.kaskoStatus === 'KASKO BİZDE DEĞİL' && p.kaskoEndDate) {
        const alreadyInList = list.some(
          (item) =>
            item.originalQuote.id === p.kaskoFollowUpQuoteId ||
            (item.plate && p.plate && item.plate.replace(/\s+/g, '') === p.plate.replace(/\s+/g, '') && item.targetBranch === 'Kasko')
        );

        if (!alreadyInList) {
          const dummyQuote: Quote = {
            id: p.kaskoFollowUpQuoteId || `cross-kasko-${p.id}`,
            type: 'quote',
            insured: p.insured,
            plate: p.plate,
            licenseSerialNo: p.licenseSerialNo,
            chassisNo: p.chassisNo,
            engineNo: p.engineNo,
            usageStyle: p.usageStyle,
            vehicleValue: p.vehicleValue,
            vehicleDetail: p.vehicleDetail,
            vehicleBrand: p.vehicleBrand,
            vehicleModel: p.vehicleModel,
            vehicleYear: p.vehicleYear,
            businessType: 'Takip',
            branch: 'Kasko',
            company: p.kaskoCompany || 'ALLIANZ SİGORTA',
            startDate: p.kaskoEndDate ? subtractOneYear(p.kaskoEndDate) : undefined,
            quoteDate: p.kaskoEndDate ? subtractOneYear(p.kaskoEndDate) : getTodayIso(),
            validUntil: p.kaskoEndDate,
            endDate: p.kaskoEndDate,
            followDate: p.kaskoEndDate,
            premium: 0,
            stage: 'MÜŞTERİYE SUNULACAK',
            status: 'active',
            quoteStatus: 'beklemede',
            notes: `Trafik poliçesi (${p.policyNumber}) kaydından oluşturulan Kasko çapraz satış takibi.`,
            kaskoStatus: 'KASKO BİZDE DEĞİL',
            kaskoCompany: p.kaskoCompany || 'ALLIANZ SİGORTA',
            kaskoEndDate: p.kaskoEndDate,
            originPolicyId: p.id,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            companyOffers: [],
          };

          list.push({
            id: dummyQuote.id,
            quoteId: dummyQuote.id,
            sourceType: 'trafik_cross_sell',
            sourceLabel: `Trafik Poliçesi (${p.policyNumber})`,
            insured: p.insured,
            plate: p.plate,
            licenseSerialNo: p.licenseSerialNo,
            usageStyle: p.usageStyle,
            vehicleValue: p.vehicleValue,
            vehicleBrand: p.vehicleBrand,
            vehicleModel: p.vehicleModel,
            vehicleYear: p.vehicleYear,
            businessType: 'Takip',
            targetBranch: 'Kasko',
            company: p.kaskoCompany || 'ALLIANZ SİGORTA',
            targetEndDate: p.kaskoEndDate,
            followDate: p.kaskoEndDate,
            stage: 'MÜŞTERİYE SUNULACAK',
            isCompleted: p.status === 'Sonuçlandı' || p.followUpStatus === 'completed',
            notes: `Trafik poliçesi (${p.policyNumber}) kaydından gelen Kasko takibi.`,
            originPolicyNumber: p.policyNumber,
            originalQuote: dummyQuote,
          });
        }
      }
    });

    // Sort by targetEndDate ascending (urgent first)
    return list.sort((a, b) => {
      const daysA = calculateDaysLeft(a.targetEndDate) ?? 9999;
      const daysB = calculateDaysLeft(b.targetEndDate) ?? 9999;
      return daysA - daysB;
    });
  }, [quotes, policies]);

  // Counts
  const activeCount = useMemo(() => followUpItems.filter((i) => !i.isCompleted).length, [followUpItems]);
  const completedCount = useMemo(() => followUpItems.filter((i) => i.isCompleted).length, [followUpItems]);
  const kaskoCrossCount = useMemo(
    () => followUpItems.filter((i) => !i.isCompleted && i.sourceType === 'kasko_cross_sell').length,
    [followUpItems]
  );
  const trafikCrossCount = useMemo(
    () => followUpItems.filter((i) => !i.isCompleted && i.sourceType === 'trafik_cross_sell').length,
    [followUpItems]
  );
  const urgentCount = useMemo(
    () =>
      followUpItems.filter((i) => {
        if (i.isCompleted) return false;
        const days = calculateDaysLeft(i.targetEndDate);
        return days !== null && days <= 7 && days >= 0;
      }).length,
    [followUpItems]
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();

    return followUpItems.filter((item) => {
      // Status filter
      if (statusFilter === 'active' && item.isCompleted) return false;
      if (statusFilter === 'completed' && !item.isCompleted) return false;

      // Source filter
      if (sourceFilter && item.sourceType !== sourceFilter) return false;

      // Branch filter
      if (branchFilter && item.targetBranch !== branchFilter) return false;

      // Company filter
      if (companyFilter && item.company !== companyFilter) return false;

      // Search query
      if (q) {
        const matchesSearch =
          item.insured.toLocaleLowerCase('tr-TR').includes(q) ||
          (item.plate && item.plate.toLocaleLowerCase('tr-TR').includes(q)) ||
          item.company.toLocaleLowerCase('tr-TR').includes(q) ||
          item.targetBranch.toLocaleLowerCase('tr-TR').includes(q) ||
          (item.notes && item.notes.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.originPolicyNumber && item.originPolicyNumber.toLocaleLowerCase('tr-TR').includes(q));

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [followUpItems, statusFilter, sourceFilter, branchFilter, companyFilter, search]);

  const getDaysBadge = (endDate?: string) => {
    if (!endDate) return <span className="text-slate-400 text-xs">—</span>;
    const days = calculateDaysLeft(endDate);
    if (days === null) return <span className="text-slate-400 text-xs">—</span>;

    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Süresi Geçti ({Math.abs(days)} gün)</span>
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span>Bugün Bitiyor!</span>
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{days} gün kaldı</span>
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span>{days} gün kaldı</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <span>{days} gün kaldı</span>
      </span>
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'Sigortalı',
      'Plaka',
      'İş Türü',
      'Takip Edilen Branş',
      'Sigorta Şirketi',
      'Takip / Bitiş Tarihi',
      'Kalan Gün',
      'Kaynak / Detay',
      'Durum',
      'İş Aşaması',
      'Notlar',
    ];

    const rows = filteredItems.map((item) => [
      `"${item.insured}"`,
      `"${item.plate || ''}"`,
      `"${item.businessType}"`,
      `"${item.targetBranch}"`,
      `"${item.company}"`,
      `"${item.targetEndDate}"`,
      `"${calculateDaysLeft(item.targetEndDate) ?? ''}"`,
      `"${item.sourceLabel}"`,
      `"${item.isCompleted ? 'Tamamlandı' : 'Aktif Takipte'}"`,
      `"${item.stage}"`,
      `"${item.notes || ''}"`,
    ]);

    const csvContent = '\ufeff' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    downloadFile(`takipteki-isler-${getTodayIso()}.csv`, csvContent, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-600" />
              <span>Takipteki İşler</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              {activeCount} Aktif Takip
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kasko ve Trafik çapraz satış takipleri ile doğrudan takip türündeki tekliflerin merkezi yönetim ekranı.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Excel / CSV</span>
          </button>
          <button
            onClick={() => onOpenNewQuote('Takip')}
            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Yeni Takip Kaydı</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Active Follow-ups */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Aktif Takipteki İşler</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">{activeCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Sonuçlandırılmayı bekleyen işler</div>
        </div>

        {/* Kasko Cross-Sell: Trafik Takibi */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Kasko Çapraz (Trafik)</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Trafik</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{kaskoCrossCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Trafik bizde değil kayıtları</div>
        </div>

        {/* Trafik Cross-Sell: Kasko Takibi */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Trafik Çapraz (Kasko)</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Kasko</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{trafikCrossCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Kasko bizde değil kayıtları</div>
        </div>

        {/* Urgent follow-ups */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
            <span>Kritik Vade (≤ 7 Gün)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">{urgentCount}</div>
          <div className="text-xs text-rose-600 font-medium mt-0.5">Hızlı temas gereken kayıtlar</div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        {/* Status Tab buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'active'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-purple-800 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            Aktif Takipler ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'completed'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tamamlanan / Pasif ({completedCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tüm Takipler ({followUpItems.length})
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col md:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sigortalı adı, plaka, poliçe no veya şirket ara..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
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
            {/* Kaynak */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="">Tüm Kaynaklar</option>
              <option value="kasko_cross_sell">Kasko Çapraz Satış</option>
              <option value="trafik_cross_sell">Trafik Çapraz Satış</option>
              <option value="quote_takip">Doğrudan Takip Teklifi</option>
            </select>

            {/* Branş */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="">Tüm Branşlar</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Şirket */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="">Tüm Şirketler</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {(search || sourceFilter || branchFilter || companyFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSourceFilter('');
                  setBranchFilter('');
                  setCompanyFilter('');
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Sıfırla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Follow-up Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 text-center sticky left-0 bg-slate-50 z-20 shadow-xs w-24">İşlem</th>
                <th className="py-3.5 px-4">Sigortalı</th>
                <th className="py-3.5 px-4">Plaka & Araç</th>
                <th className="py-3.5 px-4">Ruhsat & Tarz</th>
                <th className="py-3.5 px-4 text-right">Araç Bedeli</th>
                <th className="py-3.5 px-4">İş Türü</th>
                <th className="py-3.5 px-4">Takip Branşı</th>
                <th className="py-3.5 px-4">Mevcut Şirket</th>
                <th className="py-3.5 px-4">Vade / Bitiş Tarihi</th>
                <th className="py-3.5 px-4">Kalan Gün</th>
                <th className="py-3.5 px-4">Kaynak Detayı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onEditQuote(item.originalQuote)}
                      className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                        item.isCompleted ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* İşlem Sütunu: Tablonun en başında, şık ikon butonlar */}
                      <td
                        className="py-3 px-4 text-center sticky left-0 bg-white group-hover:bg-slate-50/90 transition-colors z-20 shadow-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. Detay İkonu */}
                          <button
                            type="button"
                            onClick={() => onEditQuote(item.originalQuote)}
                            title="Takip Teklifi Detayları ve Düzenleme"
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Sonuçlandır İkonu */}
                          {!item.isCompleted && (
                            <button
                              type="button"
                              onClick={() => setConcludingQuote(item.originalQuote)}
                              title="Takip İşini Sonuçlandır / Poliçeleştir"
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* 3. Sil İkonu */}
                          {onDeleteFollowUp && (
                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              title="Takip Kaydını Sil"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Sigortalı */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.insured}</div>
                        {item.originalQuote.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{item.originalQuote.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Plaka & Araç */}
                      <td className="py-3.5 px-4">
                        {item.plate ? (
                          <span className="inline-block px-2.5 py-1 font-mono font-bold text-xs bg-slate-100 border border-slate-300 rounded text-slate-900 tracking-wider">
                            {item.plate}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                        {(item.vehicleBrand || item.vehicleModel) && (
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                            {[item.vehicleYear, item.vehicleBrand, item.vehicleModel].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </td>

                      {/* Ruhsat & Kullanım Tarzı */}
                      <td className="py-3.5 px-4">
                        {item.licenseSerialNo ? (
                          <div className="font-mono text-xs font-semibold text-slate-800">
                            {item.licenseSerialNo}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                        {item.usageStyle && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {item.usageStyle}
                          </div>
                        )}
                      </td>

                      {/* Araç Bedeli */}
                      <td className="py-3.5 px-4 text-right">
                        {item.vehicleValue && item.vehicleValue > 0 ? (
                          <span className="font-semibold text-slate-900 text-xs">
                            {formatCurrency(item.vehicleValue)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* İş Türü */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Takip
                        </span>
                      </td>

                      {/* Takip Branşı */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {item.targetBranch}
                        </span>
                      </td>

                      {/* Şirket */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">{item.company}</div>
                      </td>

                      {/* Vade / Bitiş Tarihi */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">
                          {formatDateTr(item.targetEndDate)}
                        </div>
                      </td>

                      {/* Kalan Gün */}
                      <td className="py-3.5 px-4">{getDaysBadge(item.targetEndDate)}</td>

                      {/* Kaynak Detayı */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 max-w-[200px] truncate" title={item.sourceLabel}>
                          {item.sourceLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <div className="font-semibold text-slate-700 text-sm">Takip kaydı bulunamadı</div>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Kasko veya Trafik poliçelerinde "Bizde Değil" seçildiğinde veya yeni teklif oluştururken
                      "İş Türü = Takip" seçildiğinde takipler burada otomatik listelenir.
                    </p>
                    <button
                      onClick={() => onOpenNewQuote('Takip')}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni Takip Ekle</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-Up Conclusion Modal */}
      <FollowUpConcludeModal
        isOpen={Boolean(concludingQuote)}
        onClose={() => setConcludingQuote(null)}
        followUpQuote={concludingQuote}
        quotes={quotes}
        onStartQuoteForFollowUp={(fq) => {
          onEditQuote(fq);
        }}
        onConfirmPositive={(quoteId, createdPolicy) => {
          onConvertToPolicy(quoteId, createdPolicy);
          setConcludingQuote(null);
        }}
        onDropFollowUp={(quoteId) => {
          if (onDropFollowUp) {
            onDropFollowUp(quoteId);
          } else if (onDeleteFollowUp) {
            onDeleteFollowUp(quoteId);
          }
          setConcludingQuote(null);
        }}
        onRescheduleFollowUp={(quoteId, newCompany, newEndDate) => {
          if (onRescheduleFollowUp) {
            onRescheduleFollowUp(quoteId, newCompany, newEndDate);
          }
          setConcludingQuote(null);
        }}
      />

      {/* Delete Confirmation Modal for Follow-Up */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete && onDeleteFollowUp) {
            onDeleteFollowUp(itemToDelete.quoteId);
            setItemToDelete(null);
          }
        }}
        title="Takip Kaydı Silme Onayı"
        recordType="Takip Kaydı"
        recordDetails={
          itemToDelete
            ? [
                { label: 'Müşteri', value: itemToDelete.insured },
                { label: 'Takip Branşı', value: itemToDelete.targetBranch },
                { label: 'Plaka', value: itemToDelete.plate || '—' },
                { label: 'Mevcut Şirket', value: itemToDelete.company },
                { label: 'Vade Tarihi', value: formatDateTr(itemToDelete.targetEndDate) },
              ]
            : []
        }
      />
    </div>
  );
};
