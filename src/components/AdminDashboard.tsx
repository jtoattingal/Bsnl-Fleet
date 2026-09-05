import React, { useState } from 'react';
import { BsnlLogo } from './BsnlLogo';
import { EntriesTable } from './EntriesTable';
import { LogEntry, User } from '../types';
import {
  DEFAULT_VEHICLE_REGISTRATION,
  formatMonthYear,
  getFourthLastMonth,
  isMonthEnded,
  sortEntriesChronologically,
} from '../constants';

interface AdminDashboardProps {
  entries: LogEntry[];
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  onResetUserPassword?: (userId: string) => Promise<void> | void;
  logoUrl?: string;
  vehicleImg?: string;
  onUpdateLogo: (url: string) => Promise<void> | void;
  onUpdateVehicleImg: (url: string) => Promise<void> | void;
  onLogout: () => void;
  onEditEntry: (entry: LogEntry) => void;
  onDeleteEntry: (id: string) => void;
  adminPassword?: string;
  onChangeAdminPassword?: (password: string) => void;
  vehicleRegistration?: string;
  closedMonths?: string[];
  onToggleMonthClose?: (monthKey: string) => void;
  onClearSampleData?: () => void;
  onCleanupOldEntries?: (cutoffMonthKey: string) => Promise<any>;
  onSyncEntries?: (entries?: LogEntry[]) => Promise<boolean>;
  onSyncUsers?: (users?: User[]) => Promise<boolean>;
  onDeleteMonthEntries?: (monthKey: string) => Promise<{ deleted: number }>;
  onOpenReport?: (year?: number, month?: number) => void;
}

