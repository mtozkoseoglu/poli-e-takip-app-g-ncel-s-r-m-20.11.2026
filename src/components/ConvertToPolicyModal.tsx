import React, { useState, useEffect } from 'react';
import { Quote, Policy, COMPANIES } from '../types/insurance';
import {
  getTodayIso,
  addDays,
  addOneYear,
  generateId,
  formatCurrency,
  formatNumberTr,
  parseNumberTr,
  calculateMultiplier,
  formatMultiplier,
} from '../services/storage';
import { X, CheckCircle2, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onConfirm: (quoteId: string, createdPolicy: Policy) => void;
}

export const ConvertToPolicyModal: React.FC<Props> = ({ isOpen, onClose, quote, onConfirm }) => {
  const [policyNumber, setPolicyNumber] = useState('');
  const [company, setCompany] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [startDate, setStartDate] = useState(getTodayIso());
  const [endDate, setEndDate] = useState(addOneYear(getTodayIso()));
  const [finalPremiumStr, setFinalPremiumStr] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (quote) {
      setErrorMsg(null);
      const today = getTodayIso();
      const qIssue = quote.issueDate || quote.quoteDate || today;
      const qStart = quote.startDate || quote.quoteDate || today;
      const qEnd = quote.endDate || quote.validUntil || (qStart ? addOneYear(qStart) : addOneYear(today));
      setCompany(quote.company || COMPANIES[0]);
      setFinalPremiumStr(quote.premium ? formatNumberTr(quote.premium, 2) : '');
      setIssueDate(qIssue);
      setStartDate(qStart);
      setEndDate(qEnd);
      const branchPrefix = (quote.branch || 'POL').substring(0, 3).toUpperCase();
      setPolicyNumber(`${branchPrefix}-${Math.floor(100000 + Math.random() * 900000)}-${new Date().getFullYear()}`);
      setNotes(`${quote.quoteNumber || 'Teklif'} üzerinden olumlu sonuçlanarak tanzim edildi.`);
    }
  }, [quote, isOpen]);

  if (!isOpen || !quote) return null;

  const currentParsedPremium = parseNumberTr(finalPremiumStr) ?? quote.premium;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyNumber.trim()) return;

    if (startDate && endDate && endDate < startDate) {
      setErrorMsg('Poliçe bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }
    setErrorMsg(null);

    const prem = currentParsedPremium ?? 0;
    const vValue = quote.vehicleValue !== undefined && !isNaN(Number(quote.vehicleValue)) ? Number(quote.vehicleValue) : undefined;
    const mult = calculateMultiplier(prem, vValue, quote.branch);

    const newPolicy: Policy = {
      id: generateId(),
      type: 'policy',
      insured: quote.insured,
      phone: quote.phone || '',
      email: quote.email || '',
      plate: quote.plate || '',
      licenseSerialNo: quote.licenseSerialNo || '',
      chassisNo: quote.chassisNo || '',
      engineNo: quote.engineNo || '',
      usageStyle: quote.usageStyle || '',
      vehicleBrand: quote.vehicleBrand || '',
      vehicleModel: quote.vehicleModel || '',
      vehicleCode: quote.vehicleCode || '',
      fuelType: quote.fuelType || '',
      vehicleYear: quote.vehicleYear,
      vehicleValue: vValue,
      multiplier: mult ?? undefined,
      businessType: quote.businessType || 'Yeni İş',
      company: company || quote.company,
      branch: quote.branch,
      policyNumber: policyNumber.trim(),
      issueDate: issueDate.trim() || undefined,
      startDate: startDate.trim() || getTodayIso(),
      endDate: endDate.trim() || addOneYear(startDate || getTodayIso()),
      originalPremium: prem,
      currentPremium: prem,
      totalAdditionalPremium: 0,
      totalRefundPremium: 0,
      premium: prem,
      status: 'Portföyde',
      stage: 'Yürürlükte',
      originQuoteId: quote.id,
      trafficStatus: quote.trafficStatus,
      trafficEndDate: quote.trafficEndDate,
      trafficCompany: quote.trafficCompany,
      kaskoStatus: quote.kaskoStatus,
      kaskoEndDate: quote.kaskoEndDate,
      kaskoCompany: quote.kaskoCompany,
      notes: notes.trim(),
      followDate: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onConfirm(quote.id, newPolicy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Teklifi Poliçeye Dönüştür</h2>
              <p className="text-xs text-emerald-100">
                Olumlu sonuçlanan teklif poliçeleştirilerek portföye eklenir ve "Sonuçlananlar" sekmesine aktarılır.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Box */}
        <div className="p-5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-emerald-800 font-semibold">Dönüştürülen Teklif:</div>
            <div className="text-base font-bold text-slate-900">{quote.insured}</div>
            <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
              <span>{quote.branch}</span>
              {quote.plate && <span className="font-mono font-bold text-slate-800">· {quote.plate}</span>}
              <span>· {quote.company}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-right">
            {quote.vehicleValue && quote.vehicleValue > 0 ? (
              <div>
                <div className="text-xs text-slate-500">Araç Bedeli</div>
                <div className="text-sm font-bold text-slate-800">{formatCurrency(quote.vehicleValue)}</div>
              </div>
            ) : null}
            {quote.branch === 'Kasko' && calculateMultiplier(currentParsedPremium, quote.vehicleValue, quote.branch) !== null ? (
              <div className="bg-emerald-100/70 border border-emerald-200 px-3 py-1 rounded-xl">
                <div className="text-[11px] text-emerald-800 font-semibold">Çarpan (Prim / Bedel)</div>
                <div className="text-base font-mono font-black text-emerald-900">
                  {formatMultiplier(calculateMultiplier(currentParsedPremium, quote.vehicleValue, quote.branch))}
                </div>
              </div>
            ) : null}
            <div>
              <div className="text-xs text-slate-500">Teklif Primi</div>
              <div className="text-lg font-black text-emerald-700">{formatCurrency(quote.premium)}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resmi Poliçe Numarası *
              </label>
              <input
                type="text"
                required
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sigorta Şirketi</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {company && !(COMPANIES as readonly string[]).includes(company) && (
                  <option value={company}>
                    ⚠️ {company} (Standart Dışı - Lütfen Güncelleyin)
                  </option>
                )}
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Kesinleşen Prim Tutarı (TL) *</label>
                {currentParsedPremium !== null && currentParsedPremium > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700">
                    {formatCurrency(currentParsedPremium)}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={finalPremiumStr}
                  onChange={(e) => setFinalPremiumStr(e.target.value)}
                  onBlur={() => {
                    const p = parseNumberTr(finalPremiumStr);
                    if (p !== null) {
                      setFinalPremiumStr(formatNumberTr(p, 2));
                    }
                  }}
                  placeholder=""
                  className="w-full px-3 py-2 pl-7 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₺</span>
              </div>
            </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanzim Tarihi</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poliçe Başlangıç Tarihi *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    const s = e.target.value;
                    setStartDate(s);
                    if (s) setEndDate(addOneYear(s));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Poliçe Bitiş Tarihi *
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                    Otomatik 1 Yıl
                  </span>
                </div>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none font-semibold text-emerald-800 bg-emerald-50/20"
                />
              </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Poliçe Notu</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Otomatik Akış:</strong> Bu onay sonrasında teklif <b>Sonuçlananlar</b> sekmesine "Olumlu
              (Poliçeleştirildi)" olarak taşınır ve portföyünüze <b>yeni aktif bir poliçe</b> olarak eklenir.
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Poliçeleştir & Sonuçlandır</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
