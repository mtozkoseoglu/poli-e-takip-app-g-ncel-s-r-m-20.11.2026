import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface RecordDetail {
  label: string;
  value?: string | number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  recordType?: string;
  recordDetails?: RecordDetail[];
  warningText?: string;
}

export const DeleteConfirmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Kaydı Silme Onayı',
  recordType = 'Kayıt',
  recordDetails = [],
  warningText = 'Bu işlem ilgili kaydı sistemden kalıcı olarak silecektir. Bu işlem geri alınamaz.',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-800">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{title}</h3>
              <p className="text-[11px] text-rose-600">Lütfen silme işlemini onaylayın</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{warningText}</span>
          </div>

          {recordDetails.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Silinecek {recordType} Bilgileri
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {recordDetails.map((detail, idx) => (
                  <div key={idx} className={idx === 0 && recordDetails.length % 2 === 1 ? 'col-span-2' : ''}>
                    <span className="text-slate-500 block text-[11px]">{detail.label}:</span>
                    <span className="font-bold text-slate-800 break-words">{detail.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Bu {recordType.toLocaleLowerCase('tr-TR')} kaydını kalıcı olarak silmek istediğinize emin misiniz?
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Evet, Sil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
