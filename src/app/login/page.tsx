'use client'

import { login, signup } from './actions'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  // Get error or message from URL parameters
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  
  // Local state for form submission
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState(error || '')
  const [formMessage, setFormMessage] = useState(message || '')

  // Handle form submission
  const handleLogin = async (formData: FormData) => {
    setIsLoading(true)
    setFormError('')
    setFormMessage('')
    
    try {
      await login(formData)
    } catch (error) {
      setFormError('An error occurred during login')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (formData: FormData) => {
    setIsLoading(true)
    setFormError('')
    setFormMessage('')
    
    try {
      await signup(formData)
    } catch (error) {
      setFormError('An error occurred during signup')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-indigo-600 p-6">
            <h2 className="text-center text-3xl font-bold text-white">
              SCD Dashboard
            </h2>
            <p className="mt-2 text-center text-indigo-200">
              Sign in to access your dashboard
            </p>
          </div>
          
          <div className="p-6">
            {/* Error message */}
            {(formError || error) && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700" role="alert">
                <p>{formError || error}</p>
              </div>
            )}
            
            {/* Success message */}
            {(formMessage || message) && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 text-green-700" role="alert">
                <p>{formMessage || message}</p>
              </div>
            )}
            
            <form className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  formAction={handleLogin}
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
                <button
                  type="submit"
                  formAction={handleSignup}
                  disabled={isLoading}
                  className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-indigo-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating account...' : 'Sign up'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <p className="mt-4 text-center text-sm text-gray-600">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  )
} 