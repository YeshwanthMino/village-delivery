module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
  ],
  moduleNameMapper: {
    '^test-renderer$': 'react-test-renderer',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
