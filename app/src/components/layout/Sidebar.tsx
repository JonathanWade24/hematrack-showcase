import { useViewMode } from '@/contexts/ViewModeContext'
import Link from 'next/link'
import { Database } from 'lucide-react'

export function Sidebar() {
  const { isRestrictedView, toggleViewMode } = useViewMode()
  
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* ... existing sidebar content ... */}
      
      {/* Navigation Links */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          <Link 
            href="/query-builder" 
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <Database className="mr-2 h-5 w-5" />
            Query Builder
          </Link>
          {/* Add other navigation links here */}
        </nav>
      </div>
      
      {/* View Mode Toggle */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isRestrictedView}
            onChange={toggleViewMode}
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-900">
            Restricted View
          </span>
        </label>
      </div>
    </div>
  )
} 