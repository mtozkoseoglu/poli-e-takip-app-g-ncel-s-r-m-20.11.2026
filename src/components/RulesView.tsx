import React, { useState, useMemo } from 'react';
import {
  CustomRule,
  COMPANIES,
  BRANCHES,
  USAGE_STYLES,
  FUEL_TYPES,
  RuleCondition,
  NumericOperator,
  TextOperator,
} from '../types/insurance';
import {
  generateId,
  parseNumberTr,
  formatCurrency,
  formatConditionText,
} from '../services/storage';
import {
  Sliders,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  Save,
  Check,
  X,
  Filter,
  Layers,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  rules: CustomRule[];
  reminderDays: number[];
  onSaveReminderDays: (days: number[]) => void;
  onSaveRule: (rule: CustomRule) => void;
  onDeleteRule: (id: string) => void;
}

export const RulesView: React.FC<Props> = ({
  rules,
  reminderDays,
  onSaveReminderDays,
  onSaveRule,
  onDeleteRule,
}) => {
  const visibleRules = useMemo(() => rules.filter((r) => !r.disabled && r.id !== 'r-2'), [rules]);
  const [daysInput, setDaysInput] = useState(reminderDays.join(', '));
  const [daysSaved, setDaysSaved] = useState(false);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleText, setRuleText] = useState('');

  // 1. Sigorta Şirketi
  const [companyOp, setCompanyOp] = useState<TextOperator>('equals');
  const [companyVal, setCompanyVal] = useState('');

  // 2. Branş
  const [branchOp, setBranchOp] = useState<TextOperator>('equals');
  const [branchVal, setBranchVal] = useState('');

  // 3. Sigortalı
  const [insuredOp, setInsuredOp] = useState<TextOperator>('equals');
  const [insuredVal, setInsuredVal] = useState('');

  // 4. Model Yılı (Sayısal: =, ≠, >, ≥, <, ≤, Arasındadır)
  const [yearOp, setYearOp] = useState<NumericOperator | 'none'>('none');
  const [yearVal, setYearVal] = useState<number | ''>('');
  const [yearVal2, setYearVal2] = useState<number | ''>('');

  // 5. Kullanım Tarzı
  const [usageStyleOp, setUsageStyleOp] = useState<TextOperator>('equals');
  const [usageStyleVal, setUsageStyleVal] = useState('');

  // 6. Yakıt Türü
  const [fuelTypeOp, setFuelTypeOp] = useState<TextOperator>('equals');
  const [fuelTypeVal, setFuelTypeVal] = useState('');

  // 7. Araç Bedeli (Sayısal: =, ≠, >, ≥, <, ≤, Arasındadır)
  const [valueOp, setValueOp] = useState<NumericOperator | 'none'>('none');
  const [valueVal, setValueVal] = useState('');
  const [valueVal2, setValueVal2] = useState('');

  // Legacy preservation
  const [legacyMinAge, setLegacyMinAge] = useState<number | string | undefined>(undefined);

  const handleSaveDays = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = daysInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 365);
    const sorted = [...new Set(parsed)].sort((a, b) => b - a);
    onSaveReminderDays(sorted);
    setDaysSaved(true);
    setTimeout(() => setDaysSaved(false), 2500);
  };

  const resetForm = () => {
    setEditingId(null);
    setRuleTitle('');
    setRuleText('');
    setCompanyOp('equals');
    setCompanyVal('');
    setBranchOp('equals');
    setBranchVal('');
    setInsuredOp('equals');
    setInsuredVal('');
    setYearOp('none');
    setYearVal('');
    setYearVal2('');
    setUsageStyleOp('equals');
    setUsageStyleVal('');
    setFuelTypeOp('equals');
    setFuelTypeVal('');
    setValueOp('none');
    setValueVal('');
    setValueVal2('');
    setLegacyMinAge(undefined);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleOpenEdit = (r: CustomRule) => {
    resetForm();
    setEditingId(r.id);
    setRuleTitle(r.title);
    setRuleText(r.text);
    setLegacyMinAge(r.minAge);

    if (Array.isArray(r.conditions) && r.conditions.length > 0) {
      r.conditions.forEach((c) => {
        if (c.field === 'company') {
          setCompanyOp(c.operator as TextOperator);
          setCompanyVal(String(c.value));
        } else if (c.field === 'branch') {
          setBranchOp(c.operator as TextOperator);
          setBranchVal(String(c.value));
        } else if (c.field === 'insured') {
          setInsuredOp(c.operator as TextOperator);
          setInsuredVal(String(c.value));
        } else if (c.field === 'vehicleYear') {
          setYearOp(c.operator as NumericOperator);
          setYearVal(c.value !== '' && !isNaN(Number(c.value)) ? Number(c.value) : '');
          setYearVal2(c.value2 !== undefined && c.value2 !== '' && !isNaN(Number(c.value2)) ? Number(c.value2) : '');
        } else if (c.field === 'usageStyle') {
          setUsageStyleOp(c.operator as TextOperator);
          setUsageStyleVal(String(c.value));
        } else if (c.field === 'fuelType') {
          setFuelTypeOp(c.operator as TextOperator);
          setFuelTypeVal(String(c.value));
        } else if (c.field === 'vehicleValue') {
          setValueOp(c.operator as NumericOperator);
          setValueVal(c.value !== undefined ? String(c.value) : '');
          setValueVal2(c.value2 !== undefined ? String(c.value2) : '');
        }
      });
    } else {
      // Legacy rule backward compatibility
      if (r.company) {
        setCompanyOp('equals');
        setCompanyVal(r.company);
      }
      if (r.branch) {
        setBranchOp('equals');
        setBranchVal(r.branch);
      }
      if (r.minAge !== undefined && r.minAge !== '') {
        // e.g. minAge 10 means vehicleYear <= currentYear - 10
        setLegacyMinAge(r.minAge);
      }
    }

    setIsAdding(true);
  };

  const handleSubmitRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim() || !ruleText.trim()) return;

    // Collect conditions
    const conditions: RuleCondition[] = [];

    // 1. Sigorta Şirketi
    if (companyVal.trim()) {
      conditions.push({
        field: 'company',
        operator: companyOp,
        value: companyVal.trim(),
      });
    }

    // 2. Branş
    if (branchVal.trim()) {
      conditions.push({
        field: 'branch',
        operator: branchOp,
        value: branchVal.trim(),
      });
    }

    // 3. Sigortalı
    if (insuredVal.trim()) {
      conditions.push({
        field: 'insured',
        operator: insuredOp,
        value: insuredVal.trim(),
      });
    }

    // 4. Model Yılı
    if (yearOp !== 'none' && yearVal !== '') {
      conditions.push({
        field: 'vehicleYear',
        operator: yearOp,
        value: Number(yearVal),
        value2: yearOp === 'between' && yearVal2 !== '' ? Number(yearVal2) : undefined,
      });
    }

    // 5. Kullanım Tarzı
    if (usageStyleVal.trim()) {
      conditions.push({
        field: 'usageStyle',
        operator: usageStyleOp,
        value: usageStyleVal.trim(),
      });
    }

    // 6. Yakıt Türü
    if (fuelTypeVal.trim()) {
      conditions.push({
        field: 'fuelType',
        operator: fuelTypeOp,
        value: fuelTypeVal.trim(),
      });
    }

    // 7. Araç Bedeli
    if (valueOp !== 'none' && valueVal.trim()) {
      const parsed1 = parseNumberTr(valueVal);
      const parsed2 = valueVal2.trim() ? parseNumberTr(valueVal2) : undefined;
      if (parsed1 !== null) {
        conditions.push({
          field: 'vehicleValue',
          operator: valueOp,
          value: parsed1,
          value2: valueOp === 'between' && parsed2 !== null && parsed2 !== undefined ? parsed2 : undefined,
        });
      }
    }

    const existingRule = editingId ? rules.find((r) => r.id === editingId) : null;

    const newRule: CustomRule = {
      id: editingId || generateId(),
      title: ruleTitle.trim(),
      text: ruleText.trim(),
      conditions: conditions.length > 0 ? conditions : undefined,
      // Backward compatibility root fields
      company: companyVal && companyOp === 'equals' ? companyVal : undefined,
      branch: branchVal && branchOp === 'equals' ? branchVal : undefined,
      minAge: legacyMinAge !== undefined ? legacyMinAge : existingRule?.minAge,
      createdAt: existingRule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRule(newRule);
    setIsAdding(false);
    resetForm();
  };

  const parsedValuePreview = parseNumberTr(valueVal);
  const parsedValue2Preview = parseNumberTr(valueVal2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-slate-700" />
            <span>İşlem & Uyarı Kuralları</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Yenileme hatırlatma günlerini ve teklif/poliçe bazlı çoklu koşul kontrol kurallarını yönetin.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>＋ Yeni Kontrol Kuralı</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Reminder Days Config */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Yenileme Takip Günleri</h2>
          <p className="text-xs text-slate-500 mb-4">
            Poliçe bitiş tarihinden kaç gün önce hatırlatma yapılsın?
          </p>

          <form onSubmit={handleSaveDays} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Günleri virgülle ayırın (Örn: 30, 15, 7, 3, 1)
              </label>
              <input
                type="text"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-semibold text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {daysSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Kaydedildi</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Günleri Kaydet</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Aktif Tetikleyiciler:</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {reminderDays.map((d) => (
                <span
                  key={d}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-bold"
                >
                  {d} gün önce
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Custom Rules List & Advanced Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">İşlem Kontrol Kuralları ({visibleRules.length})</h2>
              <p className="text-xs text-slate-500">
                Poliçe düzenleme ve teklif oluştururken otomatik kontrol edilen kurallar
              </p>
            </div>
          </div>

          {/* Form for adding/editing rule with 7 conditional fields */}
          {isAdding && (
            <form onSubmit={handleSubmitRule} className="mb-6 p-5 bg-slate-50 border border-slate-300 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {editingId ? 'Kuralı Düzenle' : 'Yeni Kural Tanımla'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tüm tanımlanan koşullar aynı anda sağlandığında kural tetiklenir (VE mantığı).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Warning Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kural Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleTitle}
                    onChange={(e) => setRuleTitle(e.target.value)}
                    placeholder="Örn: 2016 Öncesi ve 1 Milyon Üzeri Kasko Kontrolü"
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Uyarı & Talimat Metni *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={ruleText}
                    onChange={(e) => setRuleText(e.target.value)}
                    placeholder="Bu kural tetiklendiğinde acente personeline gösterilecek kontrol uyarısı..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 7 Condition Fields */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kural Koşulları (Gereken alanları doldurun, boş bırakılanlar kontrol edilmez)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* 1. Sigorta Şirketi */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      1. Sigorta Şirketi
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={companyOp}
                        onChange={(e) => setCompanyOp(e.target.value as TextOperator)}
                        className="w-1/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 outline-none"
                      >
                        <option value="equals">Eşittir (=)</option>
                        <option value="not_equals">Eşit değil (≠)</option>
                      </select>
                      <select
                        value={companyVal}
                        onChange={(e) => setCompanyVal(e.target.value)}
                        className="w-2/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none"
                      >
                        <option value="">Tüm Şirketler (Koşul Yok)</option>
                        {COMPANIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Branş */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      2. Branş
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={branchOp}
                        onChange={(e) => setBranchOp(e.target.value as TextOperator)}
                        className="w-1/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 outline-none"
                      >
                        <option value="equals">Eşittir (=)</option>
                        <option value="not_equals">Eşit değil (≠)</option>
                      </select>
                      <select
                        value={branchVal}
                        onChange={(e) => setBranchVal(e.target.value)}
                        className="w-2/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none"
                      >
                        <option value="">Tüm Branşlar (Koşul Yok)</option>
                        {BRANCHES.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3. Sigortalı */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      3. Sigortalı (Müşteri Adı / Ünvan)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={insuredOp}
                        onChange={(e) => setInsuredOp(e.target.value as TextOperator)}
                        className="w-1/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 outline-none"
                      >
                        <option value="equals">Eşittir (=)</option>
                        <option value="not_equals">Eşit değil (≠)</option>
                      </select>
                      <input
                        type="text"
                        value={insuredVal}
                        onChange={(e) => setInsuredVal(e.target.value)}
                        placeholder="Müşteri Adı Soyadı veya Ünvan (Boş = Koşul Yok)"
                        className="w-2/3 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none font-semibold"
                      />
                    </div>
                  </div>

                  {/* 4. Model Yılı (Sayısal Karşılaştırma) */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      4. Model Yılı
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={yearOp}
                        onChange={(e) => setYearOp(e.target.value as NumericOperator | 'none')}
                        className="w-1/2 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 outline-none"
                      >
                        <option value="none">Koşul Yok</option>
                        <option value="equals">Eşittir (=)</option>
                        <option value="not_equals">Eşit değildir (≠)</option>
                        <option value="greater_than">Büyüktür (&gt;)</option>
                        <option value="greater_than_or_equal">Büyük veya eşit (≥)</option>
                        <option value="less_than">Küçüktür (&lt;)</option>
                        <option value="less_than_or_equal">Küçük veya eşit (≤)</option>
                        <option value="between">Arasındadır</option>
                      </select>

                      {yearOp !== 'none' && (
                        <div className="w-1/2 flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1970"
                            max="2035"
                            value={yearVal}
                            onChange={(e) => setYearVal(e.target.value ? Number(e.target.value) : '')}
                            placeholder={yearOp === 'between' ? 'Min Yıl' : 'Örn: 2016'}
                            className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none"
                          />
                          {yearOp === 'between' && (
                            <>
                              <span className="text-slate-400 font-bold">-</span>
                              <input
                                type="number"
                                min="1970"
                                max="2035"
                                value={yearVal2}
                                onChange={(e) => setYearVal2(e.target.value ? Number(e.target.value) : '')}
                                placeholder="Max Yıl"
                                className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none"
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. Kullanım Tarzı */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      5. Kullanım Tarzı
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={usageStyleOp}
                        onChange={(e) => setUsageStyleOp(e.target.value as TextOperator)}
                        className="w-1/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 outline-none"
                      >
                        <option value="equals">Eşittir (=)</option>
                        <option value="not_equals">Eşit değil (≠)</option>
                      </select>
                      <select
                        value={usageStyleVal}
                        onChange={(e) => setUsageStyleVal(e.target.value)}
                        className="w-2/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none"
                      >
                        <option value="">Tüm Kullanım Tarzları (Koşul Yok)</option>
                        {USAGE_STYLES.map((style) => (
                          <option key={style} value={style}>
                            {style}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 6. Yakıt Türü */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      6. Yakıt Türü
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={fuelTypeOp}
                        onChange={(e) => setFuelTypeOp(e.target.value as TextOperator)}
                        className="w-1/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 outline-none"
                      >
                        <option value="equals">Eşittir (=)</option>
                        <option value="not_equals">Eşit değil (≠)</option>
                      </select>
                      <select
                        value={fuelTypeVal}
                        onChange={(e) => setFuelTypeVal(e.target.value)}
                        className="w-2/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none"
                      >
                        <option value="">Tüm Yakıt Türleri (Koşul Yok)</option>
                        {FUEL_TYPES.map((ft) => (
                          <option key={ft} value={ft}>
                            {ft}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 7. Araç Bedeli (Sayısal Karşılaştırma) */}
                  <div className="md:col-span-2 p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">
                        7. Araç Bedeli (TL)
                      </label>
                      {valueOp !== 'none' && parsedValuePreview !== null && (
                        <span className="text-[11px] font-bold text-blue-600">
                          {valueOp === 'between' && parsedValue2Preview !== null
                            ? `${formatCurrency(parsedValuePreview)} ile ${formatCurrency(parsedValue2Preview)} arası`
                            : formatCurrency(parsedValuePreview)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={valueOp}
                        onChange={(e) => setValueOp(e.target.value as NumericOperator | 'none')}
                        className="sm:w-1/3 px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 outline-none"
                      >
                        <option value="none">Koşul Yok</option>
                        <option value="equals">Eşittir (=)</option>
                        <option value="not_equals">Eşit değildir (≠)</option>
                        <option value="greater_than">Büyüktür (&gt;)</option>
                        <option value="greater_than_or_equal">Büyük veya eşit (≥)</option>
                        <option value="less_than">Küçüktür (&lt;)</option>
                        <option value="less_than_or_equal">Küçük veya eşit (≤)</option>
                        <option value="between">Arasındadır</option>
                      </select>

                      {valueOp !== 'none' && (
                        <div className="sm:w-2/3 flex items-center gap-2">
                          <input
                            type="text"
                            value={valueVal}
                            onChange={(e) => setValueVal(e.target.value)}
                            placeholder={valueOp === 'between' ? 'Min Bedel (Örn: 500.000)' : 'Örn: 1.000.000'}
                            className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none"
                          />
                          {valueOp === 'between' && (
                            <>
                              <span className="text-slate-400 font-bold">-</span>
                              <input
                                type="text"
                                value={valueVal2}
                                onChange={(e) => setValueVal2(e.target.value)}
                                placeholder="Max Bedel (Örn: 1.000.000)"
                                className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none"
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {legacyMinAge !== undefined && (
                  <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ℹ Bu kural eski versiyonda oluşturulmuş bir <strong>Min. Araç Yaşı ({legacyMinAge})</strong> koşulu içeriyor. Kaydettiğinizde veri bütünlüğü korunacaktır.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Değişiklikleri Güncelle' : 'Kuralı Kaydet'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            {visibleRules.length > 0 ? (
              visibleRules.map((rule) => {
                const hasConditions = Array.isArray(rule.conditions) && rule.conditions.length > 0;

                return (
                  <div
                    key={rule.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{rule.title}</span>
                      </div>

                      {/* Conditions Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {hasConditions ? (
                          rule.conditions!.map((c, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-800 border border-slate-300 shadow-2xs"
                            >
                              {formatConditionText(c)}
                            </span>
                          ))
                        ) : (
                          <>
                            {rule.company && (
                              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-bold">
                                Şirket = {rule.company}
                              </span>
                            )}
                            {rule.branch && (
                              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[11px] font-bold">
                                Branş = {rule.branch}
                              </span>
                            )}
                            {rule.minAge !== undefined && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-bold">
                                Eski Kural: Min Yaş = {rule.minAge}
                              </span>
                            )}
                            {!rule.company && !rule.branch && rule.minAge === undefined && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold">
                                Genel Kural (Tüm İşlemler)
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Rule instruction/warning text */}
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-slate-700 text-xs flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{rule.text}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rule)}
                        title="Kuralı Düzenle"
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${rule.title}" kuralını silmek istediğinize emin misiniz?`)) {
                            onDeleteRule(rule.id);
                          }
                        }}
                        title="Kuralı Sil"
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Sliders className="w-8 h-8 text-slate-300" />
                <span>Henüz tanımlı bir kontrol kuralı bulunmuyor. Yeni Kural Ekle butonunu kullanarak koşul ekleyebilirsiniz.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
