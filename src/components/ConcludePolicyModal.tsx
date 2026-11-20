import React, { useState } from 'react';
import { Policy } from '../types/insurance';
import { formatCurrency, getTodayIso } from '../services/storage';
import { X, Archive, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy | null;
  onConfirm: (policyId: string, outcome: 'completed' | 'cancelled' | 'renewed', reason: string) => void;
}

export const ConcludePolicyModal: React.FC<Props> = ({ isOpen, onClose, policy, onConfirm }) => {
  const [outcome, setOutcome] = useState<'completed' | 'renewed' | 'cancelled'>('completed');
  const [reason, setReason] = useState('Poliçe süresi doldu ve tamamlandı.');

  if (!isOpen || !policy) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(policy.id, outcome, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Archive className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Poliçeyi Sonuçlandır / Arşivle</h2>
              <p className="text-xs text-slate-300">
                Poliçe süresi dolduysa veya kapandıysa "Sonuçlananlar" sekmesine aktarılır.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Box */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Poliçe Sahibi:</div>
            <div className="text-base font-bold text-slate-900">{policy.insured}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {policy.branch} · {policy.company} · {policy.policyNumber}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Prim Tutarı</div>
            <div className="text-base font-bold text-slate-800">{formatCurrency(policy.premium)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sonuçlanma Durumu</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOutcome('completed');
                  setReason('Poliçe süresi doldu ve tamamlandı.');
                }}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                  outcome === 'completed'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                ✓ Tamamlandı
              </button>
              <button
                type="button"
                onClick={() => {
                  setOutcome('renewed');
                  setReason('Yeni dönem için yenilendi.');
                }}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                  outcome === 'renewed'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                🔄 Yenilendi
              </button>
              <button
                type="button"
                onClick={() => {
                  setOutcome('cancelled');
                  setReason('Araç/varlık satışı veya müşteri talebi ile iptal edildi.');
                }}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-colors ${
                  outcome === 'cancelled'
                    ? 'border-rose-500 bg-rose-50 text-rose-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                ✕ İptal Edildi
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama / Sonuç Notu</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            Bu poliçe aktif portföyden kaldırılacak ve <strong>Sonuçlananlar</strong> sekmesinde geçmiş kayıtlar
            arasında görüntülenecektir.
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Sonuçlandır ve Arşive Al
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
