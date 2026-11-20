import React, { useState, useMemo } from 'react';
import { Quote, COMPANIES, BRANCHES, QUOTE_STAGES, QuoteStage, QuoteStatus, Policy, PolicyEndorsement } from '../types/insurance';
import {
  calculateDaysLeft,
  formatCurrency,
  formatDateTr,
  exportQuotesToCsv,
  getEffectiveQuoteStatus,
  getQuoteProgressPercent,
  getQuoteStatusMeta,
  generateId,
  normalizeQuoteStage,
} from '../services/storage';
import { generateQuotesPdfReport } from '../services/quotePdfService';
import { QuoteDetailModal } from './QuoteDetailModal';
import { QuoteReportModal } from './QuoteReportModal';
import {
  Search,
  Filter,
  Plus,
  FileText,
  FileDown,
  Download,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Clock,
  Phone,
  Car,
  Shield,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  Eye,
  Trash2,
  Upload,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface Props {
  quotes: Quote[];
  policies?: Policy[];
  endorsements?: PolicyEndorsement[];
  onOpenNewQuote: () => void;
  onEditQuote: (quote: Quote) => void;
  onOpenConcludeModal: (quote: Quote) => void;
  onConvertToPolicy: (quote: Quote) => void;
  onConcludeNegative: (quote: Quote) => void;
  onOpenProgressModal: (quote: Quote) => void;
  onUpdateQuote: (quote: Quote) => void;
  onDeleteQuote?: (id: string) => void;
  showToast?: (msg: string) => void;
  onOpenDoganiumImport?: () => void;
  pendingDoganiumBatch?: Quote[] | null;
  onOpenPendingDoganiumCrossSell?: () => void;
  onClearPendingDoganiumBatch?: () => void;
}

export const QuotesView: React.FC<Props> = ({
  quotes,
  policies = [],
  endorsements = [],
  onOpenNewQuote,
  onEditQuote,
  onOpenConcludeModal,
  onConvertToPolicy,
  onConcludeNegative,
  onOpenProgressModal,
  onUpdateQuote,
  onDeleteQuote,
  showToast,
  onOpenDoganiumImport,
  pendingDoganiumBatch,
  onOpenPendingDoganiumCrossSell,
  onClearPendingDoganiumBatch,
}) => {
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [statusTab, setStatusTab] = useState<'all' | 'beklemede' | 'kabul_edildi' | 'reddedildi'>('beklemede');
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterBusinessType, setFilterBusinessType] = useState('');

  // Detail Modal state
  const [selectedDetailQuote, setSelectedDetailQuote] = useState<Quote | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => {
      setCopiedField((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  // PDF Report Modal and Row selection state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());

  const handleExportSinglePdf = async (quote: Quote) => {
    try {
      if (showToast) showToast('PDF raporu oluşturuluyor, lütfen bekleyin...');
      const plateSafe = (quote.plate || 'Teklif').replace(/[^A-Za-z0-9]/g, '_');
      await generateQuotesPdfReport([quote], {
        policies,
        endorsements,
        filename: `Teklif_Raporu_${plateSafe}.pdf`,
        includeExecutiveSummary: false,
      });
      if (showToast) showToast('PDF raporu başarıyla indirildi.');
    } catch (err: any) {
      console.error('PDF hatası:', err);
      if (showToast) showToast('PDF oluşturulurken hata: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  // İş türü TAKİP olan kayıtlar normal Teklifler listesinde kesinlikle gösterilmez
  const regularQuotes = useMemo(() => {
    return quotes.filter(
      (q) => q.businessType !== 'Takip' && (q.businessType as any) !== 'TAKİP'
    );
  }, [quotes]);

  // Counts for status tabs
  const countBeklemede = useMemo(() => {
    return regularQuotes.filter((q) => getEffectiveQuoteStatus(q) === 'beklemede').length;
  }, [regularQuotes]);

  const countKabul = useMemo(() => {
    return regularQuotes.filter((q) => getEffectiveQuoteStatus(q) === 'kabul_edildi').length;
  }, [regularQuotes]);

  const countRed = useMemo(() => {
    return regularQuotes.filter((q) => getEffectiveQuoteStatus(q) === 'reddedildi').length;
  }, [regularQuotes]);

  // Filtered quotes based on status tab, search and filters (Takip kayıtları hariç)
  const filteredQuotes = useMemo(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();
    return regularQuotes
      .filter((item) => {
        const itemStatus = getEffectiveQuoteStatus(item);

        // Status tab filtering
        if (statusTab !== 'all' && itemStatus !== statusTab) {
          return false;
        }

        const matchesSearch =
          !q ||
          item.insured.toLocaleLowerCase('tr-TR').includes(q) ||
          (item.plate && item.plate.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.licenseSerialNo && item.licenseSerialNo.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.chassisNo && item.chassisNo.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.engineNo && item.engineNo.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.usageStyle && item.usageStyle.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.vehicleBrand && item.vehicleBrand.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.vehicleModel && item.vehicleModel.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.vehicleCode && item.vehicleCode.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.businessType && item.businessType.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.phone && item.phone.includes(q)) ||
          (item.email && item.email.toLocaleLowerCase('tr-TR').includes(q)) ||
          (item.quoteNumber && item.quoteNumber.toLocaleLowerCase('tr-TR').includes(q)) ||
          item.company.toLocaleLowerCase('tr-TR').includes(q) ||
          item.branch.toLocaleLowerCase('tr-TR').includes(q);

        const matchesCompany = !filterCompany || item.company === filterCompany;
        const matchesBranch = !filterBranch || item.branch === filterBranch;
        const matchesStage = !filterStage || normalizeQuoteStage(item.stage) === filterStage;
        const matchesBusinessType = !filterBusinessType || item.businessType === filterBusinessType;

        return matchesSearch && matchesCompany && matchesBranch && matchesStage && matchesBusinessType;
      })
      .sort((a, b) => {
        // Sort by validity date (urgent first)
        const daysA = calculateDaysLeft(a.validUntil) ?? 9999;
        const daysB = calculateDaysLeft(b.validUntil) ?? 9999;
        return daysA - daysB;
      });
  }, [regularQuotes, statusTab, search, filterCompany, filterBranch, filterStage, filterBusinessType]);

  // Summary Metrics (Yalnızca normal teklifler üzerinden hesaplanır)
  const activeQuotes = useMemo(() => {
    return regularQuotes.filter((q) => getEffectiveQuoteStatus(q) === 'beklemede');
  }, [regularQuotes]);

  const totalPotentialPremium = activeQuotes.reduce((acc, curr) => acc + (curr.premium || 0), 0);
  const urgentCount = activeQuotes.filter((q) => {
    const d = calculateDaysLeft(q.validUntil);
    return d !== null && d <= 3 && d >= 0;
  }).length;
  const waitingApprovalCount = activeQuotes.filter((q) => {
    const s = normalizeQuoteStage(q.stage);
    return s === 'MÜŞTERİDEN YANIT BEKLENİYOR' || s === 'İNDİRİM İSTENDİ';
  }).length;

  const handleQuickChangeStage = (quote: Quote, newStage: QuoteStage) => {
    if (quote.stage === newStage) return;
    const nowStr = new Date().toISOString();
    const updated: Quote = {
      ...quote,
      stage: newStage,
      progressLogs: [
        {
          id: generateId(),
          stage: newStage,
          status: getEffectiveQuoteStatus(quote),
          timestamp: nowStr,
          note: `Aşama hızlı seçimle "${newStage}" olarak değiştirildi.`,
        },
        ...(quote.progressLogs || []),
      ],
      updatedAt: nowStr,
    };
    onUpdateQuote(updated);
  };

  const getValidityBadge = (days: number | null) => {
    if (days === null) return <span className="text-xs text-slate-400">Tarih yok</span>;
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Süresi Dolmuş ({Math.abs(days)} gün)
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Son {days === 0 ? 'Bugün!' : `${days} gün`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        {days} gün kaldı
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Teklif Yönetimi</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {countBeklemede} Beklemede
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tekliflerin durumunu (Beklemede, Kabul Edildi, Reddedildi) ve müşteri dönüşümlerini takip edin.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => exportQuotesToCsv(filteredQuotes)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>CSV İndir</span>
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            title="Aktif teklifler için yönetici/patron PDF raporu oluştur"
            className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-rose-600" />
            <span>Teklif Raporu (PDF)</span>
          </button>

          {onOpenDoganiumImport && (
            <button
              onClick={onOpenDoganiumImport}
              title="Doğanium Excel teklif sorgulama dosyasını toplu aktar"
              className="px-3 py-2 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Excel'den Aktar (Doğanium)</span>
            </button>
          )}

          <button
            onClick={onOpenNewQuote}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Yeni Teklif Kaydı</span>
          </button>
        </div>
      </div>

      {/* Selected Quotes Batch Action Banner */}
      {selectedQuoteIds.size > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-rose-950">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-xs font-bold">
              <strong className="text-rose-700 font-extrabold">{selectedQuoteIds.size}</strong> teklif seçildi
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Seçilenleri PDF Raporla ({selectedQuoteIds.size} Araç)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedQuoteIds(new Set())}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Seçimi Temizle
            </button>
          </div>
        </div>
      )}

      {/* Pending Doganium Cross-Sell Banner */}
      {pendingDoganiumBatch && pendingDoganiumBatch.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                Tamamlanmamış Doğanium Çapraz Satış Kontrolü Bulunuyor ({pendingDoganiumBatch.length} Araç)
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                Aktarılan tekliflerin diğer branş (Trafik/Kasko) portföy durumunu kontrol ederek takip işlerini tamamlayabilirsiniz.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {onClearPendingDoganiumBatch && (
              <button
                type="button"
                onClick={onClearPendingDoganiumBatch}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Vazgeç / İptal Et
              </button>
            )}
            {onOpenPendingDoganiumCrossSell && (
              <button
                type="button"
                onClick={onOpenPendingDoganiumCrossSell}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Şimdi Tamamla
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Beklemede / Süreçte</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{countBeklemede}</div>
          <div className="text-xs text-slate-500 mt-0.5">Karar ve takip sürecinde</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Kabul Edildi (Poliçeleşen)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{countKabul}</div>
          <div className="text-xs text-slate-500 mt-0.5">Başarıyla sonuçlanan teklifler</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Reddedildi / Yapılmadı</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">{countRed}</div>
          <div className="text-xs text-slate-500 mt-0.5">Olumsuz veya iptal teklifler</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Potansiyel Prim</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">{formatCurrency(totalPotentialPremium)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Bekleyen teklif hacmi</div>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            onClick={() => setStatusTab('beklemede')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              statusTab === 'beklemede'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>⏳ Beklemede ({countBeklemede})</span>
          </button>

          <button
            onClick={() => setStatusTab('kabul_edildi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              statusTab === 'kabul_edildi'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>✅ Kabul Edildi ({countKabul})</span>
          </button>

          <button
            onClick={() => setStatusTab('reddedildi')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              statusTab === 'reddedildi'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>❌ Reddedildi ({countRed})</span>
          </button>

          <button
            onClick={() => {
              setStatusTab('all');
              setFilterBusinessType('');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusTab === 'all' && !filterBusinessType
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tüm Teklifler ({regularQuotes.length})
          </button>
        </div>

        {/* Search & Select dropdowns */}
        <div className="flex flex-col md:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sigortalı adı, plaka, şasi no, motor no, ruhsat no veya teklif no ara..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
            <select
              value={filterBusinessType}
              onChange={(e) => setFilterBusinessType(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
            >
              <option value="">Tüm İş Türleri</option>
              <option value="Yeni İş">Yeni İş</option>
              <option value="Yenileme">Yenileme</option>
            </select>

            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
            >
              <option value="">Tüm Şirketler</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
            >
              <option value="">Tüm Branşlar</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
            >
              <option value="">Tüm Aşamalar</option>
              {QUOTE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {(search || filterCompany || filterBranch || filterStage || filterBusinessType || statusTab !== 'beklemede') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterCompany('');
                  setFilterBranch('');
                  setFilterStage('');
                  setFilterBusinessType('');
                  setStatusTab('beklemede');
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Sıfırla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quotes Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-3 text-center sticky left-0 bg-slate-50 z-20 shadow-xs w-32">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="checkbox"
                        title="Tümünü seç / kaldır"
                        checked={filteredQuotes.length > 0 && filteredQuotes.every((q) => selectedQuoteIds.has(q.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuoteIds((prev) => {
                              const next = new Set(prev);
                              filteredQuotes.forEach((q) => next.add(q.id));
                              return next;
                            });
                          } else {
                            setSelectedQuoteIds((prev) => {
                              const next = new Set(prev);
                              filteredQuotes.forEach((q) => next.delete(q.id));
                              return next;
                            });
                          }
                        }}
                        className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>İşlem</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4">1. Sigortalı</th>
                  <th className="py-3.5 px-4">2. İş Türü</th>
                  <th className="py-3.5 px-4">3. Branş</th>
                  <th className="py-3.5 px-4">4. Plaka</th>
                  <th className="py-3.5 px-4">5. Ruhsat Seri No</th>
                  <th className="py-3.5 px-4">6. Şasi No</th>
                  <th className="py-3.5 px-4">7. Motor No</th>
                  <th className="py-3.5 px-4">8. Kullanım Tarzı</th>
                  <th className="py-3.5 px-4 text-center">9. Model Yılı</th>
                  <th className="py-3.5 px-4">10. Araç Marka</th>
                  <th className="py-3.5 px-4">11. Araç Model</th>
                  <th className="py-3.5 px-4">12. Araç Kodu</th>
                  <th className="py-3.5 px-4">13. Yakıt Türü</th>
                  <th className="py-3.5 px-4 text-right">14. Araç Bedeli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.length > 0 ? (
                  filteredQuotes.map((quote) => {
                    const status = getEffectiveQuoteStatus(quote);
                    const bType = quote.businessType || 'Yenileme';

                    return (
                      <tr
                        key={quote.id}
                        onClick={() => {
                          setSelectedDetailQuote(quote);
                          setIsDetailModalOpen(true);
                        }}
                        className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                        title="Teklif detayını ve 6 şirket karşılaştırmasını açmak için tıklayın"
                      >
                        {/* İşlem Sütunu: Tablonun en başında, seçim kutusu ve ikonlar */}
                        <td
                          className="py-3 px-3 text-center sticky left-0 bg-white group-hover:bg-blue-50/40 transition-colors z-20 shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {/* Seçim Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedQuoteIds.has(quote.id)}
                              onChange={() => {
                                setSelectedQuoteIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(quote.id)) next.delete(quote.id);
                                  else next.add(quote.id);
                                  return next;
                                });
                              }}
                              className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer mr-0.5"
                            />

                            {/* 1. Detay İkonu */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDetailQuote(quote);
                                setIsDetailModalOpen(true);
                              }}
                              title="Teklif Detayları ve Şirket Karşılaştırması"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* 2. PDF Raporu İkonu */}
                            <button
                              type="button"
                              onClick={() => handleExportSinglePdf(quote)}
                              title="Bu Teklif İçin PDF Raporu Oluştur (Tek Araç)"
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>

                            {/* 3. Sonuçlandır İkonu */}
                            {status === 'beklemede' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenConcludeModal) {
                                    onOpenConcludeModal(quote);
                                  } else {
                                    onConvertToPolicy(quote);
                                  }
                                }}
                                title="Teklifi Sonuçlandır / Poliçeleştir"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* 4. Sil İkonu */}
                            {onDeleteQuote && (
                              <button
                                type="button"
                                onClick={() => setQuoteToDelete(quote)}
                                title="Teklif Kaydını Sil"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 1. Sigortalı */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {quote.insured}
                          </div>
                        </td>

                        {/* 2. İş Türü */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              bType === 'Yeni İş'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : bType === 'Takip'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {bType}
                          </span>
                        </td>

                        {/* 3. Branş */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {quote.branch || 'Kasko'}
                          </span>
                        </td>

                        {/* 4. Plaka */}
                        <td className="py-3.5 px-4">
                          {quote.plate ? (
                            <span className="inline-block px-2.5 py-1 font-mono font-bold text-xs bg-slate-100 border border-slate-300 rounded text-slate-900 tracking-wider shadow-2xs">
                              {quote.plate}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* 5. Ruhsat Seri No */}
                        <td className="py-3.5 px-4">
                          {quote.licenseSerialNo ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-semibold text-slate-700">
                                {quote.licenseSerialNo}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(quote.licenseSerialNo!, `ruhsat-${quote.id}`, e)}
                                title="Ruhsat seri numarasını kopyala"
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                              >
                                {copiedField === `ruhsat-${quote.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 6. Şasi No (Formatted monospace, truncated with copy) */}
                        <td className="py-3.5 px-4">
                          {quote.chassisNo ? (
                            <div className="flex items-center gap-1.5" title={`Şasi No: ${quote.chassisNo}`}>
                              <span className="font-mono font-semibold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                                {quote.chassisNo.length > 12
                                  ? `${quote.chassisNo.slice(0, 6)}...${quote.chassisNo.slice(-4)}`
                                  : quote.chassisNo}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(quote.chassisNo!, `sasi-${quote.id}`, e)}
                                title="Tam şasi numarasını kopyala"
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                              >
                                {copiedField === `sasi-${quote.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* 7. Motor No */}
                        <td className="py-3.5 px-4">
                          {quote.engineNo ? (
                            <div className="flex items-center gap-1.5" title={`Motor No: ${quote.engineNo}`}>
                              <span className="font-mono font-semibold text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                                {quote.engineNo}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(quote.engineNo!, `motor-${quote.id}`, e)}
                                title="Motor numarasını kopyala"
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                              >
                                {copiedField === `motor-${quote.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* 8. Kullanım Tarzı */}
                        <td className="py-3.5 px-4">
                          <span className="text-slate-800 font-semibold">
                            {quote.usageStyle || '—'}
                          </span>
                        </td>

                        {/* 9. Model Yılı */}
                        <td className="py-3.5 px-4 text-center">
                          {quote.vehicleYear ? (
                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {quote.vehicleYear}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 10. Araç Marka */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">
                            {quote.vehicleBrand || '—'}
                          </span>
                        </td>

                        {/* 11. Araç Model */}
                        <td className="py-3.5 px-4">
                          <span className="text-slate-700 font-semibold max-w-[160px] truncate block" title={quote.vehicleModel}>
                            {quote.vehicleModel || '—'}
                          </span>
                        </td>

                        {/* 12. Araç Kodu */}
                        <td className="py-3.5 px-4">
                          {quote.vehicleCode ? (
                            <span className="font-mono text-xs text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                              {quote.vehicleCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* 13. Yakıt Türü */}
                        <td className="py-3.5 px-4">
                          {quote.fuelType ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {quote.fuelType}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 14. Araç Bedeli */}
                        <td className="py-3.5 px-4 text-right">
                          {quote.vehicleValue && quote.vehicleValue > 0 ? (
                            <div className="font-black text-slate-900 text-xs">
                              {formatCurrency(quote.vehicleValue)}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="py-12 text-center">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <div className="text-sm font-bold text-slate-700">Seçilen kriterlere uygun teklif bulunamadı</div>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Arama veya filtre kriterlerinizi değiştirebilir ya da yeni teklif oluşturabilirsiniz.
                      </p>
                      <button
                        onClick={onOpenNewQuote}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Yeni Teklif Oluştur</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Quote Detail & 6-Company Comparison Modal */}
      <QuoteDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailQuote(null);
        }}
        quote={selectedDetailQuote}
        onSave={(updatedQuote) => {
          onUpdateQuote(updatedQuote);
          setSelectedDetailQuote(updatedQuote);
        }}
        onConvertToPolicy={onConvertToPolicy}
        showToast={showToast || ((msg) => console.log(msg))}
        policies={policies}
        endorsements={endorsements}
      />

      {/* Bulk / Active Quotes PDF Report Modal */}
      <QuoteReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        quotes={quotes}
        policies={policies}
        endorsements={endorsements}
        showToast={showToast}
        preSelectedQuoteIds={Array.from(selectedQuoteIds)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(quoteToDelete)}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={() => {
          if (quoteToDelete && onDeleteQuote) {
            onDeleteQuote(quoteToDelete.id);
            setQuoteToDelete(null);
          }
        }}
        title="Teklif Silme Onayı"
        recordType="Teklif"
        recordDetails={
          quoteToDelete
            ? [
                { label: 'Müşteri', value: quoteToDelete.insured },
                { label: 'Teklif No', value: quoteToDelete.quoteNumber || '—' },
                { label: 'Branş', value: quoteToDelete.branch },
                { label: 'Plaka', value: quoteToDelete.plate || '—' },
              ]
            : []
        }
      />
    </div>
  );
};
