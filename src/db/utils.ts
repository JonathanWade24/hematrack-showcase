import { prisma } from './client';

/**
 * Utility function to check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

/**
 * Utility function to safely execute a database query with error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<T>,
  errorMessage = 'Database query failed'
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
  }
} 