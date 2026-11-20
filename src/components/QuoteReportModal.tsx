import React, { useState, useMemo } from 'react';
import { Quote, Policy, PolicyEndorsement } from '../types/insurance';
import { generateQuotesPdfReport } from '../services/quotePdfService';
import { formatCurrency, formatDateTr } from '../services/storage';
import {
  X,
  FileDown,
  CheckSquare,
  Square,
  Shield,
  Car,
  Filter,
  Search,
  CheckCircle2,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotes: Quote[];
  policies: Policy[];
  endorsements: PolicyEndorsement[];
  showToast?: (msg: string) => void;
  preSelectedQuoteIds?: string[];
}

export const QuoteReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quotes,
  policies,
  endorsements,
  showToast,
  preSelectedQuoteIds,
}) => {
  // Only deal with regular quotes (exclude Takip internal items)
  const regularQuotes = useMemo(() => {
    return quotes.filter(
      (q) => q.businessType !== 'Takip' && (q.businessType as any) !== 'TAKİP'
    );
  }, [quotes]);

  // Filtering states
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<'all' | 'Kasko' | 'Trafik'>('all');
  const [filterBusinessType, setFilterBusinessType] = useState<'all' | 'Yenileme' | 'Yeni İş'>('all');
  const [onlyActive, setOnlyActive] = useState(true);

  // Selected quotes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (preSelectedQuoteIds && preSelectedQuoteIds.length > 0) {
      return new Set(preSelectedQuoteIds);
    }
    // Default: select all active quotes
    const activeIds = regularQuotes
      .filter((q) => q.status !== 'concluded')
      .map((q) => q.id);
    return new Set(activeIds);
  });

  // Report configuration options
  const [agencyTitle, setAgencyTitle] = useState('DOĞAN SİGORTA ARACILIK HİZMETLERİ');
  const [reportTitle, setReportTitle] = useState('AKTİF TEKLİFLER VE YENİLEME DEĞERLENDİRME RAPORU');
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Synchronize when preSelectedQuoteIds changes
  React.useEffect(() => {
    if (preSelectedQuoteIds && preSelectedQuoteIds.length > 0) {
      setSelectedIds(new Set(preSelectedQuoteIds));
    }
  }, [preSelectedQuoteIds]);

  // Filtered quotes pool
  const filteredQuotes = useMemo(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();
    return regularQuotes.filter((item) => {
      if (onlyActive && item.status === 'concluded') return false;
      if (filterBranch !== 'all' && item.branch !== filterBranch) return false;
      if (filterBusinessType !== 'all' && (item.businessType || 'Yenileme') !== filterBusinessType) return false;

      if (q) {
        const matchesPlate = (item.plate || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchesInsured = (item.insured || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchesBrand = (item.vehicleBrand || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchesModel = (item.vehicleModel || '').toLocaleLowerCase('tr-TR').includes(q);
        if (!matchesPlate && !matchesInsured && !matchesBrand && !matchesModel) {
          return false;
        }
      }

      return true;
    });
  }, [regularQuotes, onlyActive, filterBranch, filterBusinessType, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredQuotes.forEach((q) => next.add(q.id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSelectByBranch = (branch: 'Kasko' | 'Trafik') => {
    setSelectedIds(new Set(regularQuotes.filter((q) => q.branch === branch && q.status !== 'concluded').map((q) => q.id)));
  };

  const handleSelectRenewals = () => {
    setSelectedIds(new Set(regularQuotes.filter((q) => (q.businessType || 'Yenileme') === 'Yenileme' && q.status !== 'concluded').map((q) => q.id)));
  };

  const selectedQuotesList = useMemo(() => {
    return regularQuotes.filter((q) => selectedIds.has(q.id));
  }, [regularQuotes, selectedIds]);

  const handleGeneratePdf = async () => {
    if (selectedQuotesList.length === 0) {
      if (showToast) showToast('Lütfen rapora dahil edilecek en az bir teklif seçin.');
      return;
    }

    try {
      setIsGenerating(true);
      if (showToast) showToast('PDF raporu oluşturuluyor, lütfen bekleyin...');

      const singlePlate = selectedQuotesList.length === 1 ? selectedQuotesList[0].plate : undefined;
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = singlePlate
        ? `Teklif_Raporu_${singlePlate.replace(/[^A-Za-z0-9]/g, '_')}.pdf`
        : `Aktif_Teklifler_Raporu_${todayStr}.pdf`;

      await generateQuotesPdfReport(selectedQuotesList, {
        policies,
        endorsements,
        agencyTitle: agencyTitle.trim() || 'DOĞAN SİGORTA ARACILIK HİZMETLERİ',
        reportTitle: reportTitle.trim() || 'AKTİF TEKLİFLER VE YENİLEME DEĞERLENDİRME RAPORU',
        filename,
        includeExecutiveSummary: selectedQuotesList.length > 1 ? includeExecutiveSummary : false,
      });

      if (showToast) showToast('PDF raporu başarıyla indirildi.');
      onClose();
    } catch (err: any) {
      console.error('PDF oluşturma hatası:', err);
      if (showToast) showToast('PDF oluşturulurken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center font-bold">
              <FileDown className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Aktif Teklifler PDF Raporu
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  Yönetici İnceleme
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Patron veya yönetici ile paylaşılmak üzere 6 sigorta şirketi ve yenileme karşılaştırmalı A4 PDF çıktısı
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Selection & Filters Bar */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Plaka, müşteri veya araç ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                />
              </div>

              {/* Branch Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value as any)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 outline-none"
                >
                  <option value="all">Tüm Branşlar</option>
                  <option value="Kasko">Yalnızca Kasko</option>
                  <option value="Trafik">Yalnızca Trafik</option>
                </select>

                <select
                  value={filterBusinessType}
                  onChange={(e) => setFilterBusinessType(e.target.value as any)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 outline-none"
                >
                  <option value="all">Tüm İş Türleri</option>
                  <option value="Yenileme">Yenileme</option>
                  <option value="Yeni İş">Yeni İş</option>
                </select>

                <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyActive}
                    onChange={(e) => setOnlyActive(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Sadece Aktifler</span>
                </label>
              </div>
            </div>

            {/* Quick selection chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Hızlı Seçim:</span>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Listelenenleri Seç ({filteredQuotes.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  Seçimi Temizle
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectByBranch('Kasko')}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  Kaskolar
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectByBranch('Trafik')}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  Trafikler
                </button>
                <button
                  type="button"
                  onClick={handleSelectRenewals}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                >
                  Yenilemeler
                </button>
              </div>

              <div className="text-xs font-bold text-slate-700">
                Seçilen:{' '}
                <span className="text-rose-600 font-extrabold text-sm">
                  {selectedQuotesList.length}
                </span>{' '}
                / {regularQuotes.length} Teklif
              </div>
            </div>
          </div>

          {/* Quotes List Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredQuotes.length > 0 &&
                          filteredQuotes.every((q) => selectedIds.has(q.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectAllFiltered();
                          } else {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              filteredQuotes.forEach((q) => next.delete(q.id));
                              return next;
                            });
                          }
                        }}
                        className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Plaka</th>
                    <th className="py-2.5 px-3">Müşteri / Sigortalı</th>
                    <th className="py-2.5 px-3">Branş</th>
                    <th className="py-2.5 px-3">İş Türü</th>
                    <th className="py-2.5 px-3">Araç</th>
                    <th className="py-2.5 px-3 text-right">Teklif Sayısı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.length > 0 ? (
                    filteredQuotes.map((quote) => {
                      const isSelected = selectedIds.has(quote.id);
                      const offersCount = (quote.companyOffers || []).filter(
                        (o) => typeof o.premium === 'number' && o.premium > 0
                      ).length;

                      return (
                        <tr
                          key={quote.id}
                          onClick={() => toggleSelect(quote.id)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(quote.id)}
                              className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {quote.plate || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {quote.insured}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                quote.branch === 'Kasko'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {quote.branch}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-semibold text-slate-600">
                              {quote.businessType || 'Yenileme'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {quote.vehicleBrand || '—'} {quote.vehicleModel || ''}{' '}
                            {quote.vehicleYear ? `(${quote.vehicleYear})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {offersCount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {offersCount} Şirket Teklifi
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Beklemede</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Arama kriterlerine uygun teklif bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report Customization Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>Rapor Başlık & Sayfa Ayarları</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Acente Adı / Başlığı
                </label>
                <input
                  type="text"
                  value={agencyTitle}
                  onChange={(e) => setAgencyTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Rapor Ana Başlığı
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 outline-none"
                />
              </div>
            </div>

            {selectedQuotesList.length > 1 && (
              <label className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeExecutiveSummary}
                  onChange={(e) => setIncludeExecutiveSummary(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>
                  Yönetici Özet Sayfası Ekle (Sayfa 1'de genel filo ve teklif metrikleri tablosu yer alır)
                </span>
              </label>
            )}

            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Rapor Format Standartları:</strong> Her araç bağımsız A4 sayfasında yer alır. Allianz, Axa, Doğa, Hepiyi, Ray ve HDI teklifleri karşılaştırmalı sunulur; en uygun teklif yeşil vurgulanır. Yenileme işlerinde geçen yılın orijinal poliçe primi ile değişim yüzdesi hesaplanır. Müşterinin T.C./VKN ve doğum tarihi gibi hassas bilgileri gizlilik gereği rapora dahil edilmez.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {selectedQuotesList.length > 0 ? (
              <span>
                <strong>{selectedQuotesList.length}</strong> araç için{' '}
                <strong>
                  {selectedQuotesList.length +
                    (selectedQuotesList.length > 1 && includeExecutiveSummary ? 1 : 0)}
                </strong>{' '}
                sayfalık PDF oluşturulacak
              </span>
            ) : (
              <span className="text-rose-600 font-semibold">Lütfen en az bir teklif seçin</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isGenerating || selectedQuotesList.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'PDF Oluşturuluyor...'
                  : `Seçilen Teklifleri PDF İndir (${selectedQuotesList.length} Araç)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
