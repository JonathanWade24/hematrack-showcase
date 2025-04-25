import { PrismaClient } from '@prisma/client'

// Define a type for the global scope that includes our prisma instance
interface CustomGlobal {
  prisma: PrismaClient | undefined
}

// Declare the global variable using the custom type
declare const global: CustomGlobal

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Explicitly cast globalThis to our custom type for access
const customGlobal = globalThis as unknown as CustomGlobal

export const prisma = 
  customGlobal.prisma ||
  new PrismaClient({
    log: ['warn', 'error'], // Reduce logging to warnings and errors
  })

if (process.env.NODE_ENV !== 'production') customGlobal.prisma = prisma 