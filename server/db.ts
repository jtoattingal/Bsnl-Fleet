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
} from '../src/constants';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'db.json');

interface LocalDBData {
  users: any[];
  entries: any[];
  settings: Record<string, any>;
}

let isMongoConnected = false;

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLocalDB(): LocalDBData {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      return JSON.parse(raw);
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
  const uri = process.env.MONGODB_URI;

  if (uri) {
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

    const entryCount = await EntryModel.countDocuments();
    if (entryCount === 0) {
      console.log('Seeding initial MongoDB entries...');
      await EntryModel.insertMany(DEFAULT_ENTRIES as any);
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
        },
      });
    }
  } catch (err) {
    console.error('Error seeding MongoDB:', err);
  }
}

// Unified Database Access Layer (Works with MongoDB when connected, durable JSON otherwise)
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
    if (isMongoConnected) {
      await (UserModel as any).deleteMany({});
      if (users.length > 0) {
        await (UserModel as any).insertMany(users);
      }
    }
    const data = loadLocalDB();
    data.users = users;
    saveLocalDB(data);
    return users;
  },

  async getEntries() {
    if (isMongoConnected) {
      const entries = await (EntryModel as any).find().lean();
      const mapped = entries.map((e: any) => ({
        id: e.id,
        date: e.date,
        startTime: e.startTime,
        startStation: e.startStation,
        actualOMR: e.actualOMR,
        logbookOMR: e.logbookOMR,
        placesVisited: e.placesVisited,
        purpose: e.purpose,
        endStation: e.endStation,
        actualCMR: e.actualCMR,
        logbookCMR: e.logbookCMR,
        km: e.km,
        remarks: e.remarks,
        user: e.user,
      }));
      return mapped.sort((a: any, b: any) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
    }
    const data = loadLocalDB();
    return [...data.entries].sort((a: any, b: any) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  },

  async saveEntry(entry: IEntry) {
    if (isMongoConnected) {
      await (EntryModel as any).findOneAndUpdate({ id: entry.id }, entry, { upsert: true });
    }
    const data = loadLocalDB();
    const idx = data.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      data.entries[idx] = entry;
    } else {
      data.entries.push(entry);
    }
    // Keep sorted by date and start time ascending
    data.entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
    saveLocalDB(data);
    return entry;
  },

  async deleteEntry(id: string) {
    if (isMongoConnected) {
      await (EntryModel as any).deleteOne({ id });
    }
    const data = loadLocalDB();
    data.entries = data.entries.filter((e) => e.id !== id);
    saveLocalDB(data);
    return true;
  },

  async syncEntries(entries: IEntry[]) {
    if (isMongoConnected) {
      await (EntryModel as any).deleteMany({});
      if (entries.length > 0) {
        await (EntryModel as any).insertMany(entries);
      }
    }
    const data = loadLocalDB();
    data.entries = [...entries].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
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
    }
    const data = loadLocalDB();
    const count = data.entries.length;
    data.entries = [];
    saveLocalDB(data);
    return { deleted: count };
  },

  async getSettings() {
    if (isMongoConnected) {
      const doc = await (SettingModel as any).findOne({ key: 'appConfig' }).lean();
      if (doc && doc.value) {
        return doc.value;
      }
    }
    const data = loadLocalDB();
    return (
      data.settings || {
        vehicleRegistration: DEFAULT_VEHICLE_REGISTRATION,
        monthlyAllowance: DEFAULT_MONTHLY_ALLOWANCE,
        logoUrl: '',
        vehicleImg: DEFAULT_VEHICLE_IMG,
        adminPassword: 'Bsnlatt',
      }
    );
  },

  async updateSettings(updates: any) {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };

    if (isMongoConnected) {
      // Purge any and all previous settings/image documents so only the present one is kept in MongoDB
      await (SettingModel as any).deleteMany({});
      await (SettingModel as any).create({
        key: 'appConfig',
        value: updated,
      });
    }

    const data = loadLocalDB();
    // Overwrite previous settings so only present logo and vehicle picture details exist
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
