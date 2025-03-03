'use client'

import { useState } from 'react'
import { Sidebar } from '../dashboard/Sidebar'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-10">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-indigo-600 text-white p-3 rounded-full shadow-lg"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center md:hidden">
              <h1 className="text-xl font-bold text-indigo-600 flex items-center">
                <FontAwesomeIcon icon={faBars} className="mr-2" />
                HemaTrack
              </h1>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 