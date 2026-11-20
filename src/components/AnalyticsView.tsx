import React, { useState, useMemo } from 'react';
import { Policy, Quote, PolicyEndorsement } from '../types/insurance';
import { formatCurrency, formatDateTr } from '../services/storage';
import { TabType } from './Sidebar';
import {
  BarChart3,
  TrendingUp,
  FileText,
  Shield,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  ChevronRight,
  Filter,
  DollarSign,
  PieChart,
  Percent,
  Clock,
  XCircle,
  HelpCircle,
  Building2,
  Car,
  AlertCircle,
  ArrowUpRight,
  Check,
} from 'lucide-react';

interface Props {
  policies: Policy[];
  quotes: Quote[];
  endorsements?: PolicyEndorsement[];
  onNavigateTab?: (tab: TabType, filterOption?: string) => void;
}

export type AnalyticsPeriod = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

// Europe/Istanbul safe timezone formatter helper
const getIstanbulDateString = (date: Date = new Date()): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Calculate start and end date for Europe/Istanbul
const calculatePeriodBounds = (
  period: AnalyticsPeriod,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } => {
  const todayStr = getIstanbulDateString();

  if (period === 'custom') {
    return {
      startDate: customStart || todayStr,
      endDate: customEnd || todayStr,
      label: `${customStart ? formatDateTr(customStart) : '...'} - ${customEnd ? formatDateTr(customEnd) : '...'}`,
    };
  }

  if (period === 'today') {
    return {
      startDate: todayStr,
      endDate: todayStr,
      label: `Bugün (${formatDateTr(todayStr)})`,
    };
  }

  // Parse today components
  const [yearNum, monthNum, dayNum] = todayStr.split('-').map((v) => parseInt(v, 10));
  const now = new Date(yearNum, monthNum - 1, dayNum);

  if (period === 'this_week') {
    // Monday as start of week, Sunday as end
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startWeekStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const endWeekStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    return {
      startDate: startWeekStr,
      endDate: endWeekStr,
      label: `Bu Hafta (${formatDateTr(startWeekStr)} - ${formatDateTr(endWeekStr)})`,
    };
  }

  if (period === 'this_month') {
    const firstDayStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDayNum = new Date(yearNum, monthNum, 0).getDate();
    const lastDayStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];

    return {
      startDate: firstDayStr,
      endDate: lastDayStr,
      label: `Bu Ay (${monthNames[monthNum - 1]} ${yearNum})`,
    };
  }

  if (period === 'this_year') {
    return {
      startDate: `${yearNum}-01-01`,
      endDate: `${yearNum}-12-31`,
      label: `Bu Yıl (${yearNum})`,
    };
  }

  return { startDate: todayStr, endDate: todayStr, label: 'Dönem' };
};

