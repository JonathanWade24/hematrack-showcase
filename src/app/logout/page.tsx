'use client'

import { logout } from './actions'
import Link from 'next/link'

export default function LogoutPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2 bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sign Out</h1>
          <p className="mt-2 text-gray-600">Are you sure you want to sign out?</p>
        </div>
        
        <div className="flex flex-col space-y-3">
          <form action={logout}>
            <button 
              type="submit"
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Sign Out
            </button>
          </form>
          
          <Link
            href="/"
            className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
} 