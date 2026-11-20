import React, { useState } from 'react';
import { Quote, QuoteStage, QuoteStatus, QUOTE_STAGES, QuoteProgressLog } from '../types/insurance';
import {
  formatCurrency,
  formatDateTr,
  getEffectiveQuoteStatus,
  getQuoteProgressPercent,
  getQuoteStatusMeta,
  generateId,
  normalizeQuoteStage,
} from '../services/storage';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Send,
  Plus,
  Shield,
  FileText,
  Calendar,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onUpdateQuote: (quote: Quote) => void;
  onConvertToPolicy: (quote: Quote) => void;
  onConcludeNegative: (quote: Quote) => void;
}

export const QuoteProgressModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quote,
  onUpdateQuote,
  onConvertToPolicy,
  onConcludeNegative,
}) => {
  const [newLogNote, setNewLogNote] = useState('');

  if (!isOpen || !quote) return null;

  const currentStatus = getEffectiveQuoteStatus(quote);
  const statusMeta = getQuoteStatusMeta(currentStatus);
  const progressPercent = getQuoteProgressPercent(quote);
  const currentStageIndex = QUOTE_STAGES.indexOf(normalizeQuoteStage(quote.stage));

  // Advance to next stage
  const handleAdvanceStage = () => {
    if (currentStageIndex < QUOTE_STAGES.length - 1) {
      const nextStage = QUOTE_STAGES[currentStageIndex + 1];
      const nowStr = new Date().toISOString();
      const newLog: QuoteProgressLog = {
        id: generateId(),
        stage: nextStage,
        status: currentStatus,
        timestamp: nowStr,
        note: `Aşama "${nextStage}" olarak güncellendi.`,
      };

      const updated: Quote = {
        ...quote,
        stage: nextStage,
        progressLogs: [newLog, ...(quote.progressLogs || [])],
        updatedAt: nowStr,
      };
      onUpdateQuote(updated);
    }
  };

  // Revert to previous stage
  const handleRevertStage = () => {
    if (currentStageIndex > 0) {
      const prevStage = QUOTE_STAGES[currentStageIndex - 1];
      const nowStr = new Date().toISOString();
      const newLog: QuoteProgressLog = {
        id: generateId(),
        stage: prevStage,
        status: currentStatus,
        timestamp: nowStr,
        note: `Aşama "${prevStage}" aşamasına geri alındı.`,
      };

      const updated: Quote = {
        ...quote,
        stage: prevStage,
        progressLogs: [newLog, ...(quote.progressLogs || [])],
        updatedAt: nowStr,
      };
      onUpdateQuote(updated);
    }
  };

  // Set specific stage directly
  const handleSelectStage = (targetStage: QuoteStage) => {
    if (targetStage === quote.stage) return;
    const nowStr = new Date().toISOString();
    const newLog: QuoteProgressLog = {
      id: generateId(),
      stage: targetStage,
      status: currentStatus,
      timestamp: nowStr,
      note: `Aşama "${targetStage}" olarak belirlendi.`,
    };

    const updated: Quote = {
      ...quote,
      stage: targetStage,
      progressLogs: [newLog, ...(quote.progressLogs || [])],
      updatedAt: nowStr,
    };
    onUpdateQuote(updated);
  };

  // Change general status
  const handleChangeStatus = (targetStatus: QuoteStatus) => {
    if (targetStatus === currentStatus) return;

    if (targetStatus === 'kabul_edildi') {
      onClose();
      onConvertToPolicy(quote);
      return;
    }

    if (targetStatus === 'reddedildi') {
      onClose();
      onConcludeNegative(quote);
      return;
    }

    // Set back to Beklemede
    const nowStr = new Date().toISOString();
    const newLog: QuoteProgressLog = {
      id: generateId(),
      stage: quote.stage,
      status: 'beklemede',
      timestamp: nowStr,
      note: 'Teklif durumu tekrar "Beklemede / Süreçte" olarak güncellendi.',
    };

    const updated: Quote = {
      ...quote,
      status: 'active',
      quoteStatus: 'beklemede',
      outcome: undefined,
      resultDate: undefined,
      progressLogs: [newLog, ...(quote.progressLogs || [])],
      updatedAt: nowStr,
    };
    onUpdateQuote(updated);
  };

  // Add a timeline note
  const handleAddLogNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNote.trim()) return;

    const nowStr = new Date().toISOString();
    const newLog: QuoteProgressLog = {
      id: generateId(),
      stage: quote.stage,
      status: currentStatus,
      timestamp: nowStr,
      note: newLogNote.trim(),
    };

    const updated: Quote = {
      ...quote,
      progressLogs: [newLog, ...(quote.progressLogs || [])],
      updatedAt: nowStr,
    };
    onUpdateQuote(updated);
    setNewLogNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Teklif İlerleme & Durum Takibi</h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.badgeBg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                  <span>{statusMeta.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">{quote.insured} · {quote.branch} · {quote.company}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Status Selector Buttons (Beklemede, Kabul Edildi, Reddedildi) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Teklif Ana Durumu</span>
              <span className="text-[11px] text-slate-400 font-normal">Hızlı durum güncellemesi için seçin</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Beklemede */}
              <button
                type="button"
                onClick={() => handleChangeStatus('beklemede')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  currentStatus === 'beklemede'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50 hover:border-amber-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>⏳ Beklemede / Süreçte</span>
              </button>

              {/* 2. Kabul Edildi */}
              <button
                type="button"
                onClick={() => handleChangeStatus('kabul_edildi')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  currentStatus === 'kabul_edildi'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>✅ Kabul Edildi (Poliçeleştir)</span>
              </button>

              {/* 3. Reddedildi */}
              <button
                type="button"
                onClick={() => handleChangeStatus('reddedildi')}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  currentStatus === 'reddedildi'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>❌ Reddedildi (Yapılmadı)</span>
              </button>
            </div>
          </div>

          {/* Interactive Progress Pipeline Bar */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Teklif Süreç İlerlemesi
                </span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  Aşama: <span className="text-blue-600">{normalizeQuoteStage(quote.stage)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Tamamlanma</span>
                <div className="text-lg font-black text-blue-600">%{progressPercent}</div>
              </div>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentStatus === 'kabul_edildi'
                    ? 'bg-emerald-500'
                    : currentStatus === 'reddedildi'
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step-by-Step Interactive Pipeline Stepper */}
            <div className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {QUOTE_STAGES.map((stageName, index) => {
                  const isCurrent = quote.stage === stageName && currentStatus === 'beklemede';
                  const isPast = currentStageIndex > index || currentStatus === 'kabul_edildi';

                  return (
                    <button
                      key={stageName}
                      type="button"
                      onClick={() => handleSelectStage(stageName)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[64px] ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                          : isPast
                          ? 'border-emerald-300 bg-emerald-50/40 text-slate-800'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : isPast
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isPast ? '✓' : index + 1}
                        </span>
                        {isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </div>
                      <div
                        className={`text-[11px] font-bold leading-tight ${
                          isCurrent ? 'text-blue-900' : isPast ? 'text-slate-800' : 'text-slate-600'
                        }`}
                      >
                        {stageName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Step Buttons */}
            {currentStatus === 'beklemede' && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleRevertStage}
                  disabled={currentStageIndex === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Önceki Aşama</span>
                </button>

                <button
                  type="button"
                  onClick={handleAdvanceStage}
                  disabled={currentStageIndex >= QUOTE_STAGES.length - 1}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Sonraki Aşama</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Activity / Interaction Timeline Log */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>İlerleme ve Etkinlik Günlüğü</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {(quote.progressLogs?.length || 0) + 1} kayıt
              </span>
            </div>

            {/* Add quick note form */}
            <form onSubmit={handleAddLogNote} className="flex gap-2">
              <input
                type="text"
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                placeholder="Görüşme notu veya süreç güncellemesi ekleyin (Örn: Müşteri arandı, yarın dönecek)..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newLogNote.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Not Ekle</span>
              </button>
            </form>

            {/* Timeline entries */}
            <div className="space-y-3 pt-2 max-h-56 overflow-y-auto">
              {quote.progressLogs && quote.progressLogs.length > 0 ? (
                quote.progressLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span className="font-semibold text-slate-700">{log.stage}</span>
                        <span>{new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="text-slate-800 font-medium">{log.note}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                      <span className="font-semibold text-slate-700">Teklif Oluşturuldu</span>
                      <span>{formatDateTr(quote.quoteDate)}</span>
                    </div>
                    <div className="text-slate-800 font-medium">
                      {quote.insured} adına {formatCurrency(quote.premium)} tutarlı {quote.branch} teklifi kaydedildi.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
          <div className="text-xs text-slate-500">
            Teklif Tutarı: <strong className="text-slate-900">{formatCurrency(quote.premium)}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Kapat
            </button>
            {currentStatus === 'beklemede' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConvertToPolicy(quote);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Poliçeye Dönüştür</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
