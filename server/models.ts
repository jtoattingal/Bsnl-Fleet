import mongoose, { Schema } from 'mongoose';

export interface IUser {
  id: string;
  username: string;
  name: string;
  designation: string;
  password?: string;
  active: boolean;
}

export interface IEntry {
  id: string;
  date: string;
  startTime: string;
  startStation: string;
  actualOMR: number;
  logbookOMR: number;
  placesVisited: string;
  purpose: string;
  endStation: string;
  actualCMR: number;
  logbookCMR: number;
  km: number;
  remarks: string;
  user: string;
}

export interface ISetting {
  key: string;
  value: any;
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    designation: { type: String, default: '' },
    password: { type: String, default: 'Bsnl' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const EntrySchema = new Schema<IEntry>(
  {
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    startStation: { type: String, required: true },
    actualOMR: { type: Number, required: true },
    logbookOMR: { type: Number, required: true },
    placesVisited: { type: String, required: true },
    purpose: { type: String, required: true },
    endStation: { type: String, required: true },
    actualCMR: { type: Number, required: true },
    logbookCMR: { type: Number, required: true },
    km: { type: Number, required: true },
    remarks: { type: String, default: '' },
    user: { type: String, required: true },
  },
  { timestamps: true }
);

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const EntryModel = mongoose.models.Entry || mongoose.model<IEntry>('Entry', EntrySchema);
export const SettingModel = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
