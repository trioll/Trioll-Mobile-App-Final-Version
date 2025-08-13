import { analyticsService } from './analyticsService';
import { getLogger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = getLogger('PurchaseIntentService');

interface PurchaseIntentData {
  gameId: string;
  gameTitle: string;
  response: 'yes' | 'no' | 'skip';
  timePlayed: number; // in seconds
  userId?: string;
  isGuest: boolean;
  timestamp: string;
}

interface PurchaseIntentPreferences {
  enabled: boolean;
  lastShownTimestamp?: number;
  cooldownHours: number;
  shownGameIds: string[];
}

const STORAGE_KEY = 'purchase_intent_preferences';
const DEFAULT_COOLDOWN_HOURS = 24;

class PurchaseIntentService {
  private preferences: PurchaseIntentPreferences = {
    enabled: true,
    cooldownHours: DEFAULT_COOLDOWN_HOURS,
    shownGameIds: [],
  };

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.error('Failed to load purchase intent preferences:', error);
    }
  }

  async trackPurchaseIntent(data: PurchaseIntentData) {
    try {
      logger.info('📊 PURCHASE INTENT SURVEY RESPONSE:', {
        gameId: data.gameId,
        gameTitle: data.gameTitle,
        response: data.response,
        timePlayed: data.timePlayed,
        isGuest: data.isGuest,
      });

      // Track the main event
      await analyticsService.track('purchase_intent', {
        gameId: data.gameId,
        gameTitle: data.gameTitle,
        response: data.response,
        timePlayed: data.timePlayed,
        isGuest: data.isGuest,
        timestamp: data.timestamp,
      });

      // Track response-specific event for easier analytics
      await analyticsService.track(`purchase_intent_${data.response}`, {
        gameId: data.gameId,
        gameTitle: data.gameTitle,
        timePlayed: data.timePlayed,
      });

      // Always update timestamp when shown
      this.preferences.lastShownTimestamp = Date.now();
      await this.savePreferences();

      logger.info('✅ Purchase intent successfully tracked for:', data.gameTitle);
    } catch (error) {
      logger.error('❌ Failed to track purchase intent:', error);
      throw error;
    }
  }

  async shouldShowSurvey(gameId: string, timePlayed: number): Promise<boolean> {
    // Don't show if disabled
    if (!this.preferences.enabled) {
      return false;
    }

    // Don't show for trials less than 1 minute
    if (timePlayed < 60) {
      return false;
    }

    // Don't show if already shown for this game
    if (this.preferences.shownGameIds.includes(gameId)) {
      return false;
    }

    // Check cooldown period
    if (this.preferences.lastShownTimestamp) {
      const hoursSinceLastShown = 
        (Date.now() - this.preferences.lastShownTimestamp) / (1000 * 60 * 60);
      if (hoursSinceLastShown < this.preferences.cooldownHours) {
        return false;
      }
    }

    return true;
  }

  async setEnabled(enabled: boolean) {
    this.preferences.enabled = enabled;
    await this.savePreferences();
  }

  async setCooldownHours(hours: number) {
    this.preferences.cooldownHours = hours;
    await this.savePreferences();
  }

  async resetShownGames() {
    this.preferences.shownGameIds = [];
    this.preferences.lastShownTimestamp = undefined;
    await this.savePreferences();
  }

  getPreferences(): PurchaseIntentPreferences {
    return { ...this.preferences };
  }

  private async savePreferences() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      logger.error('Failed to save purchase intent preferences:', error);
    }
  }
}

export const purchaseIntentService = new PurchaseIntentService();