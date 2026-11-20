import React from 'react';
import { TabType } from './Sidebar';
import { Plus, Shield, FileText, Menu } from 'lucide-react';

interface Props {
  currentTab: TabType;
  onOpenNewQuote: () => void;
  onOpenNewPolicy: () => void;
  onOpenNewEndorsement?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<Props> = ({
  currentTab,
  onOpenNewQuote,
  onOpenNewPolicy,
  onOpenNewEndorsement,
  onToggleMobileMenu,
}) => {
  const titles: Record<TabType, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Genel Bakış',
      subtitle: 'Acente portföy özeti, teklifler ve kritik yenilemeler',
    },
    quotes: {
      title: 'Teklif Yönetimi',
      subtitle: 'Müşteri teklifleri, indirim süreçleri ve poliçeleştirme',
    },
    followups: {
      title: 'Takipteki İşler',
      subtitle: 'Kasko/Trafik çapraz satış takipleri ve takip türündeki işler',
    },
    policies: {
      title: 'Poliçeler',
      subtitle: 'Olumlu sonuçlanarak poliçeleştirilmiş ana poliçe portföyü',
    },
    renewals: {
      title: 'Yenilemeler',
      subtitle: 'Portföydeki poliçelerin yenileme dönemleri ve araç bilgileri takibi',
    },
    concluded: {
      title: 'Sonuçlananlar',
      subtitle: 'Poliçeleşen portföy kayıtları ve poliçeleşmeyen sonuçlanmış teklifler',
    },
    endorsements: {
      title: 'Poliçe Hareketleri / Zeyil Yönetimi',
      subtitle: 'Mevcut ana poliçelere bağlı zeyil hareketleri ve geçmişi',
    },
    analytics: {
      title: 'İstatistikler & Üretim Analizi',
      subtitle: 'Dönemsel teklif ve poliçe performansı, branş ve şirket dağılımları',
    },
    calendar: {
      title: 'Yenileme & Teklif Takvimi',
      subtitle: 'Aylık vadeler ve bitiş günleri görünümü',
    },
    reminders: {
      title: 'Hatırlatmalar',
      subtitle: 'Gecikmiş ve yaklaşan yenileme takip listesi',
    },
    rules: {
      title: 'Kontrol Kuralları',
      subtitle: 'Acente kuralları ve otomatik uyarılar',
    },
    backup: {
      title: 'Excel & Yedekleme',
      subtitle: 'CSV aktarımı ve tam JSON veri yedekleme',
    },
  };

  const todayText = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const current = titles[currentTab] || { title: 'Poliçe & Teklif Takip', subtitle: '' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">{current.title}</h2>
          <p className="text-[11px] text-slate-400 capitalize">{todayText}</p>
        </div>
      </div>

      {/* Quick Action Buttons on Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenNewQuote}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>＋ Yeni Teklif</span>
        </button>

        {onOpenNewEndorsement && (
          <button
            onClick={onOpenNewEndorsement}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Mevcut bir poliçeye zeyil işlemi girin"
          >
            <span>＋ Zeyil Gir</span>
          </button>
        )}

        <button
          onClick={onOpenNewPolicy}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <Shield className="w-3.5 h-3.5 text-white" />
          <span>＋ Yeni Poliçe</span>
        </button>
      </div>
    </header>
  );
};
