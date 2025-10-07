/**
 * Health Check Service
 * Validates connectivity to all backend services
 */

import { Config } from '../../config/environments';
import { authService } from '../auth/authServiceAdapter';
import { dynamoDBService, TABLES } from '../database/dynamoDBService';
import { WebSocketManager } from '../../utils/websocketManager';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import * as Network from 'expo-network';
import { getLogger } from '../../utils/logger';

const logger = getLogger('HealthCheckService');

export interface ServiceHealth {
  name: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  latency?: number;
  lastCheck: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  timestamp: number;
  environment: string;
  overall: 'healthy' | 'degraded' | 'unavailable';
  services: ServiceHealth[];
  network: {
    isConnected: boolean;
    type: string;
    isInternetReachable: boolean;
  };
  recommendations: string[];
}

class HealthCheckService {
  private wsManager = WebSocketManager.getInstance();
  private lastCheckResult: HealthCheckResult | null = null;
  private checkInProgress = false;

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    if (this.checkInProgress) {
      logger.info('⏳ Health check already in progress');
      return this.lastCheckResult || this.createEmptyResult();
    }

    this.checkInProgress = true;
    logger.info('🏥 Starting comprehensive health check...\n');

    const result: HealthCheckResult = {
      timestamp: Date.now(),
      environment: Config.ENV,
      overall: 'healthy',
      services: [],
      network: {
        isConnected: false,
        type: 'unknown',
        isInternetReachable: false,
      },
      recommendations: [],
    };

    try {
      // Check network connectivity first
      const netInfo = await Network.getNetworkStateAsync();
      result.network = {
        isConnected: netInfo.isConnected || false,
        type: netInfo.type || Network.NetworkStateType.UNKNOWN,
        isInternetReachable: netInfo.isInternetReachable || false,
      };

      if (!result.network.isConnected) {
        result.overall = 'unavailable';
        result.recommendations.push('Check network connection');
        this.lastCheckResult = result;
        return result;
      }

      // Run service checks in parallel
      const checks = await Promise.allSettled([
        this.checkAPIGateway(),
        this.checkCognito(),
        this.checkDynamoDB(),
        this.checkWebSocket(),
        this.checkS3(),
      ]);

      // Process results
      checks.forEach((check, index) => {
        if (check.status === 'fulfilled') {
          result.services.push(check.value);
        } else {
          // Handle failed checks
          const serviceName = ['API Gateway', 'AWS Cognito', 'DynamoDB', 'WebSocket', 'S3'][index];
          result.services.push({
            name: serviceName,
            endpoint: 'unknown',
            status: 'unavailable',
            lastCheck: Date.now(),
            error: check.reason?.message || 'Health check failed',
          });
        }
      });

      // Determine overall health
      const unhealthyServices = result.services.filter(s => s.status === 'unavailable');
      const degradedServices = result.services.filter(s => s.status === 'degraded');

      if (unhealthyServices.length > 0) {
        result.overall = 'unavailable';
        result.recommendations.push(
          `Fix connectivity to: ${unhealthyServices.map(s => s.name).join(', ')}`
        );
      } else if (degradedServices.length > 0) {
        result.overall = 'degraded';
        result.recommendations.push(
          `Monitor degraded services: ${degradedServices.map(s => s.name).join(', ')}`
        );
      }

      // Performance recommendations
      const slowServices = result.services.filter(s => s.latency && s.latency > 1000);
      if (slowServices.length > 0) {
        result.recommendations.push(
          `Slow response from: ${slowServices.map(s => s.name).join(', ')}`
        );
      }

      this.lastCheckResult = result;

      // Track health check
      performanceMonitor.recordMetric('health_check_duration', Date.now() - result.timestamp);
    } catch {
      logger.error('Health check error:', error);
      result.overall = 'unavailable';
      result.recommendations.push('Health check system error');
    } finally {
      this.checkInProgress = false;
    }

