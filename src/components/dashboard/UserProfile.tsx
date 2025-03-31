'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser, 
  faSignInAlt, 
  faSignOutAlt, 
  faUserEdit,
  faCog
} from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { User } from '@/types/supabase'

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error fetching user:', error)
        return
      }
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  if (loading) {
    return (
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div className="ml-3">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mt-1" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-4 border-t border-gray-200">
        <Link 
          href="/login"
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md"
        >
          <FontAwesomeIcon icon={faSignInAlt} className="mr-3 h-4 w-4" />
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center w-full">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="text-indigo-600" />
            </div>
            <div className="ml-3 text-left">
              <p className="text-sm font-medium text-gray-700">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-white shadow-lg border border-gray-200 rounded-md">
          <div className="space-y-1">
            <Link
              href="/profile"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <FontAwesomeIcon icon={faUserEdit} className="mr-3 h-4 w-4" />
              Edit Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <FontAwesomeIcon icon={faCog} className="mr-3 h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-3 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 