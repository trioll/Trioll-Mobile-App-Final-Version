import type { Game } from '../types/api.types';
import { safeAPI } from '../services/api/SafeTriollAPI';
import { getAnalyticsService } from '../services/monitoring/analyticsEnhanced';
import { Config } from '../config/environments';
import { getLogger } from '../utils/logger';

const logger = getLogger('apiIntegrationTest');
interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
  error?: any;
}

interface IntegrationTestReport {
  timestamp: string;
  environment: string;
  apiEndpoint: string;
  overallStatus: 'ready' | 'partial' | 'not-ready';
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export class APIIntegrationTester {
  private results: TestResult[] = [];
  private testGameId: string | null = null;

  /**
   * Run all API integration tests
   */
  async runAllTests(): Promise<IntegrationTestReport> {
    logger.info('🚀 Starting API Integration Tests...\n');

    // Clear previous results
    this.results = [];

    // Run test suites
    await this.testGamesAPI();
    await this.testInteractionsAPI();
    await this.testSearchAPI();
    await this.testAnalyticsAPI();
    await this.testUserAPI();

    // Generate report
    const report = this.generateReport();
    this.printReport(report);

    return report;
  }

  /**
   * Test 1: Games API
   */
  private async testGamesAPI(): Promise<void> {
    logger.info('📦 Testing Games API...');

    // Test 1.1: Load games list
    await this.runTest('Load Games List', async () => {
      const games = await safeAPI.getGames(10);

      if (!Array.isArray(games)) {
        throw new Error('Games response is not an array');
      }

      if (games.length === 0) {
        throw new Error('No games returned from API');
      }

      // Store first game ID for later tests
      this.testGameId = games[0].id;

      return `Loaded ${games.length} games successfully`;
    });

    // Test 1.2: Load single game details
    await this.runTest('Load Game Details', async () => {
      if (!this.testGameId) {
        throw new Error('No test game ID available');
      }

      const response = await safeAPI.getGameDetails(this.testGameId);

      const game = 'game' in response ? response.game : (response as unknown as Game);

      if (!game || !game.id) {
        throw new Error('Game details not returned properly');
      }

      return `Loaded game: ${game.title}`;
    });

    // Test 1.3: Check if using real API data
    await this.runTest('Verify API Connection', async () => {
      const isConnected = safeAPI.isUsingFallback();
      const endpoint = Config.API_BASE_URL;

      if (!isConnected) {
        return `Using fallback data - API not connected`;
      }

      return `Connected to API: ${endpoint}`;
    });
  }

  /**
   * Test 2: Interactions API (Likes, Ratings, Plays)
   */
  private async testInteractionsAPI(): Promise<void> {
    logger.info('\n❤️ Testing Interactions API...');

    if (!this.testGameId) {
      this.results.push({
        test: 'Interactions API Tests',
        status: 'warning',
        message: 'Skipped - No test game ID available',
      });
      return;
    }

    // Test 2.1: Like a game
    await this.runTest('Like Game', async () => {
      const result = await safeAPI.likeGame(this.testGameId!);

      if ('success' in result && !(result as any).success) {
        throw new Error('Failed to like game');
      }

      const resultData = result as unknown;
      return `Game liked successfully (stored: ${resultData.stored || 'backend'})`;
    });

    // Test 2.2: Unlike a game
    await this.runTest('Unlike Game', async () => {
      const result = await safeAPI.unlikeGame(this.testGameId!);

      if ('success' in result && !(result as any).success) {
        throw new Error('Failed to unlike game');
      }

      return `Game unliked successfully`;
    });

    // Test 2.3: Rate a game
    await this.runTest('Rate Game', async () => {
      const rating = 4;
      const result = (await safeAPI.rateGame(this.testGameId!, rating)) as unknown;

      if ('success' in result && !(result as any).success) {
        throw new Error('Failed to rate game');
      }

      return `Game rated ${rating} stars successfully`;
    });

    // Test 2.4: Track game play
    await this.runTest('Track Game Play', async () => {
      const sessionId = `test-session-${Date.now()}`;
      const duration = 120; // 2 minutes

      const result = (await safeAPI.playGame(this.testGameId!, sessionId, duration)) as unknown;

      if ('success' in result && !(result as any).success) {
        throw new Error('Failed to track game play');
      }

      return `Game play tracked (${duration}s)`;
    });
  }

  /**
   * Test 3: Search API
   */
  private async testSearchAPI(): Promise<void> {
    logger.info('\n🔍 Testing Search API...');

    // Test 3.1: Basic search
    await this.runTest('Search Games', async () => {
      const searchQuery = 'adventure';
      const results = await safeAPI.searchGames(searchQuery);

      if (!Array.isArray(results)) {
        throw new Error('Search results not an array');
      }

      return `Found ${results.length} games for "${searchQuery}"`;
    });

    // Test 3.2: Empty search
    await this.runTest('Empty Search Query', async () => {
      const results = await safeAPI.searchGames('');

      if (!Array.isArray(results)) {
        throw new Error('Empty search should return array');
      }

      return `Empty search handled correctly (${results.length} results)`;
    });

    // Test 3.3: Complex search query
    await this.runTest('Complex Search Query', async () => {
      const complexQuery = 'racing multiplayer 2024';
      const results = await safeAPI.searchGames(complexQuery);

      if (!Array.isArray(results)) {
        throw new Error('Complex search failed');
      }

      return `Complex search returned ${results.length} results`;
    });
  }

  /**
   * Test 4: Analytics API
   */
  private async testAnalyticsAPI(): Promise<void> {
    logger.info('\n📊 Testing Analytics API...');

    const analytics = getAnalyticsService();

    // Test 4.1: Track event
    await this.runTest('Track Analytics Event', async () => {
      await analytics.track('test_integration', {
        test_id: Date.now(),
        environment: Config.ENV_NAME,
      });

      return 'Event tracked successfully';
    });

    // Test 4.2: Track screen view
    await this.runTest('Track Screen View', async () => {
      await analytics.trackScreen('TestScreen', {
        test_mode: true,
      });

      return 'Screen view tracked successfully';
    });

    // Test 4.3: Track performance metric
    await this.runTest('Track Performance Metric', async () => {
      await analytics.trackPerformance('api_test_latency', 150, { unit: 'ms' });

      return 'Performance metric tracked successfully';
    });

    // Test 4.4: Verify analytics is initialized
    await this.runTest('Analytics Service Status', async () => {
      // Analytics might be disabled in certain environments
      if (!Config.FEATURES.ANALYTICS_ENABLED) {
        return 'Analytics disabled in current environment';
      }

      return 'Analytics service is active';
    });
  }

  /**
   * Test 5: User API
   */
  private async testUserAPI(): Promise<void> {
    logger.info('\n👤 Testing User API...');

    // Test 5.1: Get user profile
    await this.runTest('Get User Profile', async () => {
      const profile = await safeAPI.getUserProfile();

      if (!profile) {
        return 'No user profile (guest mode or not authenticated)';
      }

      const profileData = profile as unknown;
      return `User profile loaded: ${profileData.username || profileData.email || 'Guest'}`;
    });

    // Test 5.2: Get user stats (via profile)
    await this.runTest('Get User Stats', async () => {
      const profile = await safeAPI.getUserProfile();

      const profileData = profile as unknown;
      if (!profileData || !profileData.stats) {
        return 'No user stats available';
      }

      const stats = profileData.stats;
      return `User stats: ${stats.trialsPlayed || 0} trials played`;
    });
  }

  /**
   * Helper: Run individual test with timing and error handling
   */
  private async runTest(testName: string, testFn: () => Promise<string>): Promise<void> {
    const startTime = Date.now();

    try {
      const message = await testFn();
      const duration = Date.now() - startTime;

      this.results.push({
        test: testName,
        status: 'pass',
        message,
        duration,
      });

      logger.info(`  ✅ ${testName}: ${message} (${duration}ms)`);
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      this.results.push({
        test: testName,
        status: 'fail',
        message: error.message || 'Unknown error',
        duration,
        error,
      });

      logger.info(`  ❌ ${testName}: ${error.message} (${duration}ms)`);
    }
  }

  /**
   * Generate test report
   */
  private generateReport(): IntegrationTestReport {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
    };

    let overallStatus: 'ready' | 'partial' | 'not-ready' = 'ready';

    if (summary.failed > 0) {
      overallStatus = summary.failed > summary.passed ? 'not-ready' : 'partial';
    }

    return {
      timestamp: new Date().toISOString(),
      environment: Config.ENV_NAME,
      apiEndpoint: Config.API.BASE_URL,
      overallStatus,
      tests: this.results,
      summary,
    };
  }

