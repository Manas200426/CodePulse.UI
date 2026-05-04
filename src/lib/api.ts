import type {
  MonitoredService,
  CreateServicePayload,
  UpdateServicePayload,
  ServiceMetrics,
  Incident,
  IncidentCorrelation,
  Anomaly,
  DashboardSummary,
} from '../types'

const BASE_URL = 'http://localhost:5084/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Monitored Services
export const api = {
  services: {
    list: () => request<MonitoredService[]>('/monitoredservices'),
    get: (id: string) => request<MonitoredService>(`/monitoredservices/${id}`),
    create: (data: CreateServicePayload) =>
      request<MonitoredService>('/monitoredservices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateServicePayload) =>
      request<MonitoredService>(`/monitoredservices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/monitoredservices/${id}`, { method: 'DELETE' }),
    runCheck: (id: string) =>
      request<void>(`/monitoredservices/${id}/run-check`, { method: 'POST' }),
    metrics: (id: string) =>
      request<ServiceMetrics>(`/monitoredservices/${id}/metrics`),
  },

  incidents: {
    list: () => request<Incident[]>('/incidents'),
    get: (id: string) => request<Incident>(`/incidents/${id}`),
    correlations: (id: string) =>
      request<IncidentCorrelation[]>(`/incidents/${id}/correlations`),
  },

  anomalies: {
    list: () => request<Anomaly[]>('/anomalies'),
    get: (id: number) => request<Anomaly>(`/anomalies/${id}`),
  },

  dashboard: {
    summary: () => request<DashboardSummary>('/dashboard/summary'),
  },

  setup: {
    reset: () => request<void>('/setup/reset', { method: 'POST' }),
  },
}
