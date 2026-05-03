import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { CreateServicePayload } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'

const defaultForm: CreateServicePayload = {
  name: '',
  baseUrl: '',
  healthEndpoint: '/health',
  checkIntervalSeconds: 60,
  timeoutSeconds: 10,
  isActive: true,
}

export function ServiceForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState<CreateServicePayload>(defaultForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    api.services.get(Number(id))
      .then(svc => {
        setForm({
          name: svc.name,
          baseUrl: svc.baseUrl,
          healthEndpoint: svc.healthEndpoint,
          checkIntervalSeconds: svc.checkIntervalSeconds,
          timeoutSeconds: svc.timeoutSeconds,
          isActive: svc.isActive,
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  function set<K extends keyof CreateServicePayload>(key: K, value: CreateServicePayload[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await api.services.update(Number(id), form)
      } else {
        await api.services.create(form)
      }
      navigate('/services')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={isEdit ? 'Edit Service' : 'Add Service'}
        description={isEdit ? 'Update service configuration' : 'Configure a new service to monitor'}
      />

      <div className="p-6">
        {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
        {!loading && (
          <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="My API"
                className="input"
              />
            </Field>

            <Field label="Base URL">
              <input
                required
                value={form.baseUrl}
                onChange={e => set('baseUrl', e.target.value)}
                placeholder="https://api.example.com"
                className="input"
              />
            </Field>

            <Field label="Health Endpoint">
              <input
                required
                value={form.healthEndpoint}
                onChange={e => set('healthEndpoint', e.target.value)}
                placeholder="/health"
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Check Interval (s)">
                <input
                  required
                  type="number"
                  min={5}
                  value={form.checkIntervalSeconds}
                  onChange={e => set('checkIntervalSeconds', Number(e.target.value))}
                  className="input"
                />
              </Field>
              <Field label="Timeout (s)">
                <input
                  required
                  type="number"
                  min={1}
                  value={form.timeoutSeconds}
                  onChange={e => set('timeoutSeconds', Number(e.target.value))}
                  className="input"
                />
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <label htmlFor="isActive" className="text-sm text-foreground">Active (enable monitoring)</label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Service'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/services')}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--border, 214 32% 91%));
          background: transparent;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: box-shadow 0.15s;
          color: inherit;
        }
        .input:focus {
          box-shadow: 0 0 0 2px var(--ring, #888);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