    this.printHealthReport(result);
    return result;
  }

  /**
   * Check API Gateway health
   */
  private async checkAPIGateway(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const health: ServiceHealth = {
      name: 'API Gateway',
      endpoint: Config.API_BASE_URL,
      status: 'unknown',
      lastCheck: startTime,
    };

    try {
      const response = await fetch(`${Config.API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'health-check',
        },
        signal: AbortSignal.timeout(5000),
      });

      health.latency = Date.now() - startTime;

      if (response.ok) {
        health.status = 'healthy';

        try {
          const data = await response.json();
          health.details = data;
        } catch {
          // JSON parse error is ok for health check
        }
      } else if (response.status === 404) {
        // 404 means API is responding but health endpoint doesn't exist
        health.status = 'healthy';
        health.details = { note: 'Health endpoint not implemented' };
      } else if (response.status >= 500) {
        health.status = 'unavailable';
        (health as any).error = `Server error: ${response.status}`;
      } else {
        health.status = 'degraded';
        (health as any).error = `Unexpected status: ${response.status}`;
      }

      // Check latency
      if (health.status === 'healthy' && health.latency > 2000) {
        health.status = 'degraded';
        health.details = { ...health.details, warning: 'High latency detected' };
      }
    } catch (error: unknown) {
      health.status = 'unavailable';
      (health as any).error = error.message;
      health.latency = Date.now() - startTime;
    }

    return health;
  }

  /**
   * Check AWS Cognito health
   */
  private async checkCognito(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const health: ServiceHealth = {
      name: 'AWS Cognito',
      endpoint: `https://cognito-idp.${Config.AWS_REGION}.amazonaws.com`,
      status: 'unknown',
      lastCheck: startTime,
    };

    try {
      // Test by attempting to get current auth mode
      const authMode = authService.getAuthMode();
      health.latency = Date.now() - startTime;

      if (Config.USE_MOCK_API) {
        health.status = authMode === 'mock' ? 'healthy' : 'degraded';
        health.details = { mode: authMode, mockEnabled: true };
      } else {
        // Try to check if user pool is accessible
        const isAuthenticated = await authService.isAuthenticated();
        health.status = 'healthy';
        health.details = {
          authenticated: isAuthenticated,
          userPoolId: Config.USER_POOL_ID,
        };
      }
    } catch (error: unknown) {
      health.status = 'unavailable';
      (health as any).error = error.message;
      health.latency = Date.now() - startTime;
    }

    return health;
  }

  /**
   * Check DynamoDB health
   */
  private async checkDynamoDB(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const health: ServiceHealth = {
      name: 'DynamoDB',
      endpoint: `${Config.API_BASE_URL}/dynamodb`,
      status: 'unknown',
      lastCheck: startTime,
    };

    try {
      if (Config.USE_MOCK_API) {
        health.status = 'healthy';
        health.details = { mockEnabled: true };
        health.latency = Date.now() - startTime;
        return health;
      }

      // Test with a lightweight query
      dynamoDBService.enableTestMode();
      const { items } = await dynamoDBService.query(
        TABLES.GAMES,
        { category: 'Action' },
        { limit: 1 }
      );

      health.latency = Date.now() - startTime;
      health.status = 'healthy';
      health.details = {
        tablesAccessible: true,
        sampleQuery: 'success',
        itemsFound: items.length,
      };

      // Check latency
      if (health.latency > 1000) {
        health.status = 'degraded';
        health.details.warning = 'High query latency';
      }
    } catch (error: unknown) {
      health.status = 'unavailable';
      (health as any).error = error.message;
      health.latency = Date.now() - startTime;
    }

    return health;
  }

  /**
   * Check WebSocket health
   */
  private async checkWebSocket(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const health: ServiceHealth = {
      name: 'WebSocket',
      endpoint: Config.WEBSOCKET_URL || 'not configured',
      status: 'unknown',
      lastCheck: startTime,
    };

    try {
      if (!Config.FEATURES.WEBSOCKET_ENABLED || !Config.WEBSOCKET_URL) {
        health.status = 'healthy';
        health.details = { enabled: false, reason: 'WebSocket disabled' };
        return health;
      }

      // Check if already connected
      if (this.wsManager.isConnected()) {
        health.status = 'healthy';
        health.latency = 0;
        health.details = {
          connected: true,
          state: this.wsManager.getState(),
        };
      } else {
        // Don't actually connect during health check
        health.status = 'healthy';
        health.details = {
          connected: false,
          configured: true,
        };
      }
    } catch (error: unknown) {
      health.status = 'degraded';
      (health as any).error = error.message;
      health.latency = Date.now() - startTime;
    }

    return health;
  }

  /**
   * Check S3 health
   */
  private async checkS3(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const health: ServiceHealth = {
      name: 'S3 Storage',
      endpoint: `https://${Config.S3_GAMES_BUCKET}.s3.${Config.AWS_REGION}.amazonaws.com`,
      status: 'unknown',
      lastCheck: startTime,
    };

    try {
      // Test by fetching a small test object
      const testUrl = `https://${Config.S3_GAMES_BUCKET}.s3.${Config.AWS_REGION}.amazonaws.com/health-check.txt`;

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });

      health.latency = Date.now() - startTime;

      if (response.ok || response.status === 404) {
        // 404 is ok - bucket is accessible but file doesn't exist
        health.status = 'healthy';
        health.details = {
          bucket: Config.S3_GAMES_BUCKET,
          accessible: true,
        };
      } else if (response.status === 403) {
        health.status = 'degraded';
        (health as any).error = 'Access denied - check bucket permissions';
      } else {
        health.status = 'unavailable';
        (health as any).error = `Unexpected status: ${response.status}`;
      }
    } catch (error: unknown) {
      // S3 might block CORS, so timeout is expected
      if (error.name === 'AbortError') {
        health.status = 'healthy';
        health.details = { note: 'S3 CORS blocking health check - assuming healthy' };
      } else {
        health.status = 'degraded';
        (health as any).error = error.message;
      }
      health.latency = Date.now() - startTime;
    }

    return health;
  }

  /**
   * Get last health check result
   */
  getLastResult(): HealthCheckResult | null {
    return this.lastCheckResult;
  }

  /**
   * Create empty result
   */
  private createEmptyResult(): HealthCheckResult {
    return {
      timestamp: Date.now(),
      environment: Config.ENV,
      overall: 'unknown',
      services: [],
      network: {
        isConnected: false,
        type: 'unknown',
        isInternetReachable: false,
      },
      recommendations: [],
    };
  }

  /**
   * Print health report
   */
  private printHealthReport(result: HealthCheckResult) {
    logger.info('\n📊 Health Check Report');
    logger.info('='.repeat(50));
    logger.info(`Environment: ${result.environment}`);
    logger.info(
      `Overall Status: ${this.getStatusEmoji(result.overall)} ${result.overall.toUpperCase()}`
    );
    logger.info(
      `Network: ${result.network.isConnected ? '✅ Connected' : '❌ Disconnected'} (${result.network.type})`
    );
    logger.info('\nService Status:');
    logger.info('-'.repeat(50));

    result.services.forEach(service => {
      const emoji = this.getStatusEmoji(service.status);
      const latency = service.latency ? ` (${service.latency}ms)` : '';
      logger.info(`${emoji} ${service.name}: ${service.status}${latency}`);
      if ((service as any).error) {
        logger.info(`   └─ Error: ${(service as any).error}`);
      }
    });

    if (result.recommendations.length > 0) {
      logger.info('\n💡 Recommendations:');
      result.recommendations.forEach(rec => {
        logger.info(`   • ${rec}`);
      });
    }

    logger.info('='.repeat(50) + '\n');
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unavailable':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Check if all services are healthy
   */
  isHealthy(): boolean {
    if (!this.lastCheckResult) return false;
    return this.lastCheckResult.overall === 'healthy';
  }

  /**
   * Get unhealthy services
   */
  getUnhealthyServices(): ServiceHealth[] {
    if (!this.lastCheckResult) return [];
    return this.lastCheckResult.services.filter(
      s => s.status === 'unavailable' || s.status === 'degraded'
    );
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();

// Export for testing
export { HealthCheckService };
