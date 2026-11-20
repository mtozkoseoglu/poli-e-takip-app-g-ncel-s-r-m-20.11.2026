import React, { useState, useEffect, useMemo } from 'react';
import { Quote, COMPANIES } from '../types/insurance';
import {
  Shield,
  Car,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Check,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export interface DoganiumCrossSellRowState {
  quoteId: string;
  isNotWithUs: boolean; // false = Bizde (default), true = Bizde Değil
  currentCompany: string;
  endDate: string;
  hasError?: boolean;
  errorMessage?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  importedQuotes: Quote[];
  onConfirm: (updatedQuotes: Quote[]) => void;
}

export const DoganiumCrossSellModal: React.FC<Props> = ({
  isOpen,
  onClose,
  importedQuotes,
  onConfirm,
}) => {
  const [rowsState, setRowsState] = useState<Record<string, DoganiumCrossSellRowState>>({});

  // Initialize state when importedQuotes changes or modal opens
  useEffect(() => {
    if (!isOpen || importedQuotes.length === 0) return;

    const initial: Record<string, DoganiumCrossSellRowState> = {};
    for (const q of importedQuotes) {
      const isNotWithUs =
        q.branch === 'Kasko'
          ? q.trafficStatus === 'TRAFİK BİZDE DEĞİL'
          : q.kaskoStatus === 'KASKO BİZDE DEĞİL';

      const existingCompany =
        q.branch === 'Kasko'
          ? q.trafficCompany || 'TÜRKİYE SİGORTA'
          : q.kaskoCompany || 'TÜRKİYE SİGORTA';

      const existingEndDate =
        q.branch === 'Kasko'
          ? q.trafficEndDate || q.endDate || ''
          : q.kaskoEndDate || q.endDate || '';

      initial[q.id] = {
        quoteId: q.id,
        isNotWithUs: isNotWithUs,
        currentCompany: existingCompany,
        endDate: existingEndDate,
      };
    }
    setRowsState(initial);
  }, [isOpen, importedQuotes]);

  const mainBranch = importedQuotes[0]?.branch || 'Kasko';
  const oppositeBranch = mainBranch === 'Kasko' ? 'Trafik' : 'Kasko';

  const handleToggleStatus = (quoteId: string, isNotWithUs: boolean) => {
    setRowsState((prev) => {
      const current = prev[quoteId] || {
        quoteId,
        isNotWithUs: false,
        currentCompany: 'TÜRKİYE SİGORTA',
        endDate: '',
      };
      return {
        ...prev,
        [quoteId]: {
          ...current,
          isNotWithUs,
          hasError: false,
          errorMessage: undefined,
        },
      };
    });
  };

  const handleUpdateField = (
    quoteId: string,
    field: 'currentCompany' | 'endDate',
    value: string
  ) => {
    setRowsState((prev) => {
      const current = prev[quoteId] || {
        quoteId,
        isNotWithUs: false,
        currentCompany: 'TÜRKİYE SİGORTA',
        endDate: '',
      };
      return {
        ...prev,
        [quoteId]: {
          ...current,
          [field]: value,
          hasError: false,
          errorMessage: undefined,
        },
      };
    });
  };

  const handleSetAll = (isNotWithUs: boolean) => {
    setRowsState((prev) => {
      const next: Record<string, DoganiumCrossSellRowState> = {};
      importedQuotes.forEach((q) => {
        const existing = prev[q.id] || {
          quoteId: q.id,
          isNotWithUs: false,
          currentCompany: 'TÜRKİYE SİGORTA',
          endDate: q.endDate || '',
        };
        next[q.id] = {
          ...existing,
          isNotWithUs,
          hasError: false,
          errorMessage: undefined,
        };
      });
      return next;
    });
  };

  // Metrics
  const notWithUsCount = Object.values(rowsState).filter((r) => r.isNotWithUs).length;
  const withUsCount = importedQuotes.length - notWithUsCount;

  const handleSubmit = () => {
    let hasValidationErrors = false;
    const validatedState = { ...rowsState };

    importedQuotes.forEach((q) => {
      const state = validatedState[q.id];
      if (state && state.isNotWithUs) {
        if (!state.currentCompany || !state.currentCompany.trim()) {
          state.hasError = true;
          state.errorMessage = 'Lütfen sigorta şirketini seçin.';
          hasValidationErrors = true;
        } else if (!state.endDate || !state.endDate.trim()) {
          state.hasError = true;
          state.errorMessage = 'Lütfen poliçe bitiş tarihini girin.';
          hasValidationErrors = true;
        }
      }
    });

    if (hasValidationErrors) {
      setRowsState(validatedState);
      return;
    }

    // Apply cross-sell attributes to quotes
    const updatedQuotes: Quote[] = importedQuotes.map((q) => {
      const row = rowsState[q.id];
      const isNotWithUs = row ? row.isNotWithUs : false;

      if (mainBranch === 'Kasko') {
        return {
          ...q,
          trafficStatus: isNotWithUs ? 'TRAFİK BİZDE DEĞİL' : 'TRAFİK BİZDE',
          trafficCompany: isNotWithUs ? row?.currentCompany : undefined,
          trafficEndDate: isNotWithUs ? row?.endDate : undefined,
        };
      } else {
        return {
          ...q,
          kaskoStatus: isNotWithUs ? 'KASKO BİZDE DEĞİL' : 'KASKO BİZDE',
          kaskoCompany: isNotWithUs ? row?.currentCompany : undefined,
          kaskoEndDate: isNotWithUs ? row?.endDate : undefined,
        };
      }
    });

    onConfirm(updatedQuotes);
  };

  if (!isOpen || importedQuotes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Aktarım Sonrası Çapraz Satış Kontrolü</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-100 border border-white/20">
                  {oppositeBranch} Portföy Durumu
                </span>
              </h2>
              <p className="text-xs text-indigo-100/80 mt-0.5">
                Aktarılan araçların {oppositeBranch.toLocaleLowerCase('tr-TR')} poliçelerinin acentenizde olup olmadığını belirleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Summary Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-800">
                Toplam: <span className="text-blue-600">{importedQuotes.length} Araç</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-emerald-700">
                {oppositeBranch} Bizde: {withUsCount}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-amber-700">
                {oppositeBranch} Bizde Değil (Takip Açılacak): {notWithUsCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAll(false)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
              >
                Tümünü "{oppositeBranch} Bizde" Yap
              </button>
              <button
                type="button"
                onClick={() => handleSetAll(true)}
                className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors cursor-pointer"
              >
                Tümünü "Bizde Değil" Yap
              </button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <strong>Otomatik Takip Entegrasyonu:</strong> "{oppositeBranch} Bizde Değil" olarak işaretlenen her araç için Takipteki İşler modülünde otomatik bir takip işi açılacaktır. Başlangıç tarihi bitiş tarihinden 1 yıl geriye gidecek ve vadesi dolduğunda hatırlatılacaktır.
            </div>
          </div>
        </div>

        {/* List of Quotes */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {importedQuotes.map((q) => {
            const row = rowsState[q.id] || {
              quoteId: q.id,
              isNotWithUs: false,
              currentCompany: 'TÜRKİYE SİGORTA',
              endDate: q.endDate || '',
            };

            return (
              <div
                key={q.id}
                className={`p-4 transition-colors ${
                  row.isNotWithUs ? 'bg-amber-50/20' : 'bg-white'
                } hover:bg-slate-50`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Vehicle & Insured */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-900 text-white rounded-lg tracking-wider shrink-0 shadow-2xs">
                      {q.plate || 'PLAKA YOK'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {q.insured}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{q.vehicleBrand}</span>
                        <span>{q.vehicleModel}</span>
                        {q.vehicleYear && <span>({q.vehicleYear})</span>}
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-indigo-700">
                          Ana Teklif: {q.branch} ({q.company})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Segmented Control & Conditional Inputs */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto shrink-0">
                    {/* Segmented Button */}
                    <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-300">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(q.id, false)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          !row.isNotWithUs
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{oppositeBranch} Bizde</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(q.id, true)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          row.isNotWithUs
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Bizde Değil (Takip Aç)</span>
                      </button>
                    </div>

                    {/* Conditional Input Fields when "Bizde Değil" */}
                    {row.isNotWithUs && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Company select */}
                        <div className="relative">
                          <select
                            value={row.currentCompany}
                            onChange={(e) => handleUpdateField(q.id, 'currentCompany', e.target.value)}
                            className={`text-xs px-2.5 py-1.5 border rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500 ${
                              row.hasError && !row.currentCompany
                                ? 'border-rose-500 bg-rose-50 text-rose-900'
                                : 'border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="">Sigorta Şirketi Seçin *</option>
                            {COMPANIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* End date picker */}
                        <div className="relative">
                          <input
                            type="date"
                            value={row.endDate}
                            onChange={(e) => handleUpdateField(q.id, 'endDate', e.target.value)}
                            placeholder="Poliçe Bitiş Tarihi *"
                            className={`text-xs px-2.5 py-1.5 border rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500 ${
                              row.hasError && !row.endDate
                                ? 'border-rose-500 bg-rose-50 text-rose-900'
                                : 'border-slate-300 text-slate-800'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row Error message if validation failed */}
                {row.hasError && (
                  <div className="mt-2 text-[11px] font-bold text-rose-600 flex items-center gap-1 pl-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{row.errorMessage || 'Lütfen zorunlu alanları doldurunuz.'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {withUsCount} araç <strong>Bizde</strong> olarak kaydedilecek, {notWithUsCount} araç için{' '}
            <strong className="text-amber-700">Takip Kaydı</strong> açılacak.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Vazgeç / Daha Sonra Tamamla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Onayla ve Teklifleri Kaydet ({importedQuotes.length} Araç)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
