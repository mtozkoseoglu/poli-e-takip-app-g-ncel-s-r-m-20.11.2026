import React, { useState, useEffect } from 'react';
import { Policy, COMPANIES, BRANCHES, CustomRule, BUSINESS_TYPES, BusinessType, USAGE_STYLES } from '../types/insurance';
import {
  getTodayIso,
  addDays,
  addOneYear,
  generateId,
  isStandardCompany,
  isRuleMatch,
  formatCurrency,
  formatNumberTr,
  parseNumberTr,
  calculateMultiplier,
  formatMultiplier,
} from '../services/storage';
import { X, Shield, AlertTriangle, ArrowRight } from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (policy: Policy) => void;
  onDelete?: (id: string) => void;
  onConclude?: (policy: Policy) => void;
  onCreateRenewalQuote?: (policy: Policy) => void;
  initialPolicy?: Policy | null;
  rules?: CustomRule[];
}

export const PolicyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onConclude,
  onCreateRenewalQuote,
  initialPolicy,
  rules = [],
}) => {
  const [formData, setFormData] = useState<Partial<Policy>>({
    insured: '',
    businessType: 'Yenileme',
    phone: '',
    email: '',
    plate: '',
    licenseSerialNo: '',
    chassisNo: '',
    engineNo: '',
    usageStyle: '',
    vehicleCode: '',
    fuelType: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleValue: undefined,
    company: COMPANIES[0],
    branch: 'Trafik',
    policyNumber: '',
    startDate: getTodayIso(),
    endDate: addOneYear(getTodayIso()),
    premium: 0,
    status: 'Portföyde',
    stage: 'Yürürlükte',
    trafficStatus: 'TRAFİK BİZDE',
    trafficEndDate: '',
    trafficCompany: COMPANIES[0],
    kaskoStatus: 'KASKO BİZDE',
    kaskoEndDate: '',
    kaskoCompany: COMPANIES[0],
    doc: false,
    endorse: false,
    egm: false,
    notes: '',
    followDate: '',
  });

  const [premiumStr, setPremiumStr] = useState<string>('');
  const [vehicleValueStr, setVehicleValueStr] = useState<string>('');

  const [ruleAlerts, setRuleAlerts] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialPolicy) {
      setFormData({
        ...initialPolicy,
        businessType: initialPolicy.businessType || 'Yenileme',
        licenseSerialNo: initialPolicy.licenseSerialNo || '',
        chassisNo: initialPolicy.chassisNo || '',
        engineNo: initialPolicy.engineNo || '',
        usageStyle: initialPolicy.usageStyle || '',
        vehicleCode: initialPolicy.vehicleCode || '',
        fuelType: initialPolicy.fuelType || '',
        pastPlates: initialPolicy.pastPlates || [],
        dainMurtehin: initialPolicy.dainMurtehin || '',
        coverages: initialPolicy.coverages || [],
        trafficStatus: initialPolicy.trafficStatus || (initialPolicy.branch === 'Kasko' ? 'TRAFİK BİZDE' : undefined),
        trafficEndDate: initialPolicy.trafficEndDate || '',
        trafficCompany: initialPolicy.trafficCompany || COMPANIES[0],
        kaskoStatus: initialPolicy.kaskoStatus || (initialPolicy.branch === 'Trafik' ? 'KASKO BİZDE' : undefined),
        kaskoEndDate: initialPolicy.kaskoEndDate || '',
        kaskoCompany: initialPolicy.kaskoCompany || COMPANIES[0],
      });
      const origPrem = initialPolicy.originalPremium !== undefined && initialPolicy.originalPremium !== null
        ? initialPolicy.originalPremium
        : initialPolicy.premium;
      setPremiumStr(origPrem !== undefined && origPrem !== null ? formatNumberTr(origPrem, 2) : '');
      setVehicleValueStr(initialPolicy.vehicleValue !== undefined && initialPolicy.vehicleValue !== null ? formatNumberTr(initialPolicy.vehicleValue, 2) : '');
    } else {
      const today = getTodayIso();
      setFormData({
        id: generateId(),
        type: 'policy',
        insured: '',
        businessType: 'Yenileme',
        phone: '',
        email: '',
        plate: '',
        licenseSerialNo: '',
        chassisNo: '',
        engineNo: '',
        usageStyle: '',
        vehicleCode: '',
        fuelType: '',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleYear: '',
        company: COMPANIES[0],
        branch: 'Trafik',
        policyNumber: 'POL-' + Math.floor(100000 + Math.random() * 900000) + '-' + new Date().getFullYear(),
        startDate: today,
        endDate: addOneYear(today),
        premium: 0,
        status: 'Portföyde',
        stage: 'Yürürlükte',
        trafficStatus: 'TRAFİK BİZDE',
        trafficEndDate: '',
        trafficCompany: COMPANIES[0],
        kaskoStatus: 'KASKO BİZDE',
        kaskoEndDate: '',
        kaskoCompany: COMPANIES[0],
        doc: false,
        endorse: false,
        egm: false,
        notes: '',
        followDate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setPremiumStr('');
      setVehicleValueStr('');
    }
  }, [initialPolicy, isOpen]);

  // Check matching rules
  useEffect(() => {
    if (!formData.company && !formData.branch && !formData.insured && !formData.vehicleYear) {
      setRuleAlerts([]);
      return;
    }
    const matches = rules.filter((r) => isRuleMatch(r, formData));
    setRuleAlerts(matches.map((m) => `${m.title}: ${m.text}`));
  }, [formData.company, formData.branch, formData.insured, formData.vehicleYear, rules]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.insured?.trim() || !formData.policyNumber?.trim() || !formData.endDate) return;

    if (formData.branch === 'Kasko' && formData.trafficStatus === 'TRAFİK BİZDE DEĞİL') {
      if (!formData.trafficEndDate || !formData.trafficCompany) {
        alert('Lütfen Trafik poliçesi bitiş tarihini ve sigorta şirketini eksiksiz giriniz.');
        return;
      }
    }

    if (formData.branch === 'Trafik' && formData.kaskoStatus === 'KASKO BİZDE DEĞİL') {
      if (!formData.kaskoEndDate || !formData.kaskoCompany) {
        alert('Lütfen Kasko poliçesi bitiş tarihini ve sigorta şirketini eksiksiz giriniz.');
        return;
      }
    }

    const prem = parseNumberTr(premiumStr) ?? Number(formData.premium) ?? 0;
    const vValue = parseNumberTr(vehicleValueStr) ?? (formData.vehicleValue !== undefined ? Number(formData.vehicleValue) : undefined);

    const origPrem = initialPolicy?.originalPremium !== undefined ? initialPolicy.originalPremium : prem;
    const totalAdd = initialPolicy?.totalAdditionalPremium || 0;
    const totalRef = initialPolicy?.totalRefundPremium || 0;
    const currPrem = initialPolicy ? (origPrem + totalAdd - totalRef) : prem;
    const mult = calculateMultiplier(currPrem, vValue, formData.branch);

    const finalPolicy: Policy = {
      id: initialPolicy?.id || formData.id || generateId(),
      type: 'policy',
      insured: formData.insured.trim(),
      phone: formData.phone?.trim() || '',
      email: formData.email?.trim() || '',
      plate: formData.plate?.trim().toLocaleUpperCase('tr-TR').replace(/[ .-]/g, '') || '',
      licenseSerialNo: formData.licenseSerialNo?.trim().toLocaleUpperCase('tr-TR') || '',
      chassisNo: formData.chassisNo?.trim().toLocaleUpperCase('tr-TR') || '',
      engineNo: formData.engineNo?.trim().toLocaleUpperCase('tr-TR') || '',
      usageStyle: formData.usageStyle || '',
      vehicleCode: formData.vehicleCode?.trim() || '',
      fuelType: formData.fuelType?.trim() || '',
      vehicleBrand: formData.vehicleBrand?.trim() || '',
      vehicleModel: formData.vehicleModel?.trim() || '',
      vehicleYear: formData.vehicleYear ? Number(formData.vehicleYear) : undefined,
      vehicleValue: vValue,
      multiplier: mult ?? undefined,
      businessType: initialPolicy?.businessType || 'Yeni İş',
      company: formData.company || COMPANIES[0],
      branch: formData.branch || 'Trafik',
      policyNumber: formData.policyNumber.trim(),
      startDate: formData.startDate || getTodayIso(),
      endDate: formData.endDate,
      originalPremium: origPrem,
      currentPremium: currPrem,
      totalAdditionalPremium: totalAdd,
      totalRefundPremium: totalRef,
      premium: currPrem,
      status: formData.status || 'Portföyde',
      stage: initialPolicy?.stage || 'Yürürlükte',
      outcome: initialPolicy?.outcome,
      resultDate: initialPolicy?.resultDate,
      originQuoteId: initialPolicy?.originQuoteId,
      concludedReason: initialPolicy?.concludedReason,
      trafficStatus: formData.branch === 'Kasko' ? formData.trafficStatus : undefined,
      trafficEndDate: formData.branch === 'Kasko' && formData.trafficStatus === 'TRAFİK BİZDE DEĞİL' ? formData.trafficEndDate : undefined,
      trafficCompany: formData.branch === 'Kasko' && formData.trafficStatus === 'TRAFİK BİZDE DEĞİL' ? formData.trafficCompany : undefined,
      trafficFollowUpQuoteId: formData.trafficFollowUpQuoteId || initialPolicy?.trafficFollowUpQuoteId,
      kaskoStatus: formData.branch === 'Trafik' ? formData.kaskoStatus : undefined,
      kaskoEndDate: formData.branch === 'Trafik' && formData.kaskoStatus === 'KASKO BİZDE DEĞİL' ? formData.kaskoEndDate : undefined,
      kaskoCompany: formData.branch === 'Trafik' && formData.kaskoStatus === 'KASKO BİZDE DEĞİL' ? formData.kaskoCompany : undefined,
      kaskoFollowUpQuoteId: formData.kaskoFollowUpQuoteId || initialPolicy?.kaskoFollowUpQuoteId,
      pastPlates: formData.pastPlates || initialPolicy?.pastPlates || [],
      dainMurtehin: formData.dainMurtehin || initialPolicy?.dainMurtehin,
      coverages: formData.coverages || initialPolicy?.coverages,
      doc: !!formData.doc,
      endorse: !!formData.endorse,
      egm: !!formData.egm,
      notes: formData.notes?.trim() || '',
      followDate: formData.followDate || '',
      createdAt: initialPolicy?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(finalPolicy);
    onClose();
  };

  const isEditing = !!initialPolicy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Poliçeyi Düzenle' : 'Yeni Poliçe Kaydı'}
              </h2>
              <p className="text-xs text-slate-500">Mevcut veya yeni tanzim edilen poliçe detayları</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts for editing active policy */}
        {isEditing && formData.status !== 'Sonuçlandı' && onCreateRenewalQuote && (
          <div className="mx-6 mt-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-indigo-900">
              <span className="font-semibold">Hızlı İşlemler:</span> Bu poliçe için yenileme teklifi hazırlayabilirsiniz.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateRenewalQuote(initialPolicy!);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                🔄 Yenileme Teklifi Aç
              </button>
            </div>
          </div>
        )}

        {/* Rule Alert Banner */}
        {ruleAlerts.length > 0 && (
          <div className="mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            {ruleAlerts.map((txt, i) => (
              <div key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{txt}</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* 1. Müşteri & İletişim Bilgileri */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Müşteri & İletişim Bilgileri
                </h3>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  ✓ KVKK Uyumlu (TCKN / Telefon Tutulmaz)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Müşteri Adı Soyadı veya Şirket Unvanı *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.insured || ''}
                    onChange={(e) => setFormData({ ...formData, insured: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    İş Türü *
                  </label>
                  <select
                    value={formData.businessType || 'Yenileme'}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value as BusinessType })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white font-medium text-slate-800"
                  >
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Araç Detayları */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                2. Araç Detayları
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Plakası (Varsa)</label>
                  <input
                    type="text"
                    value={formData.plate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plate: e.target.value.toLocaleUpperCase('tr-TR').replace(/[ .-]/g, ''),
                      })
                    }
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-semibold uppercase tracking-wider border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                  {formData.pastPlates && formData.pastPlates.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 items-center text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-600">Eski Plakalar:</span>
                      {formData.pastPlates.map((pp, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium border border-slate-200">
                          {pp}
                        </span>
                      ))}
                    </div>
                  )}
                  {formData.dainMurtehin && (
                    <div className="mt-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate">
                      <span className="font-semibold">Dain-i Mürtehin:</span> {formData.dainMurtehin}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Markası</label>
                  <input
                    type="text"
                    value={formData.vehicleBrand || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleBrand: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Modeli</label>
                  <input
                    type="text"
                    value={formData.vehicleModel || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model Yılı</label>
                  <input
                    type="number"
                    min="1970"
                    max="2035"
                    value={formData.vehicleYear || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value ? Number(e.target.value) : '' })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ruhsat Seri No</label>
                  <input
                    type="text"
                    value={formData.licenseSerialNo || ''}
                    onChange={(e) => setFormData({ ...formData, licenseSerialNo: e.target.value.toLocaleUpperCase('tr-TR') })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm uppercase font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kullanım Tarzı</label>
                  <select
                    value={formData.usageStyle || ''}
                    onChange={(e) => setFormData({ ...formData, usageStyle: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none cursor-pointer"
                  >
                    <option value="">Seçiniz...</option>
                    {formData.usageStyle && !USAGE_STYLES.includes(formData.usageStyle as any) && (
                      <option value={formData.usageStyle}>{formData.usageStyle}</option>
                    )}
                    {USAGE_STYLES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Şasi No</label>
                  <input
                    type="text"
                    value={formData.chassisNo || ''}
                    onChange={(e) => setFormData({ ...formData, chassisNo: e.target.value.toLocaleUpperCase('tr-TR') })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motor No</label>
                  <input
                    type="text"
                    value={formData.engineNo || ''}
                    onChange={(e) => setFormData({ ...formData, engineNo: e.target.value.toLocaleUpperCase('tr-TR') })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Araç Kodu</label>
                  <input
                    type="text"
                    value={formData.vehicleCode || ''}
                    onChange={(e) => setFormData({ ...formData, vehicleCode: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yakıt Türü</label>
                  <select
                    value={formData.fuelType || ''}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="">Seçiniz...</option>
                    <option value="BENZİN">BENZİN</option>
                    <option value="DİZEL">DİZEL</option>
                    <option value="LPG">LPG</option>
                    <option value="HİBRİT">HİBRİT</option>
                    <option value="ELEKTRİK">ELEKTRİK</option>
                    <option value="BENZİN + LPG">BENZİN + LPG</option>
                    <option value="DİĞER">DİĞER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Araç Bedeli (TL) <span className="text-slate-400 font-normal">(Çarpan Hesabı İçin)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={vehicleValueStr}
                      onChange={(e) => setVehicleValueStr(e.target.value)}
                      onBlur={() => {
                        const parsed = parseNumberTr(vehicleValueStr);
                        if (parsed !== null && !isNaN(parsed)) {
                          setVehicleValueStr(formatNumberTr(parsed, 2));
                        }
                      }}
                      placeholder=""
                      className="w-full px-3 py-2 pl-8 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₺</span>
                  </div>
                  {(() => {
                    const parsed = parseNumberTr(vehicleValueStr);
                    if (parsed !== null && parsed > 0) {
                      return (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1 px-1">
                          <span className="text-slate-400">Görünen:</span>
                          <span className="text-indigo-700 font-bold font-mono">{formatCurrency(parsed)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Kasko Çarpanı: YALNIZCA branş Kasko olduğunda hesaplanır ve gösterilir */}
                {formData.branch === 'Kasko' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kasko Çarpanı
                    </label>
                    <div className="flex items-center gap-2 h-[38px] px-3 bg-indigo-50/60 border border-indigo-200 rounded-lg">
                      {(() => {
                        const pPrem = parseNumberTr(premiumStr) ?? Number(formData.premium) ?? 0;
                        const pVal = parseNumberTr(vehicleValueStr) ?? (formData.vehicleValue !== undefined ? Number(formData.vehicleValue) : undefined);
                        const mult = calculateMultiplier(pPrem, pVal, 'Kasko');
                        if (mult !== null) {
                          return (
                            <span className="font-mono font-black text-indigo-700 text-sm">
                              {formatMultiplier(mult)}
                            </span>
                          );
                        }
                        return (
                          <span className="text-xs text-slate-400 font-medium">
                            —
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Şirket, Poliçe & Tarih Bilgileri */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                3. Şirket, Poliçe & Tarih Bilgileri
              </h3>
              {formData.company && !isStandardCompany(formData.company) && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Standart Dışı Şirket:</strong> Bu poliçede kayıtlı olan <em>"{formData.company}"</em> 13 yetkili sigorta şirketi listesinde yer almıyor. Lütfen aşağıdaki listeden yetkili bir sigorta şirketi seçiniz.
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sigorta Şirketi *</label>
                  <select
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none ${
                      formData.company && !isStandardCompany(formData.company)
                        ? 'border-amber-400 bg-amber-50/40 text-amber-900'
                        : 'border-slate-300 focus:border-indigo-500'
                    }`}
                  >
                    {formData.company && !isStandardCompany(formData.company) && (
                      <option value={formData.company}>
                        ⚠️ {formData.company} (Standart Dışı - Lütfen Güncelleyin)
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branş *</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => {
                      const newBranch = e.target.value;
                      setFormData({
                        ...formData,
                        branch: newBranch,
                        trafficStatus: newBranch === 'Kasko' ? (formData.trafficStatus || 'TRAFİK BİZDE') : undefined,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Poliçe Numarası *</label>
                  <input
                    type="text"
                    required
                    value={formData.policyNumber || ''}
                    onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData({
                        ...formData,
                        startDate: newStart,
                        endDate: newStart ? addOneYear(newStart) : formData.endDate,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Bitiş / Yenileme Tarihi *
                    </label>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-semibold border border-indigo-200">
                      Otomatik 1 Yıl
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-semibold text-indigo-900 bg-indigo-50/40 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {initialPolicy ? 'Orijinal Poliçe Primi (İlk Teklif) (TL) *' : 'Poliçe Primi (TL) *'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={premiumStr}
                      onChange={(e) => setPremiumStr(e.target.value)}
                      onBlur={() => {
                        const parsed = parseNumberTr(premiumStr);
                        if (parsed !== null && !isNaN(parsed)) {
                          setPremiumStr(formatNumberTr(parsed, 2));
                        }
                      }}
                      placeholder="0,00"
                      className="w-full px-3 py-2 pl-8 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg outline-none"
                    />
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₺</span>
                  </div>
                  {(() => {
                    const parsed = parseNumberTr(premiumStr);
                    if (parsed !== null && parsed > 0) {
                      return (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1 px-1">
                          <span className="text-slate-400">İlk Teklif Primi:</span>
                          <span className="text-indigo-700 font-bold font-mono">{formatCurrency(parsed)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Zeyil Prim Özeti (Zeyil varsa gösterilir) */}
                {initialPolicy && (initialPolicy.totalAdditionalPremium || initialPolicy.totalRefundPremium || (initialPolicy.currentPremium && initialPolicy.currentPremium !== (initialPolicy.originalPremium ?? initialPolicy.premium))) && (
                  <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Orijinal Poliçe Primi</span>
                      <span className="font-bold text-slate-800 text-xs font-mono">{formatCurrency(initialPolicy.originalPremium ?? initialPolicy.premium)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">Toplam Ek Prim</span>
                      <span className="font-bold text-emerald-700 text-xs font-mono">+{formatCurrency(initialPolicy.totalAdditionalPremium || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">Toplam İade Prim</span>
                      <span className="font-bold text-rose-700 text-xs font-mono">-{formatCurrency(initialPolicy.totalRefundPremium || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 block">Zeyil Sonrası Güncel Prim</span>
                      <span className="font-black text-indigo-700 text-xs font-mono">{formatCurrency(initialPolicy.currentPremium ?? initialPolicy.premium)}</span>
                    </div>
                  </div>
                )}

                {/* Conditional Portföy Durumu: Kasko -> Trafik */}
                {formData.branch === 'Kasko' ? (
                  <div className="md:col-span-3 p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Portföy Durumu (Trafik Çapraz Satış) *
                      </label>
                      <div className="flex items-center gap-3">
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          formData.trafficStatus === 'TRAFİK BİZDE'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="trafficStatus"
                            value="TRAFİK BİZDE"
                            checked={formData.trafficStatus === 'TRAFİK BİZDE'}
                            onChange={() => setFormData({ ...formData, trafficStatus: 'TRAFİK BİZDE' })}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>✓ TRAFİK BİZDE</span>
                        </label>
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          formData.trafficStatus === 'TRAFİK BİZDE DEĞİL'
                            ? 'bg-amber-50 border-amber-500 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="trafficStatus"
                            value="TRAFİK BİZDE DEĞİL"
                            checked={formData.trafficStatus === 'TRAFİK BİZDE DEĞİL'}
                            onChange={() => setFormData({ ...formData, trafficStatus: 'TRAFİK BİZDE DEĞİL' })}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>⚠️ TRAFİK BİZDE DEĞİL</span>
                        </label>
                      </div>
                    </div>

                    {formData.trafficStatus === 'TRAFİK BİZDE DEĞİL' && (
                      <div className="pt-2 border-t border-indigo-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Trafik Poliçesi Bitiş Tarihi *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.trafficEndDate || ''}
                            onChange={(e) => setFormData({ ...formData, trafficEndDate: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Trafik Sigorta Şirketi *
                          </label>
                          <select
                            required
                            value={formData.trafficCompany || COMPANIES[0]}
                            onChange={(e) => setFormData({ ...formData, trafficCompany: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                          >
                            {COMPANIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ) : formData.branch === 'Trafik' ? (
                  /* Conditional Portföy Durumu: Trafik -> Kasko */
                  <div className="md:col-span-3 p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Portföy Durumu (Kasko Çapraz Satış) *
                      </label>
                      <div className="flex items-center gap-3">
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          formData.kaskoStatus === 'KASKO BİZDE'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="kaskoStatus"
                            value="KASKO BİZDE"
                            checked={formData.kaskoStatus === 'KASKO BİZDE'}
                            onChange={() => setFormData({ ...formData, kaskoStatus: 'KASKO BİZDE' })}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>✓ KASKO BİZDE</span>
                        </label>
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          formData.kaskoStatus === 'KASKO BİZDE DEĞİL'
                            ? 'bg-amber-50 border-amber-500 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="kaskoStatus"
                            value="KASKO BİZDE DEĞİL"
                            checked={formData.kaskoStatus === 'KASKO BİZDE DEĞİL'}
                            onChange={() => setFormData({ ...formData, kaskoStatus: 'KASKO BİZDE DEĞİL' })}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>⚠️ KASKO BİZDE DEĞİL</span>
                        </label>
                      </div>
                    </div>

                    {formData.kaskoStatus === 'KASKO BİZDE DEĞİL' && (
                      <div className="pt-2 border-t border-indigo-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kasko Poliçesi Bitiş Tarihi *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.kaskoEndDate || ''}
                            onChange={(e) => setFormData({ ...formData, kaskoEndDate: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kasko Sigorta Şirketi *
                          </label>
                          <select
                            required
                            value={formData.kaskoCompany || COMPANIES[0]}
                            onChange={(e) => setFormData({ ...formData, kaskoCompany: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                          >
                            {COMPANIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Portföy Durumu</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white outline-none"
                    >
                      <option value="Portföyde">Portföyde</option>
                      <option value="Yenileme Takibinde">Yenileme Takibinde</option>
                      <option value="Sonuçlandı">Sonuçlandı (Kapandı)</option>
                      <option value="İptal">İptal Edildi</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Notlar */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Poliçe Notları & Hatırlatmalar</label>
              <textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder=""
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Poliçeyi Sil
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {isEditing ? 'Poliçeyi Güncelle' : 'Poliçeyi Kaydet'}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            if (onDelete && initialPolicy) {
              onDelete(initialPolicy.id);
              onClose();
            }
          }}
          title="Poliçe Silme Onayı"
          recordType="Poliçe"
          recordDetails={
            initialPolicy
              ? [
                  { label: 'Müşteri', value: initialPolicy.insured },
                  { label: 'Poliçe No', value: initialPolicy.policyNumber },
                  { label: 'Branş', value: initialPolicy.branch },
                  { label: 'Şirket', value: initialPolicy.company },
                  { label: 'Plaka', value: initialPolicy.plate || '—' },
                ]
              : []
          }
        />
      </div>
    </div>
  );
};