// Safe date comparison
const isDateInRange = (dateStr?: string, startStr?: string, endStr?: string): boolean => {
  if (!dateStr || !startStr || !endStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= startStr && d <= endStr;
};

// Primary policy date selector: issueDate (Tanzim) > startDate (Başlangıç) > createdAt
const getPolicyIssueDate = (policy: Policy): string => {
  return policy.issueDate || policy.startDate || policy.createdAt?.slice(0, 10) || '';
};

// Primary quote date selector: issueDate (Tanzim) > quoteDate > createdAt
const getQuoteIssueDate = (quote: Quote): string => {
  return quote.issueDate || quote.quoteDate || quote.createdAt?.slice(0, 10) || '';
};

// Get net policy premium taking endorsements & cancellations into account
const getPolicyNetPremium = (policy: Policy): number => {
  // If policy was completely cancelled from inception, net premium is 0
  if (policy.status === 'İptal' && policy.currentPremium === 0) {
    return 0;
  }
  if (typeof policy.currentPremium === 'number') {
    return Math.max(0, policy.currentPremium);
  }
  if (typeof policy.originalPremium === 'number') {
    return Math.max(0, policy.originalPremium);
  }
  return Math.max(0, policy.premium || 0);
};

export const AnalyticsView: React.FC<Props> = ({
  policies,
  quotes,
  endorsements = [],
  onNavigateTab,
}) => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');
  const [customStart, setCustomStart] = useState<string>(() => {
    const today = getIstanbulDateString();
    return today.slice(0, 7) + '-01';
  });
  const [customEnd, setCustomEnd] = useState<string>(() => getIstanbulDateString());

  // Include cancelled policies toggle or filter
  const [includeCancelled, setIncludeCancelled] = useState<boolean>(false);

  // Period bounds
  const { startDate, endDate, label: periodLabel } = useMemo(() => {
    return calculatePeriodBounds(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  // 1. FILTER POLICIES IN PERIOD
  const periodPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (!includeCancelled && p.status === 'İptal') return false;
      const d = getPolicyIssueDate(p);
      return isDateInRange(d, startDate, endDate);
    });
  }, [policies, startDate, endDate, includeCancelled]);

  // 2. FILTER QUOTES IN PERIOD (Main quotes worked on, excluding purely follow-up tasks)
  const periodWorkedQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Exclude cross-sell follow-up tasks
      if (q.businessType === 'Takip' || (q.businessType as any) === 'TAKİP') return false;
      const d = getQuoteIssueDate(q);
      return isDateInRange(d, startDate, endDate);
    });
  }, [quotes, startDate, endDate]);

  // 3. KEY METRICS & KPIS
  const kpiData = useMemo(() => {
    const workedQuotesCount = periodWorkedQuotes.length;
    const issuedPoliciesCount = periodPolicies.length;

    // Kasko vs. Trafik policy counts
    const kaskoCount = periodPolicies.filter(
      (p) => (p.branch || '').toLocaleLowerCase('tr-TR').includes('kasko')
    ).length;
    const trafikCount = periodPolicies.filter(
      (p) => (p.branch || '').toLocaleLowerCase('tr-TR').includes('trafik')
    ).length;
    const otherBranchCount = issuedPoliciesCount - kaskoCount - trafikCount;

    // Total net premium
    const totalPremium = periodPolicies.reduce((sum, p) => sum + getPolicyNetPremium(p), 0);

    // Average premium
    const avgPremium = issuedPoliciesCount > 0 ? totalPremium / issuedPoliciesCount : 0;

    // Quote conversion in the period:
    // Converted quotes: quoteStatus === 'kabul_edildi' or outcome === 'converted' or convertedPolicyId
    const convertedQuotes = periodWorkedQuotes.filter(
      (q) => q.quoteStatus === 'kabul_edildi' || q.outcome === 'converted' || Boolean(q.convertedPolicyId)
    );
    const rejectedQuotes = periodWorkedQuotes.filter(
      (q) => q.quoteStatus === 'reddedildi' || q.outcome === 'rejected'
    );
    const pendingQuotes = periodWorkedQuotes.filter(
      (q) =>
        q.status === 'active' &&
        q.quoteStatus !== 'kabul_edildi' &&
        q.quoteStatus !== 'reddedildi' &&
        !q.convertedPolicyId
    );

    const convertedQuotesCount = convertedQuotes.length;
    const conversionRate =
      workedQuotesCount > 0 ? ((convertedQuotesCount / workedQuotesCount) * 100) : 0;

    return {
      workedQuotesCount,
      issuedPoliciesCount,
      kaskoCount,
      trafikCount,
      otherBranchCount,
      totalPremium,
      avgPremium,
      convertedQuotesCount,
      rejectedQuotesCount: rejectedQuotes.length,
      pendingQuotesCount: pendingQuotes.length,
      conversionRate,
    };
  }, [periodWorkedQuotes, periodPolicies]);

  // 4. BRANCH BREAKDOWN (Kasko vs. Trafik vs. Diğer)
  const branchBreakdown = useMemo(() => {
    const kaskoPolicies = periodPolicies.filter((p) =>
      (p.branch || '').toLocaleLowerCase('tr-TR').includes('kasko')
    );
    const trafikPolicies = periodPolicies.filter((p) =>
      (p.branch || '').toLocaleLowerCase('tr-TR').includes('trafik')
    );
    const otherPolicies = periodPolicies.filter(
      (p) =>
        !(p.branch || '').toLocaleLowerCase('tr-TR').includes('kasko') &&
        !(p.branch || '').toLocaleLowerCase('tr-TR').includes('trafik')
    );

    const calcBranch = (name: string, list: Policy[]) => {
      const count = list.length;
      const prem = list.reduce((s, p) => s + getPolicyNetPremium(p), 0);
      const avg = count > 0 ? prem / count : 0;
      const countShare = kpiData.issuedPoliciesCount > 0 ? (count / kpiData.issuedPoliciesCount) * 100 : 0;
      const premShare = kpiData.totalPremium > 0 ? (prem / kpiData.totalPremium) * 100 : 0;
      return { name, count, totalPremium: prem, avgPremium: avg, countShare, premShare };
    };

    return [
      calcBranch('Kasko', kaskoPolicies),
      calcBranch('Trafik', trafikPolicies),
      ...(otherPolicies.length > 0 ? [calcBranch('Diğer', otherPolicies)] : []),
    ];
  }, [periodPolicies, kpiData.issuedPoliciesCount, kpiData.totalPremium]);

  // 5. COMPANY BREAKDOWN (Sigorta Şirketlerine Göre Dağılım)
  const companyBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; totalPremium: number; kasko: number; trafik: number }>();

    periodPolicies.forEach((p) => {
      const comp = (p.company || 'Belirtilmemiş').trim();
      const existing = map.get(comp) || { count: 0, totalPremium: 0, kasko: 0, trafik: 0 };
      const prem = getPolicyNetPremium(p);
      const isKasko = (p.branch || '').toLocaleLowerCase('tr-TR').includes('kasko');
      const isTrafik = (p.branch || '').toLocaleLowerCase('tr-TR').includes('trafik');

      existing.count += 1;
      existing.totalPremium += prem;
      if (isKasko) existing.kasko += 1;
      if (isTrafik) existing.trafik += 1;
      map.set(comp, existing);
    });

    return Array.from(map.entries())
      .map(([company, data]) => {
        const countShare = kpiData.issuedPoliciesCount > 0 ? (data.count / kpiData.issuedPoliciesCount) * 100 : 0;
        const premShare = kpiData.totalPremium > 0 ? (data.totalPremium / kpiData.totalPremium) * 100 : 0;
        const avg = data.count > 0 ? data.totalPremium / data.count : 0;
        return {
          company,
          count: data.count,
          totalPremium: data.totalPremium,
          avgPremium: avg,
          kaskoCount: data.kasko,
          trafikCount: data.trafik,
          countShare,
          premShare,
        };
      })
      .sort((a, b) => b.totalPremium - a.totalPremium); // highest premium first
  }, [periodPolicies, kpiData.issuedPoliciesCount, kpiData.totalPremium]);

  // 6. PREMIUM BRACKETS BREAKDOWN (Prim Aralıklarına Göre Dağılım)
  const premiumBrackets = useMemo(() => {
    const brackets = [
      { id: 'b1', label: '0 – 10.000 TL', min: 0, max: 10000, count: 0, totalPremium: 0 },
      { id: 'b2', label: '10.001 – 30.000 TL', min: 10000.01, max: 30000, count: 0, totalPremium: 0 },
      { id: 'b3', label: '30.001 – 50.000 TL', min: 30000.01, max: 50000, count: 0, totalPremium: 0 },
      { id: 'b4', label: '50.001 – 100.000 TL', min: 50000.01, max: 100000, count: 0, totalPremium: 0 },
      { id: 'b5', label: '100.001 TL ve Üzeri', min: 100000.01, max: Infinity, count: 0, totalPremium: 0 },
    ];

    periodPolicies.forEach((p) => {
      const prem = getPolicyNetPremium(p);
      const b = brackets.find((br) => prem >= br.min && prem <= br.max);
      if (b) {
        b.count += 1;
        b.totalPremium += prem;
      }
    });

    return brackets.map((b) => ({
      ...b,
      countShare: kpiData.issuedPoliciesCount > 0 ? (b.count / kpiData.issuedPoliciesCount) * 100 : 0,
      premShare: kpiData.totalPremium > 0 ? (b.totalPremium / kpiData.totalPremium) * 100 : 0,
    }));
  }, [periodPolicies, kpiData.issuedPoliciesCount, kpiData.totalPremium]);

  // 7. TIME SERIES TREND (Zaman İçinde Üretim Trendi)
  const timeSeriesTrend = useMemo(() => {
    // Decide grouping:
    // If range <= 31 days: Group by day
    // If range > 31 and <= 120 days: Group by week
    // If range > 120 days: Group by month
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    type TrendPoint = {
      key: string;
      label: string;
      policyCount: number;
      totalPremium: number;
      kaskoCount: number;
      trafikCount: number;
    };

    const map = new Map<string, TrendPoint>();

    if (diffDays <= 31) {
      // Daily points
      const cur = new Date(startD);
      while (cur <= endD) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        const dayLabel = `${d}.${m}`;
        map.set(iso, {
          key: iso,
          label: dayLabel,
          policyCount: 0,
          totalPremium: 0,
          kaskoCount: 0,
          trafikCount: 0,
        });
        cur.setDate(cur.getDate() + 1);
      }

      periodPolicies.forEach((p) => {
        const d = getPolicyIssueDate(p);
        const pt = map.get(d);
        if (pt) {
          pt.policyCount += 1;
          pt.totalPremium += getPolicyNetPremium(p);
          if ((p.branch || '').toLocaleLowerCase('tr-TR').includes('kasko')) pt.kaskoCount += 1;
          if ((p.branch || '').toLocaleLowerCase('tr-TR').includes('trafik')) pt.trafikCount += 1;
        }
      });
    } else {
      // Monthly points
      const monthNames = [
        'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
        'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
      ];
      const cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
      const endLimit = new Date(endD.getFullYear(), endD.getMonth(), 1);

      while (cur <= endLimit) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        const label = `${monthNames[cur.getMonth()]} ${String(y).slice(-2)}`;
        map.set(key, {
          key,
          label,
          policyCount: 0,
          totalPremium: 0,
          kaskoCount: 0,
          trafikCount: 0,
        });
        cur.setMonth(cur.getMonth() + 1);
      }

      periodPolicies.forEach((p) => {
        const d = getPolicyIssueDate(p);
        const ym = d.slice(0, 7);
        const pt = map.get(ym);
        if (pt) {
          pt.policyCount += 1;
          pt.totalPremium += getPolicyNetPremium(p);
          if ((p.branch || '').toLocaleLowerCase('tr-TR').includes('kasko')) pt.kaskoCount += 1;
          if ((p.branch || '').toLocaleLowerCase('tr-TR').includes('trafik')) pt.trafikCount += 1;
        }
      });
    }

    const points = Array.from(map.values());
    const maxCount = Math.max(1, ...points.map((pt) => pt.policyCount));
    const maxPremium = Math.max(1, ...points.map((pt) => pt.totalPremium));

    return {
      points,
      maxCount,
      maxPremium,
      mode: diffDays <= 31 ? 'daily' : 'monthly',
    };
  }, [periodPolicies, startDate, endDate]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Filter Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Üretim ve Teklif İstatistikleri</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acentenizin tanzim edilen poliçe ve çalışılan tekliflerinin performans analizi (Europe/Istanbul)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            {(
              [
                { id: 'today', label: 'Bugün' },
                { id: 'this_week', label: 'Bu Hafta' },
                { id: 'this_month', label: 'Bu Ay' },
                { id: 'this_year', label: 'Bu Yıl' },
                { id: 'custom', label: 'Özel Aralık' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  period === item.id
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Picker row if 'custom' is active */}
        {period === 'custom' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
              <Filter className="w-4 h-4 text-emerald-600" />
              Özel Tarih Aralığı:
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 font-medium">Başlangıç:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 font-medium">Bitiş:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Selected Period Badge & Status */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              {periodLabel}
            </span>
            <span className="text-slate-400">|</span>
            <span>Tanzim Tarihine Göre Hesaplanmaktadır</span>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(e) => setIncludeCancelled(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-[11px] font-medium">İptal Poliçeleri Dahil Et</span>
          </label>
        </div>
      </div>

      {/* SECTION 1: GENEL PERFORMANS GÖSTERGELERİ (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Prim Üretimi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-105 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Prim Üretimi</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                ₺
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(kpiData.totalPremium)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Kesilen poliçelerin net toplamı</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kesilen Poliçe Sayısı */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-105 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kesilen Poliçe Sayısı</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {kpiData.issuedPoliciesCount} <span className="text-sm font-semibold text-slate-500">Adet</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span className="text-indigo-600 font-bold">{kpiData.kaskoCount} Kasko</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">{kpiData.trafikCount} Trafik</span>
                {kpiData.otherBranchCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500">{kpiData.otherBranchCount} Diğer</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ortalama Poliçe Primi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-cyan-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-105 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ortalama Poliçe Primi</span>
              <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(kpiData.avgPremium)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-medium">
                Poliçe başına düşen ortalama prim
              </div>
            </div>
          </div>
        </div>

        {/* Tekliften Poliçeye Dönüşüm Oranı */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-105 transition-transform" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dönüşüm Oranı</span>
              <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                %{kpiData.conversionRate.toFixed(1)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-violet-700 font-medium">
                <span>{kpiData.workedQuotesCount} tekliften {kpiData.convertedQuotesCount} poliçe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3: BRANŞA GÖRE DAĞILIM & TEKLİF PERFORMANSI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branşa Göre Üretim (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Branşa Göre Üretim Dağılımı</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kasko ve Trafik poliçelerinin adet, prim ve pay oranları</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          {/* Branch Comparison Bars */}
          <div className="space-y-4">
            {branchBreakdown.map((item) => (
              <div key={item.name} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        item.name === 'Kasko'
                          ? 'bg-indigo-600'
                          : item.name === 'Trafik'
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="font-bold text-sm text-slate-800">{item.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold">
                      {item.count} Poliçe (%{item.countShare.toFixed(1)})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {formatCurrency(item.totalPremium)}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5 font-medium">
                      (%{item.premShare.toFixed(1)})
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.name === 'Kasko'
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                        : item.name === 'Trafik'
                        ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                        : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, item.premShare))}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span>Ortalama Prim: <strong className="text-slate-700 font-semibold">{formatCurrency(item.avgPremium)}</strong></span>
                  <span>Toplam Üretim Payı: <strong className="text-slate-700 font-semibold">%{item.premShare.toFixed(1)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {periodPolicies.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Seçilen dönemde tanzim edilmiş poliçe bulunmamaktadır.
            </div>
          )}
        </div>

        {/* Teklif Performansı (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Teklif Performansı</h2>
                <p className="text-xs text-slate-500 mt-0.5">Dönemde çalışılan ana tekliflerin akıbeti</p>
              </div>
              <div className="p-2 rounded-xl bg-violet-100 text-violet-700">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {/* Çalışılan Teklif */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Çalışılan Ana Teklif</span>
                </div>
                <span className="font-extrabold text-slate-900 text-sm">
                  {kpiData.workedQuotesCount}
                </span>
              </div>

              {/* Poliçeye Dönüşen */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-900">Poliçeye Dönüşen</span>
                    <span className="block text-[10px] text-emerald-700">Olumlu sonuç</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-900 text-sm">{kpiData.convertedQuotesCount}</span>
                  <span className="block text-[10px] text-emerald-700 font-bold">%{kpiData.conversionRate.toFixed(0)}</span>
                </div>
              </div>

              {/* Beklemede / Müşteri Yanıtı */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="text-xs font-semibold text-amber-900">Beklemede / Müşteride</span>
                    <span className="block text-[10px] text-amber-700">Süreci devam eden</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-amber-900 text-sm">{kpiData.pendingQuotesCount}</span>
                  <span className="block text-[10px] text-amber-700 font-bold">
                    %{kpiData.workedQuotesCount > 0 ? ((kpiData.pendingQuotesCount / kpiData.workedQuotesCount) * 100).toFixed(0) : 0}
                  </span>
                </div>
              </div>

              {/* Reddedilen / Olumsuz */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <div>
                    <span className="text-xs font-semibold text-rose-900">Olumsuz Sonuçlanan</span>
                    <span className="block text-[10px] text-rose-700">Yaptırmadı / Başka yer</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-rose-900 text-sm">{kpiData.rejectedQuotesCount}</span>
                  <span className="block text-[10px] text-rose-700 font-bold">
                    %{kpiData.workedQuotesCount > 0 ? ((kpiData.rejectedQuotesCount / kpiData.workedQuotesCount) * 100).toFixed(0) : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick link button to quotes */}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('quotes')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Teklif Yönetimine Git</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 4: ZAMAN İÇİNDE ÜRETİM TRENDİ (Bar Chart & Daily/Monthly Breakdown) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Zaman İçinde Üretim Trendi</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seçilen dönemde tanzim edilen poliçe adetleri ve prim dalgalanması ({timeSeriesTrend.mode === 'daily' ? 'Günlük' : 'Aylık'} akış)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Prim (₺)
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-sm bg-indigo-500" /> Poliçe Adedi
            </span>
          </div>
        </div>

        {timeSeriesTrend.points.length > 0 ? (
          <div className="space-y-6">
            {/* Visual Bar Graph */}
            <div className="h-48 flex items-end gap-1.5 sm:gap-2.5 pt-6 pb-2 border-b border-slate-200 overflow-x-auto">
              {timeSeriesTrend.points.map((pt) => {
                const heightPercent = pt.totalPremium > 0
                  ? Math.max(8, Math.round((pt.totalPremium / timeSeriesTrend.maxPremium) * 100))
                  : 4;

                return (
                  <div
                    key={pt.key}
                    className="flex-1 min-w-[28px] max-w-[60px] flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-slate-900 text-white text-[11px] rounded-lg py-1.5 px-2.5 shadow-lg whitespace-nowrap">
                        <div className="font-bold">{pt.label}</div>
                        <div className="text-emerald-400 font-semibold">{formatCurrency(pt.totalPremium)}</div>
                        <div className="text-slate-300">{pt.policyCount} Poliçe ({pt.kaskoCount} Kasko, {pt.trafikCount} Trafik)</div>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>

                    {/* Policy count indicator on top */}
                    {pt.policyCount > 0 && (
                      <span className="text-[10px] font-bold text-indigo-700 mb-1 group-hover:scale-110 transition-transform">
                        {pt.policyCount}
                      </span>
                    )}

                    {/* Bar element */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        pt.totalPremium > 0
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 shadow-sm'
                          : 'bg-slate-200 h-2'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />

                    {/* X-axis label */}
                    <span className="text-[10px] text-slate-500 mt-2 font-medium truncate w-full text-center">
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick stats footer under graph */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
              <span>Toplam {timeSeriesTrend.points.length} zaman dilimi analiz edildi</span>
              <span>
                En yüksek üretim: <strong className="text-slate-800 font-bold">{formatCurrency(timeSeriesTrend.maxPremium)}</strong> ({timeSeriesTrend.maxCount} poliçe)
              </span>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            Grafik oluşturmak için yeterli veri bulunamadı.
          </div>
        )}
      </div>

      {/* SECTION 5: SİGORTA ŞİRKETLERİNE GÖRE POLİÇE DAĞILIMI */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Sigorta Şirketlerine Göre Dağılım</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Poliçelerin kesildiği asıl sigorta şirketlerine göre adet, toplam prim ve üretim payları
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
            <Building2 className="w-3.5 h-3.5" />
            {companyBreakdown.length} Farklı Şirket
          </div>
        </div>

        {companyBreakdown.length > 0 ? (
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Sigorta Şirketi</th>
                  <th className="py-3 px-3 text-center">Poliçe Adedi</th>
                  <th className="py-3 px-3 text-center">Kasko / Trafik</th>
                  <th className="py-3 px-3 text-right">Ortalama Prim</th>
                  <th className="py-3 px-4 text-right">Toplam Prim</th>
                  <th className="py-3 px-4 text-right">Üretim Payı (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyBreakdown.map((row, idx) => (
                  <tr key={row.company} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{row.company}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800">
                      {row.count}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      <span className="text-indigo-600 font-semibold">{row.kaskoCount} K</span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="text-blue-600 font-semibold">{row.trafikCount} T</span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 font-medium">
                      {formatCurrency(row.avgPremium)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(row.totalPremium)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(3, row.premShare))}%` }}
                          />
                        </div>
                        <span className="font-bold text-emerald-700 min-w-[42px] text-right">
                          %{row.premShare.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                  <td className="py-3 px-4">TOPLAM</td>
                  <td className="py-3 px-3 text-center">{kpiData.issuedPoliciesCount}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-indigo-600">{kpiData.kaskoCount} K</span> / <span className="text-blue-600">{kpiData.trafikCount} T</span>
                  </td>
                  <td className="py-3 px-3 text-right">{formatCurrency(kpiData.avgPremium)}</td>
                  <td className="py-3 px-4 text-right text-emerald-800 font-black">{formatCurrency(kpiData.totalPremium)}</td>
                  <td className="py-3 px-4 text-right">%100.0</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            Seçilen dönemde poliçe kaydı bulunmamaktadır.
          </div>
        )}
      </div>

      {/* SECTION 6: PRİM ARALIKLARINA GÖRE DAĞILIM */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Prim Aralıklarına Göre Dağılım</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Poliçelerin tutar segmentlerine göre adet ve prim büyüklükleri
            </p>
          </div>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {premiumBrackets.map((br) => (
            <div
              key={br.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight block">
                  {br.label}
                </span>
                <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">
                  {br.count} <span className="text-xs font-semibold text-slate-500">Poliçe</span>
                </div>
                <div className="text-xs font-semibold text-emerald-700 mt-1">
                  {formatCurrency(br.totalPremium)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Adet Payı:</span>
                  <span className="font-bold text-slate-700">%{br.countShare.toFixed(1)}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, br.countShare))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
