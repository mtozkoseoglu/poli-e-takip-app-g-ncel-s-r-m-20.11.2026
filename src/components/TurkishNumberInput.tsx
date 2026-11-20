import React, { useState, useEffect } from 'react';
import { parseNumberTr, formatNumberTr, formatCurrency } from '../services/storage';

interface Props {
  value: number | string | undefined | null;
  onChange: (numericValue: number | undefined, rawText: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  decimals?: number;
  showCurrencyBadge?: boolean;
  prefix?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

export const TurkishNumberInput: React.FC<Props> = ({
  value,
  onChange,
  onBlur,
  placeholder = '0,00',
  className = '',
  decimals = 2,
  showCurrencyBadge = true,
  prefix = '₺',
  disabled = false,
  required = false,
  id,
  name,
}) => {
  const [text, setText] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Initialize or update text when external value changes and not currently typing
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null || value === '') {
        setText('');
      } else if (typeof value === 'number') {
        setText(formatNumberTr(value, decimals));
      } else {
        const parsed = parseNumberTr(value);
        if (parsed !== null && !isNaN(parsed)) {
          setText(formatNumberTr(parsed, decimals));
        } else {
          setText(String(value));
        }
      }
    }
  }, [value, isFocused, decimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const parsed = parseNumberTr(raw);
    onChange(parsed !== null && !isNaN(parsed) ? parsed : undefined, raw);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseNumberTr(text);
    if (parsed !== null && !isNaN(parsed)) {
      const formatted = formatNumberTr(parsed, decimals);
      setText(formatted);
      onChange(parsed, formatted);
    } else if (!text.trim()) {
      setText('');
      onChange(undefined, '');
    }
    if (onBlur) onBlur();
  };

  const currentParsed = parseNumberTr(text);
  const hasValidValue = currentParsed !== null && !isNaN(currentParsed) && currentParsed > 0;

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          value={text}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${prefix ? 'pl-7' : 'pl-3'} pr-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full transition-colors ${className}`}
        />
        {prefix && (
          <span className="absolute left-2.5 top-2.5 text-slate-400 font-bold text-xs select-none">
            {prefix}
          </span>
        )}
      </div>

      {showCurrencyBadge && hasValidValue && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-1 px-1">
          <span className="text-slate-400">Görünen Değer:</span>
          <span className="text-blue-700 font-bold font-mono">
            {formatCurrency(currentParsed)}
          </span>
        </div>
      )}
    </div>
  );
};
