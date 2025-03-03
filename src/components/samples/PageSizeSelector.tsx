'use client'

interface PageSizeSelectorProps {
  pageSize: number
  pageSizeOptions: number[]
}

export function PageSizeSelector({ pageSize, pageSizeOptions }: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="pageSize" className="text-sm text-gray-600">
        Show:
      </label>
      <select
        id="pageSize"
        value={pageSize}
        onChange={(e) => {
          window.location.href = `/samples?pageSize=${e.target.value}&page=1`
        }}
        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        {pageSizeOptions.map(size => (
          <option key={size} value={size}>
            {size} per page
          </option>
        ))}
      </select>
    </div>
  )
} 