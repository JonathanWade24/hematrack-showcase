interface StatsCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
}

export function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          </div>
          {icon && (
            <div className="text-gray-400">
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 