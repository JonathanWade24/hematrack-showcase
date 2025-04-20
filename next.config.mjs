/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static and server runtimes
  output: 'standalone',
  
  // Configure environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  
  // Disable TypeScript type checking during production build for faster builds
  typescript: {
    // !! WARN !!
    // Disabling type checking for builds may lead to runtime errors! 
    // Only use this in situations where deployment must succeed despite type errors
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build for faster builds
  eslint: {
    // !! WARN !!
    // Disabling ESLint for builds may lead to code quality issues!
    // Only use this in situations where deployment must succeed despite linting errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; 