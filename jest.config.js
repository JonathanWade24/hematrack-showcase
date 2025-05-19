/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Use 'jsdom' environment for React component tests
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",
  // You might need to add moduleNameMapper if you use path aliases like @/ inside your source code
  moduleNameMapper: {
    // Example: Map '@/(.*)' to '<rootDir>/src/$1'
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      jsx: 'react-jsx',
      // isolatedModules: true, // This can sometimes help, let's try without it first for simplicity
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Add setup files if needed (e.g., for environment variables or global mocks)
  // setupFiles: ['dotenv/config'], // Example if tests need .env directly
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // For setup after environment is ready
  transformIgnorePatterns: [
    '/node_modules/(?!(@testing-library|@radix-ui|react|react-dom)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}; 