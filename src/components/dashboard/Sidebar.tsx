'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faChartLine, faEdit, 
  faVial, faUserPlus, faUser, faFileImport,
  faFlask, faCalendarCheck, faEye, faEyeSlash, faDownload
} from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePHI } from '@/contexts/PHIContext'
import { UserProfile } from './UserProfile'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { showPHI, togglePHI } = usePHI()

  const handleLinkClick = () => {
    if (window.innerWidth < 768) { // md breakpoint
      onClose?.()
    }
  }

  const linkClasses = (isActive: boolean) =>
    `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
      isActive
        ? 'bg-gray-100 text-gray-900'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`

  return (
    <div className={`${isOpen ? 'block' : 'hidden'} md:flex flex-col w-64 bg-white border-r border-gray-200`}>
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-indigo-600 flex items-center">
          <FontAwesomeIcon icon={faVial} className="mr-2" />
          HemaTrack
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className="px-4 space-y-1">
          <Link href="/" className={linkClasses(pathname === '/')} onClick={handleLinkClick}>
            <FontAwesomeIcon icon={faChartLine} className="mr-3 h-4 w-4" />
            Home
          </Link>

          {/* Laboratory Section */}
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Laboratory</p>
          </div>
          <Link href="/samples" className={linkClasses(pathname === '/samples')} onClick={handleLinkClick}>
            <FontAwesomeIcon icon={faFlask} className="mr-3 h-4 w-4" />
            Samples
          </Link>
          <Link href="/subjects" className={linkClasses(pathname.startsWith('/subjects'))} onClick={handleLinkClick}>
            <FontAwesomeIcon icon={faUser} className="mr-3 h-4 w-4" />
            Subjects
          </Link>
          <Link href="/data-entry" className={linkClasses(pathname === '/data-entry')} onClick={handleLinkClick}>
            <FontAwesomeIcon icon={faEdit} className="mr-3 h-4 w-4" />
            Sample Entry
          </Link>
          <Link href="/data-download" className={linkClasses(pathname === '/data-download')} onClick={handleLinkClick}>
            <FontAwesomeIcon icon={faDownload} className="mr-3 h-4 w-4" />
            Data Download
          </Link>

          {/* PHI Section */}
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">PHI</p>
          </div>
          {showPHI && (
            <>
              <Link href="/registration" className={linkClasses(pathname === '/registration')} onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUserPlus} className="mr-3 h-4 w-4" />
                Registration
              </Link>
              <Link href="/patients" className={linkClasses(pathname === '/patients')} onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUser} className="mr-3 h-4 w-4" />
                Patients
              </Link>
              <Link href="/visits" className={linkClasses(pathname === '/visits')} onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faCalendarCheck} className="mr-3 h-4 w-4" />
                Visit History
              </Link>
              <Link href="/data-import" className={linkClasses(pathname === '/data-import')} onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faFileImport} className="mr-3 h-4 w-4" />
                EPIC Import
              </Link>
              <Link href="/admin" className={linkClasses(pathname === '/admin')} onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUser} className="mr-3 h-4 w-4" />
                Admin
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* User Profile */}
      <UserProfile />

      {/* PHI Visibility Toggle */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <button
          onClick={togglePHI}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
        >
          <FontAwesomeIcon
            icon={showPHI ? faEye : faEyeSlash}
            className={`mr-3 h-4 w-4 ${showPHI ? 'text-green-500' : 'text-red-500'}`}
          />
          <span>{showPHI ? 'Hide PHI' : 'Show PHI'}</span>
        </button>
      </div>
    </div>
  )
} 