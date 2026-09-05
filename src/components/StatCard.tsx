import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="bg-white border border-[#D4DEF0] rounded p-3 flex-1 min-w-[120px]">
      <div
        className="text-[#5A6A82] text-xs font-medium uppercase tracking-wider mb-1"
        style={{ fontFamily: "'Work Sans', sans-serif" }}
      >
        {label}
      </div>
      <div
        className={`text-2xl font-bold ${accent || 'text-[#1A2A4A]'}`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[#8A99AE] text-xs mt-0.5"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
