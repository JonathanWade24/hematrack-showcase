'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { User } from '@supabase/supabase-js';

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { role } = useRole();
  const supabase = createClient();
  
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  
  if (!user) return null;
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
          {user.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="font-medium hidden md:block">{user.email}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold">{user.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role || 'No role'}</p>
          </div>
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 