import { SettingsNav } from './components/SettingsNav'
import { SecurityTab } from './components/SecurityTab'

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <SettingsNav />
        <div className="flex-1 min-w-0">
          <SecurityTab />
        </div>
      </div>
    </div>
  )
}
