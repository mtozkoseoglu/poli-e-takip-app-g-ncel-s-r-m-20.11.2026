import React, { useRef, useState } from 'react';
import { AppData, Quote, Policy } from '../types/insurance';
import {
  exportToJsonString,
  downloadFile,
  getTodayIso,
  exportPoliciesToCsv,
  exportQuotesToCsv,
  exportRenewalsToCsv,
  generateSampleData,
  sanitizeQuoteData,
  sanitizePolicyData,
  sanitizeEndorsementData,
  formatDateTr,
} from '../services/storage';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Shield,
  Layers,
} from 'lucide-react';

interface Props {
  appData: AppData;
  onRestoreData: (data: AppData) => void;
  onResetToSample: () => void;
  showToast: (msg: string) => void;
}

interface PendingRestore {
  data: AppData;
  metadata: {
    appVersion?: string;
    exportedAt?: string;
    compliance?: string;
    filename: string;
  };
  counts: {
    quotes: number;
    policies: number;
    endorsements?: number;
    rules: number;
  };
}

export const BackupView: React.FC<Props> = ({ appData, onRestoreData, onResetToSample, showToast }) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // In-app modal and feedback state (No window.alert / window.confirm)
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [showSampleConfirmModal, setShowSampleConfirmModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExportJson = () => {
    try {
      const jsonStr = exportToJsonString(appData);
      downloadFile(`sigorta-takip-yedek-${getTodayIso()}.json`, jsonStr, 'application/json;charset=utf-8');
      showToast('JSON tam sistem yedeği indirildi.');
      setSuccessMessage('JSON tam sistem yedeği başarıyla oluşturuldu ve indirildi.');
      setErrorMessage(null);
    } catch (e: any) {
      setErrorMessage(`Dışa aktarma hatası: ${e?.message || 'Bilinmeyen hata'}`);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        if (!text || !text.trim()) {
          setErrorMessage('Seçilen yedek dosyası boş.');
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (jsonErr: any) {
          setErrorMessage(`Geçersiz JSON dosyası: Dosya içeriği JSON formatında değil (${jsonErr.message}).`);
          return;
        }

        if (typeof parsed !== 'object' || parsed === null) {
          setErrorMessage('Geçersiz dosya yapısı: JSON içeriği bir nesne olmalıdır.');
          return;
        }

        // Support root-level arrays as well as nested "data" wrapper
        const root = parsed.data && typeof parsed.data === 'object' && (parsed.data.quotes || parsed.data.policies)
          ? parsed.data
          : parsed;

        const rawQuotes = Array.isArray(root.quotes) ? root.quotes : [];
        const rawPolicies = Array.isArray(root.policies) ? root.policies : [];
        const rawEndorsements = Array.isArray(root.endorsements) ? root.endorsements : [];
        const rawRules = Array.isArray(root.rules) ? root.rules : [];
        const rawSettings = root.settings && typeof root.settings === 'object'
          ? root.settings
          : { reminderDays: [30, 15, 7, 3, 1] };

        // Metadata extraction (not treated as business records)
        const metadata = {
          appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : undefined,
          exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
          compliance: typeof parsed.compliance === 'string' ? parsed.compliance : undefined,
          filename: file.name,
        };

        // Verification: ensure the file contains insurance records
        if (rawQuotes.length === 0 && rawPolicies.length === 0 && rawRules.length === 0 && rawEndorsements.length === 0) {
          setErrorMessage('Seçilen JSON dosyasında teklif, poliçe veya kural kaydı bulunamadı.');
          return;
        }

        // Sanitize and validate every record
        const sanitizedQuotes = rawQuotes.map(sanitizeQuoteData);
        const sanitizedPolicies = rawPolicies.map(sanitizePolicyData);
        const sanitizedEndorsements = rawEndorsements.map(sanitizeEndorsementData).filter(Boolean);

        const preparedData: AppData = {
          quotes: sanitizedQuotes,
          policies: sanitizedPolicies,
          endorsements: sanitizedEndorsements,
          rules: rawRules,
          settings: {
            reminderDays: Array.isArray(rawSettings.reminderDays) && rawSettings.reminderDays.length > 0
              ? rawSettings.reminderDays
              : [30, 15, 7, 3, 1],
          },
        };

        // Open in-app confirmation modal (No window.confirm!)
        setPendingRestore({
          data: preparedData,
          metadata,
          counts: {
            quotes: sanitizedQuotes.length,
            policies: sanitizedPolicies.length,
            endorsements: sanitizedEndorsements.length,
            rules: rawRules.length,
          },
        });
      } catch (err: any) {
        setErrorMessage(`Yedek dosyası doğrulanırken hata oluştu: ${err?.message || 'Bilinmeyen hata'}`);
      } finally {
        if (jsonInputRef.current) jsonInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setErrorMessage('Dosya okunamadı. Lütfen tekrar deneyiniz.');
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    };

    reader.readAsText(file, 'utf-8');
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore) return;
    try {
      onRestoreData(pendingRestore.data);
      const msg = `Yedek başarıyla geri yüklendi: ${pendingRestore.counts.quotes} Teklif/Takip, ${pendingRestore.counts.policies} Poliçe.`;
      showToast('✅ ' + msg);
      setSuccessMessage(msg);
      setErrorMessage(null);
      setPendingRestore(null);
    } catch (e: any) {
      setErrorMessage(`Yedek uygulanırken hata oluştu: ${e?.message || 'Bilinmeyen hata'}`);
    }
  };

  const handleConfirmResetToSample = () => {
    try {
      onResetToSample();
      showToast('Örnek veriler başarıyla yüklendi.');
      setSuccessMessage('Örnek acente veri seti başarıyla yüklendi.');
      setErrorMessage(null);
      setShowSampleConfirmModal(false);
    } catch (e: any) {
      setErrorMessage(`Örnek veri yüklenirken hata oluştu: ${e?.message || 'Bilinmeyen hata'}`);
    }
  };

  const activePoliciesCount = appData.policies.filter((p) => p.status !== 'Sonuçlandı').length;
  const activeQuotesCount = appData.quotes.filter((q) => q.status === 'active').length;
  const concludedQuotesCount = appData.quotes.filter((q) => q.status === 'concluded').length;
  const concludedPoliciesCount = appData.policies.filter((p) => p.status === 'Sonuçlandı').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-slate-700" />
          <span>Excel & Yedekleme Yönetimi</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Verilerinizi tam JSON yedeği olarak dışa aktarın, yedekten güvenle geri yükleyin veya Excel (CSV) olarak indirin.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Güvenli Yerel Depolama:</strong> Verileriniz tarayıcınızın yerel depolama alanında saklanır.
          Düzenli olarak <strong>JSON Yedeği</strong> alarak verilerinizi bilgisayarınızda saklayabilirsiniz.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: JSON Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Tam JSON Yedekleme</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tüm teklifler, poliçeler, zeyiller, sonuçlanan kayıtlar ve sistem ayarları tek dosyada tam olarak yedeklenir.
            </p>

            <div className="space-y-2 mb-6 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Aktif Teklif & Takipler</span>
                <strong className="text-slate-800">{activeQuotesCount}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Aktif Poliçeler</span>
                <strong className="text-slate-800">{activePoliciesCount}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Sonuçlanan Kayıtlar</span>
                <strong className="text-slate-800">{concludedQuotesCount + concludedPoliciesCount}</strong>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleExportJson}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>JSON Yedeği İndir</span>
            </button>

            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>JSON Yedeğini Geri Yükle</span>
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>
        </div>

        {/* Card 2: Excel / CSV Export */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (CSV) Aktarımı</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Microsoft Excel ve Google E-Tablolar ile tam uyumlu UTF-8 Türkçe karakter destekli CSV tabloları.
            </p>

            <div className="space-y-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  exportQuotesToCsv(appData.quotes);
                  showToast('Teklifler CSV olarak indirildi.');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer"
              >
                <span>Teklif Listesini Excel Olarak İndir</span>
                <Download className="w-4 h-4 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  exportPoliciesToCsv(appData.policies);
                  showToast('Poliçeler CSV olarak indirildi.');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer"
              >
                <span>Poliçe Portföyünü Excel Olarak İndir</span>
                <Download className="w-4 h-4 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  exportRenewalsToCsv(appData.renewals || []);
                  showToast('Yenilemeler listesi CSV olarak indirildi.');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer"
              >
                <span>Yenilemeler Listesini Excel Olarak İndir (16 Kolon)</span>
                <Download className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">
                <span className="font-semibold block text-slate-800">Örnek Veri Setini Yükle</span>
                <span>Test için hazır örnek sigorta kayıtları</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleConfirmModal(true)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Yükle</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- IN-APP MODAL: JSON YEDEĞİ GERİ YÜKLEME ONAYI --- */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">JSON Yedeğini Geri Yükle</h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <strong>Dosya Doğrulandı:</strong> "{pendingRestore.metadata.filename}" başarıyla okundu ve incelendi.
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Teklif / Takip</span>
                  <span className="text-xl font-black text-blue-700">{pendingRestore.counts.quotes} Kayıt</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Poliçe</span>
                  <span className="text-xl font-black text-emerald-700">{pendingRestore.counts.policies} Kayıt</span>
                </div>
                {pendingRestore.counts.rules > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Kontrol Kuralı</span>
                    <span className="text-xl font-black text-purple-700">{pendingRestore.counts.rules} Kural</span>
                  </div>
                )}
              </div>

              {/* Metadata details */}
              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl text-slate-600 border border-slate-200 text-[11px]">
                {pendingRestore.metadata.exportedAt && (
                  <div>
                    <span className="font-semibold text-slate-700">Yedek Alma Zamanı:</span>{' '}
                    {formatDateTr(pendingRestore.metadata.exportedAt)}
                  </div>
                )}
                {pendingRestore.metadata.appVersion && (
                  <div>
                    <span className="font-semibold text-slate-700">Yedek Sürümü:</span>{' '}
                    {pendingRestore.metadata.appVersion}
                  </div>
                )}
                {pendingRestore.metadata.compliance && (
                  <div className="text-[10px] text-slate-500 italic">
                    {pendingRestore.metadata.compliance}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Dikkat:</strong> Geri yükleme yapıldığında mevcut çalışma alanınızdaki kayıtlar bu yedek dosyasıyla değiştirilecektir.
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingRestore(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Geri Yükle & Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-APP MODAL: ÖRNEK VERİ YÜKLEME ONAYI --- */}
      {showSampleConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Örnek Veri Setini Yükle</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleConfirmModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-700">
              <p>
                Bu işlem mevcut tüm kayıtlarınızı test amaçlı <strong>zengin örnek verilerle</strong> değiştirecektir.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                Gerçek verileriniz varsa önce mutlaka <strong>"JSON Yedeği İndir"</strong> butonunu kullanarak yedeğinizi alınız.
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSampleConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmResetToSample}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Örnek Verileri Yükle</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
