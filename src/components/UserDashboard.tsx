import React, { useState, useMemo } from 'react';
import { BsnlLogo } from './BsnlLogo';
import { MonthPicker } from './MonthPicker';
import { AllowanceBar } from './AllowanceBar';
import { EntriesTable } from './EntriesTable';
import { LogEntry, User } from '../types';
import { DEFAULT_VEHICLE_REGISTRATION, formatMonthYear, sortEntriesChronologically } from '../constants';

interface UserDashboardProps {
  currentUser: User;
  entries: LogEntry[];
  onNewEntry: () => void;
  onEditEntry?: (entry: LogEntry) => void;
  onReport: (year?: number, month?: number) => void;
  onLogout: () => void;
  logoUrl?: string;
  onUpdatePassword: (userId: string, newPass: string) => void;
  vehicleRegistration?: string;
  closedMonths?: string[];
}

export function UserDashboard({
  currentUser,
  entries,
  onNewEntry,
  onEditEntry,
  onReport,
  onLogout,
  logoUrl = '',
  onUpdatePassword,
  vehicleRegistration = DEFAULT_VEHICLE_REGISTRATION,
  closedMonths = [],
}: UserDashboardProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [showPassword, setShowPassword] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const isClosed = closedMonths.includes(currentMonthKey);

  const monthlyEntries = useMemo(() => {
    const filtered = entries.filter((e) => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return sortEntriesChronologically(filtered);
  }, [entries, year, month]);

  const totalUsed = monthlyEntries.reduce((sum, e) => sum + e.km, 0);

  function handleChangePassword() {
    if (currentPass !== currentUser.password) {
      setPassMsg('Current password is incorrect.');
      return;
    }
    if (!newPass || newPass.length < 4) {
      setPassMsg('New password must be at least 4 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg('Passwords do not match.');
      return;
    }
    onUpdatePassword(currentUser.id, newPass);
    setPassMsg('✓ Password changed successfully.');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => {
      setShowPassword(false);
      setPassMsg('');
    }, 1800);
  }

  return (
    <div className="min-h-screen bg-[#EEF2F9]">
      <header className="bg-white border-b border-[#D4DEF0] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <BsnlLogo logoUrl={logoUrl} />

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div
                className="text-[#003087] font-semibold text-xs"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {vehicleRegistration}
              </div>
              <div className="text-[#5A6A82] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                {currentUser.name}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onReport(year, month)}
                className="text-[#0055C8] text-xs font-medium px-2 py-1 rounded border border-[#C8D5EB] hover:border-[#003087] transition-colors cursor-pointer"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Report
              </button>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#5A6A82] text-xs px-2 py-1 rounded border border-[#C8D5EB] hover:border-[#003087] hover:text-[#003087] transition-colors cursor-pointer"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Password
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="text-[#5A6A82] text-xs px-2 py-1 rounded border border-[#C8D5EB] hover:border-[#003087] hover:text-[#003087] transition-colors cursor-pointer"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <div className="sm:hidden text-center">
          <div
            className="text-[#003087] font-semibold text-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {vehicleRegistration}
          </div>
          <div className="text-[#5A6A82] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
            {currentUser.name}
          </div>
        </div>

        {showPassword && (
          <div className="bg-white border border-[#D4DEF0] rounded p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3
                className="font-semibold text-sm text-[#003087]"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Change Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPassword(false);
                  setCurrentPass('');
                  setNewPass('');
                  setConfirmPass('');
                  setPassMsg('');
                }}
                className="text-[#8A99AE] text-xs hover:text-[#003087] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <input
              type="password"
              className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
              placeholder="Current password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
            <input
              type="password"
              className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
              placeholder="New password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
            <input
              type="password"
              className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
              placeholder="Confirm new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
            {passMsg && (
              <p
                className="text-xs font-medium"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: passMsg.startsWith('✓') ? '#15803d' : '#dc2626',
                }}
              >
                {passMsg}
              </p>
            )}
            <button
              type="button"
              onClick={handleChangePassword}
              className="bg-[#003087] text-white text-xs font-semibold px-4 py-2 rounded hover:bg-[#00236A] transition-colors cursor-pointer"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Change Password
            </button>
          </div>
        )}

        <div className="bg-white border border-[#D4DEF0] rounded p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2
                className="text-[#003087] font-bold text-sm uppercase tracking-wider"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                Monthly KM Status
              </h2>
              {isClosed ? (
                <span
                  className="bg-red-50 text-red-600 border border-red-200 text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  🔒 Closed by Admin
                </span>
              ) : (
                <span
                  className="bg-green-50 text-green-700 border border-green-200 text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                  style={{ fontFamily: "'Work Sans', sans-serif" }}
                >
                  ● Active
                </span>
              )}
            </div>
            <MonthPicker
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          </div>
          <AllowanceBar used={totalUsed} />
        </div>

        {isClosed ? (
          <div
            className="w-full bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] font-medium py-3 px-4 rounded text-xs flex items-center justify-between flex-wrap gap-2"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            <span className="flex items-center gap-1.5 font-semibold text-red-700">
              🔒 Month is closed by Admin. No new entries can be added.
            </span>
            <button
              type="button"
              onClick={() => onReport(year, month)}
              className="text-[#003087] font-bold hover:underline cursor-pointer"
            >
              Download PDF / CSV in Report →
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onNewEntry}
            className="w-full bg-[#003087] hover:bg-[#00236A] text-white font-bold py-3 rounded text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            style={{ fontFamily: "'Work Sans', sans-serif" }}
          >
            <span className="text-lg font-light">+</span> New Log Entry
          </button>
        )}

        <div className="bg-white border border-[#D4DEF0] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EEF2F9] flex items-center justify-between">
            <h2
              className="text-[#003087] font-bold text-sm uppercase tracking-wider"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Monthly Logbook — {formatMonthYear(year, month)}
            </h2>
            <span className="text-[#8A99AE] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
              {monthlyEntries.length} entries
            </span>
          </div>
          <EntriesTable
            entries={monthlyEntries}
            onEdit={onEditEntry}
            isAdmin={false}
            closedMonths={closedMonths}
            isMonthClosed={isClosed}
          />
        </div>
      </div>
    </div>
  );
}
