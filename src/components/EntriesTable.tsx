import React, { useMemo } from 'react';
import { LogEntry } from '../types';
import { formatDate, sortEntriesChronologically } from '../constants';

interface EntriesTableProps {
  entries: LogEntry[];
  onEdit?: (entry: LogEntry) => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

export function EntriesTable({ entries, onEdit, isAdmin, onDelete }: EntriesTableProps) {
  const sortedEntries = useMemo(() => sortEntriesChronologically(entries), [entries]);

  if (sortedEntries.length === 0) {
    return (
      <div
        className="p-8 text-center text-[#8A99AE] text-sm"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        No logbook entries found.
      </div>
    );
  }

  const thClass =
    'bg-[#F5F8FD] text-[#003087] text-xs font-semibold px-3 py-2.5 text-left border-b border-[#D4DEF0] uppercase tracking-wider';
  const tdClass = 'px-3 py-2.5 text-sm text-[#1A2A4A] border-b border-[#EEF2F9] align-top';

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[900px]">
        <thead>
          <tr>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Date & Time
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Route
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              OMR
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Places Visited
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Purpose / Details
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              End
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              CMR
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              KM
            </th>
            <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Remarks
            </th>
            {isAdmin && (
              <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((entry, idx) => (
            <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFE]'}>
              <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="whitespace-nowrap font-medium">{formatDate(entry.date)}</div>
                <div className="text-[#8A99AE] text-xs">{entry.startTime}</div>
              </td>
              <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif" }}>
                <div>{entry.startStation}</div>
                <div className="text-[#8A99AE] text-xs">→ {entry.endStation}</div>
              </td>
              <td className={tdClass}>
                <div
                  className="font-mono text-xs text-[#003087]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {entry.logbookOMR}
                </div>
                <div
                  className="text-[#8A99AE] text-xs font-mono"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  act: {entry.actualOMR}
                </div>
              </td>
              <td className={`${tdClass} max-w-[160px]`} style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="text-xs leading-relaxed">{entry.placesVisited}</div>
              </td>
              <td className={`${tdClass} max-w-[180px]`} style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="text-xs leading-relaxed">{entry.purpose}</div>
              </td>
              <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif" }}>
                {entry.endStation}
              </td>
              <td className={tdClass}>
                <div
                  className="font-mono text-xs text-[#003087]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {entry.logbookCMR}
                </div>
                <div
                  className="text-[#8A99AE] text-xs font-mono"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  act: {entry.actualCMR}
                </div>
              </td>
              <td className={tdClass}>
                <span
                  className="text-[#003087] font-bold font-mono"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {entry.km}
                </span>
              </td>
              <td className={`${tdClass} text-xs text-[#8A99AE]`} style={{ fontFamily: "'Inter', sans-serif" }}>
                {entry.remarks || '—'}
              </td>
              {isAdmin && (
                <td className={tdClass}>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(entry)}
                      className="text-[#0055C8] text-xs hover:underline font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(entry.id)}
                      className="text-red-500 text-xs hover:underline font-medium cursor-pointer"
                    >
                      Del
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