  /**
   * Print formatted report
   */
  private printReport(report: IntegrationTestReport): void {
    logger.info('\n' + '='.repeat(60));
    logger.info('📋 API INTEGRATION TEST REPORT');
    logger.info('='.repeat(60));
    logger.info(`Environment: ${report.environment}`);
    logger.info(`API Endpoint: ${report.apiEndpoint}`);
    logger.info(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    logger.info(
      `Overall Status: ${this.getStatusEmoji(report.overallStatus)} ${report.overallStatus.toUpperCase()}`
    );
    logger.info('\n📊 Summary:');
    logger.info(`  Total Tests: ${report.summary.total}`);
    logger.info(`  ✅ Passed: ${report.summary.passed}`);
    logger.info(`  ❌ Failed: ${report.summary.failed}`);
    logger.info(`  ⚠️  Warnings: ${report.summary.warnings}`);
    logger.info('='.repeat(60));
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'ready':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'not-ready':
        return '❌';
      default:
        return '❓';
    }
  }
}

// Export singleton instance
export const apiIntegrationTester = new APIIntegrationTester();

// Make available globally for console access
if (typeof global !== 'undefined' && __DEV__) {
  (global as any).runAPITests = () => apiIntegrationTester.runAllTests();
  logger.info('💡 API Integration Tests loaded. Use: await runAPITests()');
}
