// Jest setup file for WebExtensions testing

// Add Jest DOM matchers
require('@testing-library/jest-dom');

// Mock browser APIs
global.browser = {
  tabs: {
    query: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

// Mock chrome APIs for compatibility
global.chrome = global.browser;

// Mock DOM APIs that might be used in content scripts
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
};

beforeEach(() => {
  jest.clearAllMocks();
});