import React, { useState, useMemo } from 'react';
import { Policy, PolicyEndorsement, EndorsementType, ENDORSEMENT_TYPES, BRANCHES, COMPANIES } from '../types/insurance';
import { formatCurrency, formatDateTr } from '../services/storage';
import {
  Layers,
  Search,
  Filter,
  Eye,
  FileText,
  Calendar,
  Building2,
  Car,
  User,
  Shield,
  ArrowRight,
  Download,
  Paperclip,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';

interface Props {
  endorsements: PolicyEndorsement[];
  policies: Policy[];
  onOpenNewEndorsement: () => void;
  onViewPolicy?: (policy: Policy) => void;
  onDeleteEndorsement?: (endorsement: PolicyEndorsement) => void;
  onEditEndorsement?: (endorsement: PolicyEndorsement) => void;
}

export const EndorsementsView: React.FC<Props> = ({
  endorsements,
  policies,
  onOpenNewEndorsement,
  onViewPolicy,
  onDeleteEndorsement,
  onEditEndorsement,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Selected endorsement for detail inspection
  const [selectedEndorsement, setSelectedEndorsement] = useState<PolicyEndorsement | null>(null);
  // Endorsement pending deletion confirmation
  const [endorsementToDelete, setEndorsementToDelete] = useState<PolicyEndorsement | null>(null);

  // Policy map for fast O(1) lookup
  const policyMap = useMemo(() => {
    const map = new Map<string, Policy>();
    policies.forEach((p) => {
      map.set(p.id, p);
      map.set(p.policyNumber.trim(), p);
    });
    return map;
  }, [policies]);

  // Enriched endorsement list with policy details
  const enrichedList = useMemo(() => {
    return endorsements.map((end) => {
      const policy = policyMap.get(end.policyId) || policyMap.get(end.policyNumber.trim());
      return {
        ...end,
        policy,
        insured: policy?.insured || '—',
        branch: policy?.branch || '—',
        company: policy?.company || '—',
        currentPlate: policy?.plate || '—',
      };
    });
  }, [endorsements, policyMap]);

  // Filtered list
  const filteredList = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');

    return enrichedList
      .filter((item) => {
        if (filterType && item.endorsementType !== filterType) return false;
        if (filterCompany && item.company !== filterCompany) return false;
        if (filterBranch && item.branch !== filterBranch) return false;

        if (startDateFilter && item.issueDate < startDateFilter) return false;
        if (endDateFilter && item.issueDate > endDateFilter) return false;

        if (q) {
          const matchNumber = item.policyNumber.toLocaleLowerCase('tr-TR').includes(q);
          const matchEndNumber = item.endorsementNumber.toLocaleLowerCase('tr-TR').includes(q);
          const matchInsured = item.insured.toLocaleLowerCase('tr-TR').includes(q);
          const matchPlate = item.currentPlate.toLocaleLowerCase('tr-TR').includes(q);
          const matchCompany = item.company.toLocaleLowerCase('tr-TR').includes(q);
          const matchBranch = item.branch.toLocaleLowerCase('tr-TR').includes(q);
          const matchType = item.endorsementType.toLocaleLowerCase('tr-TR').includes(q);
          const matchDesc = item.description ? item.description.toLocaleLowerCase('tr-TR').includes(q) : false;

          // Also match old plates if present in oldValues or policy pastPlates
          const matchOldPlate = item.oldValues?.plate
            ? String(item.oldValues.plate).toLocaleLowerCase('tr-TR').includes(q)
            : false;
          const matchNewPlate = item.newValues?.plate
            ? String(item.newValues.plate).toLocaleLowerCase('tr-TR').includes(q)
            : false;

          if (
            !matchNumber &&
            !matchEndNumber &&
            !matchInsured &&
            !matchPlate &&
            !matchCompany &&
            !matchBranch &&
            !matchType &&
            !matchDesc &&
            !matchOldPlate &&
            !matchNewPlate
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by issueDate descending (most recent first)
        const dateA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
        const dateB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [enrichedList, search, filterType, filterCompany, filterBranch, startDateFilter, endDateFilter]);

  // Quick stats
  const totalEndorsementsCount = endorsements.length;
  const totalAdditionalPremium = useMemo(
    () => endorsements.reduce((sum, e) => sum + (e.additionalPremium || 0), 0),
    [endorsements]
  );
  const totalRefundPremium = useMemo(
    () => endorsements.reduce((sum, e) => sum + (e.refundPremium || 0), 0),
    [endorsements]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white rounded-3xl shadow-sm">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-cyan-300 uppercase">
            Poliçe Hareketleri / Zeyil Yönetimi
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-0.5">Zeyil Hareketleri Listesi</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Ana poliçelere bağlı kaydedilmiş tüm zeyilleri inceleyin, yeni zeyil hareketleri girin ve geçmiş değişiklikleri takip edin.
          </p>
        </div>

        <button
          onClick={onOpenNewEndorsement}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>＋ Yeni Zeyil Gir</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>Toplam Zeyil Sayısı</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalEndorsementsCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Kayıtlı hareketler</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Toplam Ek Prim</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {formatCurrency(totalAdditionalPremium)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Zeyillerle tahsil edilen</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Toplam İade Prim</span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {formatCurrency(totalRefundPremium)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">İptal/fark iadeleri</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Poliçe No, Zeyil No, Sigortalı, Plaka (Eski/Yeni) veya Şirket ara..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
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

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none cursor-pointer"
          >
            <option value="">Tüm Zeyil Türleri</option>
            {ENDORSEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Company Filter */}
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

          {/* Branch Filter */}
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
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Tanzim Tarihi Aralığı:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white font-medium"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white font-medium"
            />
          </div>

          {(search || filterType || filterCompany || filterBranch || startDateFilter || endDateFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType('');
                setFilterCompany('');
                setFilterBranch('');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-auto"
            >
              Filtreleri Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 text-center w-16">İşlem</th>
                <th className="py-3.5 px-4">Tanzim Tarihi</th>
                <th className="py-3.5 px-4">Poliçe No</th>
                <th className="py-3.5 px-4">Zeyil No</th>
                <th className="py-3.5 px-4">Sigortalı</th>
                <th className="py-3.5 px-4">Şirket</th>
                <th className="py-3.5 px-4">Branş</th>
                <th className="py-3.5 px-4">Plaka</th>
                <th className="py-3.5 px-4">Zeyil Türü</th>
                <th className="py-3.5 px-4 text-right">Önceki Prim</th>
                <th className="py-3.5 px-4 text-right">Ek Prim</th>
                <th className="py-3.5 px-4 text-right">İade Prim</th>
                <th className="py-3.5 px-4 text-right font-black">Zeyil Sonrası Prim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length > 0 ? (
                filteredList.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-cyan-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedEndorsement(item)}
                    >
                      {/* İşlem Butonları */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedEndorsement(item)}
                            className="p-1.5 text-cyan-700 hover:bg-cyan-100 rounded-lg transition-colors cursor-pointer"
                            title="Zeyil Detayını Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onEditEndorsement && (
                            <button
                              type="button"
                              onClick={() => onEditEndorsement(item)}
                              className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="Zeyili Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteEndorsement && (
                            <button
                              type="button"
                              onClick={() => setEndorsementToDelete(item)}
                              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Zeyili Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Tanzim Tarihi */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {formatDateTr(item.issueDate)}
                      </td>

                      {/* Poliçe No */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          {item.policyNumber}
                        </span>
                      </td>

                      {/* Zeyil No */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                          {item.endorsementNumber}
                        </span>
                      </td>

                      {/* Sigortalı */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.insured}
                      </td>

                      {/* Şirket */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.company}
                      </td>

                      {/* Branş */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {item.branch}
                      </td>

                      {/* Plaka */}
                      <td className="py-3.5 px-4">
                        {item.currentPlate && item.currentPlate !== '—' ? (
                          <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-slate-900 tracking-wider">
                            {item.currentPlate}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Zeyil Türü */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {item.endorsementType}
                        </span>
                      </td>

                      {/* Önceki Prim */}
                      <td className="py-3.5 px-4 text-right text-slate-600 font-semibold">
                        {formatCurrency(item.previousPremium)}
                      </td>

                      {/* Ek Prim */}
                      <td className="py-3.5 px-4 text-right">
                        {item.additionalPremium > 0 ? (
                          <span className="text-emerald-700 font-bold">
                            +{formatCurrency(item.additionalPremium)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* İade Prim */}
                      <td className="py-3.5 px-4 text-right">
                        {item.refundPremium > 0 ? (
                          <span className="text-rose-700 font-bold">
                            -{formatCurrency(item.refundPremium)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Zeyil Sonrası Prim */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-xs">
                        {formatCurrency(item.totalPremium)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <div className="font-semibold text-slate-600 text-sm">Zeyil hareketi bulunamadı</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Arama terimlerinizi değiştirin veya yukarıdaki butonla yeni zeyil girişi yapın.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZEYİL DETAY GÖRÜNTÜLEME MODALI                                            */}
      {/* ========================================================================= */}
      {selectedEndorsement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Zeyil Hareketi Detayı</h3>
                  <div className="text-xs text-slate-300 font-mono">
                    Poliçe No: {selectedEndorsement.policyNumber} · Zeyil No: {selectedEndorsement.endorsementNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEndorsement(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-xs text-slate-800">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Zeyil Türü</div>
                  <div className="font-bold text-cyan-900 mt-0.5 truncate">{selectedEndorsement.endorsementType}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tanzim Tarihi</div>
                  <div className="font-bold text-slate-900 mt-0.5">{formatDateTr(selectedEndorsement.issueDate)}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Önceki Prim</div>
                  <div className="font-bold text-slate-800 mt-0.5">{formatCurrency(selectedEndorsement.previousPremium)}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase">Zeyil Sonrası Prim</div>
                  <div className="font-black text-emerald-900 mt-0.5">{formatCurrency(selectedEndorsement.totalPremium)}</div>
                </div>
              </div>

              {/* Prim Değişim Detayı */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700">Prim Hareketi: </span>
                  {selectedEndorsement.additionalPremium > 0 ? (
                    <span className="font-bold text-emerald-700">+{formatCurrency(selectedEndorsement.additionalPremium)} Ek Prim Tahsil Edildi</span>
                  ) : selectedEndorsement.refundPremium > 0 ? (
                    <span className="font-bold text-rose-700">-{formatCurrency(selectedEndorsement.refundPremium)} Prim İadesi Yapıldı</span>
                  ) : (
                    <span className="text-slate-500 font-semibold">Primsiz Zeyil (0,00 TL)</span>
                  )}
                </div>
              </div>

              {/* Değiştirilen Alanlar & Eski / Yeni Değerler Tablosu */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Değiştirilen Alanlar (Eski vs Yeni Değerler)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedEndorsement.changedFields.map((field) => {
                    const oldVal = selectedEndorsement.oldValues[field];
                    const newVal = selectedEndorsement.newValues[field];

                    const renderVal = (v: any) => {
                      if (v === undefined || v === null || v === '') return '—';
                      if (Array.isArray(v)) return v.join(', ');
                      if (typeof v === 'number' && field.toLowerCase().includes('premium')) return formatCurrency(v);
                      return String(v);
                    };

                    return (
                      <div key={field} className="p-3 flex items-center justify-between bg-white text-xs">
                        <div className="font-bold text-slate-700 capitalize">{field}</div>
                        <div className="flex items-center gap-3">
                          <span className="line-through text-slate-400 font-mono">{renderVal(oldVal)}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-cyan-900 font-mono bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                            {renderVal(newVal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Araç Satış ve Noter Belge Bilgileri (Satış İptal Zeyili) */}
              {(selectedEndorsement.endorsementType === 'SATIŞ İPTAL ZEYİLİ' ||
                selectedEndorsement.notary ||
                selectedEndorsement.salesContractNo ||
                selectedEndorsement.documentIssueDate) && (
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2.5">
                  <div className="font-bold text-xs text-rose-950 flex items-center gap-1.5 border-b border-rose-200/60 pb-2">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span className="uppercase tracking-wider">Araç Satış ve Noter Belge Bilgileri</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 bg-white rounded-xl border border-rose-200/80">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Noter</div>
                      <div className="font-bold text-slate-900 mt-0.5">{selectedEndorsement.notary || '—'}</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-rose-200/80">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Satış Senedi No</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">{selectedEndorsement.salesContractNo || '—'}</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-rose-200/80">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Belge Düzenlenme Tarihi</div>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {selectedEndorsement.documentIssueDate ? formatDateTr(selectedEndorsement.documentIssueDate) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Açıklama */}
              {selectedEndorsement.description && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-700 text-[11px] uppercase">Zeyil Açıklaması</div>
                  <div className="text-slate-800">{selectedEndorsement.description}</div>
                </div>
              )}

              {/* Belgeler */}
              {selectedEndorsement.documents && selectedEndorsement.documents.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-700 text-[11px] uppercase flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>Yüklenen Belgeler ({selectedEndorsement.documents.length})</span>
                  </div>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
                    {selectedEndorsement.documents.map((doc) => (
                      <div key={doc.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-cyan-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{doc.name}</span>
                          <span className="text-[10px] text-slate-400">({Math.round(doc.size / 1024)} KB)</span>
                        </div>
                        {doc.dataUrl && (
                          <a
                            href={doc.dataUrl}
                            download={doc.name}
                            className="px-2.5 py-1 text-cyan-700 hover:bg-cyan-50 rounded text-xs font-bold transition-colors cursor-pointer"
                          >
                            İndir
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                {onDeleteEndorsement ? (
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedEndorsement;
                      setSelectedEndorsement(null);
                      setEndorsementToDelete(item);
                    }}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Zeyili Sil</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {onEditEndorsement && (
                    <button
                      type="button"
                      onClick={() => {
                        const item = selectedEndorsement;
                        setSelectedEndorsement(null);
                        onEditEndorsement(item);
                      }}
                      className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                      <span>Düzenle</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEndorsement(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZEYİL SİLME ONAY MODALI                                                    */}
      {/* ========================================================================= */}
      {endorsementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Zeyil Hareketini Silmek İstiyor musunuz?
                </h3>
                <p className="text-xs text-slate-500">
                  Bu işlem geri alınamaz. Zeyilin ana poliçeye uyguladığı değişiklikler (plaka, prim, iptal durumu vb.) güvenli şekilde geri alınacaktır.
                </p>
              </div>

              {/* Endorsement Details Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Poliçe Numarası:</span>
                  <span className="font-mono font-bold text-slate-900">{endorsementToDelete.policyNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Zeyil Numarası:</span>
                  <span className="font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {endorsementToDelete.endorsementNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Zeyil Türü:</span>
                  <span className="font-bold text-slate-800">{endorsementToDelete.endorsementType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tanzim Tarihi:</span>
                  <span className="text-slate-800">{formatDateTr(endorsementToDelete.issueDate)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEndorsementToDelete(null)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = endorsementToDelete;
                    setEndorsementToDelete(null);
                    if (onDeleteEndorsement) {
                      onDeleteEndorsement(item);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Evet, Zeyili Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
