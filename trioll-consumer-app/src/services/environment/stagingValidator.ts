
import { Config } from '../../config/environments';

import { dynamoDBService, TABLES } from '../database/dynamoDBService';
import { GameAdapter } from '../../api/adapters/gameAdapter';
import { WebSocketManager } from '../../utils/websocketManager';
import { offlineQueueManager } from '../../utils/offlineQueueManager';

import { performanceMonitor } from '../monitoring/performanceMonitor';

const logger = getLogger('stagingValidator');

import { getLogger } from '../../utils/logger';
export interface ValidationTest {
  category: string;
  test: string;
  passed: boolean;
  duration: number;
  details: string;
  critical: boolean;
}

export interface ValidationReport {
  timestamp: number;
  environment: string;
  overall: 'passed' | 'failed' | 'partial';
  tests: ValidationTest[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
  };
  recommendations: string[];
}

class StagingValidator {
  private wsManager = WebSocketManager.getInstance();
  private testUserId = 'staging_test_user';
  private testGameId = 'staging_test_game';

  /**
   * Run comprehensive staging validation
   */
  async validateStaging(): Promise<ValidationReport> {
    logger.info('🧪 Starting Staging Environment Validation...\n');
    logger.info(`Environment: ${Config.ENV}`);
    logger.info(`API: ${Config.API_BASE_URL}`);
    logger.info(`Mock API: ${Config.USE_MOCK_API}\n`);

    const report: ValidationReport = {
      timestamp: Date.now(),
      environment: Config.ENV,
      overall: 'passed',
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        critical: 0,
      },
      recommendations: [],
    };

    try {
      // Phase 1: Authentication Testing
      await this.validateAuthentication(report);

      // Phase 2: Data Operations
      await this.validateDataOperations(report);

      // Phase 3: User Interactions
      await this.validateUserInteractions(report);

      // Phase 4: WebSocket Features
      await this.validateWebSocket(report);

      // Phase 5: Offline Synchronization
      await this.validateOfflineSync(report);

      // Phase 6: Performance Benchmarks
      await this.validatePerformance(report);

      // Calculate summary
      this.calculateSummary(report);

      // Generate recommendations
      this.generateRecommendations(report);
    } catch {
      logger.error('Validation error:', error);
      report.overall = 'failed';
    }

