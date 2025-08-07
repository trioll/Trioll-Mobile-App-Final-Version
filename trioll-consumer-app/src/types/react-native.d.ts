/**
 * React Native Type Declarations
 * Extends React Native types with app-specific globals
 */

// Ensure React Native globals are recognized
declare global {
  // React Native development flag
  const __DEV__: boolean;

  // Hermes JavaScript engine flag
  const HermesInternal: any;

  // Metro bundler context
  const __r: (moduleId: number) => any;
  const __d: (
    factory: (...args: unknown[]) => any,
    moduleId: number,
    dependencyMap?: number[]
  ) => void;

  // React Native specific
  var nativePerformanceNow: (() => number) | undefined;
  var nativeQPLTimestamp: (() => number) | undefined;
}

// Module augmentation for React Native
declare module 'react-native' {
  export interface AppStateStatic {
    currentState: 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
  }
}

export {};
