import { Config } from '../config/environments';
import { getLogger } from '../utils/logger';

const logger = getLogger('comprehensiveTestRunner');
interface TestSuiteResult {
  suite: string;
  status: 'pass' | 'fail' | 'partial';
  duration: number;
  details?: any;
}

export class ComprehensiveTestRunner {
  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    logger.info('🚀 TRIOLL COMPREHENSIVE TEST SUITE');
    logger.info('='.repeat(60));
    logger.info(`Environment: ${Config.ENV_NAME}`);
    logger.info(`API Endpoint: ${Config.API.BASE_URL}`);
    logger.info(`Timestamp: ${new Date().toLocaleString()}`);
    logger.info('='.repeat(60));
    logger.info('\n');

    const results: TestSuiteResult[] = [];

    // Test Suite 1: Backend Validation
    logger.info('📡 TEST SUITE 1: BACKEND VALIDATION');
    logger.info('-'.repeat(60));
    const backendResult = await this.runBackendValidation();
    results.push(backendResult);

    logger.info('\n');

    // Test Suite 2: API Integration
    logger.info('🔌 TEST SUITE 2: API INTEGRATION');
    logger.info('-'.repeat(60));
    const apiResult = await this.runAPIIntegrationTests();
    results.push(apiResult);

    // Print final summary
    this.printFinalSummary(results);
  }

  /**
   * Run backend validation tests
   */
  private async runBackendValidation(): Promise<TestSuiteResult> {
    const startTime = Date.now();

    try {
      // Check if backend validation is available
      if (typeof (global as any).runBackendValidation !== 'function') {
        logger.info('⏳ Loading backend validation...');
        const { loadBackendValidation } = await import('./backendValidation');
        await loadBackendValidation();
      }

      // Run the validation
      const report = await (global as any).runBackendValidation({ verbose: true });
      const duration = Date.now() - startTime;

      // Determine status
      let status: 'pass' | 'fail' | 'partial' = 'pass';
      if (report.overallStatus === 'not-ready') {
        status = 'fail';
      } else if (report.overallStatus === 'partial') {
        status = 'partial';
      }

      return {
        suite: 'Backend Validation',
        status,
        duration,
        details: report,
      };
    } catch (error: unknown) {
      logger.error('❌ Backend validation failed:', error.message);
      return {
        suite: 'Backend Validation',
        status: 'fail',
        duration: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  /**
   * Run API integration tests
   */
  private async runAPIIntegrationTests(): Promise<TestSuiteResult> {
    const startTime = Date.now();

    try {
      // Check if API tests are available
      if (typeof (global as any).runAPITests !== 'function') {
        logger.info('⏳ Loading API integration tests...');
        const { apiIntegrationTester } = await import('./apiIntegrationTest');
        (global as any).runAPITests = () => apiIntegrationTester.runAllTests();
      }

      // Run the tests
      const report = await (global as any).runAPITests();
      const duration = Date.now() - startTime;

      // Determine status
      let status: 'pass' | 'fail' | 'partial' = 'pass';
      if (report.overallStatus === 'not-ready') {
        status = 'fail';
      } else if (report.overallStatus === 'partial') {
        status = 'partial';
      }

      return {
        suite: 'API Integration',
        status,
        duration,
        details: report,
      };
    } catch (error: unknown) {
      logger.error('❌ API integration tests failed:', error.message);
      return {
        suite: 'API Integration',
        status: 'fail',
        duration: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  /**
   * Print final summary
   */
  private printFinalSummary(results: TestSuiteResult[]): void {
    logger.info('\n\n');
    logger.info('='.repeat(60));
    logger.info('📊 FINAL TEST SUMMARY');
    logger.info('='.repeat(60));

    let allPassed = true;
    let hasWarnings = false;

    results.forEach(result => {
      const statusEmoji = this.getStatusEmoji(result.status);
      logger.info(
        `${statusEmoji} ${result.suite}: ${result.status.toUpperCase()} (${result.duration}ms)`
      );

      if (result.status === 'fail') {
        allPassed = false;
      } else if (result.status === 'partial') {
        hasWarnings = true;
      }
    });

    logger.info('\n');

    if (allPassed && !hasWarnings) {
      logger.info('✅ ALL TESTS PASSED! Backend integration is fully operational.');
    } else if (allPassed && hasWarnings) {
      logger.info('⚠️  TESTS PASSED WITH WARNINGS. Some features may have limited functionality.');
    } else {
      logger.info('❌ SOME TESTS FAILED. Backend integration needs attention.');
    }

    logger.info('='.repeat(60));

    // Print recommendations
    this.printRecommendations(results);
  }

  /**
   * Print recommendations based on test results
   */
  private printRecommendations(results: TestSuiteResult[]): void {
    logger.info('\n📝 RECOMMENDATIONS:');

    results.forEach(result => {
      if (result.status === 'fail' || result.status === 'partial') {
        logger.info(`\n${result.suite}:`);

        if (result.details?.recommendations) {
          result.details.recommendations.forEach((rec: string) => {
            logger.info(`  • ${rec}`);
          });
        } else if (result.details?.error) {
          logger.info(`  • Fix error: ${(result.details as unknown).error}`);
        } else if (result.details?.summary) {
          const { failed } = result.details.summary;
          if (failed > 0) {
            logger.info(`  • Review and fix ${failed} failed tests`);
          }
        }
      }
    });

    logger.info('\n');
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'pass':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'fail':
        return '❌';
      default:
        return '❓';
    }
  }
}

// Export singleton instance
export const testRunner = new ComprehensiveTestRunner();

// Make available globally for console access
if (typeof global !== 'undefined' && __DEV__) {
  (global as any).runAllTests = () => testRunner.runAllTests();

  // Also expose individual test suites
  logger.info('\n🧪 Test Suite Commands Available:');
  logger.info('  • await runAllTests()        - Run all test suites');
  logger.info('  • await runBackendValidation() - Run backend validation only');
  logger.info('  • await runAPITests()        - Run API integration tests only');
}
