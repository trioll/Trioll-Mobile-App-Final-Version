
/**
 * End-to-End Testing Framework
 * Comprehensive testing infrastructure for Trioll mobile application
 */

import { Config } from '../../config/environments';

import { dynamoDBService } from '../../services/database/dynamoDBService';
import { analyticsService } from '../../services/monitoring/analyticsEnhanced';

export interface E2ETestResult {
  testId: string;
  category: string;
  scenario: string;
  status: 'passed' | 'failed' | 'skipped' | 'warning';
  duration: number;
  details: string;
  errors: string[];
  screenshots?: string[];
  performanceMetrics?: {
    loadTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface E2ETestSuite {
  suiteId: string;
  name: string;
  description: string;
  tests: E2ETest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface E2ETest {
  testId: string;
  name: string;
  description: string;
  category:
    | 'user-journey'
    | 'authentication'
    | 'game-data'
    | 'real-time'
    | 'offline'
    | 'network'
    | 'load'
    | 'error'
    | 'security'
    | 'integration';
  priority: 'critical' | 'high' | 'medium' | 'low';
  retryCount?: number;
  timeout?: number;
  execute: () => Promise<E2ETestResult>;
}

export interface E2ETestReport {
  reportId: string;
  timestamp: number;
  environment: string;
  overall: 'passed' | 'failed' | 'partial';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    warnings: number;
  };
  categories: Record<
    string,
    {
      total: number;
      passed: number;
      failed: number;
    }
  >;
  criticalFailures: E2ETestResult[];
  performanceSummary: {
    avgLoadTime: number;
    maxLoadTime: number;
    avgMemoryUsage: number;
    maxMemoryUsage: number;
  };
  recommendations: string[];
  testResults: E2ETestResult[];
}

export class E2ETestFramework {
  private testSuites: Map<string, E2ETestSuite> = new Map();
  private currentReport: E2ETestReport;
  private testStartTime: number = 0;
  private isRunning: boolean = false;

  // Test data management
  private testDataPrefix = 'e2e_test_';
  private testUsers: Set<string> = new Set();
  private testGames: Set<string> = new Set();
  private testInteractions: Set<string> = new Set();

  constructor() {
    this.currentReport = this.initializeReport();
  }

  /**
   * Initialize test report
   */
  private initializeReport(): E2ETestReport {
    return {
      reportId: `e2e_${Date.now()}`,
      timestamp: Date.now(),
      environment: Config.ENV,
      overall: 'passed',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        warnings: 0,
      },
      categories: {},
      criticalFailures: [],
      performanceSummary: {
        avgLoadTime: 0,
        maxLoadTime: 0,
        avgMemoryUsage: 0,
        maxMemoryUsage: 0,
      },
      recommendations: [],
      testResults: [],
    };
  }

  /**
   * Register a test suite
   */
  registerSuite(suite: E2ETestSuite) {
    this.testSuites.set(suite.suiteId, suite);
  }

  /**
   * Run all test suites
   */
  async runAllTests(
    options: {
      categories?: string[];
      skipCategories?: string[];
      stopOnFailure?: boolean;
      parallel?: boolean;
      verbose?: boolean;
    } = {}
  ): Promise<E2ETestReport> {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    this.testStartTime = Date.now();
    this.currentReport = this.initializeReport();

    try {
      // Track test execution start
      analyticsService.track('e2e_test_started', {
        environment: Config.ENV,
        suiteCount: this.testSuites.size,
        options,
      });

      // Execute test suites
      const suites = Array.from(this.testSuites.entries());
      for (let i = 0; i < suites.length; i++) {
        const [suiteId, suite] = suites[i];
        await this.executeSuite(suite, options);

        if (options.stopOnFailure && this.currentReport.summary.failed > 0) {
          break;
        }
      }

      // Calculate final metrics
      this.calculateFinalMetrics();

      // Generate recommendations
      this.generateRecommendations();

      // Track completion
      analyticsService.track('e2e_test_completed', {
        environment: Config.ENV,
        overall: this.currentReport.overall,
        summary: this.currentReport.summary,
        duration: Date.now() - this.testStartTime,
      });
    } catch (error) {
      console.error('E2E test execution error:', error);
      this.currentReport.overall = 'failed';

      analyticsService.track('e2e_test_error', {
        environment: Config.ENV,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // Cleanup test data
      await this.cleanupTestData();
      this.isRunning = false;
    }

    return this.currentReport;
  }

  /**
   * Execute a test suite
   */
  private async executeSuite(suite: E2ETestSuite, options: any): Promise<void> {
    // Run suite setup
    if (suite.setup) {
      try {
        await suite.setup();
      } catch (error) {
        console.error(`Suite setup failed: ${error}`);
        return;
      }
    }

    // Execute tests
    for (const test of suite.tests) {
      // Check if category should be skipped
      if (options.categories && !options.categories.includes(test.category)) {
        continue;
      }
      if (options.skipCategories && options.skipCategories.includes(test.category)) {
        continue;
      }

      await this.executeTest(test, options);
    }

    // Run suite teardown
    if (suite.teardown) {
      try {
        await suite.teardown();
      } catch (error) {
        console.error(`Suite teardown failed: ${error}`);
      }
    }
  }

  /**
   * Execute individual test
   */
  private async executeTest(test: E2ETest, options: any) {
    const startTime = Date.now();
    let result: E2ETestResult;

    
    try {
      // Set timeout if specified
      const timeout = test.timeout || 30000;
      const testPromise = test.execute();

      result = await this.withTimeout(testPromise, timeout);

      // Retry logic for failed tests
      if (result.status === 'failed' && test.retryCount) {
        for (let i = 0; i < test.retryCount; i++) {
          console.log(`Retrying test ${test.name} (attempt ${i + 1}/${test.retryCount})`);
          result = await this.withTimeout(test.execute(), timeout);
          if (result.status !== 'failed') break;
        }
      }
    } catch (error: unknown) {
      result = {
        testId: test.testId,
        category: test.category,
        scenario: test.name,
        status: 'failed',
        duration: Date.now() - startTime,
        details: 'Test execution failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }

    // Update report
    this.updateReport(result, test);

    // Log result
    const statusIcon = this.getStatusIcon(result.status);
    console.log(`${statusIcon} ${test.name} (${result.duration}ms)`);
    if (result.status === 'failed' && options.verbose) {
      console.error(`  Errors: ${result.errors.join(', ')}`);
    }
  }

  /**
   * Execute with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Test timeout')), timeout)),
    ]);
  }

  /**
   * Update test report
   */
  private updateReport(result: E2ETestResult, test: E2ETest) {
    this.currentReport.testResults.push(result);
    this.currentReport.summary.total++;

    // Update summary counts
    switch (result.status) {
      case 'passed':
        this.currentReport.summary.passed++;
        break;
      case 'failed':
        this.currentReport.summary.failed++;
        if (test.priority === 'critical') {
          this.currentReport.criticalFailures.push(result);
        }
        break;
      case 'skipped':
        this.currentReport.summary.skipped++;
        break;
      case 'warning':
        this.currentReport.summary.warnings++;
        break;
    }

    // Update category stats
    if (!this.currentReport.categories[test.category]) {
      this.currentReport.categories[test.category] = {
        total: 0,
        passed: 0,
        failed: 0,
      };
    }

    const categoryStats = this.currentReport.categories[test.category];
    categoryStats.total++;
    if (result.status === 'passed') categoryStats.passed++;
    if (result.status === 'failed') categoryStats.failed++;

    // Update performance metrics
    if (result.performanceMetrics) {
      this.updatePerformanceMetrics(result.performanceMetrics);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metrics: any) {
    const summary = this.currentReport.performanceSummary;

    // Update load time
    if (metrics.loadTime) {
      summary.avgLoadTime =
        (summary.avgLoadTime * (this.currentReport.summary.total - 1) + metrics.loadTime) /
        this.currentReport.summary.total;
      summary.maxLoadTime = Math.max(summary.maxLoadTime, metrics.loadTime);
    }

    // Update memory usage
    if (metrics.memoryUsage) {
      summary.avgMemoryUsage =
        (summary.avgMemoryUsage * (this.currentReport.summary.total - 1) + metrics.memoryUsage) /
        this.currentReport.summary.total;
      summary.maxMemoryUsage = Math.max(summary.maxMemoryUsage, metrics.memoryUsage);
    }
  }

  /**
   * Calculate final metrics
   */
  private calculateFinalMetrics() {
    const { summary, criticalFailures } = this.currentReport;

    // Determine overall status
    if (criticalFailures.length > 0) {
      this.currentReport.overall = 'failed';
    } else if (summary.failed > 0) {
      this.currentReport.overall = 'partial';
    } else {
      this.currentReport.overall = 'passed';
    }

    // Round performance metrics
    const perfSummary = this.currentReport.performanceSummary;
    perfSummary.avgLoadTime = Math.round(perfSummary.avgLoadTime);
    perfSummary.maxLoadTime = Math.round(perfSummary.maxLoadTime);
    perfSummary.avgMemoryUsage = Math.round(perfSummary.avgMemoryUsage);
    perfSummary.maxMemoryUsage = Math.round(perfSummary.maxMemoryUsage);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations() {
    const { categories, performanceSummary, criticalFailures } = this.currentReport;

    // Critical failure recommendations
    if (criticalFailures.length > 0) {
      this.currentReport.recommendations.push(
        'CRITICAL: Fix critical test failures before production deployment'
      );

      // Add specific critical failure recommendations
      criticalFailures.forEach(failure => {
        this.currentReport.recommendations.push(
          `Fix ${failure.category}: ${failure.scenario} - ${failure.errors.join(', ')}`
        );
      });
    }

    // Category-specific recommendations
    Object.entries(categories).forEach(([category, stats]) => {
      const failureRate = stats.failed / stats.total;
      if (failureRate > 0.2) {
        this.currentReport.recommendations.push(
          `Investigate high failure rate in ${category} tests (${Math.round(failureRate * 100)}%)`
        );
      }
    });

    // Performance recommendations
    if (performanceSummary.avgLoadTime > 3000) {
      this.currentReport.recommendations.push(
        'Optimize loading performance - average load time exceeds 3 seconds'
      );
    }

    if (performanceSummary.maxMemoryUsage > 200) {
      this.currentReport.recommendations.push(
        'Investigate memory usage - peak memory exceeds 200MB'
      );
    }

    // Success recommendation
    if (this.currentReport.overall === 'passed') {
      this.currentReport.recommendations.push(
        'All tests passed - application is ready for production deployment'
      );
    }
  }

  /**
   * Clean up test data
   */
  private async cleanupTestData(): Promise<void> {
    console.log('Cleaning up test data...');
    try {
      // Clean up test users
      const userIds = Array.from(this.testUsers);
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        try {
          // TODO: Implement user deletion when authService.deleteAccount is available
          // await authService.deleteAccount();
          console.log(`Skipping cleanup for user ${userId} - deleteAccount not implemented`);
        } catch (error) {
          console.error(`Failed to cleanup user ${userId}:`, error);
        }
      }

      // Clean up test games
      const gameIds = Array.from(this.testGames);
      for (let i = 0; i < gameIds.length; i++) {
        const gameId = gameIds[i];
        try {
          await dynamoDBService.deleteItem('games', { id: gameId });
        } catch (error) {
          console.error(`Failed to cleanup game ${gameId}:`, error);
        }
      }

      // Clear sets
      this.testUsers.clear();
      this.testGames.clear();
      this.testInteractions.clear();

      console.log('Test data cleanup completed');
    } catch (error) {
      console.error('Test data cleanup error:', error);
    }
  }

  /**
   * Register test data for cleanup
   */
  registerTestData(type: 'user' | 'game' | 'interaction', id: string) {
    switch (type) {
      case 'user':
        this.testUsers.add(id);
        break;
      case 'game':
        this.testGames.add(id);
        break;
      case 'interaction':
        this.testInteractions.add(id);
        break;
    }
  }

  /**
   * Generate test user data
   */
  generateTestUser(suffix: string = ''): { email: string; password: string; displayName: string } {
    const timestamp = Date.now();
    return {
      email: `${this.testDataPrefix}user_${timestamp}${suffix}@test.com`,
      password: 'TestPassword123!',
      displayName: `Test User ${timestamp}`,
    };
  }

  /**
   * Generate test game data
   */
  generateTestGame(suffix: string = ''): { id: string; name: string; category: string; description: string; developer: string } {
    const timestamp = Date.now();
    return {
      id: `${this.testDataPrefix}game_${timestamp}${suffix}`,
      name: `Test Game ${timestamp}`,
      category: 'Action',
      description: 'E2E test game',
      developer: 'E2E Test Suite',
    };
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      case 'warning':
        return '⚠️';
      default:
        return '❓';
    }
  }

  /**
   * Print test report
   */
  printReport(report: E2ETestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log(`E2E TEST REPORT - ${report.overall.toUpperCase()}`);
    console.log(`Environment: ${report.environment}`);
    console.log(`Duration: ${(Date.now() - report.timestamp) / 1000}s\n`);

    // Summary
    console.log('Summary:');
    console.log(`  Total: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Skipped: ${report.summary.skipped}`);
    console.log(`  Warnings: ${report.summary.warnings}\n`);
    
    // Category breakdown
    console.log('Categories:');
    Object.entries(report.categories).forEach(([category, stats]) => {
      const passRate = Math.round((stats.passed / stats.total) * 100);
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${passRate}% pass rate)`);
    });

    // Performance summary
    console.log('\nPerformance:');
    console.log(`  Avg Load Time: ${report.performanceSummary.avgLoadTime}ms`);
    console.log(`  Max Load Time: ${report.performanceSummary.maxLoadTime}ms`);
    console.log(`  Avg Memory: ${report.performanceSummary.avgMemoryUsage}MB`);
    console.log(`  Max Memory: ${report.performanceSummary.maxMemoryUsage}MB\n`);
                
    // Critical failures
    if (report.criticalFailures.length > 0) {
      console.log('Critical Failures:');
      report.criticalFailures.forEach(failure => {
        console.log(`  - ${failure.scenario}: ${failure.errors.join(', ')}`);
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (report.overall === 'passed') {
      console.log('✅ All tests passed!');
    } else if (report.overall === 'partial') {
      console.log('⚠️  Some tests failed, but no critical failures');
    } else {
      console.log('❌ Critical tests failed - deployment not recommended');
    }

    console.log('='.repeat(60) + '\n');
  }
}

// Export singleton instance
export const e2eTestFramework = new E2ETestFramework();
