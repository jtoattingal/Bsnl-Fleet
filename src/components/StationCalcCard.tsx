import React from 'react';
import { Station } from '../types';
import {
  calcLogbookCMR,
  calcLogbookOMR,
  CLOSING_STEPS,
  OPENING_STEPS,
  STATION_OFFSETS,
} from '../constants';

interface StationCalcCardProps {
  label: string;
  actualMeter: number;
  station: Station;
  isOpening: boolean;
}

export function StationCalcCard({
  label,
  actualMeter,
  station,
  isOpening,
}: StationCalcCardProps) {
  const offset = STATION_OFFSETS[station] ?? 0;
  const result = isOpening
    ? calcLogbookOMR(actualMeter, station)
    : calcLogbookCMR(actualMeter, station);
  const steps = isOpening ? OPENING_STEPS[station] : CLOSING_STEPS[station];

  return (
    <div className="bg-[#F0F4FA] border border-[#D4DEF0] rounded p-3 text-xs space-y-1.5">
      <div className="flex justify-between font-semibold text-[#003087]">
        <span style={{ fontFamily: "'Work Sans', sans-serif" }}>
          {label} ({station})
        </span>
        <span
          className="font-mono text-sm"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {result} KM
        </span>
      </div>
      <div className="text-[#5A6A82] space-y-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
        {steps?.map((s, idx) => (
          <div key={idx} className="flex justify-between text-[11px]">
            <span>{s.label}</span>
            <span className="font-mono">{s.km} KM</span>
          </div>
        ))}
      </div>
      <div
        className="text-[#8A99AE] text-[11px] pt-1 border-t border-[#D4DEF0]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {isOpening
          ? `Logbook OMR = Actual (${actualMeter}) - Garage (${offset}) = ${result}`
          : `Logbook CMR = Actual (${actualMeter}) + Garage (${offset}) = ${result}`}
      </div>
    </div>
  );
}
