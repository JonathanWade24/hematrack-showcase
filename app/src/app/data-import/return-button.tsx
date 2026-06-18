'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ReturnButton() {
  const router = useRouter()
  
  return (
    <Button 
      onClick={() => router.push('/dashboard')} 
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      Return to Dashboard
    </Button>
  )
} 