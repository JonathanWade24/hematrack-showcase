'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PageSizeSelectorProps {
  currentSize: number
}

export default function PageSizeSelector({ currentSize }: PageSizeSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageSizeChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('pageSize', value)
    params.set('page', '1') // Reset to first page when changing page size
    router.push(`/samples?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="pageSize" className="text-sm text-gray-600">
        Show:
      </label>
      <Select value={currentSize.toString()} onValueChange={handlePageSizeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select page size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10 per page</SelectItem>
          <SelectItem value="20">20 per page</SelectItem>
          <SelectItem value="50">50 per page</SelectItem>
          <SelectItem value="100">100 per page</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
} 