import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PatientTable } from '../dashboard/components/PatientTable'
import { dashboardService } from '@/services/dashboardService'

export default function PatientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: patients = [], isLoading } = useQuery<import('@/services/dashboardService').PatientRow[]>({  
    queryKey: ['patients'],
    queryFn: () => dashboardService.getPatients(),
  })

  const filtered = useMemo(() =>
    patients.filter((p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase())
    ),
    [patients, search]
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{patients.length} total patients</p>
        </div>
        <Button size="sm" onClick={() => navigate('/invite')}>
          <UserPlus size={14} /> Invite patient
        </Button>
      </div>

      <Input
        label=""
        placeholder="Search by name or condition…"
        icon={<Search size={15} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto">
        <PatientTable patients={filtered} isLoading={isLoading} />
      </div>
    </div>
  )
}
