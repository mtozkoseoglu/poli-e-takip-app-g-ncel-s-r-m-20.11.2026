import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Quote, CompanyOffer, COMPANIES } from '../types/insurance';
import {
  DoganiumParsedVehicle,
  DoganiumParsedOffer,
  parseDoganiumWorkbook,
  detectBranchFromFileName,
} from '../services/doganiumParser';
import {
  formatCurrency,
  formatDateTr,
  generateId,
  getTodayIso,
  normalizeQuoteStage,
} from '../services/storage';
import { downloadDoganiumTemplateFile } from '../services/doganiumTemplateService';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Calendar,
  Car,
  X,
  Check,
  Info,
  ArrowRight,
  Filter,
  FileText,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingQuotes: Quote[];
  onConfirmImport: (createdQuotes: Quote[]) => void;
  showToast?: (msg: string) => void;
}

export const DoganiumImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  existingQuotes,
  onConfirmImport,
  showToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<'Kasko' | 'Trafik' | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed vehicles state
  const [vehicles, setVehicles] = useState<DoganiumParsedVehicle[]>([]);
  const [detectedBranch, setDetectedBranch] = useState<'Kasko' | 'Trafik'>('Kasko');
  const [sheetName, setSheetName] = useState<string>('');
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  // Filter and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing_no' | 'has_duplicate' | 'errors'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // KPIs & filtered view - declared unconditionally at top level
  const totalVehicles = vehicles.length;
  const duplicateQuotesCount = useMemo(() => {
    return vehicles.filter((v) => v.hasExistingQuote).length;
  }, [vehicles]);

  const missingQuoteNumbersCount = useMemo(() => {
    return vehicles.filter((v) =>
      v.offers.some((o) => o.status === 'TEKLİF ALINDI' && (!o.quoteNumber || !o.quoteNumber.trim()))
    ).length;
  }, [vehicles]);

  const completeVehiclesCount = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.offers.some((o) => o.status === 'TEKLİF ALINDI') &&
        !v.offers.some((o) => o.status === 'TEKLİF ALINDI' && (!o.quoteNumber || !o.quoteNumber.trim()))
    ).length;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.toLocaleLowerCase('tr-TR').trim();
    return vehicles.filter((v) => {
      if (filterMode === 'missing_no') {
        const hasMissing = v.offers.some(
          (o) => o.status === 'TEKLİF ALINDI' && (!o.quoteNumber || !o.quoteNumber.trim())
        );
        if (!hasMissing) return false;
      } else if (filterMode === 'has_duplicate') {
        if (!v.hasExistingQuote) return false;
      } else if (filterMode === 'errors') {
        if (v.errors.length === 0) return false;
      }

      if (!q) return true;
      const matchPlate = v.plate.toLocaleLowerCase('tr-TR').includes(q);
      const matchInsured = v.insured.toLocaleLowerCase('tr-TR').includes(q);
      const matchBrand = v.vehicleBrand.toLocaleLowerCase('tr-TR').includes(q);
      const matchModel = v.vehicleModel.toLocaleLowerCase('tr-TR').includes(q);
      return matchPlate || matchInsured || matchBrand || matchModel;
    });
  }, [vehicles, searchTerm, filterMode]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    await processFile(dropped);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const autoBranch = detectBranchFromFileName(selectedFile.name);
      const branchToUse = selectedBranch || autoBranch || 'Kasko';

      const result = parseDoganiumWorkbook(
        workbook,
        selectedFile.name,
        branchToUse,
        existingQuotes
      );

      setVehicles(result.vehicles);
      setDetectedBranch(result.detectedBranch || branchToUse);
      setSheetName(result.sheetName);

      if (result.vehicles.length === 0) {
        setParseError('Excel dosyasında aktarılacak geçerli araç veya teklif satırı bulunamadı.');
      }
    } catch (err: any) {
      console.error('Doğanium parse error:', err);
      setParseError(err.message || 'Excel dosyası okunurken beklenmeyen bir hata oluştu.');
      setVehicles([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleBranchChange = (newBranch: 'Kasko' | 'Trafik') => {
    setSelectedBranch(newBranch);
    setDetectedBranch(newBranch);
    setVehicles((prev) =>
      prev.map((v) => ({
        ...v,
        branch: newBranch,
      }))
    );
  };

  // In-place editing of vehicle fields
  const handleUpdateVehicleOffer = (
    tempId: string,
    company: string,
    updates: Partial<DoganiumParsedOffer>
  ) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.tempId !== tempId) return v;
        const updatedOffers = v.offers.map((o) => {
          if (o.company !== company) return o;
          const merged = { ...o, ...updates };
          if (updates.premium !== undefined) {
            merged.status = updates.premium && updates.premium > 0 ? 'TEKLİF ALINDI' : 'TEKLİF ALINAMADI';
            merged.noOffer = !updates.premium || updates.premium <= 0;
          }
          return merged;
        });

        // Re-evaluate active offers missing quote numbers
        const activeOffersWithoutNo = updatedOffers.filter(
          (o) => o.status === 'TEKLİF ALINDI' && (!o.quoteNumber || !o.quoteNumber.trim())
        );
        const filteredWarnings = v.warnings.filter((w) => !w.includes('teklif numarası metinden ayrılamadı'));
        if (activeOffersWithoutNo.length > 0) {
          filteredWarnings.push(
            `${activeOffersWithoutNo.map((o) => o.company).join(', ')} için teklif numarası eksik.`
          );
        }

        return {
          ...v,
          offers: updatedOffers,
          warnings: filteredWarnings,
        };
      })
    );
  };

  const handleUpdateVehicleField = (
    tempId: string,
    field: keyof DoganiumParsedVehicle,
    value: any
  ) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.tempId !== tempId) return v;
        return {
          ...v,
          [field]: value,
        };
      })
    );
  };

  const handleRemoveVehicle = (tempId: string) => {
    setVehicles((prev) => prev.filter((v) => v.tempId !== tempId));
  };

  // Convert parsed vehicles to actual Quote records
  const handleProceedToImport = () => {
    if (vehicles.length === 0) return;

    const now = new Date().toISOString();
    const createdQuotes: Quote[] = [];

    for (const v of vehicles) {
      // Find company offers
      const companyOffers: CompanyOffer[] = v.offers.map((o) => ({
        company: o.company,
        premium: o.premium && o.premium > 0 ? o.premium : 0,
        quoteNumber: o.quoteNumber ? o.quoteNumber.trim() : undefined,
        status: o.status,
        noOffer: o.status === 'TEKLİF ALINAMADI',
        notes: o.extraDescription || undefined,
      }));

      // Find best (lowest) valid positive offer
      const validPositiveOffers = companyOffers.filter(
        (o) => o.status === 'TEKLİF ALINDI' && (o.premium || 0) > 0
      );
      validPositiveOffers.sort((a, b) => (a.premium || 0) - (b.premium || 0));
      const bestOffer = validPositiveOffers[0];

      // Quote number format: if best offer has quoteNumber use it, else generate one
      const finalQuoteNumber =
        bestOffer?.quoteNumber ||
        `DOG-${v.plate.replace(/\s+/g, '') || Math.floor(100000 + Math.random() * 900000)}`;

      // Construct Quote
      const newQuote: Quote = {
        id: generateId(),
        type: 'quote',
        quoteNumber: finalQuoteNumber,
        insured: v.insured,
        phone: '',
        plate: v.plate,
        licenseSerialNo: v.licenseSerialNo || undefined,
        chassisNo: v.chassisNo || undefined,
        engineNo: v.engineNo || undefined,
        usageStyle: v.usageStyle || undefined,
        vehicleBrand: v.vehicleBrand || undefined,
        vehicleModel: v.vehicleModel || undefined,
        vehicleYear: v.vehicleYear ? Number(v.vehicleYear) || undefined : undefined,
        vehicleCode: v.vehicleCode || undefined,
        vehicleValue: v.vehicleValue || undefined,
        fuelType: v.fuelType || undefined,
        branch: v.branch,
        company: bestOffer ? bestOffer.company : 'DOĞA SİGORTA',
        premium: bestOffer ? bestOffer.premium || 0 : 0,
        businessType: v.businessType,
        isPriority: v.isPriority,
        startDate: v.startDate || undefined,
        endDate: v.endDate || undefined,
        previousStartDate: v.previousStartDate || undefined,
        previousEndDate: v.previousEndDate || undefined,
        issueDate: v.issueDate || getTodayIso(),
        quoteDate: v.issueDate || getTodayIso(),
        validUntil: v.endDate || v.startDate || getTodayIso(),
        stage: 'MÜŞTERİYE SUNULACAK',
        status: 'active',
        trafficStatus: 'TRAFİK BİZDE',
        kaskoStatus: 'KASKO BİZDE',
        companyOffers: companyOffers.length > 0 ? companyOffers : undefined,
        notes: undefined,
        progressLogs: [
          {
            id: generateId(),
            stage: 'MÜŞTERİYE SUNULACAK',
            status: 'beklemede',
            timestamp: now,
            note: `Doğanium Excel dosyasından toplu aktarıldı (${v.offers.filter((o) => o.status === 'TEKLİF ALINDI').length} şirket teklifi).`,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      createdQuotes.push(newQuote);
    }

    onConfirmImport(createdQuotes);
  };

  const handleReset = () => {
    setFile(null);
    setVehicles([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Doğanium Excel Teklif Aktarımı</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-white/20">
                  {detectedBranch} Branşı
                </span>
              </h2>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Doğanium Excel teklif listesini aktarın, şirket tekliflerini ve teklif numaralarını kontrol edin.
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

        {/* Step 1: File Upload (if no vehicles loaded) */}
        {vehicles.length === 0 ? (
          <div className="p-8 overflow-y-auto space-y-6">
            {/* Branch selector if user wants to specify manually */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-700">Aktarılacak Branş</div>
                <div className="text-xs text-slate-500">
                  Otomatik olarak dosya adından tespit edilir ("Kasko" / "Trafik"). Gerekirse manuel seçebilirsiniz.
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => handleBranchChange('Kasko')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    detectedBranch === 'Kasko'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kasko
                </button>
                <button
                  type="button"
                  onClick={() => handleBranchChange('Trafik')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    detectedBranch === 'Trafik'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Trafik
                </button>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/70 rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">
                  Doğanium Excel Dosyasını Buraya Sürükleyin
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  veya dosya seçmek için <span className="text-indigo-600 font-semibold underline">tıklayın</span> (.xlsx, .xls)
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 mt-2">
                <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                  Otomatik Şirket Teklif Ayrıştırma (Doğa, Axa, Hepiyi, Allianz, HDI, Ray)
                </span>
                <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                  Teklif No & Prim Denetimi
                </span>
                <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                  Çapraz Satış Entegrasyonu
                </span>
              </div>

              <div className="pt-2 border-t border-indigo-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadDoganiumTemplateFile('Doganium_Aktarim_Sablonu.xlsx');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Doğanium Aktarım Şablonunu İndir (.xlsx)</span>
                </button>
              </div>
            </div>

            {isParsing && (
              <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Excel verileri okunuyor ve şirket teklifleri ayrıştırılıyor...</span>
              </div>
            )}

            {parseError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Aktarım Başarısız Oldu</div>
                  <div className="mt-0.5">{parseError}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Interactive Preview & In-Place Edit */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* KPI Cards & File summary */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Dosya: <span className="font-semibold text-indigo-700">{file?.name}</span>
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">
                    Sayfa: <span className="font-medium text-slate-700">{sheetName}</span>
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-rose-600 hover:text-rose-700 underline font-semibold ml-2 cursor-pointer"
                  >
                    Farklı Dosya Seç
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Branş:</span>
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => handleBranchChange('Kasko')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        detectedBranch === 'Kasko'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Kasko
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBranchChange('Trafik')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        detectedBranch === 'Trafik'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Trafik
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Toplam Araç</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{totalVehicles}</div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Teklif No Tam</span>
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {completeVehiclesCount}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Teklif No Eksik</span>
                  </div>
                  <div className="text-xl font-black text-amber-700 mt-0.5">
                    {missingQuoteNumbersCount}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Aktif Çift Plaka</span>
                  </div>
                  <div className="text-xl font-black text-rose-700 mt-0.5">
                    {duplicateQuotesCount}
                  </div>
                </div>
              </div>

              {/* Duplicate Plate Warning Banner if any */}
              {duplicateQuotesCount > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Dikkat:</strong> {duplicateQuotesCount} araç için sistemde halihazırda aktif teklif bulunmaktadır. Bu teklifler için aktarım yapıldığında yeni teklifler oluşturulacak ve eskisinin yerine geçecektir.
                  </span>
                </div>
              )}

              {/* Missing Quote No Warning Banner if any */}
              {missingQuoteNumbersCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {missingQuoteNumbersCount} araçta teklif numarası boş veya metinden ayrıştırılamadı. Doğrudan tablodan veya detay kartından manuel teklif no girebilirsiniz.
                    </span>
                  </div>
                  <button
                    onClick={() => setFilterMode(filterMode === 'missing_no' ? 'all' : 'missing_no')}
                    className="text-amber-900 font-bold underline shrink-0 cursor-pointer text-xs"
                  >
                    {filterMode === 'missing_no' ? 'Filtreyi Temizle' : 'Yalnızca Eksikleri Göster'}
                  </button>
                </div>
              )}

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Plaka, sigortalı, marka/model ara..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Tümü ({vehicles.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('missing_no')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      filterMode === 'missing_no'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    Teklif No Eksik ({missingQuoteNumbersCount})
                  </button>
                  <button
                    onClick={() => setFilterMode('has_duplicate')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      filterMode === 'has_duplicate'
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
                    }`}
                  >
                    Mevcut Teklifli ({duplicateQuotesCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Table of Vehicles */}
            <div className="flex-1 overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Arama kriterlerine uygun araç bulunamadı.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredVehicles.map((v) => {
                    const isExpanded = expandedVehicleId === v.tempId;
                    const positiveOffers = v.offers.filter((o) => o.status === 'TEKLİF ALINDI');
                    const hasMissingQuoteNo = positiveOffers.some((o) => !o.quoteNumber || !o.quoteNumber.trim());

                    return (
                      <div
                        key={v.tempId}
                        className={`transition-colors ${
                          v.hasExistingQuote ? 'bg-rose-50/20' : hasMissingQuoteNo ? 'bg-amber-50/20' : 'bg-white'
                        } hover:bg-slate-50/80`}
                      >
                        {/* Summary Row */}
                        <div
                          onClick={() => setExpandedVehicleId(isExpanded ? null : v.tempId)}
                          className="px-6 py-3.5 flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>

                            {/* Plate */}
                            <div className="shrink-0">
                              <span className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-900 text-white rounded-lg tracking-wider shadow-2xs">
                                {v.plate || 'PLAKA YOK'}
                              </span>
                            </div>

                            {/* Insured & Vehicle */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {v.insured || 'İsimsiz Müşteri'}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    v.businessType === 'Yenileme'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {v.businessType}
                                </span>
                                {v.isPriority && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    Öncelikli
                                  </span>
                                )}
                                {v.hasExistingQuote && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                    Mevcut Teklif: {v.existingQuoteNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                                <span>{v.vehicleYear || ''}</span>
                                <span>{v.vehicleBrand}</span>
                                <span>{v.vehicleModel}</span>
                                {v.vehicleCode && (
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    (Kod: {v.vehicleCode})
                                  </span>
                                )}
                                {v.startDate && v.endDate && (
                                  <span className="text-slate-500 text-[10px] ml-1 bg-slate-100 px-1.5 py-0.2 rounded">
                                    Dönem: {v.startDate} – {v.endDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Offers Chips & Best Price */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Positive Offers Count badge */}
                            <div className="flex items-center gap-1.5">
                              {positiveOffers.map((o) => (
                                <span
                                  key={o.company}
                                  title={`${o.company}: ${o.premium ? formatCurrency(o.premium) : ''} (No: ${o.quoteNumber || 'Eksik'})`}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                    !o.quoteNumber
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  }`}
                                >
                                  <span>{o.company.replace(' SİGORTA', '')}</span>
                                  <span className="font-mono">{o.premium ? formatCurrency(o.premium) : ''}</span>
                                </span>
                              ))}
                              {v.offers.filter((o) => o.status === 'TEKLİF ALINAMADI').length > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-100 rounded">
                                  +{v.offers.filter((o) => o.status === 'TEKLİF ALINAMADI').length} Alınamadı
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveVehicle(v.tempId);
                              }}
                              title="Bu aracı aktarımdan çıkar"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded In-Place Edit Panel */}
                        {isExpanded && (
                          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200 space-y-4">
                            {/* Vehicle Details Strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 text-xs bg-white p-3 rounded-xl border border-slate-200">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Ruhsat Seri</span>
                                <input
                                  type="text"
                                  value={v.licenseSerialNo || ''}
                                  onChange={(e) => handleUpdateVehicleField(v.tempId, 'licenseSerialNo', e.target.value)}
                                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Şasi No</span>
                                <input
                                  type="text"
                                  value={v.chassisNo || ''}
                                  onChange={(e) => handleUpdateVehicleField(v.tempId, 'chassisNo', e.target.value)}
                                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Motor No</span>
                                <input
                                  type="text"
                                  value={v.engineNo || ''}
                                  onChange={(e) => handleUpdateVehicleField(v.tempId, 'engineNo', e.target.value)}
                                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Kasko Bedeli</span>
                                <input
                                  type="number"
                                  value={v.vehicleValue || ''}
                                  onChange={(e) =>
                                    handleUpdateVehicleField(v.tempId, 'vehicleValue', Number(e.target.value) || undefined)
                                  }
                                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Başlangıç</span>
                                <input
                                  type="date"
                                  value={v.startDate || ''}
                                  onChange={(e) => handleUpdateVehicleField(v.tempId, 'startDate', e.target.value)}
                                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 mt-0.5"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Bitiş</span>
                                <input
                                  type="date"
                                  value={v.endDate || ''}
                                  onChange={(e) => handleUpdateVehicleField(v.tempId, 'endDate', e.target.value)}
                                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 mt-0.5"
                                />
                              </div>
                            </div>

                            {/* Company Offers Table with editable Quote Numbers and Premiums */}
                            <div>
                              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                                <span>Şirket Teklifleri & Teklif Numaraları</span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  Teklif numarası eksikse doğrudan bu tablodan yazabilirsiniz.
                                </span>
                              </div>
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                      <th className="px-3 py-2">Şirket</th>
                                      <th className="px-3 py-2">Durum</th>
                                      <th className="px-3 py-2">Prim (TL)</th>
                                      <th className="px-3 py-2">Teklif Numarası</th>
                                      <th className="px-3 py-2">Ek Açıklama / Alternatif</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {v.offers.map((o) => (
                                      <tr key={o.company} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 font-bold text-slate-800">
                                          {o.company}
                                        </td>
                                        <td className="px-3 py-2">
                                          <select
                                            value={o.status}
                                            onChange={(e) =>
                                              handleUpdateVehicleOffer(v.tempId, o.company, {
                                                status: e.target.value as any,
                                                noOffer: e.target.value === 'TEKLİF ALINAMADI',
                                              })
                                            }
                                            className={`text-[11px] font-bold px-2 py-1 rounded border ${
                                              o.status === 'TEKLİF ALINDI'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                : 'bg-slate-100 text-slate-600 border-slate-300'
                                            }`}
                                          >
                                            <option value="TEKLİF ALINDI">TEKLİF ALINDI</option>
                                            <option value="TEKLİF ALINAMADI">TEKLİF ALINAMADI</option>
                                          </select>
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={o.premium ?? ''}
                                            placeholder="Prim yok"
                                            disabled={o.status === 'TEKLİF ALINAMADI'}
                                            onChange={(e) =>
                                              handleUpdateVehicleOffer(v.tempId, o.company, {
                                                premium: e.target.value ? parseFloat(e.target.value) : null,
                                              })
                                            }
                                            className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="text"
                                            value={o.quoteNumber || ''}
                                            placeholder={o.status === 'TEKLİF ALINDI' ? 'Teklif No Girin' : '-'}
                                            disabled={o.status === 'TEKLİF ALINAMADI'}
                                            onChange={(e) =>
                                              handleUpdateVehicleOffer(v.tempId, o.company, {
                                                quoteNumber: e.target.value,
                                              })
                                            }
                                            className={`w-36 px-2 py-1 border rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 ${
                                              o.status === 'TEKLİF ALINDI' && !o.quoteNumber
                                                ? 'border-amber-400 bg-amber-50/50 text-amber-900'
                                                : 'border-slate-300'
                                            } disabled:bg-slate-100 disabled:text-slate-400`}
                                          />
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 text-[11px]">
                                          <input
                                            type="text"
                                            value={o.extraDescription || ''}
                                            placeholder="Opsiyonel not"
                                            onChange={(e) =>
                                              handleUpdateVehicleOffer(v.tempId, o.company, {
                                                extraDescription: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 border border-slate-200 rounded text-[11px]"
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Raw Doğanium Text display */}
                            {v.doganiumText && (
                              <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Orijinal Doğanium Teklif Metni:
                                </span>
                                <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                  {v.doganiumText}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-800">{vehicles.length}</span> araç aktarılacak.{' '}
                {missingQuoteNumbersCount > 0 && (
                  <span className="text-amber-700 font-semibold">
                    ({missingQuoteNumbersCount} araçta teklif numarası eksik)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleProceedToImport}
                  className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Teklifleri Oluştur ve Çapraz Satışa Geç ({vehicles.length} Araç)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
