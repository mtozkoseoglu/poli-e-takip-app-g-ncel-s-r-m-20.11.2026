import React from 'react';
import { Quote, QuoteStage, QUOTE_STAGES } from '../types/insurance';
import {
  formatCurrency,
  formatDateTr,
  calculateDaysLeft,
  getEffectiveQuoteStatus,
  getQuoteProgressPercent,
  generateId,
  normalizeQuoteStage,
} from '../services/storage';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface Props {
  quotes: Quote[];
  onOpenProgressModal: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onOpenConcludeModal?: (quote: Quote) => void;
  onConvertToPolicy: (quote: Quote) => void;
  onConcludeNegative: (quote: Quote) => void;
  onUpdateQuote: (quote: Quote) => void;
}

export const QuoteKanbanBoard: React.FC<Props> = ({
  quotes,
  onOpenProgressModal,
  onEditQuote,
  onOpenConcludeModal,
  onConvertToPolicy,
  onConcludeNegative,
  onUpdateQuote,
}) => {
  // Define Pipeline Columns:
  // 4 Active Stages + 2 Concluded Stages (Kabul Edildi, Reddedildi)
  const columns: Array<{
    id: string;
    title: string;
    stageMatch?: QuoteStage | string;
    statusMatch?: 'kabul_edildi' | 'reddedildi';
    badgeColor: string;
    headerBg: string;
    borderTop: string;
  }> = [
    {
      id: 'sunulacak',
      title: 'Müşteriye Sunulacak',
      stageMatch: 'MÜŞTERİYE SUNULACAK',
      badgeColor: 'bg-blue-100 text-blue-700',
      headerBg: 'bg-blue-50/50',
      borderTop: 'border-t-blue-500',
    },
    {
      id: 'indirim_istendi',
      title: 'İndirim İstendi',
      stageMatch: 'İNDİRİM İSTENDİ',
      badgeColor: 'bg-purple-100 text-purple-700',
      headerBg: 'bg-purple-50/50',
      borderTop: 'border-t-purple-500',
    },
    {
      id: 'yanit_bekleniyor',
      title: 'Müşteriden Yanıt Bekleniyor',
      stageMatch: 'MÜŞTERİDEN YANIT BEKLENİYOR',
      badgeColor: 'bg-indigo-100 text-indigo-700',
      headerBg: 'bg-indigo-50/50',
      borderTop: 'border-t-indigo-500',
    },
    {
      id: 'kabul',
      title: 'Kabul Edildi (Poliçeleşti)',
      statusMatch: 'kabul_edildi',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      headerBg: 'bg-emerald-50/50',
      borderTop: 'border-t-emerald-500',
    },
    {
      id: 'red',
      title: 'Reddedildi / Yapılmadı',
      statusMatch: 'reddedildi',
      badgeColor: 'bg-rose-100 text-rose-800',
      headerBg: 'bg-rose-50/50',
      borderTop: 'border-t-rose-500',
    },
  ];

  const handleMoveQuote = (quote: Quote, direction: 'next' | 'prev') => {
    const currentNormStage = normalizeQuoteStage(quote.stage);
    const currentIndex = QUOTE_STAGES.indexOf(currentNormStage);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < QUOTE_STAGES.length) {
      const nextStage = QUOTE_STAGES[newIndex];
      const nowStr = new Date().toISOString();
      const updated: Quote = {
        ...quote,
        stage: nextStage,
        progressLogs: [
          {
            id: generateId(),
            stage: nextStage,
            status: getEffectiveQuoteStatus(quote),
            timestamp: nowStr,
            note: `Aşama Kanban üzerinden "${nextStage}" olarak değiştirildi.`,
          },
          ...(quote.progressLogs || []),
        ],
        updatedAt: nowStr,
      };
      onUpdateQuote(updated);
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1050px]">
        {columns.map((col) => {
          // Get items in this column
          const colQuotes = quotes.filter((q) => {
            const status = getEffectiveQuoteStatus(q);
            if (col.statusMatch) {
              return status === col.statusMatch;
            }
            if (status !== 'beklemede') return false;
            const normStage = normalizeQuoteStage(q.stage);
            return normStage === col.stageMatch;
          });

          const totalPremium = colQuotes.reduce((acc, curr) => acc + (curr.premium || 0), 0);

          return (
            <div
              key={col.id}
              className={`flex-1 min-w-[240px] bg-slate-50/80 rounded-2xl border border-slate-200 border-t-4 ${col.borderTop} flex flex-col max-h-[760px]`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-slate-200/80 rounded-t-xl ${col.headerBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-xs text-slate-900 truncate" title={col.title}>
                    {col.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${col.badgeColor}`}>
                    {colQuotes.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Toplam: <strong className="text-slate-800">{formatCurrency(totalPremium)}</strong>
                </div>
              </div>

              {/* Column Cards List */}
              <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
                {colQuotes.length > 0 ? (
                  colQuotes.map((quote) => {
                    const daysLeft = calculateDaysLeft(quote.validUntil);
                    const status = getEffectiveQuoteStatus(quote);
                    const progressPercent = getQuoteProgressPercent(quote);
                    const currentStageIdx = QUOTE_STAGES.indexOf(quote.stage);

                    return (
                      <div
                        key={quote.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all space-y-2.5 group"
                      >
                        {/* Top Info */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-900 text-xs leading-tight">
                              {quote.insured}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span className="font-medium text-slate-700">{quote.branch}</span>
                              {quote.plate && (
                                <span className="font-mono px-1 py-0.2 bg-slate-100 rounded text-[10px] text-slate-800 font-bold">
                                  {quote.plate}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-slate-900 text-xs shrink-0">
                            {formatCurrency(quote.premium)}
                          </span>
                        </div>

                        {/* Company & Details */}
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span className="truncate max-w-[120px]">{quote.company}</span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {quote.quoteNumber || '—'}
                          </span>
                        </div>

                        {/* Progress Mini Track */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span>İlerleme</span>
                            <span className="font-bold text-slate-700">%{progressPercent}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                status === 'kabul_edildi'
                                  ? 'bg-emerald-500'
                                  : status === 'reddedildi'
                                  ? 'bg-rose-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Validity Badge */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          {daysLeft !== null ? (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                daysLeft < 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : daysLeft <= 3
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              {daysLeft < 0
                                ? 'Süre doldu'
                                : daysLeft === 0
                                ? 'Son gün!'
                                : `${daysLeft} gün kaldı`}
                            </span>
                          ) : (
                            <span />
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenProgressModal(quote)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>İlerleme</span>
                          </button>
                        </div>

                        {/* If rejected, show nonConversionReason */}
                        {(quote.nonConversionReason || quote.rejectionReason) && status === 'reddedildi' && (
                          <div className="text-[10px] text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 font-semibold truncate" title={quote.nonConversionReason || quote.rejectionReason}>
                            ❌ {quote.nonConversionReason || quote.rejectionReason}
                          </div>
                        )}

                        {/* Action Buttons for Active Quotes */}
                        {status === 'beklemede' && (
                          <div className="flex items-center justify-between pt-1 gap-1">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={currentStageIdx === 0}
                                onClick={() => handleMoveQuote(quote, 'prev')}
                                title="Önceki aşamaya al"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={currentStageIdx >= QUOTE_STAGES.length - 1}
                                onClick={() => handleMoveQuote(quote, 'next')}
                                title="Sonraki aşamaya ilerlet"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenConcludeModal) {
                                    onOpenConcludeModal(quote);
                                  } else {
                                    onConvertToPolicy(quote);
                                  }
                                }}
                                title="Teklifi Sonuçlandır (Olumlu / Olumsuz)"
                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Sonuçlandır</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">Teklif yok</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
