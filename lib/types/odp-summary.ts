export enum OperationalStatus {
  DRAFT = 'draft',
  INSTALLED = 'installed',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum ValidationStatus {
  VALIDATED = 'validated',
  UNVALIDATED = 'unvalidated',
}

export interface PortStatistics {
  total: number;
  used: number;
  available: number;
}

export interface OdpListSummary {
  total: number;
  validated: number;
  unvalidated: number;
  validationRate: number | null;
  ports: PortStatistics;
}

export interface OdpPopSummary {
  popId: string | null;
  label: string;
  regionId: string | null;
  total: number;
  validated: number;
  unvalidated: number;
  validationRate: number | null;
  totalPorts: number;
  usedPorts: number;
  availablePorts: number;
}
