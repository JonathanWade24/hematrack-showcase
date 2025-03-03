import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { Input } from '../ui/input'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  loading?: boolean
  placeholder?: string
}

export function SearchBar({ value, onChange, loading = false, placeholder }: SearchBarProps) {
  return (
    <div className="max-w-xl">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Search by Sample ID or Subject ID..."}
          className="w-full pl-10 pr-4"
        />
        <FontAwesomeIcon
          icon={faSearch}
          className={`absolute left-3 top-3 text-gray-400 ${loading ? 'animate-spin' : ''}`}
        />
      </div>
    </div>
  )
} 