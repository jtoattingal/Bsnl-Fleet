export type Station = 'Attingal' | 'Kallambalam' | 'Kilimanoor';

export interface RouteStep {
  label: string;
  km: number;
}

export interface LogEntry {
  id: string;
  date: string;
  startTime: string;
  startStation: Station;
  actualOMR: number;
  logbookOMR: number;
  placesVisited: string;
  purpose: string;
  endStation: Station;
  actualCMR: number;
  logbookCMR: number;
  km: number;
  remarks: string;
  user: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  designation: string;
  password?: string;
  active: boolean;
}

export interface AppSettings {
  vehicleRegistration: string;
  monthlyAllowance: number;
  logoUrl: string;
  vehicleImg: string;
  adminPassword?: string;
  closedMonths?: string[];
  sampleDataCleared?: boolean;
}

export type AppView = 'login' | 'user' | 'admin' | 'new-entry' | 'report';
