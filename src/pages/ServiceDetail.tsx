import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ServiceDetailPanel } from './ServiceDetailPanel'

export function ServiceDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2.5 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/services')}>
          <ArrowLeft size={14} className="mr-1" />Back to Services
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ServiceDetailPanel serviceId={id} onDelete={() => navigate('/services')} />
      </div>
    </div>
  )
}
