export interface MonitoredService {
  id: number;
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  checkIntervalSeconds: number;
  timeoutSeconds: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface HealthCheckResult {
  id: number;
  serviceId: number;
  statusCode: number | null;
  responseTimeMs: number | null;
  isSuccess: boolean;
  errorMessage: string | null;
  checkedAtUtc: string;
}

export type IncidentStatus = "Active" | "Resolved";
export type IncidentSeverity = "Low" | "Medium" | "High";

export interface Incident {
  id: number;
  serviceId: number;
  serviceName?: string;
  status: IncidentStatus;
  reason: string;
  failureCount: number;
  severity: IncidentSeverity;
  startedAtUtc: string;
  resolvedAtUtc: string | null;
}

export type AnomalyType =
  | "LatencySpike"
  | "ErrorRateSpike"
  | "ConsecutiveFailures";
export type AnomalyStatus = "Active" | "Resolved";

export interface Anomaly {
  id: number;
  serviceId: number;
  serviceName?: string;
  type: AnomalyType;
  currentValue: number;
  baselineValue: number;
  deviation: number;
  status: AnomalyStatus;
  detectedAtUtc: string;
  resolvedAtUtc: string | null;
}

export interface IncidentCorrelation {
  id: number;
  downstreamIncidentId: number;
  upstreamIncidentId: number;
  downstreamServiceId: number;
  upstreamServiceId: number;
  upstreamServiceName?: string;
  downstreamServiceName?: string;
  confidenceScore: number;
  timeDifferenceMinutes: number;
  detectedAtUtc: string;
}

export interface ServiceMetrics {
  uptimePercent: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
}

export interface DashboardServiceSummary {
  id: string;
  name: string;
  healthStatus: "Healthy" | "Degraded" | "Down";
  hasActiveIncident: boolean;
  hasActiveAnomaly: boolean;
  latestResponseMs: number;
  lastCheckSuccess: boolean;
  lastCheckedAtUtc: string;
}

export interface DashboardSummary {
  totalServices: number;
  activeIncidents: number;
  activeAnomalies: number;
  healthyServices: number;
  degradedServices: number;
  downServices: number;
  services: DashboardServiceSummary[];
}

export interface CreateServicePayload {
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  checkIntervalSeconds: number;
  timeoutSeconds: number;
  isActive: boolean;
}

export type UpdateServicePayload = CreateServicePayload;
