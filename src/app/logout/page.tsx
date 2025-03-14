import { logout } from './actions'

export default function LogoutPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-6 shadow-md">
        <h1 className="text-2xl font-bold">Sign Out</h1>
        <p>Are you sure you want to sign out?</p>
        <form action={logout}>
          <button 
            type="submit"
            className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
} 