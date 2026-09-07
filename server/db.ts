import fs from 'fs';
import path from 'path';
import { IUser, IEntry } from './models';
import {
  DEFAULT_ENTRIES,
  DEFAULT_MONTHLY_ALLOWANCE,
  DEFAULT_USERS,
  DEFAULT_VEHICLE_IMG,
  DEFAULT_VEHICLE_REGISTRATION,
  calcOpeningOMR,
  calcClosingCMR,
} from '../src/constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'db.json');

interface LocalDBData {
  users: any[];
  entries: any[];
  settings: Record<string, any>;
}

// Local storage folder creation
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Data folder check:', e);
}

function loadLocalDB(): LocalDBData {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (!Array.isArray(parsed.entries)) {
          parsed.entries = parsed.settings?.sampleDataCleared ? [] : DEFAULT_ENTRIES;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read local DB file:', err);
  }

  const initialData: LocalDBData = {
    users: DEFAULT_USERS,
    entries: DEFAULT_ENTRIES,
    settings: {
      vehicleRegistration: DEFAULT_VEHICLE_REGISTRATION,
      monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
      logoUrl: '',
      vehicleImg: DEFAULT_VEHICLE_IMG,
      adminPassword: 'Bsnlatt',
      closedMonths: [],
      sampleDataCleared: false,
    },
  };

  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(initialData, null, 2));
  } catch (e) {
    console.error('Could not write initial db.json:', e);
  }

  return initialData;
}

function saveLocalDB(data: LocalDBData) {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to write local DB file:', err);
  }
}

export async function initDatabase() {
  loadLocalDB();
}

function sortEntriesList(entries: any[]) {
  if (!Array.isArray(entries)) return [];
  return [...entries].sort((a, b) => {
    const dateA = String(a?.date || '');
    const dateB = String(b?.date || '');
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = String(a?.startTime || '');
    const timeB = String(b?.startTime || '');
    return timeA.localeCompare(timeB);
  });
}

function sanitizeEntry(e: any): IEntry {
  const startStation = String(e.startStation || 'Attingal');
  const endStation = String(e.endStation || 'Attingal');
  const actualOMR = Number(e.actualOMR) || 0;
  const actualCMR = Number(e.actualCMR) || 0;

  const logbookOMR =
    Number(e.logbookOMR) || (actualOMR ? calcOpeningOMR(actualOMR, startStation) : 0);
  const logbookCMR =
    Number(e.logbookCMR) || (actualCMR ? calcClosingCMR(actualCMR, endStation) : 0);
  const km =
    Number(e.km) || (logbookCMR && logbookOMR ? logbookCMR - logbookOMR : 0);

  return {
    id: String(e.id || Date.now().toString() + Math.floor(Math.random() * 1000)),
    date: String(e.date || ''),
    startTime: String(e.startTime || ''),
    startStation,
    actualOMR,
    logbookOMR,
    placesVisited: String(e.placesVisited || ''),
    purpose: String(e.purpose || ''),
    endStation,
    actualCMR,
    logbookCMR,
    km,
    remarks: String(e.remarks || ''),
    user: String(e.user || ''),
  };
}

function sanitizeUser(u: any): IUser {
  return {
    id: String(u.id || Date.now().toString() + Math.floor(Math.random() * 1000)),
    username: String(u.username || '').trim().toLowerCase(),
    name: String(u.name || '').trim(),
    designation: String(u.designation || '').trim(),
    password: String(u.password || 'Bsnl'),
    active: u.active !== false,
  };
}

export const DB = {
  async getUsers() {
    const data = loadLocalDB();
    return data.users;
  },

  async getUserById(id: string) {
    const data = loadLocalDB();
    return data.users.find((u) => u.id === id);
  },

  async getUserByUsername(username: string) {
    const data = loadLocalDB();
    return data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  },

  async createUser(user: IUser) {
    const data = loadLocalDB();
    data.users.push(user);
    saveLocalDB(data);
    return user;
  },

  async updateUser(id: string, updates: Partial<IUser>) {
    const data = loadLocalDB();
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx >= 0) {
      data.users[idx] = { ...data.users[idx], ...updates };
      saveLocalDB(data);
      return data.users[idx];
    }
    return null;
  },

  async deleteUser(id: string) {
    const data = loadLocalDB();
    data.users = data.users.filter((u) => u.id !== id);
    saveLocalDB(data);
    return true;
  },

  async syncUsers(users: any[]) {
    const cleanUsers = (users || []).map(sanitizeUser);
    const data = loadLocalDB();
    data.users = cleanUsers;
    saveLocalDB(data);
    return cleanUsers;
  },

  async getEntries() {
    const data = loadLocalDB();
    return sortEntriesList(data.entries || []);
  },

  async saveEntry(entry: IEntry) {
    const clean = sanitizeEntry(entry);
    const data = loadLocalDB();
    if (!Array.isArray(data.entries)) data.entries = [];
    const idx = data.entries.findIndex((e) => e.id === clean.id);
    if (idx >= 0) {
      data.entries[idx] = clean;
    } else {
      data.entries.push(clean);
    }
    data.entries = sortEntriesList(data.entries);
    saveLocalDB(data);
    return clean;
  },

  async deleteEntry(id: string) {
    const data = loadLocalDB();
    data.entries = (data.entries || []).filter((e) => e.id !== id);
    saveLocalDB(data);
    return true;
  },

  async syncEntries(entries: IEntry[]) {
    const cleanEntries = (entries || []).map(sanitizeEntry);
    const data = loadLocalDB();
    data.entries = sortEntriesList(cleanEntries);
    saveLocalDB(data);
    return data.entries;
  },

  async deleteMonthEntries(monthKey: string) {
    const data = loadLocalDB();
    const countBefore = data.entries.length;
    data.entries = data.entries.filter((e) => !e.date.startsWith(monthKey));
    saveLocalDB(data);
    return { deleted: countBefore - data.entries.length };
  },

  async deleteOldEntries(cutoffMonthKey: string) {
    const cutoffDate = `${cutoffMonthKey}-31`;
    const data = loadLocalDB();
    const countBefore = data.entries.length;
    data.entries = data.entries.filter((e) => e.date > cutoffDate);
    saveLocalDB(data);
    return { deleted: countBefore - data.entries.length };
  },

  async clearAllEntries() {
    const data = loadLocalDB();
    const count = (data.entries || []).length;
    data.entries = [];
    if (!data.settings) data.settings = {};
    data.settings.sampleDataCleared = true;
    saveLocalDB(data);
    return { deleted: count, sampleDataCleared: true };
  },

  async getSettings() {
    const defaults = {
      vehicleRegistration: DEFAULT_VEHICLE_REGISTRATION,
      monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
      logoUrl: '',
      vehicleImg: DEFAULT_VEHICLE_IMG,
      adminPassword: 'Bsnlatt',
      closedMonths: [],
    };
    const data = loadLocalDB();
    return {
      ...defaults,
      ...(data.settings || {}),
    };
  },

  async updateSettings(updates: any) {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    const data = loadLocalDB();
    data.settings = updated;
    saveLocalDB(data);
    return updated;
  },

  async resetToDefaults() {
    const initialData: LocalDBData = {
      users: [...DEFAULT_USERS],
      entries: [...DEFAULT_ENTRIES],
      settings: {
        vehicleRegistration: DEFAULT_VEHICLE_REGISTRATION,
        monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
        logoUrl: '',
        vehicleImg: DEFAULT_VEHICLE_IMG,
        adminPassword: 'Bsnlatt',
      },
    };
    saveLocalDB(initialData);
    return initialData;
  },
};
