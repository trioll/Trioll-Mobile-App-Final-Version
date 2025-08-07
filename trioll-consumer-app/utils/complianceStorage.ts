
import { safeStorage } from './safeStorage';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('complianceStorage');
const COMPLIANCE_KEY = 'trioll_compliance_data';
const COMPLIANCE_VERSION = '1.0';

export interface ComplianceData {
  age: number | null;
  birthDate: Date | null;
  isTeenMode: boolean;
  region: string | null;
  isGDPR: boolean;
  consents: {
    essential: boolean;
    analytics: boolean;
    recommendations: boolean;
    marketing: boolean;
  };
  termsAccepted: boolean;
  privacyAccepted: boolean;
  completedAt: string;
  version: string;
}

export const storeComplianceData = async (data: Partial<ComplianceData>) => {
  try {
    const complianceData: ComplianceData = {
      ...data,
      version: COMPLIANCE_VERSION,
    } as ComplianceData;

    logger.info('Storing compliance data:', {
      age: complianceData.age,
      region: complianceData.region,
      termsAccepted: complianceData.termsAccepted,
      completedAt: complianceData.completedAt
    });

    await safeStorage.setItem(COMPLIANCE_KEY, JSON.stringify(complianceData));
    
    // Verify it was stored
    const stored = await safeStorage.getItem(COMPLIANCE_KEY);
    if (stored) {
      logger.info('Compliance data successfully stored and verified');
    } else {
      logger.error('Compliance data storage verification failed');
    }

    return true;
  } catch (error) {
    logger.error('Failed to store compliance data:', error);
    return false;
  }
};

export const getComplianceData = async (): Promise<ComplianceData | null> => {
  try {
    logger.info('Getting compliance data from storage...');
    const stored = await safeStorage.getItem(COMPLIANCE_KEY);
    if (!stored) {
      logger.info('No compliance data found in storage');
      return null;
    }
    logger.info('Found compliance data in storage');

    const data = JSON.parse(stored) as ComplianceData;

    // Check if re-verification is needed (365 days for age - more lenient for guest users)
    if (data.completedAt) {
      const completedDate = new Date(data.completedAt);
      const daysSinceCompleted = Math.floor(
        (new Date().getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceCompleted > 365) {
        // Age verification expired after 1 year
        logger.info('Compliance data expired after 365 days');
        return null;
      }
    }

    // Check version compatibility
    if (data.version !== COMPLIANCE_VERSION) {
      // Compliance requirements changed, need re-verification
      logger.info('Compliance version mismatch, need re-verification');
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Failed to get compliance data:', error);
    return null;
  }
};

export const clearComplianceData = async () => {
  try {
    await safeStorage.deleteItem(COMPLIANCE_KEY);
    return true;
  } catch (error) {
    logger.error('Failed to clear compliance data:', error);
    return false;
  }
};

export const updateComplianceConsents = async (consents: Partial<ComplianceData['consents']>) => {
  try {
    const existing = await getComplianceData();
    if (!existing) return false;

    const updated: ComplianceData = {
      ...existing,
      consents: {
        ...existing.consents,
        ...consents,
      },
    };

    await safeStorage.setItem(COMPLIANCE_KEY, JSON.stringify(updated));

    return true;
  } catch (error) {
    logger.error('Failed to update compliance consents:', error);
    return false;
  }
};

export const isUserCompliant = async (): Promise<boolean> => {
  const data = await getComplianceData();
  if (!data) {
    logger.info('No compliance data found - user is not compliant');
    return false;
  }

  const isCompliant = (
    data.age !== null &&
    data.age >= 13 &&
    data.region !== null &&
    data.termsAccepted &&
    data.privacyAccepted
  );

  logger.info('User compliance check:', {
    hasAge: data.age !== null,
    ageValid: data.age !== null && data.age >= 13,
    hasRegion: data.region !== null,
    termsAccepted: data.termsAccepted,
    privacyAccepted: data.privacyAccepted,
    isCompliant
  });

  return isCompliant;
};