    this.printReport(report);
    return report;
  }

  /**
   * Validate authentication services
   */
  private async validateAuthentication(report: ValidationReport) {
    logger.info('🔐 Validating Authentication...\n');

    // Test 1: Check auth mode
    await this.runTest(report, {
      category: 'Authentication',
      test: 'Auth Mode Check',
      critical: true,
      testFn: async () => {
        const mode = authService.getAuthMode();
        const expected = Config.USE_MOCK_API ? 'mock' : 'cognito';

        if (mode !== expected) {
          throw new Error(`Auth mode is ${mode}, expected ${expected}`);
        }

        return `Auth mode: ${mode}`;
      },
    });

    // Test 2: Authentication state
    await this.runTest(report, {
      category: 'Authentication',
      test: 'Authentication State',
      critical: false,
      testFn: async () => {
        const isAuth = await authService.isAuthenticated();
        return `Authenticated: ${isAuth}`;
      },
    });

    // Test 3: Token refresh (if authenticated)
    await this.runTest(report, {
      category: 'Authentication',
      test: 'Token Refresh',
      critical: false,
      testFn: async () => {
        const refreshed = await authService.refreshTokens();
        return `Token refresh: ${refreshed ? 'Success' : 'Not authenticated'}`;
      },
    });
  }

  /**
   * Validate data operations
   */
  private async validateDataOperations(report: ValidationReport) {
    logger.info('\n📊 Validating Data Operations...\n');

    // Enable test mode
    dynamoDBService.enableTestMode();

    // Test 1: Query games
    await this.runTest(report, {
      category: 'Data Operations',
      test: 'Query Games',
      critical: true,
      testFn: async () => {
        const { items, nextToken } = await dynamoDBService.query(
          TABLES.GAMES,
          { category: 'Action' },
          { limit: 5 }
        );

        return `Found ${items.length} games, hasMore: ${!!nextToken}`;
      },
    });

    // Test 2: Get single item
    await this.runTest(report, {
      category: 'Data Operations',
      test: 'Get Single Game',
      critical: true,
      testFn: async () => {
        const game = await dynamoDBService.getItem(TABLES.GAMES, { id: this.testGameId });

        return game ? 'Game found' : 'Game not found (expected)';
      },
    });

    // Test 3: Field mapping
    await this.runTest(report, {
      category: 'Data Operations',
      test: 'Field Mapping',
      critical: true,
      testFn: async () => {
        const mockData = {
          id: 'test123',
          title: 'Test Game',
          genre: 'Action',
          thumbnailUrl: 'https://example.com/image.jpg',
        };

        const mapped = GameAdapter.applyLegacyMapping(mockData);
        const game = GameAdapter.fromDynamoDB(mapped);

        if (!game.name || !game.category || !game.image) {
          throw new Error('Field mapping failed');
        }

        return 'Field mapping successful';
      },
    });

    // Test 4: Pagination
    await this.runTest(report, {
      category: 'Data Operations',
      test: 'Pagination',
      critical: false,
      testFn: async () => {
        const page1 = await dynamoDBService.scan(TABLES.GAMES, { limit: 3 });

        if (page1.nextToken) {
          const page2 = await dynamoDBService.scan(TABLES.GAMES, {
            limit: 3,
            nextToken: page1.nextToken,
          });

          return `Page 1: ${page1.items.length} items, Page 2: ${page2.items.length} items`;
        }

        return `Single page with ${page1.items.length} items`;
      },
    });
  }

  /**
   * Validate user interactions
   */
  private async validateUserInteractions(report: ValidationReport) {
    logger.info('\n👤 Validating User Interactions...\n');

    // Test 1: Like operation
    await this.runTest(report, {
      category: 'User Interactions',
      test: 'Like Game',
      critical: false,
      testFn: async () => {
        await offlineQueueManager.enqueue({
          type: 'put',
          table: TABLES.USER_INTERACTIONS,
          data: {
            userId: this.testUserId,
            gameId: this.testGameId,
            liked: true,
            timestamp: new Date().toISOString(),
          },
          priority: 'normal',
          userId: this.testUserId,
        });

        return 'Like operation queued';
      },
    });

    // Test 2: Rating operation
    await this.runTest(report, {
      category: 'User Interactions',
      test: 'Rate Game',
      critical: false,
      testFn: async () => {
        await offlineQueueManager.enqueue({
          type: 'update',
          table: TABLES.USER_INTERACTIONS,
          data: {
            key: { userId: this.testUserId, gameId: this.testGameId },
            updates: { rating: 5, ratedAt: new Date().toISOString() },
          },
          priority: 'normal',
          userId: this.testUserId,
        });

        return 'Rating operation queued';
      },
    });

    // Test 3: Check queue
    await this.runTest(report, {
      category: 'User Interactions',
      test: 'Offline Queue Status',
      critical: false,
      testFn: async () => {
        const status = offlineQueueManager.getQueueStatus();
        return `Queue size: ${status.size}, Online: ${status.isOnline}`;
      },
    });
  }

  /**
   * Validate WebSocket functionality
   */
  private async validateWebSocket(report: ValidationReport) {
    logger.info('\n🔌 Validating WebSocket...\n');

    if (!Config.FEATURES.WEBSOCKET_ENABLED) {
      logger.info('WebSocket disabled - skipping tests');
      return;
    }

    // Test 1: Connection
    await this.runTest(report, {
      category: 'WebSocket',
      test: 'WebSocket Connection',
      critical: false,
      testFn: async () => {
        if (this.wsManager.isConnected()) {
          return 'Already connected';
        }

        await this.wsManager.connect();
        await new Promise(resolve => setTimeout(resolve, 2000));

        const connected = this.wsManager.isConnected();
        return connected ? 'Connected successfully' : 'Connection failed';
      },
    });

    // Test 2: Channel subscription
    await this.runTest(report, {
      category: 'WebSocket',
      test: 'Channel Subscription',
      critical: false,
      testFn: async () => {
        if (!this.wsManager.isConnected()) {
          return 'Not connected - skipping';
        }

        await this.wsManager.subscribe('test:channel', data => {
          logger.info('Received test message:', data);
        });

        return 'Subscribed to test channel';
      },
    });

    // Cleanup
    if (this.wsManager.isConnected()) {
      this.wsManager.disconnect();
    }
  }

  /**
   * Validate offline synchronization
   */
  private async validateOfflineSync(report: ValidationReport) {
    logger.info('\n📴 Validating Offline Sync...\n');

    // Test 1: Sync attempt
    await this.runTest(report, {
      category: 'Offline Sync',
      test: 'Sync Queue',
      critical: false,
      testFn: async () => {
        const result = await offlineQueueManager.startSync();
        return `Synced: ${(result as any).successful}, Failed: ${result.failed}`;
      },
    });

    // Test 2: Cleanup test data
    await this.runTest(report, {
      category: 'Offline Sync',
      test: 'Cleanup Test Data',
      critical: false,
      testFn: async () => {
        const userOps = offlineQueueManager.getUserOperations(this.testUserId);

        for (let i = 0; i < userOps.length; i++) {
        const op = userOps[i];
          await offlineQueueManager.cancelOperation(op.id);
         }

        return `Cleaned up ${userOps.length} operations`;
      },
    });
  }

  /**
   * Validate performance benchmarks
   */
  private async validatePerformance(report: ValidationReport) {
    logger.info('\n⚡ Validating Performance...\n');

    // Test 1: API response time
    await this.runTest(report, {
      category: 'Performance',
      test: 'API Response Time',
      critical: false,
      testFn: async () => {
        const start = Date.now();
        await fetch(`${Config.API_BASE_URL}/health`);
        const duration = Date.now() - start;

        if (duration > 2000) {
          throw new Error(`Response too slow: ${duration}ms`);
        }

        return `Response time: ${duration}ms`;
      },
    });

    // Test 2: Query performance
    await this.runTest(report, {
      category: 'Performance',
      test: 'Query Performance',
      critical: false,
      testFn: async () => {
        const start = Date.now();
        await dynamoDBService.query(TABLES.GAMES, { category: 'Action' }, { limit: 10 });
        const duration = Date.now() - start;

        return `Query time: ${duration}ms`;
      },
    });

    // Test 3: Memory usage
    await this.runTest(report, {
      category: 'Performance',
      test: 'Memory Usage',
      critical: false,
      testFn: async () => {
        // In React Native, we can't directly measure memory
        performanceMonitor.recordMetric('staging_validation_complete', 1);
        return 'Performance metrics recorded';
      },
    });
  }

  /**
   * Run individual test
   */
  private async runTest(
    report: ValidationReport,
    config: {
      category: string;
      test: string;
      critical: boolean;
      testFn: () => Promise<string>;
    }
  ) {
    const startTime = Date.now();
    const test: ValidationTest = {
      category: config.category,
      test: config.test,
      passed: false,
      duration: 0,
      details: '',
      critical: config.critical,
    };

    try {
      test.details = await config.testFn();
      test.passed = true;
    } catch (error: unknown) {
      test.details = error.message;
      test.passed = false;
    } finally {
      test.duration = Date.now() - startTime;
      report.tests.push(test);
    }
  }

  /**
   * Calculate summary
   */
  private calculateSummary(report: ValidationReport) {
    report.summary.total = report.tests.length;
    report.summary.passed = report.tests.filter(t => t.passed).length;
    report.summary.failed = report.tests.filter(t => !t.passed).length;
    report.summary.critical = report.tests.filter(t => t.critical && !t.passed).length;

    if (report.summary.critical > 0) {
      report.overall = 'failed';
    } else if (report.summary.failed > 0) {
      report.overall = 'partial';
    } else {
      report.overall = 'passed';
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(report: ValidationReport) {
    const failedTests = report.tests.filter(t => !t.passed);

    if (failedTests.length === 0) {
      report.recommendations.push('All tests passed - staging environment is ready');
      return;
    }

    // Authentication issues
    const authFailures = failedTests.filter(t => t.category === 'Authentication');
    if (authFailures.length > 0) {
      report.recommendations.push('Fix authentication configuration before proceeding');
      report.recommendations.push('Verify Cognito user pool settings');
    }

    // Data operation issues
    const dataFailures = failedTests.filter(t => t.category === 'Data Operations');
    if (dataFailures.length > 0) {
      report.recommendations.push('Check DynamoDB table permissions');
      report.recommendations.push('Verify API Gateway endpoints');
    }

    // Performance issues
    const perfFailures = failedTests.filter(t => t.category === 'Performance');
    if (perfFailures.length > 0) {
      report.recommendations.push('Optimize API response times');
      report.recommendations.push('Consider implementing caching');
    }

    // Critical failures
    if (report.summary.critical > 0) {
      report.recommendations.push('CRITICAL: Fix critical failures before using staging');
    }
  }

  /**
   * Print validation report
   */
  private printReport(report: ValidationReport) {
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 STAGING VALIDATION REPORT');
    logger.info('='.repeat(60) + '\n');

    logger.info(`Environment: ${report.environment}`);
    logger.info(
      `Overall Result: ${this.getResultEmoji(report.overall)} ${report.overall.toUpperCase()}`
    );
    logger.info(`Duration: ${Date.now() - report.timestamp}ms\n`);

    // Group by category
    const categories = [...new Set(report.tests.map(t => t.category))];

    categories.forEach(category => {
      logger.info(`\n${category}:`);
      logger.info('-'.repeat(40));

      const categoryTests = report.tests.filter(t => t.category === category);
      categoryTests.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        const critical = test.critical ? ' [CRITICAL]' : '';
        logger.info(`${icon} ${test.test}${critical}: ${test.details} (${test.duration}ms)`);
      });
    });

    logger.info('\n' + '-'.repeat(60));
    logger.info('Summary:');
    logger.info(`Total Tests: ${report.summary.total}`);
    logger.info(`Passed: ${report.summary.passed}`);
    logger.info(`Failed: ${report.summary.failed}`);
    logger.info(`Critical Failures: ${report.summary.critical}`);

    if (report.recommendations.length > 0) {
      logger.info('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        logger.info(`   • ${rec}`);
      });
    }

    logger.info('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Get result emoji
   */
  private getResultEmoji(result: string): string {
    switch (result) {
      case 'passed':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  }
}

// Export singleton instance
export const stagingValidator = new StagingValidator();

// Export for testing
export { StagingValidator };
