import React from 'react';
import { formatMonthYear } from '../constants';

interface MonthPickerProps {
  year: number;
  month: number; // 0-indexed
  onChange: (year: number, month: number) => void;
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  function handlePrev() {
    if (month === 0) {
      onChange(year - 1, 11);
    } else {
      onChange(year, month - 1);
    }
  }

  function handleNext() {
    // allow navigation
    if (month === 11) {
      onChange(year + 1, 0);
    } else {
      onChange(year, month + 1);
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={handlePrev}
        className="w-7 h-7 flex items-center justify-center rounded border border-[#D4DEF0] text-[#5A6A82] hover:border-[#003087] hover:text-[#003087] text-sm transition-colors"
        title="Previous Month"
      >
        ‹
      </button>
      <span
        className="text-[#1A2A4A] font-semibold text-sm min-w-[130px] sm:min-w-[140px] text-center"
        style={{ fontFamily: "'Work Sans', sans-serif" }}
      >
        {formatMonthYear(year, month)}
      </span>
      <button
        type="button"
        onClick={handleNext}
        className="w-7 h-7 flex items-center justify-center rounded border border-[#D4DEF0] text-[#5A6A82] hover:border-[#003087] hover:text-[#003087] text-sm transition-colors"
        title="Next Month"
      >
        ›
      </button>
    </div>
  );
}
