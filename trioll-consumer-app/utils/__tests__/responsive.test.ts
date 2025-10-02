import { Dimensions } from 'react-native';
import {
  responsivePadding,
  responsiveSpacing,
  responsiveFontSize,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  responsiveValue,
  wp,
  hp,
  clamp,
} from '../responsive';

// Mock Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  PixelRatio: {
    roundToNearestPixel: jest.fn((value: number) => Math.round(value)),
  },
}));

describe('Responsive Utilities', () => {
  describe('responsivePadding', () => {
    it('should provide all padding sizes', () => {
      expect(responsivePadding.xs).toBeDefined();
      expect(responsivePadding.sm).toBeDefined();
      expect(responsivePadding.md).toBeDefined();
      expect(responsivePadding.lg).toBeDefined();
      expect(responsivePadding.xl).toBeDefined();
      expect(responsivePadding.xxl).toBeDefined();
    });

    it('should have ascending values', () => {
      expect(responsivePadding.xs).toBeLessThan(responsivePadding.sm);
      expect(responsivePadding.sm).toBeLessThan(responsivePadding.md);
      expect(responsivePadding.md).toBeLessThan(responsivePadding.lg);
      expect(responsivePadding.lg).toBeLessThan(responsivePadding.xl);
      expect(responsivePadding.xl).toBeLessThan(responsivePadding.xxl);
    });
  });

  describe('responsiveSpacing', () => {
    it('should provide all spacing sizes', () => {
      expect(responsiveSpacing.tight).toBeDefined();
      expect(responsiveSpacing.normal).toBeDefined();
      expect(responsiveSpacing.relaxed).toBeDefined();
      expect(responsiveSpacing.loose).toBeDefined();
      expect(responsiveSpacing.extraLoose).toBeDefined();
    });
  });

  describe('responsiveFontSize', () => {
    it('should scale font sizes based on device width', () => {
      const size = responsiveFontSize(16);
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });

    it('should return whole numbers', () => {
      const size = responsiveFontSize(16);
      expect(size % 1).toBe(0);
    });
  });

  describe('device size checks', () => {
    it('should categorize device sizes', () => {
      expect(typeof isSmallDevice).toBe('boolean');
      expect(typeof isMediumDevice).toBe('boolean');
      expect(typeof isLargeDevice).toBe('boolean');
    });

    it('should only be one category at a time', () => {
      const categories = [isSmallDevice, isMediumDevice, isLargeDevice];
      const trueCount = categories.filter(Boolean).length;
      expect(trueCount).toBe(1);
    });
  });

  describe('responsiveValue', () => {
    it('should return appropriate value for device size', () => {
      const value = responsiveValue(10, 15, 20);
      expect([10, 15, 20]).toContain(value);
    });
  });

  describe('percentage helpers', () => {
    it('wp should calculate width percentage', () => {
      const width = Dimensions.get('window').width;
      expect(wp(50)).toBe(width * 0.5);
      expect(wp(100)).toBe(width);
    });

    it('hp should calculate height percentage', () => {
      const height = Dimensions.get('window').height;
      expect(hp(50)).toBe(height * 0.5);
      expect(hp(100)).toBe(height);
    });
  });

  describe('clamp', () => {
    it('should constrain values within min/max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
