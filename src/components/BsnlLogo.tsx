import React from 'react';

interface BsnlLogoProps {
  logoUrl?: string;
}

export function BsnlLogo({ logoUrl }: BsnlLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      {logoUrl ? (
        <img src={logoUrl} alt="BSNL Logo" className="h-8 max-w-[120px] object-contain" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#003087] flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-sm shrink-0">
          BSNL
        </div>
      )}
      <div>
        <div
          className="text-[#003087] font-extrabold text-sm leading-tight tracking-wide"
          style={{ fontFamily: "'Work Sans', sans-serif" }}
        >
          BHARAT SANCHAR NIGAM LIMITED
        </div>
        <div
          className="text-[#5A6A82] text-[11px] leading-tight font-medium"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Vehicle Digital Logbook
        </div>
      </div>
    </div>
  );
}
