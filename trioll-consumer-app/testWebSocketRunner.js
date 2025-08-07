#!/usr/bin/env node

/**
 * WebSocket Test Runner
 * Run WebSocket tests in a Node.js environment
 */

// Set up globals
global.__DEV__ = true;

// Mock React Native modules
global.NetInfo = {
  fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true }),
};

// Mock Config
const mockConfig = {
  ENV: 'development',
  WEBSOCKET_URL: 'ws://localhost:8080',
  USE_MOCK_API: true,
  FEATURES: {
    WEBSOCKET_ENABLED: true,
  },
  AWS_REGION: 'us-east-1',
};

// Mock WebSocket implementation
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;

    setTimeout(() => {
      this.readyState = this.OPEN;
      if (this.onopen) this.onopen();
    }, 100);
  }

  send(data) {
    
    // Simulate responses
    setTimeout(() => {
      const parsed = JSON.parse(data);
      if (parsed.type === 'ping' && this.onmessage) {
        this.onmessage({ data: JSON.stringify({ type: 'pong' }) });
      }
    }, 50);
  }

  close() {
    this.readyState = this.CLOSED;
    if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure' });
  }
}

global.WebSocket = MockWebSocket;

// Mock modules
const mockModules = {
  '../config/environments': { Config: mockConfig },
  '../services/monitoring/analyticsEnhanced': {
    analyticsService: {
      track: (event, data) => {},
    },
  },
  '../services/monitoring/performanceMonitor': {
    performanceMonitor: {
      recordMetric: (metric, value) => {},
    },
  },
  './mockWebSocket': {},
  './websocketIntegration': {
    websocketIntegration: {
      initialize: () => Promise.resolve(),
      getConnectionState: () => 'connected',
    },
  },
};

// Override require
const originalRequire = require;
require = function (id) {
  if (mockModules[id]) {
    return mockModules[id];
  }
  return originalRequire.apply(this, arguments);
};

// Import and run tests
try {
  
  const { WebSocketTester } = require('./src/utils/testWebSocket.ts');
  const tester = new WebSocketTester();

  tester
    .runAllTests()
    .then(results => {
            process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test run failed:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Failed to run tests:', error);
  process.exit(1);
}
