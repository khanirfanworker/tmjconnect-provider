import { cn } from '@/lib/cn'

export type FilterTab = 'all' | 'needs_attention' | 'recent' | 'no_activity' | 'pending_invites'
export type SortOption = 'urgency' | 'name' | 'last_activity' | 'pain_level' | 'adherence'

interface FilterTabItem {
  key: FilterTab
  label: string
  count: number
}

const TABS: FilterTabItem[] = [
  { key: 'all',             label: 'All Patients',      count: 142 },
  { key: 'needs_attention', label: 'Needs Attention',   count: 2 },
  { key: 'recent',          label: 'Recent Activity',   count: 38 },
  { key: 'no_activity',     label: 'No Activity: 7d',   count: 12 },
  { key: 'pending_invites', label: 'Pending Invites',   count: 4 },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'urgency',       label: 'Urgency (high to low)' },
  { value: 'name',          label: 'Name (A–Z)' },
  { value: 'last_activity', label: 'Last Activity' },
  { value: 'pain_level',    label: 'Pain Level (high to low)' },
  { value: 'adherence',     label: 'Exercise Adherence' },
]

interface PatientFiltersProps {
  activeTab: FilterTab
  sortBy: SortOption
  onTabChange: (tab: FilterTab) => void
  onSortChange: (sort: SortOption) => void
}

export function PatientFilters({
  activeTab, sortBy, onTabChange, onSortChange,
}: PatientFiltersProps) {
  return (
    <div className="flex flex-col gap-3">

      {/* Filter tabs — scrollable on small screens */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-shrink-0">
        {TABS.map(({ key, label, count }) => {
          const isActive = activeTab === key
          const isUrgent = key === 'needs_attention'
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5',
                'text-xs font-semibold transition-all border',
                isActive
                  ? 'text-white border-transparent'
                  : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
              style={isActive ? { backgroundColor: '#0e2040', borderColor: '#0e2040' } : {}}
            >
              {label}
              <span
                className={cn(
                  'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-bold',
                  isActive
                    ? 'bg-white/20 text-white'
                    : isUrgent
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-500',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sort dropdown */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-slate-400 hidden sm:block">Sort by</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs
                     font-medium text-slate-700 focus:outline-none focus:ring-2
                     focus:ring-offset-1 cursor-pointer"
          style={{ focusRingColor: '#c49526' } as React.CSSProperties}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

    </div>
  )
}
