import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { EntryModel, SettingModel, UserModel, IUser, IEntry } from './models';
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

let isMongoConnected = false;

// Ensure data folder exists ONLY in local development, NOT on Vercel
if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create data directory:', e);
  }
}

function loadLocalDB(): LocalDBData {
  try {
    if (!process.env.VERCEL && fs.existsSync(BACKUP_FILE)) {
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

  if (!process.env.VERCEL) {
    try {
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(initialData, null, 2));
    } catch (e) {
      console.error('Could not write initial db.json:', e);
    }
  }

  return initialData;
}

function saveLocalDB(data: LocalDBData) {
  if (process.env.VERCEL) return; // Skip writing local files on Vercel
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to write local DB file:', err);
  }
}

export async function initDatabase() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    if (mongoose.connection.readyState === 1) {
      isMongoConnected = true;
      return;
    }
    try {
      console.log('Connecting to MongoDB at:', uri.replace(/:([^:@]{3,})@/, ':***@'));
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      isMongoConnected = true;
      console.log('✓ Connected to MongoDB successfully.');
      await seedMongoIfEmpty();
      return;
    } catch (err: any) {
      console.warn('MongoDB connection failed, operating with durable local storage:', err.message);
      isMongoConnected = false;
    }
  } else {
    console.log('MONGODB_URI not provided. Operating with durable local storage repository.');
  }

  // Ensure local DB has default data
  loadLocalDB();
}

async function seedMongoIfEmpty() {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('Seeding initial MongoDB users...');
      await UserModel.insertMany(DEFAULT_USERS as any);
    }

    const existingSettings = await SettingModel.findOne({ key: 'appConfig' } as any);
    if (!existingSettings) {
      console.log('Seeding initial MongoDB settings...');
      await SettingModel.create({
        key: 'appConfig',
        value: {
          vehicleRegistration: DEFAULT_VEHICLE_REGISTRATION,
          monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
          logoUrl: '',
          vehicleImg: DEFAULT_VEHICLE_IMG,
          adminPassword: 'Bsnlatt',
          closedMonths: [],
          sampleDataCleared: false,
        },
      });
    }

    const settingsVal = (existingSettings as any)?.value || {};
    if (!settingsVal.sampleDataCleared) {
      const entryCount = await EntryModel.countDocuments();
      if (entryCount === 0) {
        console.log('Seeding initial MongoDB entries...');
        await EntryModel.insertMany(DEFAULT_ENTRIES as any);
      }
    }
  } catch (err) {
    console.error('Error seeding MongoDB:', err);
  }
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

