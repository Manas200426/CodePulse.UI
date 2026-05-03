import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { ServicesList } from '@/pages/ServicesList'
import { ServiceDetail } from '@/pages/ServiceDetail'
import { ServiceForm } from '@/pages/ServiceForm'
import { IncidentsList } from '@/pages/IncidentsList'
import { IncidentDetail } from '@/pages/IncidentDetail'
import { AnomaliesList } from '@/pages/AnomaliesList'
import { Insights } from '@/pages/Insights'
import { Setup } from '@/pages/Setup'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="services" element={<ServicesList />} />
          <Route path="services/new" element={<ServiceForm />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          <Route path="services/:id/edit" element={<ServiceForm />} />
          <Route path="incidents" element={<IncidentsList />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="anomalies" element={<AnomaliesList />} />
          <Route path="insights" element={<Insights />} />
          <Route path="setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
