// Export the Prisma client
export { prisma } from './client';

// Export any database utility functions
export * from './utils';

// Export database procedures
export const procedures = {
  // Add procedure exports here as needed
  // Example: getOmicsWithClinical: require('./procedures/get_omics_with_clinical.sql')
}; 