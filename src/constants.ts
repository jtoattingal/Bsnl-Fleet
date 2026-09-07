import { LogEntry, RouteStep, Station, User } from './types';

export const STATION_OFFSETS: Record<Station, number> = {
  Attingal: 5,
  Kallambalam: 14,
  Kilimanoor: 17,
};

export const OPENING_STEPS: Record<Station, RouteStep[]> = {
  Attingal: [{ label: 'Garage → Attingal', km: 5 }],
  Kallambalam: [
    { label: 'Garage → Attingal', km: 5 },
    { label: 'Attingal → Kallambalam', km: 9 },
  ],
  Kilimanoor: [
    { label: 'Garage → Attingal', km: 5 },
    { label: 'Attingal → Kilimanoor', km: 12 },
  ],
};

export const CLOSING_STEPS: Record<Station, RouteStep[]> = {
  Attingal: [{ label: 'Attingal → Garage', km: 5 }],
  Kallambalam: [
    { label: 'Kallambalam → Attingal', km: 9 },
    { label: 'Attingal → Garage', km: 5 },
  ],
  Kilimanoor: [
    { label: 'Kilimanoor → Attingal', km: 12 },
    { label: 'Attingal → Garage', km: 5 },
  ],
};

export const DEFAULT_VEHICLE_REGISTRATION = 'KL 19 L 6865';
export const DEFAULT_MONTHLY_ALLOWANCE = 2000;
export const DEFAULT_VEHICLE_IMG = '/vehicle.jpeg';
 
export const DEFAULT_USERS: User[] = [
  {
    id: '1',
    username: 'jto_attingal',
    name: 'JTO (Network), Attingal',
    designation: 'Junior Telecom Officer (Network)',
    password: 'Bsnl',
    active: true,
  },
  {
    id: '2',
    username: 'jto_varkala',
    name: 'JTO (Network), Varkala',
    designation: 'Junior Telecom Officer (Network)',
    password: 'Bsnl',
    active: true,
  },
  {
    id: '3',
    username: 'sde_kilimanoor',
    name: 'SDE (Network), Kilimanoor',
    designation: 'Sub-Divisional Engineer (Network)',
    password: 'Bsnl',
    active: true,
  },
  {
    id: '4',
    username: 'agm_attingal',
    name: 'AGM (Network), Attingal',
    designation: 'Assistant General Manager (Network)',
    password: 'Bsnl',
    active: true,
  },
];

export const DEFAULT_ENTRIES: LogEntry[] = [
  {
    id: '1',
    date: '2026-09-01',
    startTime: '09:00',
    startStation: 'Attingal',
    actualOMR: 12340,
    logbookOMR: 12335,
    placesVisited: 'Attingal, Varkala, Chirayinkeezhu',
    purpose: 'BTS maintenance, battery reading',
    endStation: 'Attingal',
    actualCMR: 12412,
    logbookCMR: 12417,
    km: 82,
    remarks: '',
    user: 'jto_attingal',
  },
  {
    id: '2',
    date: '2026-09-02',
    startTime: '08:30',
    startStation: 'Kallambalam',
    actualOMR: 12412,
    logbookOMR: 12398,
    placesVisited: 'Kallambalam, Kilimanoor, Attingal',
    purpose: 'Site inspection, office work',
    endStation: 'Kilimanoor',
    actualCMR: 12530,
    logbookCMR: 12547,
    km: 149,
    remarks: '',
    user: 'sde_kilimanoor',
  },
  {
    id: '3',
    date: '2026-09-04',
    startTime: '10:00',
    startStation: 'Attingal',
    actualOMR: 12530,
    logbookOMR: 12525,
    placesVisited: 'Attingal, Varkala',
    purpose: 'Network fault rectification',
    endStation: 'Attingal',
    actualCMR: 12574,
    logbookCMR: 12579,
    km: 54,
    remarks: '',
    user: 'jto_varkala',
  },
];

export const START_BREAKDOWNS: Record<string, RouteStep[]> = OPENING_STEPS;
export const END_BREAKDOWNS: Record<string, RouteStep[]> = CLOSING_STEPS;

export function calcLogbookOMR(actualOMR: number, station: Station | string): number {
  return actualOMR - (STATION_OFFSETS[station as Station] ?? 0);
}

export function calcLogbookCMR(actualCMR: number, station: Station | string): number {
  return actualCMR + (STATION_OFFSETS[station as Station] ?? 0);
}

export const calcOpeningOMR = calcLogbookOMR;
export const calcClosingCMR = calcLogbookCMR;

export function formatDisplayDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const formatDate = formatDisplayDate;

export function sortEntriesChronologically(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
}

export function formatMonthYear(year: number, month: number): string {
  try {
    return new Date(year, month, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return `${month + 1}/${year}`;
  }
}

export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function isMonthEnded(year: number, month: number): boolean {
  const now = new Date();
  // The last millisecond of the month (month is 0-indexed)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return now.getTime() > endOfMonth.getTime();
}

export function isDateFuture(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr > today;
}

export function getFourthLastMonth(): { year: number; month: number; key: string; label: string } {
  const now = new Date();
  // 4th last month (e.g., if September 2026, 4 months ago is May 2026)
  const target = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  const y = target.getFullYear();
  const m = target.getMonth();
  const key = `${y}-${String(m + 1).padStart(2, '0')}`;
  const label = formatMonthYear(y, m);
  return { year: y, month: m, key, label };
}
