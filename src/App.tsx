import React, { useEffect, useState } from 'react';
import { AppSettings, AppView, LogEntry, User } from './types';
import { api } from './api';
import {
  DEFAULT_ENTRIES,
  DEFAULT_MONTHLY_ALLOWANCE,
  DEFAULT_USERS,
  DEFAULT_VEHICLE_IMG,
  DEFAULT_VEHICLE_REGISTRATION,
  sortEntriesChronologically,
} from './constants';
import { LoginView } from './components/LoginView';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { EntryForm } from './components/EntryForm';
import { MonthlyReportView } from './components/MonthlyReportView';

const ADMIN_FALLBACK_USER: User = {
  id: 'admin',
  name: 'Administrator',
  username: 'admin',
  designation: 'Admin',
  password: 'Bsnlatt',
  active: true,
};

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [entries, setEntries] = useState<LogEntry[]>(DEFAULT_ENTRIES);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem('bsnl_cached_settings');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return {
      vehicleRegistration: DEFAULT_VEHICLE_REGISTRATION,
      monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
      logoUrl: '',
      vehicleImg: DEFAULT_VEHICLE_IMG,
      adminPassword: 'Bsnlatt',
    };
  });
  const [editingEntry, setEditingEntry] = useState<LogEntry | undefined>(undefined);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [reportYearMonth, setReportYearMonth] = useState<{ year: number; month: number } | null>(null);

  // Load backend database state on initial render
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedSettings, loadedEntries, loadedUsers] = await Promise.all([
          api.getSettings().catch(() => null),
          api.getEntries().catch(() => DEFAULT_ENTRIES),
          api.getUsers().catch(() => DEFAULT_USERS),
        ]);

        if (loadedSettings) {
          setSettings(loadedSettings);
          try {
            localStorage.setItem('bsnl_cached_settings', JSON.stringify(loadedSettings));
          } catch {}
        }
        if (loadedEntries) setEntries(sortEntriesChronologically(loadedEntries));
        if (loadedUsers && loadedUsers.length > 0) setUsers(loadedUsers);
      } catch (err) {
        console.error('Error initializing data from server:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  function handleLogin(user: User | null) {
    if (user === null) {
      // Admin login
      setIsAdmin(true);
      setCurrentUser(ADMIN_FALLBACK_USER);
      setCurrentView('admin');
    } else {
      // Regular user login
      setIsAdmin(false);
      setCurrentUser(user);
      setCurrentView('user');
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setIsAdmin(false);
    setCurrentView('login');
    setEditingEntry(undefined);
  }

  async function handleSaveEntry(entry: LogEntry) {
    try {
      const saved = await api.saveEntry(entry);
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === saved.id);
        const next = [...prev];
        if (idx >= 0) {
          next[idx] = saved;
        } else {
          next.push(saved);
        }
        return sortEntriesChronologically(next);
      });
      setEditingEntry(undefined);
      setCurrentView(isAdmin ? 'admin' : 'user');
    } catch (err: any) {
      console.error('Error saving entry:', err);
      // Fallback local update
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === entry.id);
        const next = [...prev];
        if (idx >= 0) {
          next[idx] = entry;
        } else {
          next.push(entry);
        }
        return sortEntriesChronologically(next);
      });
      setEditingEntry(undefined);
      setCurrentView(isAdmin ? 'admin' : 'user');
    }
  }

  async function handleDeleteEntry(id: string) {
    try {
      await api.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  function handleStartEditEntry(entry: LogEntry) {
    setEditingEntry(entry);
    setCurrentView('new-entry');
  }

  async function handleUpdateUsers(newUsers: User[]) {
    setUsers(newUsers);
    try {
      await api.saveUsers(newUsers);
    } catch (err) {
      console.error('Failed to sync users to backend:', err);
    }
  }

  async function handleUpdateUserPassword(userId: string, newPass: string) {
    const updated = users.map((u) => (u.id === userId ? { ...u, password: newPass } : u));
    setUsers(updated);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, password: newPass });
    }
    try {
      await api.saveUsers(updated);
    } catch (err) {
      console.error('Failed to update user password on backend:', err);
    }
  }

  async function handleResetUserPassword(userId: string) {
    const updated = users.map((u) => (u.id === userId ? { ...u, password: 'Bsnl' } : u));
    setUsers(updated);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, password: 'Bsnl' });
    }
    try {
      await api.resetUserPassword(userId);
      await api.saveUsers(updated);
    } catch (err) {
      console.error('Failed to reset user password on backend:', err);
    }
  }

  async function handleUpdateLogo(url: string): Promise<void> {
    const updated = await api.updateSettings({ logoUrl: url });
    setSettings(updated);
    try {
      localStorage.setItem('bsnl_cached_settings', JSON.stringify(updated));
    } catch {}
  }

  async function handleUpdateVehicleImg(url: string): Promise<void> {
    const updated = await api.updateSettings({ vehicleImg: url });
    setSettings(updated);
    try {
      localStorage.setItem('bsnl_cached_settings', JSON.stringify(updated));
    } catch {}
  }

  async function handleChangeAdminPassword(newPw: string) {
    const updated = await api.updateSettings({ adminPassword: newPw });
    setSettings(updated);
    try {
      localStorage.setItem('bsnl_cached_settings', JSON.stringify(updated));
    } catch {}
    return updated;
  }

  async function handleToggleMonthClose(monthKey: string) {
    const currentClosed = settings.closedMonths || [];
    const isAlreadyClosed = currentClosed.includes(monthKey);
    const updatedClosed = isAlreadyClosed
      ? currentClosed.filter((m) => m !== monthKey)
      : [...currentClosed, monthKey];

    const updated = await api.updateSettings({ closedMonths: updatedClosed });
    setSettings(updated);
    try {
      localStorage.setItem('bsnl_cached_settings', JSON.stringify(updated));
    } catch {}
    return updated;
  }

  async function handleSyncEntries(updatedEntries?: LogEntry[]): Promise<boolean> {
    const listToSave = sortEntriesChronologically(updatedEntries || entries);
    setEntries(listToSave);
    try {
      await api.syncEntries(listToSave);
      return true;
    } catch (err) {
      console.error('Failed to sync entries to database:', err);
      throw err;
    }
  }

  async function handleSyncUsers(updatedUsers?: User[]): Promise<boolean> {
    const listToSave = updatedUsers || users;
    setUsers(listToSave);
    try {
      await api.saveUsers(listToSave);
      return true;
    } catch (err) {
      console.error('Failed to sync users to database:', err);
      throw err;
    }
  }

  async function handleDeleteMonthEntries(monthKey: string): Promise<{ deleted: number }> {
    try {
      const res = await api.deleteMonthEntries(monthKey);
      setEntries((prev) => prev.filter((e) => !e.date.startsWith(monthKey)));
      return res;
    } catch (err) {
      console.error('Failed to purge month entries from backend:', err);
      setEntries((prev) => prev.filter((e) => !e.date.startsWith(monthKey)));
      return { deleted: 0 };
    }
  }

  async function handleClearSampleData() {
    try {
      await api.clearAllEntries();
      setEntries([]);
    } catch (err) {
      console.error('Failed to clear entries on backend:', err);
      setEntries([]);
    }
  }

  async function handleCleanupOldEntries(cutoffMonthKey: string) {
    try {
      const res = await api.cleanupOldEntries(cutoffMonthKey);
      setEntries((prev) => prev.filter((e) => e.date > `${cutoffMonthKey}-31`));
      return res;
    } catch (err) {
      console.error('Failed to cleanup old entries on backend:', err);
      setEntries((prev) => prev.filter((e) => e.date > `${cutoffMonthKey}-31`));
    }
  }

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#EEF2F9] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#003087] border-t-transparent rounded-full animate-spin mb-3" />
        <p
          className="text-xs text-[#5A6A82] font-medium"
          style={{ fontFamily: "'Work Sans', sans-serif" }}
        >
          Loading BSNL Digital Logbook...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F9] text-[#1A2A4A] font-sans antialiased">
      {currentView === 'login' && (
        <LoginView
          onLogin={handleLogin}
          logoUrl={settings.logoUrl}
          vehicleImg={settings.vehicleImg}
          vehicleRegistration={settings.vehicleRegistration}
          users={users}
          onApiLogin={api.login}
        />
      )}

      {currentView === 'user' && currentUser && (
        <UserDashboard
          currentUser={currentUser}
          entries={entries}
          logoUrl={settings.logoUrl}
          vehicleRegistration={settings.vehicleRegistration}
          closedMonths={settings.closedMonths || []}
          onNewEntry={() => {
            setEditingEntry(undefined);
            setCurrentView('new-entry');
          }}
          onReport={(year, month) => {
            if (year !== undefined && month !== undefined) {
              setReportYearMonth({ year, month });
            }
            setCurrentView('report');
          }}
          onLogout={handleLogout}
          onUpdatePassword={handleUpdateUserPassword}
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard
          entries={entries}
          users={users}
          onUpdateUsers={handleUpdateUsers}
          onResetUserPassword={handleResetUserPassword}
          logoUrl={settings.logoUrl}
          vehicleImg={settings.vehicleImg}
          onUpdateLogo={handleUpdateLogo}
          onUpdateVehicleImg={handleUpdateVehicleImg}
          onLogout={handleLogout}
          onEditEntry={handleStartEditEntry}
          onDeleteEntry={handleDeleteEntry}
          adminPassword={settings.adminPassword || 'Bsnlatt'}
          onChangeAdminPassword={handleChangeAdminPassword}
          vehicleRegistration={settings.vehicleRegistration}
          closedMonths={settings.closedMonths || []}
          onToggleMonthClose={handleToggleMonthClose}
          onClearSampleData={handleClearSampleData}
          onCleanupOldEntries={handleCleanupOldEntries}
          onSyncEntries={handleSyncEntries}
          onSyncUsers={handleSyncUsers}
          onDeleteMonthEntries={handleDeleteMonthEntries}
          onOpenReport={(year, month) => {
            if (year !== undefined && month !== undefined) {
              setReportYearMonth({ year, month });
            }
            setCurrentView('report');
          }}
        />
      )}

      {currentView === 'new-entry' && (
        <EntryForm
          currentUser={currentUser || ADMIN_FALLBACK_USER}
          editEntry={editingEntry}
          existingEntries={entries}
          closedMonths={settings.closedMonths || []}
          isAdmin={isAdmin}
          onSave={handleSaveEntry}
          onCancel={() => {
            setEditingEntry(undefined);
            setCurrentView(isAdmin ? 'admin' : 'user');
          }}
        />
      )}

      {currentView === 'report' && currentUser && (
        <MonthlyReportView
          entries={entries}
          currentUser={currentUser}
          logoUrl={settings.logoUrl}
          vehicleRegistration={settings.vehicleRegistration}
          monthlyAllowance={settings.monthlyAllowance}
          closedMonths={settings.closedMonths || []}
          isAdmin={isAdmin}
          onToggleMonthClose={handleToggleMonthClose}
          initialYear={reportYearMonth?.year}
          initialMonth={reportYearMonth?.month}
          onBack={() => setCurrentView(isAdmin ? 'admin' : 'user')}
        />
      )}
    </div>
  );
}

export default App;
