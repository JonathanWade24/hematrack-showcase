'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '../ui/Input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'

export function SamplesSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
      params.set('page', '1') // Reset to first page on search
    } else {
      params.delete('search')
    }
    router.push(`/samples?${params.toString()}`)
  }, [debouncedSearch, router, searchParams])

  return (
    <div className="relative max-w-md w-full">
      <Input
        type="text"
        placeholder="Search by Sample ID, Subject ID, or Genotype..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-10 pr-4 w-full"
      />
      <FontAwesomeIcon
        icon={faSearch}
        className="absolute left-3 top-3 text-gray-400"
      />
    </div>
  )
} 