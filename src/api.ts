import { AppSettings, LogEntry, User } from './types';

const API_BASE = ((import.meta as any).env?.VITE_API_URL || '/api').replace(/\/$/, '');

export const api = {
  async getEntries(): Promise<LogEntry[]> {
    const res = await fetch(`${API_BASE}/entries`);
    if (!res.ok) throw new Error('Failed to fetch entries');
    return res.json();
  },

  async saveEntry(entry: LogEntry): Promise<LogEntry> {
    const isUpdate = Boolean(entry.id);
    const method = isUpdate ? 'PUT' : 'POST';
    const url = isUpdate ? `${API_BASE}/entries/${entry.id}` : `${API_BASE}/entries`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save entry');
    }
    return res.json();
  },

  async deleteEntry(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/entries/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete entry');
    }
    return true;
  },

  async syncEntries(entries: LogEntry[]): Promise<boolean> {
    const res = await fetch(`${API_BASE}/entries/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync entries to database');
    }
    return true;
  },

  async deleteMonthEntries(monthKey: string): Promise<{ deleted: number }> {
    const res = await fetch(`${API_BASE}/entries/month`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthKey }),
    });
    if (!res.ok) throw new Error('Failed to purge month entries from database');
    return res.json();
  },

  async cleanupOldEntries(cutoffMonthKey: string): Promise<{ deleted: number }> {
    const res = await fetch(`${API_BASE}/entries/cleanup-older`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cutoffMonthKey }),
    });
    if (!res.ok) throw new Error('Failed to clean up old entries');
    return res.json();
  },

  async clearAllEntries(): Promise<{ deleted: number }> {
    const res = await fetch(`${API_BASE}/entries/clear-all`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear entries');
    return res.json();
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createUser(userData: {
    username: string;
    name: string;
    designation: string;
    password?: string;
  }): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  async deleteUser(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete user');
    return true;
  },

  async resetUserPassword(id: string): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      // fallback to updateUser with 'Bsnl'
      return this.updateUser(id, { password: 'Bsnl' });
    }
    const data = await res.json();
    return data.user || data;
  },

  async saveUsers(users: User[]): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync users to database');
    }
    return true;
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    return this.updateSettings(settings);
  },

  async login(credentials: {
    username?: string;
    password?: string;
    type: 'user' | 'admin';
  }): Promise<{ success: boolean; user?: User; isAdmin?: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.message || 'Login failed' };
    }
    return data;
  },

  async changeUserPassword(userId: string, currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_BASE}/auth/user-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update password');
    }
    return data;
  },
};
