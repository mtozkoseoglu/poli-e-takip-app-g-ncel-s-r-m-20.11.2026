import React, { useState, useEffect, useMemo } from 'react';
import { Quote, Policy, BusinessType } from '../types/insurance';
import { calculateDaysLeft, formatCurrency, formatDateTr } from '../services/storage';
import {
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Shield,
  FileText,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  Tag,
  ArrowUpDown,
  Car,
} from 'lucide-react';

interface Props {
  quotes: Quote[];
  policies?: Policy[];
  reminderDays?: number[];
  onViewQuote: (quote: Quote) => void;
  onViewPolicy?: (policy: Policy) => void;
  onConvertToPolicy?: (quote: Quote) => void;
  onOpenConcludeModal?: (quote: Quote) => void;
  initialFilter?: 'all' | 'urgent';
}

export type ReminderBranchFilter = 'all' | 'Kasko' | 'Trafik';
export type ReminderBusinessTypeFilter = 'all' | 'Yenileme' | 'Yeni İş' | 'Takip';
export type SortColumn = 'sigortali' | 'isTuru' | 'brans' | 'plaka' | 'bitisTarihi' | 'kalanGun';
export type SortDirection = 'asc' | 'desc';

export const RemindersView: React.FC<Props> = ({
  quotes,
  policies = [],
  reminderDays = [15, 7, 3, 1],
  onViewQuote,
  onViewPolicy,
  onConvertToPolicy,
  onOpenConcludeModal,
  initialFilter = 'all',
}) => {
  const [branchFilter, setBranchFilter] = useState<ReminderBranchFilter>('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<ReminderBusinessTypeFilter>('all');
  const [urgentOnly, setUrgentOnly] = useState<boolean>(initialFilter === 'urgent');
  const [search, setSearch] = useState('');

  // Sorting state (Default: Kalan Gün, ascending / en acil & süresi geçenler ilk sırada)
  const [sortColumn, setSortColumn] = useState<SortColumn>('kalanGun');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sync with initialFilter if changed from navigation
  useEffect(() => {
    if (initialFilter === 'urgent') {
      setUrgentOnly(true);
    } else if (initialFilter === 'all') {
      setUrgentOnly(false);
    }
  }, [initialFilter]);

  // Helper to determine normalized business type for quote
  const getQuoteBusinessType = (q: Quote): 'Yenileme' | 'Yeni İş' | 'Takip' => {
    const bt = q.businessType;
    if (bt === 'Takip' || (bt as any) === 'TAKİP') return 'Takip';
    if (bt === 'Yeni İş') return 'Yeni İş';
    return 'Yenileme';
  };

  // Helper to extract policy end date (Poliçe Bitiş Tarihi)
  const getQuoteEndDate = (q: Quote): string => {
    return q.endDate || q.validUntil || q.trafficEndDate || q.kaskoEndDate || '';
  };

  // Base list of active quotes with upcoming/past policy end dates
  const activeReminderQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Must be active and not already concluded
      if (q.status !== 'active' || q.outcome === 'converted' || q.outcome === 'rejected') {
        return false;
      }
      return true;
    });
  }, [quotes]);

  // KPI Counts
  const countKasko = useMemo(() => {
    return activeReminderQuotes.filter((q) => q.branch === 'Kasko').length;
  }, [activeReminderQuotes]);

  const countTrafik = useMemo(() => {
    return activeReminderQuotes.filter((q) => q.branch === 'Trafik').length;
  }, [activeReminderQuotes]);

  const countYenileme = useMemo(() => {
    return activeReminderQuotes.filter((q) => getQuoteBusinessType(q) === 'Yenileme').length;
  }, [activeReminderQuotes]);

  const countYeniIs = useMemo(() => {
    return activeReminderQuotes.filter((q) => getQuoteBusinessType(q) === 'Yeni İş').length;
  }, [activeReminderQuotes]);

  const countTakip = useMemo(() => {
    return activeReminderQuotes.filter((q) => getQuoteBusinessType(q) === 'Takip').length;
  }, [activeReminderQuotes]);

  const countUrgent = useMemo(() => {
    return activeReminderQuotes.filter((q) => {
      const targetDate = getQuoteEndDate(q);
      const days = targetDate ? calculateDaysLeft(targetDate) : null;
      return days !== null && (days < 0 || days <= 14);
    }).length;
  }, [activeReminderQuotes]);

  // Toggle sorting on column header click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filtered & Sorted quotes for display
  const filteredQuotes = useMemo(() => {
    const qSearch = search.toLocaleLowerCase('tr-TR').trim();

    return activeReminderQuotes
      .filter((q) => {
        const bType = getQuoteBusinessType(q);

        // 1. Branş Filtresi (Tümü, Kasko, Trafik)
        if (branchFilter !== 'all' && q.branch !== branchFilter) {
          return false;
        }

        // 2. İş Türü Filtresi (Tümü, Yenileme, Yeni İş, Takip)
        if (businessTypeFilter !== 'all' && bType !== businessTypeFilter) {
          return false;
        }

        // 3. Urgent Only Filter (<= 14 days or overdue)
        if (urgentOnly) {
          const targetDate = getQuoteEndDate(q);
          const days = targetDate ? calculateDaysLeft(targetDate) : null;
          if (days === null || days > 14) return false;
        }

        // 4. Search Filter (insured, plate, branch, company, phone)
        if (qSearch) {
          const matches =
            q.insured.toLocaleLowerCase('tr-TR').includes(qSearch) ||
            (q.plate && q.plate.toLocaleLowerCase('tr-TR').includes(qSearch)) ||
            q.company.toLocaleLowerCase('tr-TR').includes(qSearch) ||
            q.branch.toLocaleLowerCase('tr-TR').includes(qSearch) ||
            (q.phone && q.phone.includes(qSearch)) ||
            (q.quoteNumber && q.quoteNumber.toLocaleLowerCase('tr-TR').includes(qSearch));
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;

        switch (sortColumn) {
          case 'sigortali':
            return dir * a.insured.localeCompare(b.insured, 'tr');

          case 'isTuru':
            return dir * getQuoteBusinessType(a).localeCompare(getQuoteBusinessType(b), 'tr');

          case 'brans':
            return dir * a.branch.localeCompare(b.branch, 'tr');

          case 'plaka': {
            const plA = a.plate || '';
            const plB = b.plate || '';
            return dir * plA.localeCompare(plB, 'tr');
          }

          case 'bitisTarihi': {
            const dateA = getQuoteEndDate(a);
            const dateB = getQuoteEndDate(b);
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            return dir * (timeA - timeB);
          }

          case 'kalanGun':
          default: {
            const dateA = getQuoteEndDate(a);
            const dateB = getQuoteEndDate(b);
            const daysA = dateA ? calculateDaysLeft(dateA) ?? 99999 : 99999;
            const daysB = dateB ? calculateDaysLeft(dateB) ?? 99999 : 99999;
            return dir * (daysA - daysB);
          }
        }
      });
  }, [activeReminderQuotes, branchFilter, businessTypeFilter, urgentOnly, search, sortColumn, sortDirection]);

  const renderDaysLeftBadge = (days: number | null) => {
    if (days === null) {
      return <span className="text-slate-400 font-medium">-</span>;
    }
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>{days} Gün</span>
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>Bugün</span>
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
          <span>{days} Gün</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
        <span>{days} Gün</span>
      </span>
    );
  };

  const renderBusinessTypeBadge = (bType: 'Yenileme' | 'Yeni İş' | 'Takip') => {
    switch (bType) {
      case 'Yenileme':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
            <RefreshCw className="w-3 h-3 text-indigo-600" />
            <span>Yenileme</span>
          </span>
        );
      case 'Yeni İş':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Yeni İş</span>
          </span>
        );
      case 'Takip':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
            <span>Takip</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-slate-600 bg-slate-100">
            {bType}
          </span>
        );
    }
  };

  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <span className="text-blue-600 font-black text-xs">↑</span>
    ) : (
      <span className="text-blue-600 font-black text-xs">↓</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-600" />
              <span>Hatırlatmalar</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {filteredQuotes.length} Kayıt
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Poliçe bitiş tarihi yaklaşan veya süresi dolan teklif kayıtları ve yenileme takipleri.
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Vade Hatırlatma Sistemi Aktif</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tümü */}
        <div
          onClick={() => {
            setBranchFilter('all');
            setBusinessTypeFilter('all');
            setUrgentOnly(false);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            branchFilter === 'all' && businessTypeFilter === 'all' && !urgentOnly
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={branchFilter === 'all' && businessTypeFilter === 'all' && !urgentOnly ? 'text-slate-200' : 'text-slate-500'}>
              Tüm Hatırlatmalar
            </span>
            <Bell className={`w-4 h-4 ${branchFilter === 'all' && businessTypeFilter === 'all' && !urgentOnly ? 'text-slate-200' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black mt-2">{activeReminderQuotes.length}</div>
          <div className={`text-xs mt-0.5 ${branchFilter === 'all' && businessTypeFilter === 'all' && !urgentOnly ? 'text-slate-300' : 'text-slate-400'}`}>
            Aktif teklif & takip kaydı
          </div>
        </div>

        {/* Card 2: Kasko */}
        <div
          onClick={() => setBranchFilter(branchFilter === 'Kasko' ? 'all' : 'Kasko')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            branchFilter === 'Kasko'
              ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-900 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Kasko Poliçeleri</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
              Kasko
            </span>
          </div>
          <div className="text-2xl font-black text-blue-950 mt-2">{countKasko}</div>
          <div className="text-xs text-blue-700 font-medium mt-0.5">Kasko branş kayıtları</div>
        </div>

        {/* Card 3: Trafik */}
        <div
          onClick={() => setBranchFilter(branchFilter === 'Trafik' ? 'all' : 'Trafik')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            branchFilter === 'Trafik'
              ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-900 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-indigo-600" />
              <span>Trafik Poliçeleri</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
              Trafik
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-950 mt-2">{countTrafik}</div>
          <div className="text-xs text-indigo-700 font-medium mt-0.5">Zorunlu trafik kayıtları</div>
        </div>

        {/* Card 4: Acil / Gecikmiş */}
        <div
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            urgentOnly
              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-900 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Acil / Gecikmiş</span>
            </span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
              ≤ 14 Gün
            </span>
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2">{countUrgent}</div>
          <div className="text-xs text-amber-700 font-medium mt-0.5">Öncelikli müdahale gerekenler</div>
        </div>
      </div>

      {/* Filter and Search Bar: Branş & İş Türü Filtreleri */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        {/* 1. BRANŞ FİLTRESİ (Tümü, Kasko, Trafik) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Branş:</span>
            </span>

            <button
              type="button"
              onClick={() => setBranchFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                branchFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              Tümü ({activeReminderQuotes.length})
            </button>

            <button
              type="button"
              onClick={() => setBranchFilter('Kasko')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                branchFilter === 'Kasko'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span>Kasko ({countKasko})</span>
            </button>

            <button
              type="button"
              onClick={() => setBranchFilter('Trafik')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                branchFilter === 'Trafik'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <span>Trafik ({countTrafik})</span>
            </button>
          </div>

          {/* Acil Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUrgentOnly(!urgentOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                urgentOnly
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400/30 shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Yalnızca Acil Vadeliler (≤ 14 Gün)</span>
              {urgentOnly && <span className="ml-1 text-[11px] bg-white/20 px-1.5 rounded">Aktif</span>}
            </button>
          </div>
        </div>

        {/* 2. İŞ TÜRÜ FİLTRESİ (Tümü, Yenileme, Yeni İş, Takip) */}
        <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span>İş Türü:</span>
          </span>

          <button
            type="button"
            onClick={() => setBusinessTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              businessTypeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            Tümü ({activeReminderQuotes.length})
          </button>

          <button
            type="button"
            onClick={() => setBusinessTypeFilter('Yenileme')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              businessTypeFilter === 'Yenileme'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenileme ({countYenileme})</span>
          </button>

          <button
            type="button"
            onClick={() => setBusinessTypeFilter('Yeni İş')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              businessTypeFilter === 'Yeni İş'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Yeni İş ({countYeniIs})</span>
          </button>

          <button
            type="button"
            onClick={() => setBusinessTypeFilter('Takip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              businessTypeFilter === 'Takip'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Takip ({countTakip})</span>
          </button>
        </div>

        {/* Search input & reset */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sigortalı adı, plaka, şirket, branş veya teklif no ara..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {(search || branchFilter !== 'all' || businessTypeFilter !== 'all' || urgentOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setBranchFilter('all');
                setBusinessTypeFilter('all');
                setUrgentOnly(false);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* TEK BİR BAŞLIK VE SIRALANABİLİR TABLO: HATIRLATMALAR (7 Sütun) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Hatırlatmalar</h2>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredQuotes.length} kayıt listeleniyor)
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Sıralamak için sütun başlıklarına tıklayabilirsiniz.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                {/* 1. Sigortalı */}
                <th
                  onClick={() => handleSort('sigortali')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Sigortalıya göre sırala"
                >
                  <div className="flex items-center gap-1.5">
                    <span>1. Sigortalı</span>
                    {renderSortIndicator('sigortali')}
                  </div>
                </th>

                {/* 2. İş Türü */}
                <th
                  onClick={() => handleSort('isTuru')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="İş türüne göre sırala"
                >
                  <div className="flex items-center gap-1.5">
                    <span>2. İş Türü</span>
                    {renderSortIndicator('isTuru')}
                  </div>
                </th>

                {/* 3. Branş */}
                <th
                  onClick={() => handleSort('brans')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Branşa göre sırala"
                >
                  <div className="flex items-center gap-1.5">
                    <span>3. Branş</span>
                    {renderSortIndicator('brans')}
                  </div>
                </th>

                {/* 4. Plaka */}
                <th
                  onClick={() => handleSort('plaka')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Plakaya göre sırala"
                >
                  <div className="flex items-center gap-1.5">
                    <span>4. Plaka</span>
                    {renderSortIndicator('plaka')}
                  </div>
                </th>

                {/* 5. Poliçe Bitiş Tarihi */}
                <th
                  onClick={() => handleSort('bitisTarihi')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Bitiş tarihine göre sırala"
                >
                  <div className="flex items-center gap-1.5">
                    <span>5. Poliçe Bitiş Tarihi</span>
                    {renderSortIndicator('bitisTarihi')}
                  </div>
                </th>

                {/* 6. Kalan Gün */}
                <th
                  onClick={() => handleSort('kalanGun')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                  title="Kalan güne göre sırala (küçükten büyüğe / büyükten küçüğe)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>6. Kalan Gün</span>
                    {renderSortIndicator('kalanGun')}
                  </div>
                </th>

                {/* 7. İşlem */}
                <th className="py-3 px-4 text-right">
                  <span>7. İşlem</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((q) => {
                  const bType = getQuoteBusinessType(q);
                  const targetEndDate = getQuoteEndDate(q);
                  const days = targetEndDate ? calculateDaysLeft(targetEndDate) : null;

                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. Sigortalı: SADELEŞTİRİLDİ - Sadece isim/unvan, şirket/teklif no/prim kaldırıldı */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {q.insured}
                      </td>

                      {/* 2. İş Türü */}
                      <td className="py-3.5 px-4">
                        {renderBusinessTypeBadge(bType)}
                      </td>

                      {/* 3. Branş */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200">
                          <Shield className="w-3 h-3 text-blue-600" />
                          <span>{q.branch}</span>
                        </span>
                      </td>

                      {/* 4. Plaka */}
                      <td className="py-3.5 px-4">
                        {q.plate ? (
                          <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 font-mono font-bold text-slate-900 text-xs tracking-wider">
                            {q.plate}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">-</span>
                        )}
                      </td>

                      {/* 5. Poliçe Bitiş Tarihi */}
                      <td className="py-3.5 px-4 font-medium">
                        {targetEndDate ? (
                          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateTr(targetEndDate)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 6. Kalan Gün */}
                      <td className="py-3.5 px-4">
                        {renderDaysLeftBadge(days)}
                      </td>

                      {/* 7. İşlem (Detay ve Sonuçlandır Butonları) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Detay Butonu */}
                          <button
                            type="button"
                            onClick={() => onViewQuote(q)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Detay
                          </button>

                          {/* Sonuçlandır Butonu (Teklifler sayfasındaki akışın birebiri) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenConcludeModal) {
                                onOpenConcludeModal(q);
                              } else if (onConvertToPolicy) {
                                onConvertToPolicy(q);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sonuçlandır</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Bell className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-medium">
                        Seçilen filtrelere uygun hatırlatma kaydı bulunamadı.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
