import React, { useMemo } from 'react';
import { Quote, Policy } from '../types/insurance';
import { calculateDaysLeft, formatCurrency, formatDateTr } from '../services/storage';
import {
  FileText,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface Props {
  quotes: Quote[];
  policies: Policy[];
  onOpenNewQuote: () => void;
  onOpenNewPolicy: () => void;
  onViewQuote: (quote: Quote) => void;
  onViewPolicy: (policy: Policy) => void;
  onConvertToPolicy: (quote: Quote) => void;
  onNavigateTab: (tab: 'dashboard' | 'quotes' | 'policies' | 'concluded' | 'reminders', filterOption?: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  quotes,
  policies,
  onOpenNewQuote,
  onOpenNewPolicy,
  onViewQuote,
  onViewPolicy,
  onConvertToPolicy,
  onNavigateTab,
}) => {
  const activeQuotes = quotes.filter(
    (q) => q.status === 'active' && q.businessType !== 'Takip' && (q.businessType as any) !== 'TAKİP'
  );
  const activePolicies = policies.filter((p) => p.status !== 'Sonuçlandı' && p.status !== 'İptal');
  const concludedQuotes = quotes.filter((q) => q.status === 'concluded');
  const convertedCount = concludedQuotes.filter((q) => q.outcome === 'converted').length;
  const totalConcludedQuotes = concludedQuotes.length;
  const conversionRate = totalConcludedQuotes > 0 ? Math.round((convertedCount / totalConcludedQuotes) * 100) : 0;

  // 1.A: Yaklaşan İşler:
  // Poliçe veya takip kapsamında bitiş tarihine 14 gün veya daha az kalan tüm işler (Yenileme, Yeni İş, Takip)
  // Süresi geçmiş işler (daysLeft < 0) dahil edilmez, bitiş tarihi olmayanlar gösterilmez.
  // Tekrarlanan kayıtlar önlenir (deduplicated).
  const upcomingJobs = useMemo(() => {
    interface UpcomingItem {
      id: string;
      insured: string;
      branch: string;
      plate?: string;
      endDate: string;
      daysLeft: number;
    }

    const items: UpcomingItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Aktif poliçeler
    activePolicies.forEach((p) => {
      if (!p.endDate) return;
      const d = calculateDaysLeft(p.endDate);
      if (d !== null && d >= 0 && d <= 14) {
        const cleanPlate = p.plate ? p.plate.replace(/\s+/g, '').toLocaleUpperCase('tr-TR') : '';
        const key = `${p.insured.trim().toLocaleLowerCase('tr-TR')}-${p.branch.trim().toLocaleLowerCase('tr-TR')}-${cleanPlate}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          items.push({
            id: `pol-${p.id}`,
            insured: p.insured,
            branch: p.branch,
            plate: p.plate,
            endDate: p.endDate,
            daysLeft: d,
          });
        }
      }
    });

    // 2. Aktif teklifler & Takipler
    quotes
      .filter((q) => q.status === 'active')
      .forEach((q) => {
        const end = q.endDate || q.validUntil;
        if (!end) return;
        const d = calculateDaysLeft(end);
        if (d !== null && d >= 0 && d <= 14) {
          const cleanPlate = q.plate ? q.plate.replace(/\s+/g, '').toLocaleUpperCase('tr-TR') : '';
          const key = `${q.insured.trim().toLocaleLowerCase('tr-TR')}-${q.branch.trim().toLocaleLowerCase('tr-TR')}-${cleanPlate}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            items.push({
              id: `quote-${q.id}`,
              insured: q.insured,
              branch: q.branch,
              plate: q.plate,
              endDate: end,
              daysLeft: d,
            });
          }
        }
      });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [activePolicies, quotes]);

  // 1.B: Öncelikli İşler:
  // Yalnızca Kasko branşında ve kullanıcı tarafından Öncelikli İş olarak işaretlenmiş aktif teklifler
  const priorityKaskoQuotes = useMemo(() => {
    return quotes
      .filter((q) => q.status === 'active' && q.branch === 'Kasko' && Boolean(q.isPriority))
      .map((q) => {
        const end = q.endDate || q.validUntil || '';
        const days = end ? calculateDaysLeft(end) : null;
        return {
          id: q.id,
          insured: q.insured,
          branch: q.branch,
          plate: q.plate,
          endDate: end,
          daysLeft: days,
        };
      })
      .sort((a, b) => {
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      });
  }, [quotes]);

  const overduePoliciesCount = activePolicies.filter((p) => {
    const d = calculateDaysLeft(p.endDate);
    return d !== null && d < 0;
  }).length;

  const next14DaysCount = activePolicies.filter((p) => {
    const d = calculateDaysLeft(p.endDate);
    return d !== null && d >= 0 && d <= 14;
  }).length;

  const totalPortfolioPremium = activePolicies.reduce((acc, curr) => acc + (curr.premium || 0), 0);
  const totalQuotesPremium = activeQuotes.reduce((acc, curr) => acc + (curr.premium || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome & Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-sm">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-indigo-300 uppercase">
            Acente Yönetim Paneli
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-0.5">Teklif ve Poliçe Takip Portalı</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Teklif hazırlayın, olumlu teklifleri tek tıkla poliçeleştirin ve sonuçlanan tüm işlerinizi analiz edin.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onOpenNewQuote}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Yeni Teklif</span>
          </button>
          <button
            onClick={onOpenNewPolicy}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Yeni Poliçe</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Teklifler */}
        <div
          onClick={() => onNavigateTab('quotes')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Aktif Teklifler</span>
            </span>
            <span className="text-[11px] text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
              Tümü →
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{activeQuotes.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Potansiyel: <strong className="text-slate-800">{formatCurrency(totalQuotesPremium)}</strong>
          </div>
        </div>

        {/* Card 2: Poliçeler */}
        <div
          onClick={() => onNavigateTab('policies')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Poliçeler</span>
            </span>
            <span className="text-[11px] text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
              Poliçeler →
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{activePolicies.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Poliçeleşen Portföy: <strong className="text-slate-800">{formatCurrency(totalPortfolioPremium)}</strong>
          </div>
        </div>

        {/* Card 3: Yaklaşan / Acil Yenilemeler */}
        <div
          onClick={() => onNavigateTab('reminders', 'urgent')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Acil Yenilemeler</span>
            </span>
            {overduePoliciesCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                {overduePoliciesCount} Gecikmiş
              </span>
            ) : (
              <span className="text-[11px] text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform">
                Git →
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{next14DaysCount + overduePoliciesCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">14 gün içi ve gecikmişler</div>
        </div>

        {/* Card 4: Sonuçlananlar & Dönüşüm */}
        <div
          onClick={() => onNavigateTab('concluded')}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sonuçlananlar</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">
              İncele →
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">%{conversionRate} Başarı</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {convertedCount} teklif poliçeleştirildi
          </div>
        </div>
      </div>

      {/* Two Columns: Yaklaşan İşler & Öncelikli İşler (Her iki bölümde de buton bulunmaz) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Yaklaşan İşler */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col w-[457.2px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Yaklaşan İşler</span>
              </h2>
              <p className="text-xs text-slate-500">Bitiş tarihine 14 gün veya daha az kalan tüm poliçe ve takipleri</p>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {upcomingJobs.length} Kayıt
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Sigortalı</th>
                  <th className="py-2.5 px-3">Branş</th>
                  <th className="py-2.5 px-3">Plaka</th>
                  <th className="py-2.5 px-3">Bitiş Tarihi</th>
                  <th className="py-2.5 px-3 text-right">Kalan Gün</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingJobs.length > 0 ? (
                  upcomingJobs.slice(0, 15).map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{job.insured}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {job.branch}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-xs">
                        {job.plate || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {formatDateTr(job.endDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          job.daysLeft <= 3
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : job.daysLeft <= 7
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {job.daysLeft === 0 ? 'Bugün' : `${job.daysLeft} Gün`}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                      Bitişine 14 gün veya daha az kalan kayıt bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Öncelikli İşler (Kasko Öncelikli Teklifler) */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col w-[457.2px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Öncelikli İşler</span>
              </h2>
              <p className="text-xs text-slate-500">Öncelikli olarak işaretlenmiş Kasko teklifleri</p>
            </div>
            <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {priorityKaskoQuotes.length} Teklif
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Sigortalı</th>
                  <th className="py-2.5 px-3">Branş</th>
                  <th className="py-2.5 px-3">Plaka</th>
                  <th className="py-2.5 px-3">Bitiş Tarihi</th>
                  <th className="py-2.5 px-3 text-right">Kalan Gün</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityKaskoQuotes.length > 0 ? (
                  priorityKaskoQuotes.slice(0, 15).map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{q.insured}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {q.branch}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-xs">
                        {q.plate || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {formatDateTr(q.endDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {q.daysLeft !== null ? (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            q.daysLeft < 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : q.daysLeft <= 7
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {q.daysLeft < 0
                              ? `${Math.abs(q.daysLeft)} gün geçti`
                              : q.daysLeft === 0
                              ? 'Bugün'
                              : `${q.daysLeft} Gün`}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                      Öncelikli olarak işaretlenmiş Kasko teklifi bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
