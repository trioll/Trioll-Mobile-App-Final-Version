import { Platform } from 'react-native';

const logger = getLogger('androidEmulatorFix');

import { getLogger } from '../../utils/logger';
/**
 * Map of domain names to their resolved IPs
 * Used as fallback when DNS resolution fails on Android emulator
 */
const DNS_FALLBACK_MAP: { [domain: string]: string } = {
  // AWS API Gateway
  '4ib0hvu1xj.execute-api.us-east-1.amazonaws.com': '52.94.236.248',

  // S3 buckets (using S3 regional endpoints)
  'trioll-prod-games-us-east-1.s3.amazonaws.com': '52.217.224.104',
  's3.us-east-1.amazonaws.com': '52.217.224.104',

  // CloudFront
  'd33yj1oylm0icp.cloudfront.net': '13.33.144.197',
};

/**
 * Check if running on Android emulator
 */
export const isAndroidEmulator = (): boolean => {
  if (Platform.OS !== 'android') return false;

  // Common Android emulator fingerprints
  const emulatorIndicators = [
    'goldfish',
    'ranchu',
    'generic',
    'unknown',
    'emulator',
    'Android SDK built for x86',
  ];

  // Check device model/brand (would need react-native-device-info for accurate detection)
  // For now, return true for all Android in dev mode
  return __DEV__;
};

/**
 * Convert URL to use IP address instead of domain name
 * Only applies to Android emulator to work around DNS issues
 */
export const fixUrlForAndroidEmulator = (url: string): string => {
  if (!isAndroidEmulator()) return url;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Check if we have a fallback IP for this domain
    if (DNS_FALLBACK_MAP[domain]) {
      logger.info(`Android emulator DNS fix: ${domain} -> ${DNS_FALLBACK_MAP[domain]}`);
      urlObj.hostname = DNS_FALLBACK_MAP[domain];

      // Add Host header to maintain proper routing
      // Note: This would need to be handled in the fetch options
      return urlObj.toString();
    }
  } catch (error) {
    logger.info('Error fixing URL for Android emulator:', error);
  }

  return url;
};

/**
 * Create fetch options with Host header for IP-based requests
 */
export const createAndroidEmulatorFetchOptions = (
  url: string,
  options: RequestInit = {}
): RequestInit => {
  if (!isAndroidEmulator()) return options;

  try {
    const originalUrl = new URL(url);
    const domain = originalUrl.hostname;

    // If we're using an IP address, add the Host header
    if (DNS_FALLBACK_MAP[domain]) {
      return {
        ...options,
        headers: {
          ...options.headers,
          Host: domain,
        },
      };
    }
  } catch (error) {
    logger.info('Error creating Android emulator fetch options:', error);
  }

  return options;
};

/**
 * Log network configuration for debugging
 */
export const logNetworkConfig = (): void => {
  if (!__DEV__) return;

  logger.info('=== Android Emulator Network Configuration ===');
  logger.info('Platform:', Platform.OS);
  logger.info('Is Emulator:', isAndroidEmulator());
  logger.info('DNS Fallback Enabled:', isAndroidEmulator());

  if (isAndroidEmulator()) {
    logger.info('\nDNS Fallback Mappings:');
    Object.keys(DNS_FALLBACK_MAP).forEach((domain) => { const ip = DNS_FALLBACK_MAP[domain];
      logger.info(`  ${domain} -> ${ip}`);
    });

    logger.info('\n⚠️  Android Emulator DNS Issues Detected');
    logger.info('Using IP addresses as fallback for network requests');
    logger.info('This is a known limitation of Android emulators');
    logger.info('For production testing, use a physical device');
  }

  logger.info('===========================================');
};
