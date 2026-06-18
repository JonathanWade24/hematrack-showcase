/**
 * Prisma Client Helpers
 * 
 * This file provides utility functions for working with Prisma Client,
 * including schema-specific clients that replace the old Supabase schema clients.
 */

import { PrismaClient } from '@/generated/prisma'
import { prisma } from './prisma'

/**
 * Get data from the laboratory schema
 */
export async function getLaboratoryData(
  model: string,
  options: {
    where?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  } = {}
) {
  // Use the prisma client directly with the model name as a dynamic key
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].findMany({
    ...options
  });
}

/**
 * Get data from the clinical schema
 */
export async function getClinicalData(
  model: string,
  options: {
    where?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  } = {}
) {
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].findMany({
    ...options
  });
}

/**
 * Get data from the phi schema
 */
export async function getPhiData(
  model: string,
  options: {
    where?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  } = {}
) {
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].findMany({
    ...options
  });
}

/**
 * Get data from the app schema
 */
export async function getAppData(
  model: string,
  options: {
    where?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  } = {}
) {
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].findMany({
    ...options
  });
}

/**
 * Get a single record by ID from any schema
 */
export async function getById(model: string, id: string | number) {
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].findUnique({
    where: { id }
  });
}

/**
 * Create a record in any schema
 */
export async function createRecord(model: string, data: any) {
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].create({
    data
  });
}

/**
 * Update a record in any schema
 */
export async function updateRecord(model: string, id: string | number, data: any) {
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].update({
    where: { id },
    data
  });
}

/**
 * Delete a record in any schema
 */
export async function deleteRecord(model: string, id: string | number) {
  // @ts-ignore - We know the model exists in the client
  return await prisma[model].delete({
    where: { id }
  });
} 