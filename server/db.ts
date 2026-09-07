import mongoose from 'mongoose';
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

let isMongoConnected = false;

export async function initDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI found.');
    return;
  }

  try {
    if (mongoose.connection.readyState === 1) {
      isMongoConnected = true;
      return;
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log('Successfully connected to MongoDB Cloud Database!');

    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      await UserModel.insertMany(DEFAULT_USERS);
    }
  } catch (err: any) {
    console.warn('MongoDB connection warning:', err.message);
    isMongoConnected = false;
  }
}

function sanitizeEntry(e: any): IEntry {
  const startStation = String(e.startStation || 'Attingal');
  const endStation = String(e.endStation || 'Attingal');
  const actualOMR = Number(e.actualOMR) || 0;
  const actualCMR = Number(e.actualCMR) || 0;
  const logbookOMR = Number(e.logbookOMR) || (actualOMR ? calcOpeningOMR(actualOMR, startStation) : 0);
  const logbookCMR = Number(e.logbookCMR) || (actualCMR ? calcClosingCMR(actualCMR, endStation) : 0);
  const km = Number(e.km) || (logbookCMR && logbookOMR ? logbookCMR - logbookOMR : 0);

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

export const DB = {
  async getUsers() {
    if (isMongoConnected) {
      const users = await UserModel.find().lean();
      return users.map((u: any) => ({ ...u, id: u.id || u._id?.toString() }));
    }
    return DEFAULT_USERS;
  },

  async getUserById(id: string) {
    if (isMongoConnected) {
      return await UserModel.findOne({ id }).lean();
    }
    return DEFAULT_USERS.find((u) => u.id === id);
  },

  async getUserByUsername(username: string) {
    if (isMongoConnected) {
      return await UserModel.findOne({ username: username.toLowerCase() }).lean();
    }
    return DEFAULT_USERS.find((u) => u.username.toLowerCase() === username.toLowerCase());
  },

  async createUser(user: IUser) {
    if (isMongoConnected) {
      await UserModel.create(user);
      return user;
    }
    return user;
  },

  async updateUser(id: string, updates: Partial<IUser>) {
    if (isMongoConnected) {
      return await UserModel.findOneAndUpdate({ id }, updates, { returnDocument: 'after' }).lean();
    }
    return null;
  },

  async deleteUser(id: string) {
    if (isMongoConnected) {
      await UserModel.deleteOne({ id });
    }
    return true;
  },

  async getEntries() {
    if (isMongoConnected) {
      const entries = await EntryModel.find().sort({ date: 1, startTime: 1 }).lean();
      return entries.map((e: any) => ({ ...e, id: e.id || e._id?.toString() }));
    }
    return [];
  },

  async saveEntry(entry: IEntry) {
    const clean = sanitizeEntry(entry);
    if (isMongoConnected) {
      await EntryModel.findOneAndUpdate({ id: clean.id }, clean, { upsert: true, returnDocument: 'after' });
    }
    return clean;
  },

  async deleteEntry(id: string) {
    if (isMongoConnected) {
      await EntryModel.deleteOne({ id });
    }
    return true;
  },

  async deleteMonthEntries(monthKey: string) {
    if (isMongoConnected) {
      const regex = new RegExp(`^${monthKey}`);
      const res = await EntryModel.deleteMany({ date: { $regex: regex } });
      return { deleted: res.deletedCount };
    }
    return { deleted: 0 };
  },

  async clearAllEntries() {
    if (isMongoConnected) {
      await EntryModel.deleteMany({});
    }
    return { deleted: true };
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
      const s = await SettingModel.findOne().lean();
      return s ? { ...defaults, ...s } : defaults;
    }
    return defaults;
  },

  async updateSettings(updates: any) {
    if (isMongoConnected) {
      return await SettingModel.findOneAndUpdate({}, { $set: updates }, { upsert: true, returnDocument: 'after' }).lean();
    }
    return updates;
  },
};
