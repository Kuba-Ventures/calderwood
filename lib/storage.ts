// Placeholder storage layer. All "user data" lives in this browser's
// localStorage. Real auth + per-user persistence lands with Supabase.

export type Carrier =
  | "Delta"
  | "Aetna"
  | "Cigna"
  | "MetLife"
  | "UnitedHealthcare"
  | "Guardian"
  | "BCBS"
  | "Humana"
  | "Other";

export const CARRIERS: Carrier[] = [
  "Delta",
  "Aetna",
  "Cigna",
  "MetLife",
  "UnitedHealthcare",
  "Guardian",
  "BCBS",
  "Humana",
  "Other",
];

export type FeeEntry = { code: string; fee: string };

export type Intake = {
  zip: string;
  providerCount: number;
  feeMethod: "csv" | "paste" | "manual";
  feeFilename?: string;
  feePaste?: string;
  feeManual?: FeeEntry[];
  carriers: Carrier[];
  submittedAt: string; // ISO
};

export type Account = {
  practiceName: string;
  primaryEmail: string;
  billingEmail: string;
  phone?: string;
};

export type CodeRow = {
  code: string;
  label: string;
  yourFee: number;
  ucrMedian: number;
  ucrP75: number;
  annualVolume: number;
  gapPerProc: number; // ucrMedian - yourFee (positive means underpaid)
  annualGap: number; // gapPerProc * annualVolume
};

export type CarrierRow = {
  name: Carrier;
  annualGapUsd: number;
  gapPct: number; // 0..1, how far below UCR median on a blended basis
  share: number; // 0..1, share of PPO volume
};

export type ReportData = {
  annualUnderpaymentUsd: number;
  worstCarrier: { name: Carrier; annualGapUsd: number; gapPct: number };
  carriers: CarrierRow[];
  codes: CodeRow[];
  zip: string;
};

export type Report = {
  state: "pending" | "delivered";
  deliveredAt?: string; // ISO
  data?: ReportData;
};

const KEYS = {
  auth: "cw_auth",
  intake: "cw_intake",
  account: "cw_account",
  report: "cw_report",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export const auth = {
  isSignedIn(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(KEYS.auth) === "1";
  },
  signIn(): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEYS.auth, "1");
  },
  signOut(): void {
    remove(KEYS.auth);
  },
};

export const intake = {
  get(): Intake | null {
    return read<Intake>(KEYS.intake);
  },
  set(value: Intake): void {
    write(KEYS.intake, value);
    // First intake creates a pending report.
    if (!report.get()) {
      report.set({ state: "pending" });
    }
  },
  clear(): void {
    remove(KEYS.intake);
  },
};

export const account = {
  get(): Account | null {
    return read<Account>(KEYS.account);
  },
  set(value: Account): void {
    write(KEYS.account, value);
  },
  clear(): void {
    remove(KEYS.account);
  },
};

export const report = {
  get(): Report | null {
    return read<Report>(KEYS.report);
  },
  set(value: Report): void {
    write(KEYS.report, value);
  },
  markDelivered(data?: ReportData, at: string = new Date().toISOString()): void {
    const existing = read<Report>(KEYS.report) ?? { state: "pending" };
    write(KEYS.report, {
      ...existing,
      state: "delivered",
      deliveredAt: at,
      data: data ?? existing.data,
    });
  },
  clear(): void {
    remove(KEYS.report);
  },
};

export function clearAll(): void {
  auth.signOut();
  intake.clear();
  account.clear();
  report.clear();
}

export function expectedDelivery(submittedAt: string): Date {
  const d = new Date(submittedAt);
  d.setHours(d.getHours() + 24);
  return d;
}

export function formatUsd(n: number, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  if (opts.signed) {
    return n < 0 ? `-${formatted}` : `+${formatted}`;
  }
  return n < 0 ? `-${formatted}` : formatted;
}

export function formatPct(n: number, decimals = 0): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
