// Placeholder functions to allow the build to pass
// These are only lazy-loaded by the omics route when needed

export async function createOmicsResult(data: any) {
  console.warn("Using deprecated Prisma operation: createOmicsResult. Please migrate to Drizzle version.");
  // Actual implementation is only used when lazy-loaded
  throw new Error("This operation has been deprecated. Use Drizzle equivalent instead.");
}

export async function createOmicsSubject(data: any) {
  console.warn("Using deprecated Prisma operation: createOmicsSubject. Please migrate to Drizzle version.");
  throw new Error("This operation has been deprecated. Use Drizzle equivalent instead.");
}

export async function getOmicsResultBySampleId(sampleId: string) {
  console.warn("Using deprecated Prisma operation: getOmicsResultBySampleId. Please migrate to Drizzle version.");
  throw new Error("This operation has been deprecated. Use Drizzle equivalent instead.");
}

export async function getOmicsSubjectById(subjectId: string) {
  console.warn("Using deprecated Prisma operation: getOmicsSubjectById. Please migrate to Drizzle version.");
  throw new Error("This operation has been deprecated. Use Drizzle equivalent instead.");
}

export async function updateOmicsResult(data: any) {
  console.warn("Using deprecated Prisma operation: updateOmicsResult. Please migrate to Drizzle version.");
  throw new Error("This operation has been deprecated. Use Drizzle equivalent instead.");
}

export async function createPatient(data: any) {
  console.warn("Using deprecated Prisma operation: createPatient. Please migrate to Drizzle version.");
  throw new Error("This operation has been deprecated. Use Drizzle equivalent instead.");
} 