// Unified Database Access Layer
export const DB = {
  async getUsers() {
    if (isMongoConnected) {
      const users = await (UserModel as any).find().lean();
      return users.map((u: any) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        designation: u.designation,
        password: u.password,
        active: u.active,
      }));
    }
    const data = loadLocalDB();
    return data.users;
  },

  async getUserById(id: string) {
    if (isMongoConnected) {
      return await (UserModel as any).findOne({ id }).lean();
    }
    const data = loadLocalDB();
    return data.users.find((u) => u.id === id);
  },

  async getUserByUsername(username: string) {
    if (isMongoConnected) {
      return await (UserModel as any).findOne({ username: new RegExp(`^${username}$`, 'i') }).lean();
    }
    const data = loadLocalDB();
    return data.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  },

  async createUser(user: IUser) {
    if (isMongoConnected) {
      await (UserModel as any).create(user);
    }
    const data = loadLocalDB();
    data.users.push(user);
    saveLocalDB(data);
    return user;
  },

  async updateUser(id: string, updates: Partial<IUser>) {
    if (isMongoConnected) {
      await (UserModel as any).updateOne({ id }, { $set: updates });
    }
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
    if (isMongoConnected) {
      await (UserModel as any).deleteOne({ id });
    }
    const data = loadLocalDB();
    data.users = data.users.filter((u) => u.id !== id);
    saveLocalDB(data);
    return true;
  },

  async syncUsers(users: any[]) {
    const cleanUsers = (users || []).map(sanitizeUser);
    if (isMongoConnected) {
      await (UserModel as any).deleteMany({});
      if (cleanUsers.length > 0) {
        await (UserModel as any).insertMany(cleanUsers);
      }
    }
    const data = loadLocalDB();
    data.users = cleanUsers;
    saveLocalDB(data);
    return cleanUsers;
  },

  async getEntries() {
    if (isMongoConnected) {
      const entries = await (EntryModel as any).find().lean();
      const mapped = entries.map((e: any) => sanitizeEntry(e));
      return sortEntriesList(mapped);
    }
    const data = loadLocalDB();
    return sortEntriesList(data.entries || []);
  },

  async saveEntry(entry: IEntry) {
    const clean = sanitizeEntry(entry);
    if (isMongoConnected) {
      await (EntryModel as any).findOneAndUpdate({ id: clean.id }, clean, { upsert: true });
    }
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
    if (isMongoConnected) {
      await (EntryModel as any).deleteOne({ id });
    }
    const data = loadLocalDB();
    data.entries = (data.entries || []).filter((e) => e.id !== id);
    saveLocalDB(data);
    return true;
  },

  async syncEntries(entries: IEntry[]) {
    const cleanEntries = (entries || []).map(sanitizeEntry);
    if (isMongoConnected) {
      await (EntryModel as any).deleteMany({});
      if (cleanEntries.length > 0) {
        await (EntryModel as any).insertMany(cleanEntries);
      }
    }
    const data = loadLocalDB();
    data.entries = sortEntriesList(cleanEntries);
    saveLocalDB(data);
    return data.entries;
  },

  async deleteMonthEntries(monthKey: string) {
    if (isMongoConnected) {
      await (EntryModel as any).deleteMany({ date: { $regex: `^${monthKey}` } });
    }
    const data = loadLocalDB();
    const countBefore = data.entries.length;
    data.entries = data.entries.filter((e) => !e.date.startsWith(monthKey));
    saveLocalDB(data);
    return { deleted: countBefore - data.entries.length };
  },

  async deleteOldEntries(cutoffMonthKey: string) {
    const cutoffDate = `${cutoffMonthKey}-31`;
    if (isMongoConnected) {
      await (EntryModel as any).deleteMany({ date: { $lte: cutoffDate } });
    }
    const data = loadLocalDB();
    const countBefore = data.entries.length;
    data.entries = data.entries.filter((e) => e.date > cutoffDate);
    saveLocalDB(data);
    return { deleted: countBefore - data.entries.length };
  },

  async clearAllEntries() {
    if (isMongoConnected) {
      await (EntryModel as any).deleteMany({});
      try {
        const current = await this.getSettings();
        await (SettingModel as any).findOneAndUpdate(
          { key: 'appConfig' },
          { key: 'appConfig', value: { ...current, sampleDataCleared: true } },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error setting sampleDataCleared in MongoDB:', err);
      }
    }
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

    if (isMongoConnected) {
      try {
        const doc = await (SettingModel as any).findOne({ key: 'appConfig' }).lean();
        if (doc && doc.value) {
          return { ...defaults, ...doc.value };
        }
      } catch (err) {
        console.error('Error reading settings from MongoDB:', err);
      }
    }
    const data = loadLocalDB();
    return {
      ...defaults,
      ...(data.settings || {}),
    };
  },

  async updateSettings(updates: any) {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };

    if (isMongoConnected) {
      try {
        await (SettingModel as any).findOneAndUpdate(
          { key: 'appConfig' },
          { key: 'appConfig', value: updated },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('Error saving settings to MongoDB:', err);
      }
    }

    const data = loadLocalDB();
    data.settings = updated;
    saveLocalDB(data);
    return updated;
  },

  async resetToDefaults() {
    if (isMongoConnected) {
      await (UserModel as any).deleteMany({});
      await (EntryModel as any).deleteMany({});
      await (SettingModel as any).deleteMany({});
      await (UserModel as any).insertMany(DEFAULT_USERS);
      await (EntryModel as any).insertMany(DEFAULT_ENTRIES);
      await (SettingModel as any).create({
        key: 'appConfig',
        value: {
          vehicleRegistration: DEFAULT_VEHICLE_REGISTRATION,
          monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
          logoUrl: '',
          vehicleImg: DEFAULT_VEHICLE_IMG,
          adminPassword: 'Bsnlatt',
        },
      });
    }
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
