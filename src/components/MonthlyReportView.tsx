import React, { useState, useMemo } from 'react';
import { BsnlLogo } from './BsnlLogo';
import { MonthPicker } from './MonthPicker';
import { LogEntry, User } from '../types';
import {
  DEFAULT_MONTHLY_ALLOWANCE,
  DEFAULT_VEHICLE_REGISTRATION,
  formatDate,
  formatMonthYear,
  isMonthEnded,
  sortEntriesChronologically,
} from '../constants';

interface MonthlyReportViewProps {
  entries: LogEntry[];
  currentUser: User;
  logoUrl?: string;
  onBack: () => void;
  vehicleRegistration?: string;
  monthlyAllowance?: number;
  closedMonths?: string[];
  isAdmin?: boolean;
  onToggleMonthClose?: (monthKey: string) => void;
  initialYear?: number;
  initialMonth?: number;
}

export function MonthlyReportView({
  entries,
  currentUser,
  logoUrl = '',
  onBack,
  vehicleRegistration = DEFAULT_VEHICLE_REGISTRATION,
  monthlyAllowance = DEFAULT_MONTHLY_ALLOWANCE,
  closedMonths = [],
  isAdmin = false,
  onToggleMonthClose,
  initialYear,
  initialMonth,
}: MonthlyReportViewProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(
    initialYear !== undefined ? initialYear : now.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth !== undefined ? initialMonth : now.getMonth()
  );

  const selectedMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const isClosed = closedMonths.includes(selectedMonthKey);
  const monthEnded = isMonthEnded(selectedYear, selectedMonth);

  // Month date range
  const fromDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const lastDayNum = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const toDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;

  const reportEntries = useMemo(() => {
    const filtered = entries.filter((e) => {
      return e.date >= fromDate && e.date <= toDate;
    });
    return sortEntriesChronologically(filtered);
  }, [entries, fromDate, toDate]);

  const totalUsed = reportEntries.reduce((sum, e) => sum + e.km, 0);
  const remaining = monthlyAllowance - totalUsed;

  function handleDownloadCSV() {
    if (!isClosed) return;
    const headers = [
      'Sl No',
      'Date',
      'Starting Time',
      'Starting Station',
      'Actual OMR (KM)',
      'Logbook OMR (KM)',
      'Places Visited',
      'Purpose of Journey',
      'Ending Station',
      'Actual CMR (KM)',
      'Logbook CMR (KM)',
      'Distance (KM)',
      'Officer / User',
      'Remarks',
    ];

    const rows = reportEntries.map((e, idx) => [
      idx + 1,
      `"${e.date}"`,
      `"${e.startTime}"`,
      `"${e.startStation}"`,
      e.actualOMR,
      e.logbookOMR,
      `"${(e.placesVisited || '').replace(/"/g, '""')}"`,
      `"${(e.purpose || '').replace(/"/g, '""')}"`,
      `"${e.endStation}"`,
      e.actualCMR,
      e.logbookCMR,
      e.km,
      `"${e.user}"`,
      `"${(e.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BSNL_Logbook_Statement_${vehicleRegistration.replace(/\s+/g, '_')}_${selectedMonthKey}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const thClass =
    'border border-[#C8D5EB] bg-[#F5F8FD] px-2 py-1.5 text-xs font-semibold text-[#003087] text-left uppercase tracking-wider';
  const tdClass = 'border border-[#C8D5EB] px-2 py-1.5 text-xs text-[#1A2A4A] align-top';

  return (
    <div className="min-h-screen bg-[#EEF2F9]">
      <div className="bg-white border-b border-[#D4DEF0] px-4 py-3 flex items-center justify-between no-print flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-[#003087] text-sm font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          style={{ fontFamily: "'Work Sans', sans-serif" }}
        >
          ← Back to Logbook
        </button>

        <div className="flex items-center gap-2">
          {/* Admin Close / Reopen button */}
          {isAdmin && onToggleMonthClose && (
            <div>
              {isClosed ? (
                <button
                  type="button"
                  onClick={() => onToggleMonthClose(selectedMonthKey)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded transition-colors cursor-pointer"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  🔓 Reopen Month Entries
                </button>
              ) : monthEnded ? (
                <button
                  type="button"
                  onClick={() => onToggleMonthClose(selectedMonthKey)}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-2 rounded transition-colors cursor-pointer"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  🔒 Close Month Entries
                </button>
              ) : (
                <span
                  className="text-xs text-[#5A6A82] bg-gray-100 px-2.5 py-1.5 rounded border border-gray-200"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Can close after month ends
                </span>
              )}
            </div>
          )}

          {/* Download CSV button */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={!isClosed}
            className={`font-semibold px-3 py-2 rounded text-xs transition-colors flex items-center gap-1.5 ${
              isClosed
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
            }`}
            style={{ fontFamily: "'Work Sans', sans-serif" }}
            title={!isClosed ? 'Download enabled after month is closed by Admin' : 'Download CSV'}
          >
            {isClosed ? '⬇ Download CSV' : '🔒 CSV Locked'}
          </button>

          {/* Print / Download PDF button */}
          <button
            type="button"
            onClick={() => {
              if (isClosed) window.print();
            }}
            disabled={!isClosed}
            className={`font-semibold px-3 py-2 rounded text-xs transition-colors flex items-center gap-1.5 ${
              isClosed
                ? 'bg-[#003087] hover:bg-[#00236A] text-white cursor-pointer shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
            }`}
            style={{ fontFamily: "'Work Sans', sans-serif" }}
            title={!isClosed ? 'Download enabled after month is closed by Admin' : 'Print or Save as PDF'}
          >
            {isClosed ? '🖨 Print / Download PDF' : '🔒 PDF Locked'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 no-print space-y-3">
        {/* Month Selector Bar */}
        <div className="bg-white border border-[#D4DEF0] rounded p-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold text-[#003087] uppercase tracking-wider"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Report Month:
            </span>
            <MonthPicker
              year={selectedYear}
              month={selectedMonth}
              onChange={(y, m) => {
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            {isClosed ? (
              <span
                className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                🔒 Closed by Admin — Official Final Statement (Downloads Enabled)
              </span>
            ) : (
              <span
                className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                ⏳ Month Open — Downloads will be unlocked after Admin closes this month
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8">
        <div className="bg-white border border-[#D4DEF0] rounded p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <div className="border-b-2 border-[#003087] pb-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <BsnlLogo logoUrl={logoUrl} />
              <div className="text-right">
                <div
                  className="text-[#003087] font-bold text-xs uppercase tracking-widest"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  BSNL · Kerala Telecom Circle
                </div>
                <div className="text-[#5A6A82] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Attingal Sub-Division / Secondary Switching Area
                </div>
              </div>
            </div>
            <div className="text-center pt-2">
              <h1
                className="text-[#003087] font-bold text-lg uppercase tracking-wider"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Monthly Vehicle Logbook Statement
              </h1>
              <div className="text-xs text-[#5A6A82] mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                Statement for {formatMonthYear(selectedYear, selectedMonth)} ·{' '}
                {isClosed ? (
                  <strong className="text-red-700 font-semibold">[CLOSED & CERTIFIED BY ADMIN]</strong>
                ) : (
                  <strong className="text-amber-700 font-semibold">[PROVISIONAL / OPEN]</strong>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-[#F5F8FD] border border-[#C8D5EB] rounded p-3 mb-6 text-sm">
            <div>
              <div
                className="text-[#5A6A82] text-xs font-semibold uppercase tracking-wider"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Vehicle No.
              </div>
              <div
                className="font-bold text-[#003087] text-sm"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {vehicleRegistration}
              </div>
            </div>
            <div>
              <div
                className="text-[#5A6A82] text-xs font-semibold uppercase tracking-wider"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Officer / User
              </div>
              <div className="font-medium text-[#1A2A4A] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                {currentUser.name}
              </div>
            </div>
            <div>
              <div
                className="text-[#5A6A82] text-xs font-semibold uppercase tracking-wider"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Period
              </div>
              <div className="font-medium text-[#1A2A4A] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                {fromDate} to {toDate}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Date
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Start Station
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Logbook OMR
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Places Visited
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Purpose / Details
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    End Station
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Logbook CMR
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    KM
                  </th>
                  <th className={thClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-8 text-[#8A99AE] text-sm border border-[#D4DEF0]"
                    >
                      No entries recorded for {formatMonthYear(selectedYear, selectedMonth)}.
                    </td>
                  </tr>
                ) : (
                  reportEntries.map((e) => (
                    <tr key={e.id}>
                      <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif" }}>
                        {formatDate(e.date)}
                      </td>
                      <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif" }}>
                        {e.startStation}
                      </td>
                      <td
                        className={`${tdClass} text-center font-mono`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {e.logbookOMR}
                      </td>
                      <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px' }}>
                        {e.placesVisited}
                      </td>
                      <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px' }}>
                        {e.purpose}
                      </td>
                      <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif" }}>
                        {e.endStation}
                      </td>
                      <td
                        className={`${tdClass} text-center font-mono`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {e.logbookCMR}
                      </td>
                      <td
                        className={`${tdClass} text-center font-bold`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {e.km}
                      </td>
                      <td className={tdClass} style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px' }}>
                        {e.remarks || ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#F5F8FD]">
                  <td
                    colSpan={7}
                    className="border border-[#C8D5EB] px-2 py-2 text-xs font-bold text-right text-[#1A2A4A]"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    Total KM
                  </td>
                  <td
                    className="border border-[#C8D5EB] px-2 py-2 text-center font-bold text-[#003087]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {totalUsed}
                  </td>
                  <td className="border border-[#C8D5EB]" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8 text-sm">
            <div className="border border-[#D4DEF0] rounded p-3 text-center">
              <div
                className="text-[#8A99AE] text-xs uppercase tracking-wider mb-1"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Monthly Allowable
              </div>
              <div
                className="font-bold text-[#003087] text-xl"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {monthlyAllowance}
              </div>
            </div>
            <div className="border border-[#D4DEF0] rounded p-3 text-center">
              <div
                className="text-[#8A99AE] text-xs uppercase tracking-wider mb-1"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Total Used
              </div>
              <div
                className="font-bold text-[#003087] text-xl"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {totalUsed}
              </div>
            </div>
            <div className="border border-[#D4DEF0] rounded p-3 text-center">
              <div
                className="text-[#8A99AE] text-xs uppercase tracking-wider mb-1"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Remaining
              </div>
              <div
                className={`font-bold text-xl ${remaining <= 0 ? 'text-red-600' : 'text-green-700'}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {remaining}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-[#D4DEF0]">
            <div>
              <div className="h-10 border-b border-[#1A2A4A] mb-1" />
              <div className="text-xs text-[#5A6A82]" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Prepared by
              </div>
              <div className="text-xs font-medium text-[#1A2A4A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {currentUser.name}
              </div>
            </div>
            <div>
              <div className="h-10 border-b border-[#1A2A4A] mb-1" />
              <div className="text-xs text-[#5A6A82]" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Checked by
              </div>
              <div className="text-xs font-medium text-[#1A2A4A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                AGM (Network), Attingal
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
