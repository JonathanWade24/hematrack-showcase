/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Use 'node' environment for backend/db tests
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",
  // You might need to add moduleNameMapper if you use path aliases like @/ inside your source code
  moduleNameMapper: {
    // Example: Map '@/(.*)' to '<rootDir>/src/$1'
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Add setup files if needed (e.g., for environment variables or global mocks)
  // setupFiles: ['dotenv/config'], // Example if tests need .env directly
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // For setup after environment is ready
}; 