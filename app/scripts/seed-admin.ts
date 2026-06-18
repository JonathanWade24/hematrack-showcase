// scripts/seed-admin.ts
const { clearAllUsers, createAdminUser } = require('../src/lib/auth/user-management');
const { db } = require('../src/lib/db'); // Import for potential connection closing

/**
 * This script clears all existing users and creates a new admin user.
 * To run: npx ts-node scripts/seed-admin.ts
 * 
 * If you encounter path resolution issues, try:
 * npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 */
async function main() {
  console.log('🔑 Starting admin user setup script...');
  
  try {
    console.log('🧹 Clearing existing users...');
    await clearAllUsers();
    
    console.log('👤 Creating admin user...');
    await createAdminUser('admin@email.com', 'admin'); // Password is 'admin'
    
    console.log('✅ Admin user setup completed successfully!');
    console.log('Email: admin@email.com');
    console.log('Password: admin');
  } catch (error) {
    console.error('❌ Error during admin user setup:', error);
    process.exit(1); // Exit with error code
  } finally {
    // For standalone scripts with node-postgres, you might need to close connections
    // Uncomment if the script hangs after completion
    /*
    if (db && typeof db.end === 'function') {
      console.log('🔌 Closing database connection...');
      await db.end();
    }
    */
    console.log('🏁 Script finished.');
  }
}

// Run the main function
main(); 