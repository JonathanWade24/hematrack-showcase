import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-red-600 p-6">
          <h2 className="text-center text-3xl font-bold text-white">
            Authentication Error
          </h2>
        </div>
        
        <div className="p-6">
          <div className="mb-4 text-center">
            <p className="text-gray-700 mb-4">
              There was an error processing your authentication request.
            </p>
            <p className="text-gray-700 mb-4">
              This could be because the link has expired or is invalid.
            </p>
          </div>
          
          <div className="mt-6">
            <Link 
              href="/login"
              className="block w-full bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-center"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 