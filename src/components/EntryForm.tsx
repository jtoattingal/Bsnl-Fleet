import React, { useState, useMemo } from 'react';
import { StationCalcCard } from './StationCalcCard';
import { LogEntry, User } from '../types';
import { calcOpeningOMR, calcClosingCMR } from '../constants';

interface EntryFormProps {
  currentUser: User;
  onSave: (entry: LogEntry) => void;
  onCancel: () => void;
  editEntry?: LogEntry;
  closedMonths?: string[];
  isAdmin?: boolean;
  existingEntries?: LogEntry[];
}

export function EntryForm({
  currentUser,
  onSave,
  onCancel,
  editEntry,
  closedMonths = [],
  isAdmin = false,
  existingEntries = [],
}: EntryFormProps) {
  const defaultDate =
    editEntry?.date ||
    (existingEntries.length > 0 ? existingEntries[existingEntries.length - 1].date : '2026-09-01');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(editEntry?.startTime || '09:00');
  const [startStation, setStartStation] = useState(editEntry?.startStation || 'Attingal');
  const [actualOMRStr, setActualOMRStr] = useState(editEntry?.actualOMR?.toString() || '');
  const [placesVisited, setPlacesVisited] = useState(editEntry?.placesVisited || '');
  const [purpose, setPurpose] = useState(editEntry?.purpose || '');
  const [endStation, setEndStation] = useState(editEntry?.endStation || 'Attingal');
  const [actualCMRStr, setActualCMRStr] = useState(editEntry?.actualCMR?.toString() || '');
  const [remarks, setRemarks] = useState(editEntry?.remarks || '');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const numOMR = parseFloat(actualOMRStr);
  const numCMR = parseFloat(actualCMRStr);

  const logOMR = isNaN(numOMR) ? null : calcOpeningOMR(numOMR, startStation);
  const logCMR = isNaN(numCMR) ? null : calcClosingCMR(numCMR, endStation);
  const tripKm = logOMR !== null && logCMR !== null ? logCMR - logOMR : null;

  // Find previous trip for sequential threshold verification
  const previousTrip = useMemo(() => {
    if (!existingEntries || existingEntries.length === 0) return null;
    const sorted = [...existingEntries]
      .filter((e) => e.id !== editEntry?.id)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
    // Find the latest trip that happened before or on the chosen date/time
    const priors = sorted.filter(
      (e) => e.date < date || (e.date === date && e.startTime <= startTime)
    );
    return priors.length > 0 ? priors[priors.length - 1] : null;
  }, [existingEntries, editEntry, date, startTime]);

  async function handleSave() {
    setError('');

    if (!date || !startTime || !actualOMRStr || !placesVisited || !purpose || !actualCMRStr) {
      setError('Please fill in all required fields.');
      return;
    }

    // Closed month validation
    const monthKey = date.slice(0, 7);
    if (closedMonths.includes(monthKey) && !isAdmin) {
      setError('This month has been closed by the Administrator. New entries cannot be added.');
      return;
    }

    if (isNaN(numOMR) || isNaN(numCMR)) {
      setError('Meter readings must be valid numbers.');
      return;
    }

    // Open meter reading must be less than closed meter reading
    if (numCMR <= numOMR) {
      setError(`Closing meter reading (${numCMR} KM) must be strictly greater than opening meter reading (${numOMR} KM).`);
      return;
    }

    // Sequential threshold check: Opening meter reading should not be less than previous trip's closing meter
    if (previousTrip && numOMR < previousTrip.actualCMR) {
      setError(
        `Opening meter reading (${numOMR} KM) cannot be less than previous trip's closing reading (${previousTrip.actualCMR} KM on ${previousTrip.date}).`
      );
      return;
    }

    const entryToSave: LogEntry = {
      id: editEntry?.id || Date.now().toString(),
      date,
      startTime,
      startStation,
      actualOMR: numOMR,
      logbookOMR: calcOpeningOMR(numOMR, startStation),
      placesVisited,
      purpose,
      endStation,
      actualCMR: numCMR,
      logbookCMR: calcClosingCMR(numCMR, endStation),
      km: calcClosingCMR(numCMR, endStation) - calcOpeningOMR(numOMR, startStation),
      remarks,
      user: editEntry ? editEntry.user : currentUser.username,
    };

    setSaving(true);
    try {
      await onSave(entryToSave);
      setSuccess(true);
      setTimeout(() => {
        onCancel();
      }, 600);
    } catch (err: any) {
      console.error('Error saving entry:', err);
      setError(err?.message || 'Error occurred while saving entry to database.');
    } finally {
      setSaving(false);
    }
  }

  const labelClass = 'block text-[#5A6A82] text-xs font-medium mb-1 uppercase tracking-wider';
  const inputClass =
    'w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm text-[#1A2A4A] focus:outline-none focus:border-[#003087] focus:ring-1 focus:ring-[#003087]';

  return (
    <div className="bg-[#EEF2F9] min-h-screen">
      <div className="bg-white border-b border-[#D4DEF0] px-4 py-3 flex items-center justify-between">
        <h2
          className="text-[#003087] font-bold text-base"
          style={{ fontFamily: "'Work Sans', sans-serif" }}
        >
          {editEntry ? 'Edit Log Entry' : 'New Log Entry'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-[#5A6A82] text-sm hover:text-[#003087] cursor-pointer"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          ✕ Cancel
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {success && (
          <div
            className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm font-medium text-center"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            ✓ Logbook entry saved successfully.
          </div>
        )}

        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {error}
          </div>
        )}

        <div className="bg-white border border-[#D4DEF0] rounded p-4 space-y-3">
          <h3
            className="text-[#003087] font-semibold text-xs uppercase tracking-widest border-b border-[#EEF2F9] pb-2"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Journey Start
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Date *
              </label>
              <input
                type="date"
                min="2026-09-01"
                className={inputClass}
                style={{ fontFamily: "'Inter', sans-serif" }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <span className="text-[11px] text-[#8A99AE]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Log entry date (from 01/09/2026 onwards)
              </span>
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Start Time *
              </label>
              <input
                type="time"
                className={inputClass}
                style={{ fontFamily: "'Inter', sans-serif" }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Starting Station *
            </label>
            <select
              className={inputClass}
              style={{ fontFamily: "'Inter', sans-serif" }}
              value={startStation}
              onChange={(e) => setStartStation(e.target.value)}
            >
              <option value="Attingal">Attingal</option>
              <option value="Kallambalam">Kallambalam</option>
              <option value="Kilimanoor">Kilimanoor</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Actual Opening Meter Reading (KM) *
              </label>
              {previousTrip && (
                <span className="text-[11px] text-[#5A6A82]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Prev CMR: <strong className="font-mono text-[#003087]">{previousTrip.actualCMR} KM</strong>
                </span>
              )}
            </div>
            <input
              type="number"
              className={`${inputClass} font-mono`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              value={actualOMRStr}
              onChange={(e) => setActualOMRStr(e.target.value)}
              placeholder={previousTrip ? `e.g. ${previousTrip.actualCMR}` : 'e.g. 12340'}
            />
          </div>

          {!isNaN(numOMR) && actualOMRStr && (
            <StationCalcCard
              label="Opening Calculation"
              actualMeter={numOMR}
              station={startStation}
              isOpening={true}
            />
          )}
        </div>

        <div className="bg-white border border-[#D4DEF0] rounded p-4 space-y-3">
          <h3
            className="text-[#003087] font-semibold text-xs uppercase tracking-widest border-b border-[#EEF2F9] pb-2"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Journey Details
          </h3>
          <div>
            <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Places Visited *
            </label>
            <textarea
              className={`${inputClass} resize-none`}
              style={{ fontFamily: "'Inter', sans-serif" }}
              rows={2}
              value={placesVisited}
              onChange={(e) => setPlacesVisited(e.target.value)}
              placeholder="e.g. Attingal, Varkala, Kallambalam, Chirayinkeezhu"
            />
          </div>

          <div>
            <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Purpose / Details *
            </label>
            <textarea
              className={`${inputClass} resize-none`}
              style={{ fontFamily: "'Inter', sans-serif" }}
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Site inspection, battery reading, BTS maintenance, office work"
            />
          </div>
        </div>

        <div className="bg-white border border-[#D4DEF0] rounded p-4 space-y-3">
          <h3
            className="text-[#003087] font-semibold text-xs uppercase tracking-widest border-b border-[#EEF2F9] pb-2"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Journey End
          </h3>
          <div>
            <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Ending Station *
            </label>
            <select
              className={inputClass}
              style={{ fontFamily: "'Inter', sans-serif" }}
              value={endStation}
              onChange={(e) => setEndStation(e.target.value)}
            >
              <option value="Attingal">Attingal</option>
              <option value="Kallambalam">Kallambalam</option>
              <option value="Kilimanoor">Kilimanoor</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
                Actual Closing Meter Reading (KM) *
              </label>
              <span className="text-[11px] text-[#5A6A82]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Threshold: must be &gt; OMR (Max 500 KM)
              </span>
            </div>
            <input
              type="number"
              className={`${inputClass} font-mono`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              value={actualCMRStr}
              onChange={(e) => setActualCMRStr(e.target.value)}
              placeholder={!isNaN(numOMR) ? `e.g. ${numOMR + 45}` : 'e.g. 12412'}
            />
          </div>

          {!isNaN(numCMR) && actualCMRStr && (
            <StationCalcCard
              label="Closing Calculation"
              actualMeter={numCMR}
              station={endStation}
              isOpening={false}
            />
          )}

          {tripKm !== null && (
            <div className="bg-[#003087] text-white rounded p-3 flex justify-between items-center">
              <div>
                <div className="text-sm font-semibold" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                  Logbook KM for this Trip
                </div>
                <div className="text-xs text-blue-200">
                  Actual Distance: {numCMR - numOMR} KM
                </div>
              </div>
              <span
                className={`text-2xl font-bold ${tripKm <= 0 ? 'text-red-300' : 'text-white'}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {tripKm <= 0 ? `⚠ ${tripKm}` : `${tripKm} KM`}
              </span>
            </div>
          )}

          <div>
            <label className={labelClass} style={{ fontFamily: "'Work Sans', sans-serif" }}>
              Remarks
            </label>
            <textarea
              className={`${inputClass} resize-none`}
              style={{ fontFamily: "'Inter', sans-serif" }}
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks or notes"
            />
          </div>
        </div>

        <div className="flex gap-3 pb-8">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className={`flex-1 bg-[#003087] hover:bg-[#00236A] text-white font-semibold py-3 rounded text-sm transition-colors cursor-pointer ${
              saving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            {saving ? 'Saving to Database...' : editEntry ? 'Update Log Entry' : 'Save Log Entry'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="px-6 border border-[#C8D5EB] text-[#5A6A82] hover:border-[#003087] hover:text-[#003087] font-medium py-3 rounded text-sm transition-colors cursor-pointer"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
