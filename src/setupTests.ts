import '@testing-library/jest-dom';

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Setup test environment
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  (fetch as jest.Mock).mockClear();
});