'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Inner component that uses useSearchParams
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Extract error from URL params if present (optional, but common)
  useState(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      switch (urlError) {
        case 'CredentialsSignin':
          setError('Invalid email or password.')
          break
        // Add other specific error codes from NextAuth if needed
        default:
          setError('Login failed. Please try again.')
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false, // Handle redirect manually below
      })

      if (result?.error) {
        // More user-friendly error messages
        switch (result.error) {
          case 'CredentialsSignin':
          case 'Invalid password': // Assuming this custom error might be thrown
            setError('Invalid email or password.')
            break
          case 'No user found': // Assuming this custom error might be thrown
            setError('No account found with this email.')
            break
          default:
            setError('An unexpected error occurred. Please try again.')
        }
        setIsLoading(false) // Stop loading on error
        return
      }

      // Get the callback URL from the search params or default to '/'
      const callbackUrl = searchParams.get('callbackUrl') || '/'
      router.push(callbackUrl)
      // No need to refresh manually usually, NextAuth session should update context
    } catch (error) {
      console.error("Sign in error:", error) // Log the actual error for debugging
      setError('An error occurred during sign in. Please try again.')
      setIsLoading(false)
    }
    // Removed finally block as isLoading is set in error/success paths
  }

  // Return the form JSX
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>Enter your email and password to access your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

// Main page component wraps LoginForm in Suspense
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}> {/* Suspense Boundary */}
        <LoginForm />
      </Suspense>
    </div>
  )
} 