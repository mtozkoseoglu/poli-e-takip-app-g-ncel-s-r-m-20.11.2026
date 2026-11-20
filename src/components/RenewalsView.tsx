import React, { useState, useMemo } from 'react';
import { RenewalRecord, Policy, COMPANIES, BRANCHES } from '../types/insurance';
import {
  formatCurrency,
  formatDateTr,
  calculateDaysLeft,
  exportRenewalsToCsv,
  subtractOneYear,
} from '../services/storage';
import {
  RefreshCw,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  Shield,
  Car,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface Props {
  renewals: RenewalRecord[];
  policies: Policy[];
  onCreateRenewalQuote: (policy: Policy) => void;
  onViewPolicy?: (policy: Policy) => void;
}

export const RenewalsView: React.FC<Props> = ({
  renewals,
  policies,
  onCreateRenewalQuote,
  onViewPolicy,
}) => {
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'cancelled' | 'all'>('active');

  // Policy map for fast lookup
  const policyMap = useMemo(() => {
    const map = new Map<string, Policy>();
    policies.forEach((p) => map.set(p.id, p));
    return map;
  }, [policies]);

  // Filtered renewals
  const filteredRenewals = useMemo(() => {
    return renewals.filter((r) => {
      // 1. Status Filter: Default 'active' excludes cancelled
      if (statusFilter === 'active' && r.status === 'cancelled') return false;
      if (statusFilter === 'cancelled' && r.status !== 'cancelled') return false;

      // 2. Company Filter
      if (companyFilter && r.company !== companyFilter) return false;

      // 3. Branch Filter
      if (branchFilter && r.branch !== branchFilter) return false;

      // 4. Period / Days Left Filter (Yenileme başlangıç vadesine göre)
      const daysLeft = calculateDaysLeft(r.startDate);
      if (periodFilter === 'overdue' && (daysLeft === null || daysLeft >= 0)) return false;
      if (periodFilter === '7days' && (daysLeft === null || daysLeft < 0 || daysLeft > 7)) return false;
      if (periodFilter === '15days' && (daysLeft === null || daysLeft < 0 || daysLeft > 15)) return false;
      if (periodFilter === '30days' && (daysLeft === null || daysLeft < 0 || daysLeft > 30)) return false;
      if (periodFilter === '60days' && (daysLeft === null || daysLeft < 0 || daysLeft > 60)) return false;

      // 5. Search Text
      if (search.trim()) {
        const q = search.trim().toLocaleLowerCase('tr-TR');
        const plateNorm = (r.plate || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
        const qPlateNorm = q.replace(/\s+/g, '');
        const matchPlate = plateNorm.includes(qPlateNorm);
        const matchInsured = r.insured.toLocaleLowerCase('tr-TR').includes(q);
        const matchPolicyNo = r.policyNumber.toLocaleLowerCase('tr-TR').includes(q);
        const matchBrand = (r.vehicleBrand || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchModel = (r.vehicleModel || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchChassis = (r.chassisNo || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchEngine = (r.engineNo || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchSerial = (r.licenseSerialNo || '').toLocaleLowerCase('tr-TR').includes(q);

        if (
          !matchPlate &&
          !matchInsured &&
          !matchPolicyNo &&
          !matchBrand &&
          !matchModel &&
          !matchChassis &&
          !matchEngine &&
          !matchSerial
        ) {
          return false;
        }
      }

      return true;
    });
  }, [renewals, statusFilter, companyFilter, branchFilter, periodFilter, search]);

  // Sort by startDate ascending (yenileme vadesi en yakın olan önce)
  const sortedRenewals = useMemo(() => {
    return [...filteredRenewals].sort((a, b) => {
      const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return timeA - timeB;
    });
  }, [filteredRenewals]);

  // Statistics
  const stats = useMemo(() => {
    const activeList = renewals.filter((r) => r.status !== 'cancelled');
    const totalCount = activeList.length;
    let dueThisMonth = 0;
    let criticalCount = 0;
    let totalPremium = 0;

    activeList.forEach((r) => {
      totalPremium += r.premium || 0;
      const days = calculateDaysLeft(r.startDate);
      if (days !== null) {
        if (days >= 0 && days <= 30) dueThisMonth++;
        if (days <= 7) criticalCount++;
      }
    });

    const cancelledCount = renewals.filter((r) => r.status === 'cancelled').length;

    return {
      totalCount,
      dueThisMonth,
      criticalCount,
      totalPremium,
      cancelledCount,
    };
  }, [renewals]);

  // Trigger Renewal Quote Creation
  const handleStartRenewalQuote = (renewal: RenewalRecord) => {
    let parentPolicy = policyMap.get(renewal.policyId);
    if (!parentPolicy) {
      // Fallback: reconstruct policy from renewal record
      parentPolicy = {
        id: renewal.policyId,
        type: 'policy',
        insured: renewal.insured,
        branch: renewal.branch,
        company: renewal.company,
        policyNumber: renewal.policyNumber,
        plate: renewal.plate,
        licenseSerialNo: renewal.licenseSerialNo,
        chassisNo: renewal.chassisNo,
        engineNo: renewal.engineNo,
        vehicleBrand: renewal.vehicleBrand,
        vehicleModel: renewal.vehicleModel,
        vehicleYear: renewal.vehicleYear,
        vehicleCode: renewal.vehicleCode,
        vehicleValue: renewal.vehicleValue,
        startDate: subtractOneYear(renewal.startDate),
        endDate: renewal.startDate,
        premium: renewal.premium,
        originalPremium: renewal.premium,
        currentPremium: renewal.premium,
        status: renewal.status === 'cancelled' ? 'İptal' : 'Portföyde',
        stage: 'Yenileme Bekliyor',
        createdAt: renewal.createdAt,
        updatedAt: renewal.updatedAt,
      };
    }
    onCreateRenewalQuote(parentPolicy);
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Renewals */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktif Yenilemeler</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Takipteki toplam portföy</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>

        {/* Due This Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bu Ay Yenilenecek</div>
            <div className="text-2xl font-black text-indigo-900 mt-1">{stats.dueThisMonth}</div>
            <div className="text-xs text-indigo-600 font-medium mt-0.5">0 - 30 gün içinde</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Critical (Next 7 Days or Overdue) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kritik Vade</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{stats.criticalCount}</div>
            <div className="text-xs text-rose-700 font-medium mt-0.5">Son 7 gün & gecikenler</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Renewal Premium */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Portföy Primi</div>
            <div className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(stats.totalPremium)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Brüt yenileme hacmi</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plaka, Sigortalı, Poliçe No, Şasi, Motor No, Araç Marka/Model..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <button
              onClick={() => exportRenewalsToCsv(sortedRenewals)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Listelenen kayıtları CSV olarak indirin"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Excel / CSV</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Company Filter */}
          <div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="">Tüm Şirketler ({COMPANIES.length})</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="">Tüm Branşlar</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Period / Days Left Filter */}
          <div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="all">Tüm Vadeler</option>
              <option value="overdue">⚠️ Vadesi Geçmiş (Gecikmiş)</option>
              <option value="7days">0 - 7 Gün Kalanlar (Kritik)</option>
              <option value="15days">0 - 15 Gün Kalanlar</option>
              <option value="30days">0 - 30 Gün Kalanlar (Bu Ay)</option>
              <option value="60days">30 - 60 Gün Kalanlar</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none font-medium cursor-pointer"
            >
              <option value="active">Aktif Yenilemeler</option>
              <option value="cancelled">İptal Edilenler ({stats.cancelledCount})</option>
              <option value="all">Tümü (İptaller Dahil)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table with 16 Exact Columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800">Yenileme Takip Listesi</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">
              {sortedRenewals.length} Kayıt
            </span>
          </div>
          {statusFilter === 'active' && stats.cancelledCount > 0 && (
            <span className="text-[11px] text-slate-400">
              * {stats.cancelledCount} adet iptal edilmiş poliçe otomatik gizlendi.
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                {/* 1. PLAKA */}
                <th className="py-3 px-3">PLAKA</th>
                {/* 2. Branş */}
                <th className="py-3 px-3">Branş</th>
                {/* 3. Sigorta Şirketi */}
                <th className="py-3 px-3">Sigorta Şirketi</th>
                {/* 4. Sigortalı */}
                <th className="py-3 px-3">Sigortalı</th>
                {/* 5. Poliçe No */}
                <th className="py-3 px-3">Poliçe No</th>
                {/* 6. Başlama Tarihi */}
                <th className="py-3 px-3">Başlama Tarihi</th>
                {/* 7. Bitiş Tarihi */}
                <th className="py-3 px-3">Bitiş Tarihi</th>
                {/* 8. Brüt Prim TL */}
                <th className="py-3 px-3 text-right">Brüt Prim TL</th>
                {/* 9. ARAÇ MARKA */}
                <th className="py-3 px-3">ARAÇ MARKA</th>
                {/* 10. ARAÇ MODEL */}
                <th className="py-3 px-3">ARAÇ MODEL</th>
                {/* 11. Model Yılı */}
                <th className="py-3 px-3">Model Yılı</th>
                {/* 12. Ruhsat No */}
                <th className="py-3 px-3">Ruhsat No</th>
                {/* 13. Motor No */}
                <th className="py-3 px-3">Motor No</th>
                {/* 14. Şasi No */}
                <th className="py-3 px-3">Şasi No</th>
                {/* 15. Araç Bedeli */}
                <th className="py-3 px-3 text-right">Araç Bedeli</th>
                {/* 16. Araç Kodu */}
                <th className="py-3 px-3">Araç Kodu</th>
                {/* Aksiyon */}
                <th className="py-3 px-3 text-center sticky right-0 bg-slate-100/90 shadow-xs z-10">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedRenewals.map((r) => {
                const days = calculateDaysLeft(r.startDate);
                const isOverdue = days !== null && days < 0;
                const isCritical = days !== null && days >= 0 && days <= 7;
                const isCancelled = r.status === 'cancelled';
                const parentPolicy = policyMap.get(r.policyId);

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isCancelled ? 'bg-rose-50/30 opacity-75' : isOverdue ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* 1. PLAKA */}
                    <td className="py-3 px-3">
                      {r.plate ? (
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {r.plate}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono">—</span>
                      )}
                    </td>

                    {/* 2. Branş */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {r.branch}
                      </span>
                    </td>

                    {/* 3. Sigorta Şirketi */}
                    <td className="py-3 px-3 font-semibold text-slate-800">{r.company}</td>

                    {/* 4. Sigortalı */}
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {parentPolicy && onViewPolicy ? (
                        <button
                          type="button"
                          onClick={() => onViewPolicy(parentPolicy)}
                          className="hover:text-blue-600 hover:underline cursor-pointer text-left"
                          title="Poliçe detayını görüntüle"
                        >
                          {r.insured}
                        </button>
                      ) : (
                        r.insured
                      )}
                    </td>

                    {/* 5. Poliçe No */}
                    <td className="py-3 px-3 font-mono font-medium text-slate-600">
                      {parentPolicy && onViewPolicy ? (
                        <button
                          type="button"
                          onClick={() => onViewPolicy(parentPolicy)}
                          className="hover:text-blue-600 hover:underline cursor-pointer"
                          title="Poliçe detayını görüntüle"
                        >
                          {r.policyNumber}
                        </button>
                      ) : (
                        r.policyNumber
                      )}
                    </td>

                    {/* 6. Başlama Tarihi */}
                    <td className="py-3 px-3 text-slate-600">{formatDateTr(r.startDate)}</td>

                    {/* 7. Bitiş Tarihi */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{formatDateTr(r.endDate)}</span>
                        {isCancelled ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                            İptal
                          </span>
                        ) : isOverdue ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                            {Math.abs(days!)}g Geçti
                          </span>
                        ) : isCritical ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            {days}g Kaldı
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                            {days !== null ? `${days}g` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 8. Brüt Prim TL */}
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {formatCurrency(r.premium)}
                    </td>

                    {/* 9. ARAÇ MARKA */}
                    <td className="py-3 px-3 font-medium text-slate-700">{r.vehicleBrand || '—'}</td>

                    {/* 10. ARAÇ MODEL */}
                    <td className="py-3 px-3 text-slate-600">{r.vehicleModel || '—'}</td>

                    {/* 11. Model Yılı */}
                    <td className="py-3 px-3 text-slate-600">{r.vehicleYear || '—'}</td>

                    {/* 12. Ruhsat No */}
                    <td className="py-3 px-3 font-mono text-slate-600">{r.licenseSerialNo || '—'}</td>

                    {/* 13. Motor No */}
                    <td className="py-3 px-3 font-mono text-slate-600">{r.engineNo || '—'}</td>

                    {/* 14. Şasi No */}
                    <td className="py-3 px-3 font-mono text-slate-600">{r.chassisNo || '—'}</td>

                    {/* 15. Araç Bedeli */}
                    <td className="py-3 px-3 text-right text-slate-700">
                      {r.vehicleValue ? formatCurrency(r.vehicleValue) : '—'}
                    </td>

                    {/* 16. Araç Kodu */}
                    <td className="py-3 px-3 font-mono text-slate-600">{r.vehicleCode || '—'}</td>

                    {/* Aksiyon */}
                    <td className="py-2.5 px-3 text-center sticky right-0 bg-white/95 backdrop-blur-xs shadow-xs z-10">
                      {isCancelled ? (
                        <span className="text-[11px] text-slate-400 italic">Poliçe İptal</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartRenewalQuote(r)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Bu poliçe ve araç bilgileriyle yeni yenileme teklifi oluştur"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Yenileme Teklifi Çalış</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedRenewals.length === 0 && (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <div className="font-semibold text-slate-700 text-sm">Yenileme kaydı bulunamadı</div>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || companyFilter || branchFilter || periodFilter !== 'all'
                        ? 'Seçtiğiniz arama veya filtre kriterlerine uygun yenileme kaydı bulunmuyor.'
                        : 'Portföyünüzde henüz kayıtlı poliçe bulunmuyor. Yeni bir poliçe eklendiğinde yenileme kaydı otomatik oluşur.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
