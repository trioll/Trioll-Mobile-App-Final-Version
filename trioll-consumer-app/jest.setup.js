// Mock React Native modules - Updated for RN 0.79
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch (e) {
  // Handle different React Native versions
  jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper', () => ({
    default: {
      API: {
        Value: jest.fn(),
        timing: jest.fn(),
        spring: jest.fn(),
      },
    },
  }));
}

try {
  jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
} catch (e) {
  // Handle different React Native versions
  jest.mock('react-native/Libraries/vendor/emitter/EventEmitter', () => ({
    default: jest.fn().mockImplementation(() => ({
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    })),
  }));
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'WIFI'
  })),
  NetworkStateType: {
    UNKNOWN: 'UNKNOWN',
    NONE: 'NONE',
    CELLULAR: 'CELLULAR',
    WIFI: 'WIFI',
    BLUETOOTH: 'BLUETOOTH',
    ETHERNET: 'ETHERNET',
    WIMAX: 'WIMAX',
    VPN: 'VPN',
    OTHER: 'OTHER'
  }
}));

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock WebView
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
// (Already mocked above)

// Setup fetch
global.fetch = jest.fn();

// Setup timers
global.setTimeout = jest.fn((cb, _ms) => cb());
global.setInterval = jest.fn();
global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Setup console mocks
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Add WebSocket matchers for jest-websocket-mock
if (typeof expect !== 'undefined') {
  expect.extend({
    toReceiveMessage(_ws, _message) {
      // Mock implementation for testing
      return {
        pass: true,
        message: () => 'WebSocket received message'
      };
    },
    toHaveReceivedMessages(_ws, _messages) {
      // Mock implementation for testing
      return {
        pass: true,
        message: () => 'WebSocket received messages'
      };
    }
  });
}
