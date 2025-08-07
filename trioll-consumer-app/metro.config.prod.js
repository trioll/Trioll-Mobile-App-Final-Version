const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

const config = getDefaultConfig(__dirname);

// Production optimizations
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.debug', 'console.info'],
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
  },
};

// Asset optimization
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Bundle optimization
config.serializer = {
  ...config.serializer,
  processModuleFilter: module => {
    // Remove test files from production bundle
    if (module.path.includes('__tests__') || module.path.includes('.test.')) {
      return false;
    }
    // Remove mock files from production
    if (module.path.includes('mock') || module.path.includes('Mock')) {
      return false;
    }
    return true;
  },
};

// Cache configuration for faster builds
config.cacheStores = [
  {
    name: 'metro-cache',
    directory: '.metro-cache',
  },
];

// Enable aggressive caching
config.resetCache = false;

// RAM bundle configuration for faster startup
config.serializer.createModuleIdFactory = () => {
  let nextId = 0;
  const idMap = new Map();

  return path => {
    if (!idMap.has(path)) {
      idMap.set(path, nextId++);
    }
    return idMap.get(path);
  };
};

module.exports = withSentryConfig(config);
