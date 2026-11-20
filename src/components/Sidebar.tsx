import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Clock,
  Shield,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Bell,
  Sliders,
  Database,
  CheckCheck,
  Layers,
  BarChart3,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'quotes'
  | 'followups'
  | 'policies'
  | 'renewals'
  | 'concluded'
  | 'endorsements'
  | 'analytics'
  | 'calendar'
  | 'reminders'
  | 'rules'
  | 'backup';

interface Props {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeQuotesCount: number;
  activePoliciesCount?: number;
  renewalsCount?: number;
  followUpsCount?: number;
  concludedCount: number;
  endorsementsCount?: number;
  urgentRemindersCount: number;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  activeQuotesCount,
  activePoliciesCount = 0,
  renewalsCount = 0,
  followUpsCount = 0,
  concludedCount,
  endorsementsCount = 0,
  urgentRemindersCount,
}) => {
  const navItems: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Genel Bakış',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'quotes',
      label: 'Teklifler',
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      badge: activeQuotesCount,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    },
    {
      id: 'followups',
      label: 'Takipteki İşler',
      icon: <Clock className="w-4 h-4 text-purple-400" />,
      badge: followUpsCount > 0 ? followUpsCount : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'policies',
      label: 'Poliçeler',
      icon: <Shield className="w-4 h-4 text-indigo-400" />,
      badge: activePoliciesCount > 0 ? activePoliciesCount : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'renewals',
      label: 'Yenilemeler',
      icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
      badge: renewalsCount > 0 ? renewalsCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'concluded',
      label: 'Sonuçlananlar',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      badge: concludedCount,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'endorsements',
      label: 'Poliçe Hareketleri',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      badge: endorsementsCount > 0 ? endorsementsCount : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    },
    {
      id: 'analytics',
      label: 'İstatistikler',
      icon: <BarChart3 className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'calendar',
      label: 'Takvim',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'reminders',
      label: 'Hatırlatmalar',
      icon: <Bell className="w-4 h-4 text-amber-400" />,
      badge: urgentRemindersCount > 0 ? urgentRemindersCount : undefined,
      badgeColor: 'bg-rose-500 text-white font-bold',
    },
    {
      id: 'rules',
      label: 'Kurallar',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'backup',
      label: 'Excel & Yedekleme',
      icon: <Database className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm font-black">
          <CheckCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight text-white leading-tight">Poliçe & Teklif</div>
          <div className="text-[11px] text-slate-400">Acente Takip Sistemi</div>
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">Çalışma Alanı</div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Yerel Depolama Aktif</span>
        </div>
        <div>Tüm teklif ve poliçeler tarayıcınızda güvendedir.</div>
      </div>
    </aside>
  );
};
