/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",                // API routes run on the server
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],           // pick up all .test.ts under src
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  verbose: false,
};
