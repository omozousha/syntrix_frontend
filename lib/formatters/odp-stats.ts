import { OperationalStatus, ValidationStatus } from '../types/odp-summary';

export const OPERATIONAL_STATUS_COLORS: Record<OperationalStatus, string> = {
  [OperationalStatus.DRAFT]: 'border-slate-300 bg-slate-50 text-slate-700',
  [OperationalStatus.INSTALLED]: 'border-blue-300 bg-blue-50 text-blue-700',
  [OperationalStatus.ACTIVE]: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  [OperationalStatus.INACTIVE]: 'border-slate-300 bg-slate-50 text-slate-700',
  [OperationalStatus.MAINTENANCE]: 'border-amber-300 bg-amber-50 text-amber-700',
  [OperationalStatus.RETIRED]: 'border-slate-300 bg-slate-50 text-slate-700',
};

export const VALIDATION_STATUS_COLORS: Record<ValidationStatus, string> = {
  [ValidationStatus.VALIDATED]: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  [ValidationStatus.UNVALIDATED]: 'border-slate-300 bg-slate-50 text-slate-700',
};

export function formatValidationRate(
  validated: number,
  total: number
): { rate: string | null; isHigh: boolean } {
  if (total <= 0 || validated < 0) {
    return { rate: null, isHigh: false };
  }

  const rate = Math.round((validated / total) * 100);
  const isHigh = rate >= 80;

  return {
    rate: `${rate}%`,
    isHigh,
  };
}

export function calculateValidationRate(
  validated: number,
  total: number
): number | null {
  if (total <= 0 || validated < 0) {
    return null;
  }
  return Math.round((validated / total) * 100);
}

export function formatPortUsage(
  used: number | null,
  total: number | null
): { label: string; availabilityPct: string | null } {
  const validUsed = used ?? 0;
  const validTotal = total ?? 0;

  let label: string;
  let availabilityPct: string | null = null;

  if (used === null && total === null) {
    label = '--/--';
  } else if (used === null || total === null || total <= 0) {
    label = validUsed > 0 ? `${validUsed}/?` : '?/?';
  } else {
    label = `${validUsed}/${total}`;
    const available = Math.max(0, total - validUsed);
    const availPct = Math.round((available / total) * 100);
    availabilityPct = `${availPct}%`;
  }

  return { label, availabilityPct };
}

export function calculateAvailablePorts(
  total: number | null,
  used: number | null
): number {
  const validTotal = total ?? 0;
  const validUsed = used ?? 0;

  if (total === null || used === null || validTotal <= 0) {
    return 0;
  }

  return Math.max(0, validTotal - validUsed);
}

export function calculateAvailableCores(
  capacity: number | null,
  used: number | null
): number {
  const validCapacity = capacity ?? 0;
  const validUsed = used ?? 0;

  if (capacity === null || used === null || validCapacity <= 0) {
    return 0;
  }

  return Math.max(0, validCapacity - validUsed);
}

export function isUnassignedPOP(popId: string | null): boolean {
  return popId === null || popId.trim() === '';
}

export const UNASSIGNED_POP_LABEL = 'Unassigned';