export function AdminDashboard({
  entries,
  users,
  onUpdateUsers,
  onResetUserPassword,
  logoUrl = '',
  vehicleImg = '',
  onUpdateLogo,
  onUpdateVehicleImg,
  onLogout,
  onEditEntry,
  onDeleteEntry,
  adminPassword = 'Bsnlatt',
  onChangeAdminPassword,
  vehicleRegistration = DEFAULT_VEHICLE_REGISTRATION,
  closedMonths = [],
  onToggleMonthClose,
  onClearSampleData,
  onCleanupOldEntries,
  onSyncEntries,
  onSyncUsers,
  onDeleteMonthEntries,
  onOpenReport,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<'entries' | 'users' | 'appearance' | 'password'>('entries');

  // Entries filter
  const [userFilter, setUserFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Save to database state
  const [isSavingLogbook, setIsSavingLogbook] = useState(false);
  const [logbookSaveMsg, setLogbookSaveMsg] = useState('');
  const [isSavingUsers, setIsSavingUsers] = useState(false);
  const [userSaveMsg, setUserSaveMsg] = useState('');

  // MongoDB Space cleanup state
  const [selectedPurgeMonth, setSelectedPurgeMonth] = useState('');
  const [isPurgingMonth, setIsPurgingMonth] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState('');

  // Calculate unique months with entry counts
  const monthsWithEntries = React.useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const monthKey = e.date.substring(0, 7); // 'YYYY-MM'
      map.set(monthKey, (map.get(monthKey) || 0) + 1);
    });
    closedMonths.forEach((m) => {
      if (!map.has(m)) map.set(m, 0);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries, closedMonths]);

  const closedMonthsWithData = React.useMemo(() => {
    return monthsWithEntries.filter(([mKey, count]) => closedMonths.includes(mKey) && count > 0);
  }, [monthsWithEntries, closedMonths]);

  // 4th last month cleanup state
  const fourthLast = getFourthLastMonth();
  const oldEntries = entries.filter((e) => e.date <= `${fourthLast.key}-31`);
  const [cleanupDismissed, setCleanupDismissed] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState('');

  // Monthly closure state
  const [closureMonth, setClosureMonth] = useState(() => {
    const d = new Date();
    // Default to last completed month or current month
    const lm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}`;
  });

  const isClosureMonthClosed = closedMonths.includes(closureMonth);
  const closureYear = parseInt(closureMonth.split('-')[0] || '2026', 10);
  const closureMonthIdx = parseInt(closureMonth.split('-')[1] || '1', 10) - 1;
  const isClosureMonthEnded = isMonthEnded(closureYear, closureMonthIdx);

  // Users state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', designation: '', password: '' });
  const [userMsg, setUserMsg] = useState('');
  const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
  const [newPwVal, setNewPwVal] = useState('');

  // Appearance state
  const [inputLogoUrl, setInputLogoUrl] = useState(logoUrl);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [logoMsg, setLogoMsg] = useState('');

  const [inputVehicleImg, setInputVehicleImg] = useState(vehicleImg);
  const [vehiclePreview, setVehiclePreview] = useState(vehicleImg);
  const [vehicleMsg, setVehicleMsg] = useState('');

  // Synchronize appearance previews when active settings update
  React.useEffect(() => {
    setInputLogoUrl(logoUrl);
    setLogoPreview(logoUrl);
  }, [logoUrl]);

  React.useEffect(() => {
    setInputVehicleImg(vehicleImg);
    setVehiclePreview(vehicleImg);
  }, [vehicleImg]);

  async function handleResetUserPasswordToDefault(userId: string, username: string) {
    try {
      if (onResetUserPassword) {
        await onResetUserPassword(userId);
      } else {
        const updatedUsers = users.map((item) =>
          item.id === userId ? { ...item, password: 'Bsnl' } : item
        );
        onUpdateUsers(updatedUsers);
      }
      setResetPwUserId(null);
      setUserMsg(`✓ Password for ${username} reset to default 'Bsnl' and is now effective.`);
      setTimeout(() => setUserMsg(''), 4000);
    } catch (err: any) {
      setUserMsg(`Error resetting password: ${err.message || 'Failed'}`);
    }
  }

  async function handleSaveLogbookToDatabase() {
    setIsSavingLogbook(true);
    setLogbookSaveMsg('');
    try {
      if (onSyncEntries) {
        await onSyncEntries(entries);
      }
      setLogbookSaveMsg(`✓ Logbook changes saved and effective in MongoDB database (${entries.length} records).`);
      setTimeout(() => setLogbookSaveMsg(''), 4000);
    } catch (err: any) {
      setLogbookSaveMsg(`Error saving logbook to database: ${err.message || 'Failed'}`);
    } finally {
      setIsSavingLogbook(false);
    }
  }

  async function handleSaveUsersToDatabase() {
    setIsSavingUsers(true);
    setUserSaveMsg('');
    try {
      if (onSyncUsers) {
        await onSyncUsers(users);
      } else {
        onUpdateUsers(users);
      }
      setUserSaveMsg(`✓ User management changes saved and effective in MongoDB database (${users.length} users).`);
      setTimeout(() => setUserSaveMsg(''), 4000);
    } catch (err: any) {
      setUserSaveMsg(`Error saving users to database: ${err.message || 'Failed'}`);
    } finally {
      setIsSavingUsers(false);
    }
  }

  async function handlePurgeMonthData(monthKey: string, label: string, count: number) {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete all ${count} entries for ${label} from MongoDB database?\n\nThis will free up MongoDB storage space when running out of space. This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsPurgingMonth(true);
    setPurgeMsg('');
    try {
      if (onDeleteMonthEntries) {
        const res = await onDeleteMonthEntries(monthKey);
        setPurgeMsg(
          `✓ Successfully deleted ${res.deleted !== undefined ? res.deleted : count} records for ${label}. MongoDB database space has been freed.`
        );
      } else {
        await onCleanupOldEntries?.(monthKey);
        setPurgeMsg(`✓ Successfully deleted records for ${label} to free database space.`);
      }
      if (selectedPurgeMonth === monthKey) {
        setSelectedPurgeMonth('');
      }
      setTimeout(() => setPurgeMsg(''), 5000);
    } catch (err: any) {
      setPurgeMsg(`Error deleting month data: ${err.message || 'Failed'}`);
    } finally {
      setIsPurgingMonth(false);
    }
  }

  // Password state
  const [currentAdminPw, setCurrentAdminPw] = useState('');
  const [newAdminPw, setNewAdminPw] = useState('');
  const [confirmAdminPw, setConfirmAdminPw] = useState('');
  const [adminPwMsg, setAdminPwMsg] = useState('');

  const filteredEntries = React.useMemo(() => {
    const list = entries.filter((e) => {
      const matchUser = !userFilter || e.user.toLowerCase().includes(userFilter.toLowerCase());
      const matchMonth = !monthFilter || e.date.startsWith(monthFilter);
      return matchUser && matchMonth;
    });
    return sortEntriesChronologically(list);
  }, [entries, userFilter, monthFilter]);

  function tabClass(t: string) {
    const base = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ';
    if (tab === t) {
      return base + 'border-[#003087] text-[#003087]';
    }
    return base + 'border-transparent text-[#5A6A82] hover:text-[#003087]';
  }

  function handleAddUser() {
    if (!newUser.name || !newUser.username || !newUser.password) {
      setUserMsg('Name, username and password are required.');
      return;
    }
    if (users.find((u) => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      setUserMsg('Username already exists.');
      return;
    }
    const created: User = {
      id: Date.now().toString(),
      name: newUser.name,
      username: newUser.username,
      designation: newUser.designation,
      password: newUser.password,
      active: true,
    };
    onUpdateUsers([...users, created]);
    setShowAddUser(false);
    setUserMsg(`✓ User "${newUser.username}" added.`);
    setNewUser({ name: '', username: '', designation: '', password: '' });
    setTimeout(() => setUserMsg(''), 3000);
  }

  function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string) => void,
    setValue: (url: string) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
      setValue(result);
    };
    reader.readAsDataURL(file);
  }

  function handleChangeAdminPassword() {
    if (currentAdminPw !== adminPassword) {
      setAdminPwMsg('Current password incorrect.');
      return;
    }
    if (newAdminPw !== confirmAdminPw) {
      setAdminPwMsg('Passwords do not match.');
      return;
    }
    if (!newAdminPw || newAdminPw.length < 4) {
      setAdminPwMsg('Password too short.');
      return;
    }
    onChangeAdminPassword?.(newAdminPw);
    setAdminPwMsg('✓ Password changed successfully.');
    setCurrentAdminPw('');
    setNewAdminPw('');
    setConfirmAdminPw('');
  }

  return (
    <div className="min-h-screen bg-[#EEF2F9]">
      <header className="bg-white border-b border-[#D4DEF0] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <BsnlLogo logoUrl={logoUrl} />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5A6A82]" style={{ fontFamily: "'Inter', sans-serif" }}>
                BSNL Attingal Network
              </span>
              <span
                className="bg-[#003087] text-white text-xs font-bold px-2 py-0.5 rounded"
                style={{ fontFamily: "'Work Sans', sans-serif" }}
              >
                ADMIN
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="text-[#5A6A82] text-xs px-2 py-1 rounded border border-[#C8D5EB] hover:text-[#003087] hover:border-[#003087] transition-colors cursor-pointer"
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="bg-white border border-[#D4DEF0] rounded overflow-hidden">
          <div className="flex border-b border-[#EEF2F9] px-2">
            <button
              type="button"
              className={tabClass('entries')}
              onClick={() => setTab('entries')}
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Logbook Entries
            </button>
            <button
              type="button"
              className={tabClass('users')}
              onClick={() => setTab('users')}
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Users
            </button>
            <button
              type="button"
              className={tabClass('appearance')}
              onClick={() => setTab('appearance')}
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Appearance
            </button>
            <button
              type="button"
              className={tabClass('password')}
              onClick={() => setTab('password')}
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Admin Profile & Storage
            </button>
          </div>

          <div className="p-4">
            {tab === 'entries' && (
              <div className="space-y-4">
                {/* Closed Months Data Deletion Prompt for MongoDB Space */}
                {closedMonthsWithData.length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-bold uppercase tracking-wider">
                        <span>💾 MongoDB Storage Space Cleanup Prompt</span>
                      </div>
                      <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                        {closedMonthsWithData.length} Closed Month{closedMonthsWithData.length > 1 ? 's' : ''} Ready to Purge
                      </span>
                    </div>
                    <p className="text-amber-800" style={{ fontFamily: "'Inter', sans-serif" }}>
                      When MongoDB storage space gets full, you can permanently delete closed months data to reclaim storage capacity. The following closed month(s) currently contain data:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {closedMonthsWithData.map(([mKey, count]) => {
                        const [y, m] = mKey.split('-').map(Number);
                        const label = formatMonthYear(y, m - 1);
                        return (
                          <button
                            key={mKey}
                            type="button"
                            disabled={isPurgingMonth}
                            onClick={() => handlePurgeMonthData(mKey, label, count)}
                            className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5"
                            style={{ fontFamily: "'Work Sans', sans-serif" }}
                          >
                            <span>🗑 Delete {label} Data ({count} records) to Free Space</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MongoDB Database Storage Space Management */}
                <div className="bg-[#F5F8FD] border border-[#C8D5EB] rounded p-3 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div
                      className="text-[#003087] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <span>💾 MongoDB Database Storage Space Management</span>
                      <span className="bg-blue-100 text-[#003087] text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {entries.length} Total Records
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A6A82]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Meant to get space in MongoDB when running out of space. You can select and delete particular closed months data.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedPurgeMonth}
                      onChange={(e) => setSelectedPurgeMonth(e.target.value)}
                      className="border border-[#C8D5EB] bg-white rounded px-2.5 py-1.5 text-xs text-[#1A2A4A] focus:outline-none focus:border-[#003087]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <option value="">-- Select Closed Month to Delete --</option>
                      {monthsWithEntries.map(([mKey, count]) => {
                        const [y, m] = mKey.split('-').map(Number);
                        const label = formatMonthYear(y, m - 1);
                        const isClosed = closedMonths.includes(mKey);
                        return (
                          <option key={mKey} value={mKey}>
                            {label} ({count} records{isClosed ? ' • CLOSED' : ' • OPEN'})
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedPurgeMonth || isPurgingMonth}
                      onClick={() => {
                        if (!selectedPurgeMonth) return;
                        const [y, m] = selectedPurgeMonth.split('-').map(Number);
                        const label = formatMonthYear(y, m - 1);
                        const count = entries.filter((e) => e.date.startsWith(selectedPurgeMonth)).length;
                        handlePurgeMonthData(selectedPurgeMonth, label, count);
                      }}
                      className="bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <span>🗑</span>
                      <span>{isPurgingMonth ? 'Deleting...' : 'Delete Month & Free MongoDB Space'}</span>
                    </button>
                  </div>
                </div>

                {purgeMsg && (
                  <div
                    className={`border px-3 py-2 rounded text-xs font-medium ${
                      purgeMsg.startsWith('✓')
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    {purgeMsg}
                  </div>
                )}

                {/* Monthly Closure Control Panel */}
                <div className="bg-[#F5F8FD] border border-[#C8D5EB] rounded p-3 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div
                      className="text-[#003087] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <span>🔒 Monthly Closure Controls</span>
                      {isClosureMonthClosed ? (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          CLOSED
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          OPEN
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5A6A82]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Months can only be closed after they have ended. Once closed, users cannot add/modify entries and official PDF / CSV downloads are unlocked for everyone.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="month"
                      value={closureMonth}
                      onChange={(e) => setClosureMonth(e.target.value)}
                      className="border border-[#C8D5EB] bg-white rounded px-2.5 py-1.5 text-xs text-[#1A2A4A] focus:outline-none focus:border-[#003087]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />

                    {isClosureMonthClosed ? (
                      <button
                        type="button"
                        onClick={() => onToggleMonthClose?.(closureMonth)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                      >
                        🔓 Reopen Month
                      </button>
                    ) : isClosureMonthEnded ? (
                      <button
                        type="button"
                        onClick={() => onToggleMonthClose?.(closureMonth)}
                        className="bg-red-700 hover:bg-red-800 text-white font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                      >
                        🔒 Close Month Entries
                      </button>
                    ) : (
                      <span
                        className="text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded border border-gray-200"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        Ongoing (Closeable after month ends)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenReport?.(closureYear, closureMonthIdx)}
                      className="bg-[#003087] hover:bg-[#00236A] text-white font-semibold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      View Report / Download
                    </button>
                  </div>
                </div>

                {/* Filter and Clear Sample Data bar */}
                <div className="flex justify-between items-center flex-wrap gap-2 pt-1">
                  <div className="flex gap-2 flex-wrap">
                    <input
                      className="border border-[#C8D5EB] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#003087]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      placeholder="Filter by username"
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                    />
                    <input
                      type="month"
                      className="border border-[#C8D5EB] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#003087]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUserFilter('');
                        setMonthFilter('');
                      }}
                      className="text-xs text-[#5A6A82] hover:text-[#003087] cursor-pointer"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSaveLogbookToDatabase}
                      disabled={isSavingLogbook}
                      className="bg-[#003087] hover:bg-[#00236A] disabled:opacity-60 text-white font-semibold text-xs px-3.5 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <span>💾</span>
                      <span>{isSavingLogbook ? 'Saving to Database...' : 'Save Logbook to Database'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Are you sure you want to delete the sample logbook data? Users can then start fresh from the month of September 2026 reading.'
                          )
                        ) {
                          onClearSampleData?.();
                        }
                      }}
                      className="border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      🗑 Clear Sample Data (Start September 2026 Fresh)
                    </button>
                  </div>
                </div>

                {logbookSaveMsg && (
                  <div
                    className={`border px-3 py-2 rounded text-xs font-medium ${
                      logbookSaveMsg.startsWith('✓')
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    {logbookSaveMsg}
                  </div>
                )}

                <EntriesTable
                  entries={filteredEntries}
                  onEdit={onEditEntry}
                  onDelete={onDeleteEntry}
                  isAdmin={true}
                />
              </div>
            )}

            {tab === 'users' && (
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs text-[#8A99AE]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {users.length} registered user{users.length === 1 ? '' : 's'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveUsersToDatabase}
                      disabled={isSavingUsers}
                      className="bg-[#003087] hover:bg-[#00236A] disabled:opacity-60 text-white font-semibold text-xs px-3.5 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <span>💾</span>
                      <span>{isSavingUsers ? 'Saving to Database...' : 'Save Users to Database'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUser(true);
                        setUserMsg('');
                        setNewUser({ name: '', username: '', designation: '', password: '' });
                      }}
                      className="border border-[#003087] text-[#003087] hover:bg-[#F5F8FD] text-xs font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      + Add User
                    </button>
                  </div>
                </div>

                {userSaveMsg && (
                  <div
                    className={`border px-3 py-2 rounded text-xs font-medium ${
                      userSaveMsg.startsWith('✓')
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    {userSaveMsg}
                  </div>
                )}

                {userMsg && (
                  <div
                    className={`text-xs px-3 py-2 rounded border ${
                      userMsg.startsWith('✓')
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {userMsg}
                  </div>
                )}

                {showAddUser && (
                  <div className="border border-[#C8D5EB] rounded p-4 bg-[#F5F8FD] space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <h4
                        className="text-sm font-semibold text-[#003087]"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                      >
                        New User
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddUser(false)}
                        className="text-[#8A99AE] text-xs hover:text-[#003087] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                      placeholder="Full name / designation (e.g. JTO (Network), Attingal)"
                      value={newUser.name}
                      onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    <input
                      className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                      placeholder="Username (e.g. jto_attingal)"
                      value={newUser.username}
                      onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    <input
                      className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                      placeholder="Designation (e.g. Junior Telecom Officer)"
                      value={newUser.designation}
                      onChange={(e) => setNewUser((u) => ({ ...u, designation: e.target.value }))}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    <input
                      type="password"
                      className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                      placeholder="Initial password"
                      value={newUser.password}
                      onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    <button
                      type="button"
                      onClick={handleAddUser}
                      className="bg-[#003087] text-white text-xs font-semibold px-4 py-2 rounded hover:bg-[#00236A] transition-colors cursor-pointer"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      Add User
                    </button>
                  </div>
                )}

                {users.map((u) => (
                  <div key={u.id} className="border border-[#D4DEF0] rounded bg-white">
                    <div className="p-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-semibold text-sm text-[#1A2A4A] truncate"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          {u.name}
                        </div>
                        <div className="text-xs text-[#5A6A82]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {u.username}
                          </span>
                          {u.designation && <span> · {u.designation}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setResetPwUserId(resetPwUserId === u.id ? null : u.id);
                            setNewPwVal('');
                          }}
                          className="text-xs text-[#0055C8] hover:underline font-medium cursor-pointer"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Reset PW
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateUsers(
                              users.map((item) => (item.id === u.id ? { ...item, active: !item.active } : item))
                            );
                          }}
                          className={`text-xs font-medium hover:underline cursor-pointer ${
                            u.active ? 'text-amber-600' : 'text-green-700'
                          }`}
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete user "${u.username}"?`)) {
                              onUpdateUsers(users.filter((item) => item.id !== u.id));
                            }
                          }}
                          className="text-xs text-red-500 hover:underline cursor-pointer"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {resetPwUserId === u.id && (
                      <div className="border-t border-[#EEF2F9] p-3 bg-[#F5F8FD] flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-[#1A2A4A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Reset password for <strong className="font-mono text-[#003087]">{u.username}</strong> to default password{' '}
                          <span className="bg-white border border-[#C8D5EB] text-[#003087] px-1.5 py-0.5 rounded font-bold font-mono">
                            Bsnl
                          </span>
                          ?
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetUserPasswordToDefault(u.id, u.username)}
                            className="bg-[#003087] text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-[#00236A] transition-colors cursor-pointer"
                            style={{ fontFamily: "'Work Sans', sans-serif" }}
                          >
                            Confirm Reset to 'Bsnl'
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetPwUserId(null)}
                            className="text-xs text-[#5A6A82] hover:text-[#1A2A4A] cursor-pointer"
                            style={{ fontFamily: "'Work Sans', sans-serif" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'appearance' && (
              <div className="max-w-xl space-y-7">
                <div>
                  <h3
                    className="font-semibold text-sm text-[#1A2A4A] mb-3 uppercase tracking-wider"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    Logo
                  </h3>
                  <div className="border border-[#D4DEF0] rounded p-4 bg-[#F5F8FD] mb-3 flex items-center justify-center min-h-[70px]">
                    <BsnlLogo logoUrl={logoPreview} />
                  </div>
                  <div className="mb-2">
                    <label
                      className="block text-[#5A6A82] text-xs font-medium mb-1 uppercase tracking-wider"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      Paste Logo URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087] focus:ring-1 focus:ring-[#003087]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                        placeholder="https://example.com/logo.png"
                        value={inputLogoUrl.startsWith('data:') ? '' : inputLogoUrl}
                        onChange={(e) => {
                          setInputLogoUrl(e.target.value);
                          setLogoPreview(e.target.value);
                        }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onUpdateLogo(inputLogoUrl);
                            setLogoMsg('✓ Logo saved and made effective.');
                            setTimeout(() => setLogoMsg(''), 3000);
                          } catch (err: any) {
                            setLogoMsg('Failed to save logo.');
                          }
                        }}
                        className="bg-[#003087] text-white text-xs font-semibold px-3 py-2 rounded hover:bg-[#00236A] transition-colors whitespace-nowrap cursor-pointer"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                      >
                        Save Logo
                      </button>
                      {(inputLogoUrl || logoUrl) && (
                        <button
                          type="button"
                          onClick={async () => {
                            setInputLogoUrl('');
                            setLogoPreview('');
                            await onUpdateLogo('');
                            setLogoMsg('✓ Logo removed and database updated.');
                            setTimeout(() => setLogoMsg(''), 3000);
                          }}
                          className="text-xs text-[#5A6A82] hover:text-red-500 px-2 py-2 cursor-pointer whitespace-nowrap"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-[#E8EEF8]" />
                    <span className="text-[#8A99AE] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                      or
                    </span>
                    <div className="flex-1 h-px bg-[#E8EEF8]" />
                  </div>

                  <div>
                    <label
                      className="block text-[#5A6A82] text-xs font-medium mb-1 uppercase tracking-wider"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      Upload Logo File
                    </label>
                    <label className="flex items-center gap-3 border-2 border-dashed border-[#C8D5EB] rounded px-4 py-3 cursor-pointer hover:border-[#003087] hover:bg-[#F5F8FD] transition-colors group">
                      <div className="w-8 h-8 rounded bg-[#EEF2F9] flex items-center justify-center text-[#003087] group-hover:bg-[#003087] group-hover:text-white transition-colors text-sm">
                        ↑
                      </div>
                      <div>
                        <div
                          className="text-sm font-medium text-[#1A2A4A]"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Choose image file
                        </div>
                        <div className="text-xs text-[#8A99AE]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          PNG, JPG, SVG accepted
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setLogoPreview, setInputLogoUrl)}
                      />
                    </label>
                    {inputLogoUrl.startsWith('data:') && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await onUpdateLogo(inputLogoUrl);
                              setLogoMsg('✓ Logo uploaded, saved and made effective.');
                              setTimeout(() => setLogoMsg(''), 3000);
                            } catch (err: any) {
                              setLogoMsg('Failed to save uploaded logo.');
                            }
                          }}
                          className="bg-[#003087] text-white text-xs font-semibold px-4 py-2 rounded hover:bg-[#00236A] transition-colors cursor-pointer"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Save Uploaded Logo
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setInputLogoUrl('');
                            setLogoPreview('');
                            await onUpdateLogo('');
                            setLogoMsg('✓ Logo removed.');
                            setTimeout(() => setLogoMsg(''), 3000);
                          }}
                          className="text-xs text-[#5A6A82] hover:text-red-500 px-2 py-2 cursor-pointer"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  {logoMsg && (
                    <div
                      className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {logoMsg}
                    </div>
                  )}
                </div>

                <div>
                  <h3
                    className="font-semibold text-sm text-[#1A2A4A] mb-3 uppercase tracking-wider"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    Vehicle Image
                  </h3>
                  <div className="border border-[#D4DEF0] rounded overflow-hidden h-28 bg-[#1A2A4A] mb-3 flex items-center justify-center">
                    {vehiclePreview ? (
                      <img
                        src={vehiclePreview}
                        alt="Vehicle preview"
                        className="w-full h-full object-cover opacity-90"
                        onError={() => setVehiclePreview('')}
                      />
                    ) : (
                      <div className="text-4xl">🚐</div>
                    )}
                  </div>
                  <div className="mb-2">
                    <label
                      className="block text-[#5A6A82] text-xs font-medium mb-1 uppercase tracking-wider"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      Paste Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087] focus:ring-1 focus:ring-[#003087]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                        placeholder="https://example.com/vehicle.jpg"
                        value={inputVehicleImg.startsWith('data:') ? '' : inputVehicleImg}
                        onChange={(e) => {
                          setInputVehicleImg(e.target.value);
                          setVehiclePreview(e.target.value);
                        }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onUpdateVehicleImg(inputVehicleImg);
                            setVehicleMsg('✓ Vehicle picture saved and made effective.');
                            setTimeout(() => setVehicleMsg(''), 3000);
                          } catch (err: any) {
                            setVehicleMsg('Failed to save vehicle picture.');
                          }
                        }}
                        className="bg-[#003087] text-white text-xs font-semibold px-3 py-2 rounded hover:bg-[#00236A] transition-colors whitespace-nowrap cursor-pointer"
                        style={{ fontFamily: "'Work Sans', sans-serif" }}
                      >
                        Save Image
                      </button>
                      {(inputVehicleImg || vehicleImg) && (
                        <button
                          type="button"
                          onClick={async () => {
                            setInputVehicleImg('');
                            setVehiclePreview('');
                            await onUpdateVehicleImg('');
                            setVehicleMsg('✓ Vehicle picture reset to default and database updated.');
                            setTimeout(() => setVehicleMsg(''), 3000);
                          }}
                          className="text-xs text-[#5A6A82] hover:text-red-500 px-2 py-2 cursor-pointer whitespace-nowrap"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-[#E8EEF8]" />
                    <span className="text-[#8A99AE] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                      or
                    </span>
                    <div className="flex-1 h-px bg-[#E8EEF8]" />
                  </div>

                  <div>
                    <label
                      className="block text-[#5A6A82] text-xs font-medium mb-1 uppercase tracking-wider"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      Upload Image File
                    </label>
                    <label className="flex items-center gap-3 border-2 border-dashed border-[#C8D5EB] rounded px-4 py-3 cursor-pointer hover:border-[#003087] hover:bg-[#F5F8FD] transition-colors group">
                      <div className="w-8 h-8 rounded bg-[#EEF2F9] flex items-center justify-center text-[#003087] group-hover:bg-[#003087] group-hover:text-white transition-colors text-sm">
                        ↑
                      </div>
                      <div>
                        <div
                          className="text-sm font-medium text-[#1A2A4A]"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Choose vehicle photo
                        </div>
                        <div className="text-xs text-[#8A99AE]" style={{ fontFamily: "'Inter', sans-serif" }}>
                          PNG, JPG, WEBP accepted
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setVehiclePreview, setInputVehicleImg)}
                      />
                    </label>
                    {inputVehicleImg.startsWith('data:') && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await onUpdateVehicleImg(inputVehicleImg);
                              setVehicleMsg('✓ Vehicle picture uploaded, saved and made effective.');
                              setTimeout(() => setVehicleMsg(''), 3000);
                            } catch (err: any) {
                              setVehicleMsg('Failed to save vehicle picture.');
                            }
                          }}
                          className="bg-[#003087] text-white text-xs font-semibold px-4 py-2 rounded hover:bg-[#00236A] transition-colors cursor-pointer"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Save Uploaded Image
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setInputVehicleImg('');
                            setVehiclePreview('');
                            await onUpdateVehicleImg('');
                            setVehicleMsg('✓ Vehicle photo removed.');
                            setTimeout(() => setVehicleMsg(''), 3000);
                          }}
                          className="text-xs text-[#5A6A82] hover:text-red-500 px-2 py-2 cursor-pointer"
                          style={{ fontFamily: "'Work Sans', sans-serif" }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  {vehicleMsg && (
                    <div
                      className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {vehicleMsg}
                    </div>
                  )}
                  <p className="text-xs text-[#8A99AE] mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Vehicle registration {vehicleRegistration} is always shown regardless of image.
                  </p>
                </div>
              </div>
            )}

            {tab === 'password' && (
              <div className="space-y-6 max-w-2xl">
                {/* Admin Profile Details */}
                <div className="bg-[#F5F8FD] border border-[#C8D5EB] rounded p-4 space-y-2">
                  <div
                    className="text-[#003087] font-bold text-sm uppercase tracking-wider flex items-center gap-2"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    <span>👤 Administrator Profile</span>
                    <span className="bg-[#003087] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      ROOT ADMIN
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <div>
                      <span className="text-[#5A6A82]">Admin Username: </span>
                      <strong className="text-[#1A2A4A]">admin</strong>
                    </div>
                    <div>
                      <span className="text-[#5A6A82]">Station / Network: </span>
                      <strong className="text-[#1A2A4A]">BSNL Attingal Network</strong>
                    </div>
                    <div>
                      <span className="text-[#5A6A82]">Assigned Vehicle: </span>
                      <strong className="text-[#1A2A4A]">{vehicleRegistration}</strong>
                    </div>
                    <div>
                      <span className="text-[#5A6A82]">Database Records: </span>
                      <strong className="text-[#1A2A4A]">{entries.length} log entries | {users.length} users</strong>
                    </div>
                  </div>
                </div>

                {/* MongoDB Database Storage Space Management in Admin Profile */}
                <div className="border border-[#C8D5EB] rounded p-4 bg-white space-y-3">
                  <div>
                    <div
                      className="text-[#003087] font-bold text-sm uppercase tracking-wider flex items-center gap-1.5"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <span>💾 MongoDB Database Storage & Space Cleanup</span>
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                        SPACE MANAGEMENT
                      </span>
                    </div>
                    <p className="text-xs text-[#5A6A82] mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                      This tool is meant to get storage space in MongoDB when the database gets out of space. You can be prompted to delete particular closed months data from MongoDB, and act accordingly.
                    </p>
                  </div>

                  {closedMonthsWithData.length > 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-900 font-bold uppercase tracking-wide">
                          ⚠️ Space Cleanup Prompt: Closed Months with Data
                        </span>
                        <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                          {closedMonthsWithData.length} Month{closedMonthsWithData.length > 1 ? 's' : ''} Ready to Purge
                        </span>
                      </div>
                      <p className="text-amber-800" style={{ fontFamily: "'Inter', sans-serif" }}>
                        The following closed month(s) have data stored in MongoDB. Admin can delete any of these to immediately free space in MongoDB:
                      </p>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {closedMonthsWithData.map(([mKey, count]) => {
                          const [y, m] = mKey.split('-').map(Number);
                          const label = formatMonthYear(y, m - 1);
                          return (
                            <button
                              key={mKey}
                              type="button"
                              disabled={isPurgingMonth}
                              onClick={() => handlePurgeMonthData(mKey, label, count)}
                              className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-semibold px-2.5 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs"
                              style={{ fontFamily: "'Work Sans', sans-serif" }}
                            >
                              <span>🗑 Delete {label} ({count} entries)</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <select
                      value={selectedPurgeMonth}
                      onChange={(e) => setSelectedPurgeMonth(e.target.value)}
                      className="border border-[#C8D5EB] bg-white rounded px-3 py-2 text-xs text-[#1A2A4A] focus:outline-none focus:border-[#003087] flex-1 min-w-[220px]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <option value="">-- Select Closed Month to Delete from MongoDB --</option>
                      {monthsWithEntries.map(([mKey, count]) => {
                        const [y, m] = mKey.split('-').map(Number);
                        const label = formatMonthYear(y, m - 1);
                        const isClosed = closedMonths.includes(mKey);
                        return (
                          <option key={mKey} value={mKey}>
                            {label} ({count} entries{isClosed ? ' • CLOSED' : ' • OPEN'})
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedPurgeMonth || isPurgingMonth}
                      onClick={() => {
                        if (!selectedPurgeMonth) return;
                        const [y, m] = selectedPurgeMonth.split('-').map(Number);
                        const label = formatMonthYear(y, m - 1);
                        const count = entries.filter((e) => e.date.startsWith(selectedPurgeMonth)).length;
                        handlePurgeMonthData(selectedPurgeMonth, label, count);
                      }}
                      className="bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      <span>🗑</span>
                      <span>{isPurgingMonth ? 'Deleting...' : 'Delete Month Data & Free Space'}</span>
                    </button>
                  </div>

                  {purgeMsg && (
                    <div
                      className={`border px-3 py-2 rounded text-xs font-medium ${
                        purgeMsg.startsWith('✓')
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                      style={{ fontFamily: "'Work Sans', sans-serif" }}
                    >
                      {purgeMsg}
                    </div>
                  )}
                </div>

                {/* Change Admin Password Section */}
                <div className="max-w-sm space-y-3 pt-2">
                  <h3
                    className="font-semibold text-sm text-[#1A2A4A]"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    Change Admin Password
                  </h3>
                  <input
                    type="password"
                    className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                    placeholder="Current password"
                    value={currentAdminPw}
                    onChange={(e) => setCurrentAdminPw(e.target.value)}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  <input
                    type="password"
                    className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                    placeholder="New password"
                    value={newAdminPw}
                    onChange={(e) => setNewAdminPw(e.target.value)}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  <input
                    type="password"
                    className="w-full border border-[#C8D5EB] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#003087]"
                    placeholder="Confirm new password"
                    value={confirmAdminPw}
                    onChange={(e) => setConfirmAdminPw(e.target.value)}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  {adminPwMsg && (
                    <p
                      className="text-xs"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color: adminPwMsg.startsWith('✓') ? 'green' : 'red',
                      }}
                    >
                      {adminPwMsg}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleChangeAdminPassword}
                    className="bg-[#003087] text-white text-sm font-semibold px-4 py-2 rounded hover:bg-[#00236A] transition-colors cursor-pointer"
                    style={{ fontFamily: "'Work Sans', sans-serif" }}
                  >
                    Change Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
