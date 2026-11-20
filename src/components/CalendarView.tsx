import React, { useState } from 'react';
import { Quote, Policy } from '../types/insurance';
import { calculateDaysLeft, formatCurrency, getTodayIso } from '../services/storage';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Shield, FileText } from 'lucide-react';

interface Props {
  quotes: Quote[];
  policies: Policy[];
  onViewQuote: (quote: Quote) => void;
  onViewPolicy: (policy: Policy) => void;
}

export const CalendarView: React.FC<Props> = ({ quotes, policies, onViewQuote, onViewPolicy }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday as first day of week (Turkish calendar style)
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = firstDayOfMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const activePolicies = policies.filter((p) => p.status !== 'Sonuçlandı' && p.status !== 'İptal');
  const activeQuotes = quotes.filter((q) => q.status === 'active');
  const todayStr = getTodayIso();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
            <span>Yenileme & Teklif Takvimi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Poliçe bitiş tarihlerini ve teklif son geçerlilik sürelerini aylık takvimde takip edin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Bugün
          </button>
          <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-2xs overflow-hidden">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 text-xs font-bold text-slate-800 capitalize min-w-[130px] text-center">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-600 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-indigo-100 border border-indigo-300 inline-block" />
          <span>Poliçe Bitiş / Yenileme</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-blue-100 border border-blue-300 inline-block" />
          <span>Teklif Son Geçerlilik</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-300 inline-block" />
          <span>Kritik (≤ 7 Gün)</span>
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-600">
          {dayNames.map((d) => (
            <div key={d} className="py-2.5">
              {d}
            </div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {/* Empty cells before month start */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/40 p-2 text-slate-300" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = dayDate === todayStr;

            const dayPolicies = activePolicies.filter((p) => p.endDate === dayDate);
            const dayQuotes = activeQuotes.filter((q) => q.validUntil === dayDate);

            return (
              <div
                key={dayNum}
                className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between ${
                  isToday ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {(dayPolicies.length > 0 || dayQuotes.length > 0) && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {dayPolicies.length + dayQuotes.length} işlem
                    </span>
                  )}
                </div>

                {/* Events list */}
                <div className="space-y-1 overflow-y-auto max-h-[90px]">
                  {/* Policies */}
                  {dayPolicies.map((p) => {
                    const days = calculateDaysLeft(p.endDate);
                    const isUrgent = days !== null && days <= 7;
                    return (
                      <div
                        key={p.id}
                        onClick={() => onViewPolicy(p)}
                        title={`Poliçe Bitişi: ${p.insured} - ${p.branch} (${formatCurrency(p.premium)})`}
                        className={`px-1.5 py-1 rounded text-[11px] truncate font-medium cursor-pointer transition-colors flex items-center gap-1 border ${
                          isUrgent
                            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        <Shield className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.plate || p.insured}</span>
                      </div>
                    );
                  })}

                  {/* Quotes */}
                  {dayQuotes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => onViewQuote(q)}
                      title={`Teklif Son Gün: ${q.insured} - ${q.branch} (${formatCurrency(q.premium)})`}
                      className="px-1.5 py-1 rounded text-[11px] truncate font-medium cursor-pointer transition-colors flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{q.plate || q.insured}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
