import React, { useState, useMemo } from 'react';
import { Policy, COMPANIES, BRANCHES } from '../types/insurance';
import {
  formatCurrency,
  formatDateTr,
  calculateDaysLeft,
  calculateMultiplier,
  formatMultiplier,
  downloadFile,
  getTodayIso,
} from '../services/storage';
import {
  Search,
  CheckCircle2,
  Download,
  Shield,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Eye,
  Layers,
  Car,
  Calendar,
  XCircle,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface Props {
  policies: Policy[];
  onOpenNewPolicy: () => void;
  onEditPolicy: (policy: Policy) => void;
  onDeletePolicy: (id: string) => void;
  onCreateRenewalQuote: (policy: Policy) => void;
  onNewEndorsement?: (policy: Policy) => void;
  includeEndorsementPremium?: boolean;
  onToggleIncludeEndorsementPremium?: (val: boolean) => void;
}

export const PoliciesView: React.FC<Props> = ({
  policies,
  onOpenNewPolicy,
  onEditPolicy,
  onDeletePolicy,
  onCreateRenewalQuote,
  onNewEndorsement,
  includeEndorsementPremium = true,
  onToggleIncludeEndorsementPremium,
}) => {
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'active', 'cancelled', 'expired'
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);

  // 1. Filter policies based on search query, company, branch, and status
  const filteredPolicies = useMemo(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();

    return policies.filter((p) => {
      // Status filter
      if (filterStatus === 'cancelled' && p.status !== 'İptal') return false;
      if (filterStatus === 'active' && (p.status === 'İptal' || p.status === 'Sonuçlandı')) return false;
      if (filterStatus === 'expired') {
        const days = calculateDaysLeft(p.endDate);
        if (days === null || days >= 0 || p.status === 'İptal') return false;
      }

      // Company & Branch filters
      if (filterCompany && p.company !== filterCompany) return false;
      if (filterBranch && p.branch !== filterBranch) return false;

      // Search query
      if (q) {
        const matches =
          p.insured.toLocaleLowerCase('tr-TR').includes(q) ||
          (p.plate && p.plate.toLocaleLowerCase('tr-TR').includes(q)) ||
          (p.pastPlates && p.pastPlates.some((pp) => pp.toLocaleLowerCase('tr-TR').includes(q))) ||
          (p.policyNumber && p.policyNumber.toLocaleLowerCase('tr-TR').includes(q)) ||
          (p.vehicleBrand && p.vehicleBrand.toLocaleLowerCase('tr-TR').includes(q)) ||
          (p.vehicleModel && p.vehicleModel.toLocaleLowerCase('tr-TR').includes(q)) ||
          (p.phone && p.phone.includes(q)) ||
          (p.email && p.email.toLocaleLowerCase('tr-TR').includes(q)) ||
          p.company.toLocaleLowerCase('tr-TR').includes(q) ||
          p.branch.toLocaleLowerCase('tr-TR').includes(q) ||
          (p.notes && p.notes.toLocaleLowerCase('tr-TR').includes(q));

        if (!matches) return false;
      }

      return true;
    });
  }, [policies, filterStatus, filterCompany, filterBranch, search]);

  // 2. Metrics & KPI calculations
  const totalCount = policies.length;
  const activeCount = useMemo(
    () => policies.filter((p) => p.status !== 'İptal' && p.status !== 'Sonuçlandı').length,
    [policies]
  );
  const cancelledCount = useMemo(() => policies.filter((p) => p.status === 'İptal').length, [policies]);

  const totalPremiumSum = useMemo(() => {
    return policies.reduce((sum, p) => {
      const prem = includeEndorsementPremium
        ? (p.currentPremium ?? p.premium ?? 0)
        : (p.originalPremium ?? p.premium ?? 0);
      return sum + prem;
    }, 0);
  }, [policies, includeEndorsementPremium]);

  // 3. Export CSV handler
  const handleExportCsv = () => {
    const headers = [
      'Durum',
      'Sigortalı',
      'İş Türü',
      'Telefon',
      'E-posta',
      'Güncel Plaka',
      'Geçmiş Plakalar',
      'Araç Marka Model',
      'Araç Bedeli (TL)',
      includeEndorsementPremium ? 'Güncel Prim (TL)' : 'Orijinal Prim (TL)',
      'Orijinal Teklif Primi (TL)',
      'Toplam Ek Prim (TL)',
      'Toplam İade Prim (TL)',
      'Çarpan (Prim/Bedel)',
      'Sigorta Şirketi',
      'Branş',
      'Poliçe No',
      'Başlangıç Tarihi',
      'Bitiş Tarihi',
      'Dain-i Mürtehin',
      'Notlar / Açıklama',
    ];

    const rows = filteredPolicies.map((p) => [
      `"${p.status}"`,
      `"${p.insured}"`,
      `"${p.businessType || 'Yenileme'}"`,
      `"${p.phone || ''}"`,
      `"${p.email || ''}"`,
      `"${p.plate || ''}"`,
      `"${(p.pastPlates || []).join(', ')}"`,
      `"${[p.vehicleYear, p.vehicleBrand, p.vehicleModel].filter(Boolean).join(' ')}"`,
      `"${p.vehicleValue || ''}"`,
      `"${includeEndorsementPremium ? (p.currentPremium ?? p.premium) : (p.originalPremium ?? p.premium)}"`,
      `"${p.originalPremium ?? p.premium}"`,
      `"${p.totalAdditionalPremium || 0}"`,
      `"${p.totalRefundPremium || 0}"`,
      `"${calculateMultiplier(p.currentPremium ?? p.premium, p.vehicleValue, p.branch) !== null ? formatMultiplier(calculateMultiplier(p.currentPremium ?? p.premium, p.vehicleValue, p.branch)) : ''}"`,
      `"${p.company}"`,
      `"${p.branch}"`,
      `"${p.policyNumber}"`,
      `"${p.startDate || ''}"`,
      `"${p.endDate || ''}"`,
      `"${p.dainMurtehin || ''}"`,
      `"${p.notes || ''}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    downloadFile(`policeler-${getTodayIso()}.csv`, csvContent, 'text/csv;charset=utf-8;');
  };

  const getDaysBadge = (endDate?: string) => {
    if (!endDate) return null;
    const days = calculateDaysLeft(endDate);
    if (days === null) return null;

    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Süresi Doldu ({Math.abs(days)} gün önce)</span>
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span>Bugün Bitiyor</span>
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span>{days} gün kaldı</span>
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span>{days} gün kaldı</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
        <span>{days} gün kaldı</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600" />
              <span>Poliçeler</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
              {totalCount} Poliçe
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Olumlu sonuçlanarak poliçeleştirilmiş ana poliçe portföyü ve güncel hareketler.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Excel / CSV</span>
          </button>
          {onNewEndorsement && (
            <button
              onClick={() => onNewEndorsement({} as Policy)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Seçili veya aranan bir poliçeye zeyil hareketi gir"
            >
              <Layers className="w-4 h-4" />
              <span>＋ Zeyil Gir</span>
            </button>
          )}
          <button
            onClick={onOpenNewPolicy}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Yeni Poliçe Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Toplam Poliçe */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Toplam Poliçe</span>
            <Shield className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Portföydeki Kayıtlar</div>
        </div>

        {/* Yürürlükteki Poliçeler */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            filterStatus === 'active'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Yürürlükte</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
              Aktif
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2">{activeCount}</div>
          <div className="text-xs text-emerald-700 font-medium mt-0.5">Yürürlükteki Poliçeler</div>
        </div>

        {/* İptal Olan Poliçeler */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'cancelled' ? 'all' : 'cancelled')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            filterStatus === 'cancelled'
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>İptal Edilenler</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
              Zeyil / İptal
            </span>
          </div>
          <div className="text-2xl font-black text-rose-800 mt-2">{cancelledCount}</div>
          <div className="text-xs text-rose-700 font-medium mt-0.5">İptal Zeyli Uygulananlar</div>
        </div>

        {/* Toplam Prim Portföyü */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-900 text-xs font-semibold">
            <span>Toplam Prim Portföyü</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
              {includeEndorsementPremium ? 'Zeyil Dahil' : 'Orijinal'}
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-2 truncate" title={formatCurrency(totalPremiumSum)}>
            {formatCurrency(totalPremiumSum)}
          </div>
          <div className="text-xs text-indigo-700 font-medium mt-0.5">
            {includeEndorsementPremium ? 'Zeyiller Dahil Güncel Toplam' : 'İlk Teklif / Orijinal Toplam'}
          </div>
        </div>
      </div>

      {/* Filters Bar & Zeyil Dahil Prim Toggle */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sigortalı, plaka (eski/yeni), poliçe no veya marka/model ara..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Durum */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="all">Tüm Durumlar ({totalCount})</option>
              <option value="active">Yürürlükte ({activeCount})</option>
              <option value="cancelled">İptal Edilenler ({cancelledCount})</option>
              <option value="expired">Süresi Dolanlar</option>
            </select>

            {/* Şirket */}
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="">Tüm Şirketler</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Branş */}
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
            >
              <option value="">Tüm Branşlar</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Zeyil Dahil Prim Gösterim Ayarı */}
            <label className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl cursor-pointer text-xs select-none transition-colors shrink-0">
              <input
                type="checkbox"
                checked={includeEndorsementPremium}
                onChange={(e) => onToggleIncludeEndorsementPremium?.(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-bold text-indigo-900">Zeyil Dahil Prim</span>
            </label>

            {/* Reset Filter Button */}
            {(search || filterCompany || filterBranch || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterCompany('');
                  setFilterBranch('');
                  setFilterStatus('all');
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Policies Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4 text-center w-28">İşlem</th>
                <th className="py-3.5 px-4">Sigortalı</th>
                <th className="py-3.5 px-4">İş Türü</th>
                <th className="py-3.5 px-4">Plaka</th>
                <th className="py-3.5 px-4">Şirket</th>
                <th className="py-3.5 px-4">Branş</th>
                <th className="py-3.5 px-4">Poliçe No</th>
                <th className="py-3.5 px-4">Bitiş Tarihi / Kalan Gün</th>
                <th className="py-3.5 px-4 text-right">Araç Bedeli</th>
                <th className="py-3.5 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span>Prim (TL)</span>
                    <span className="text-[9px] font-normal text-slate-400 lowercase">
                      {includeEndorsementPremium ? '(zeyil dahil güncel)' : '(orijinal teklif)'}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Çarpan (Prim/Bedel)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPolicies.length > 0 ? (
                filteredPolicies.map((policy) => {
                  const isCancelled = policy.status === 'İptal';
                  const origPrem = policy.originalPremium ?? policy.premium ?? 0;
                  const currPrem = policy.currentPremium ?? policy.premium ?? 0;
                  const displayedPrem = includeEndorsementPremium ? currPrem : origPrem;
                  const mult = calculateMultiplier(displayedPrem, policy.vehicleValue, policy.branch);

                  return (
                    <tr
                      key={policy.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled ? 'bg-rose-50/30 text-slate-500' : ''
                      }`}
                    >
                      {/* 1. Durum */}
                      <td className="py-3.5 px-4">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>İptal</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Yürürlükte</span>
                          </span>
                        )}
                      </td>

                      {/* 2. İşlemler */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditPolicy(policy)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Poliçe Detayını Görüntüle ve Düzenle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onNewEndorsement && (
                            <button
                              type="button"
                              onClick={() => onNewEndorsement(policy)}
                              className="p-1.5 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                              title="Bu Poliçeye Zeyil Hareketi Gir"
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onCreateRenewalQuote(policy)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Gelecek Yıl İçin Yenileme Teklifi Oluştur"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPolicyToDelete(policy)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Poliçeyi Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* 3. Sigortalı */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs truncate max-w-[180px]" title={policy.insured}>
                          {policy.insured}
                        </div>
                        {policy.phone && (
                          <div className="text-[11px] text-slate-400 font-mono">{policy.phone}</div>
                        )}
                        {policy.dainMurtehin && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded inline-block truncate max-w-[180px] border border-amber-200 mt-0.5" title={`Dain-i Mürtehin: ${policy.dainMurtehin}`}>
                            D-M: {policy.dainMurtehin}
                          </div>
                        )}
                      </td>

                      {/* 4. İş Türü */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-600 text-xs">
                          {policy.businessType || 'Yenileme'}
                        </span>
                      </td>

                      {/* 5. Plaka & Araç */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {policy.plate || 'Plakasız'}
                          </span>
                        </div>
                        {policy.pastPlates && policy.pastPlates.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={`Eski Plakalar: ${policy.pastPlates.join(', ')}`}>
                            Eski: {policy.pastPlates.join(', ')}
                          </div>
                        )}
                        {(policy.vehicleBrand || policy.vehicleModel) && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {[policy.vehicleYear, policy.vehicleBrand, policy.vehicleModel].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </td>

                      {/* 6. Şirket */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 text-xs">{policy.company}</span>
                      </td>

                      {/* 7. Branş */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {policy.branch}
                        </span>
                      </td>

                      {/* 8. Poliçe No */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-semibold text-xs inline-block">
                          {policy.policyNumber}
                        </span>
                      </td>

                      {/* 9. Bitiş Tarihi / Kalan Gün */}
                      <td className="py-3.5 px-4">
                        {policy.endDate ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800 text-xs">
                              {formatDateTr(policy.endDate)}
                            </div>
                            <div>{getDaysBadge(policy.endDate)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 10. Araç Bedeli */}
                      <td className="py-3.5 px-4 text-right">
                        {policy.vehicleValue && policy.vehicleValue > 0 ? (
                          <div className="font-bold text-slate-800 text-xs">
                            {formatCurrency(policy.vehicleValue)}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 11. Prim (TL) */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className={`font-black text-sm ${
                            isCancelled ? 'text-rose-700 line-through' : 'text-slate-900'
                          }`}
                        >
                          {formatCurrency(displayedPrem)}
                        </div>
                        {currPrem !== origPrem && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {includeEndorsementPremium ? (
                              <span>İlk: {formatCurrency(origPrem)}</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Güncel: {formatCurrency(currPrem)}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 12. Çarpan (Prim / Araç Bedeli - Yalnızca Kasko) */}
                      <td className="py-3.5 px-4 text-center">
                        {policy.branch === 'Kasko' && mult !== null && mult !== undefined ? (
                          <span
                            className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200 inline-block shadow-2xs"
                            title={`Çarpan = Prim / Araç Bedeli (${formatCurrency(displayedPrem)} / ${formatCurrency(policy.vehicleValue || 0)})`}
                          >
                            {formatMultiplier(mult)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Shield className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-xs">Kayıtlı poliçe bulunamadı veya arama kriterine uymuyor.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {policyToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          title="Poliçeyi Sil"
          recordType="Poliçe"
          recordDetails={[
            { label: 'Poliçe No', value: policyToDelete.policyNumber },
            { label: 'Sigortalı', value: policyToDelete.insured },
            { label: 'Şirket & Branş', value: `${policyToDelete.company} - ${policyToDelete.branch}` },
          ]}
          onConfirm={() => {
            onDeletePolicy(policyToDelete.id);
            setPolicyToDelete(null);
          }}
          onClose={() => setPolicyToDelete(null)}
        />
      )}
    </div>
  );
};
