import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Initialize a postgres client
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

console.log(`🔌 Connecting to database: ${connectionString.split('@')[1]}`); // Log just the host/db part

const client = postgres(connectionString);
const db = drizzle(client);

// Define the app schema for references
const app = { schema: 'app' };

// Clear all users and create an admin user
async function setupAdmin() {
  console.log('🔑 Starting admin user setup...');
  
  try {
    // Clear existing data
    console.log('🧹 Deleting existing account data...');
    await client.unsafe(`DELETE FROM app."Account"`);
    
    console.log('🧹 Deleting existing session data...');
    await client.unsafe(`DELETE FROM app."Session"`);
    
    console.log('🧹 Deleting existing user data...');
    await client.unsafe(`DELETE FROM app."User"`);
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const userId = randomUUID();
    const hashedPassword = await bcrypt.hash('admin', 10);
    const now = new Date().toISOString(); // Convert to ISO format
    
    // Insert user with ISO string formatted date
    await client.unsafe(
      `INSERT INTO app."User" (id, email, password, name, role, "emailVerified", created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [userId, 'admin@email.com', hashedPassword, 'Admin User', 'admin', now]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@email.com');
    console.log('Password: admin');
    
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    process.exit(1);
  } finally {
    // Close the postgres connection
    await client.end();
    console.log('🏁 Script finished.');
  }
}

// Run the setup function
setupAdmin(); 