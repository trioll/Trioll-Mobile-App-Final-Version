
import { Config } from '../../config/environments';
import TriollAPI from '../api/TriollAPI';

import { authService } from '../auth/authServiceAdapter';
import { getLogger } from '../../utils/logger';
// Temporarily disable AWS SDK imports to fix bundling error
// import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
// import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const logger = getLogger('awsConnectionChecker');

interface ServiceStatus {
  name: string;
  connected: boolean;
  error?: string;
  details?: any;
}

class AWSConnectionChecker {
  private results: ServiceStatus[] = [];

  /**
   * Check all AWS services connectivity
   */
  async checkAllServices(): Promise<ServiceStatus[]> {
    this.results = [];

    // Run all checks
    await Promise.all([
      this.checkAPIGateway(),
      this.checkCognito(),
      this.checkDynamoDB(),
      this.checkS3Buckets(),
    ]);

    // Log results
    logger.info('\n🔍 AWS Services Connection Status:');
    logger.info('================================');

    this.results.forEach(result => {
      const status = result.connected ? '✅' : '❌';
      logger.info(
        `${status} ${result.name}: ${result.connected ? 'Connected' : (result as any).error || 'Failed'}`
      );
      if (result.details) {
        logger.info(`   Details:`, result.details);
      }
    });

    return this.results;
  }

  /**
   * Check API Gateway connectivity
   */
  private async checkAPIGateway(): Promise<void> {
    try {
      logger.info('Checking API Gateway...');

      // Try to fetch games from API
      const response = await TriollAPI.getGames(5);

      this.results.push({
        name: 'API Gateway',
        connected: true,
        details: {
          endpoint: Config.API_BASE_URL,
          gamesReturned: response?.games?.length || 0,
        },
      });
    } catch (error: unknown) {
      this.results.push({
        name: 'API Gateway',
        connected: false,
        error: error.message,
        details: {
          endpoint: Config.API_BASE_URL,
        },
      });
    }
  }

  /**
   * Check Cognito connectivity
   */
  private async checkCognito(): Promise<void> {
    try {
      logger.info('Checking Cognito...');

      const authMode = authService.getAuthMode();

      if (authMode === 'mock') {
        this.results.push({
          name: 'Cognito',
          connected: false,
          error: 'Using mock authentication',
          details: {
            mode: 'mock',
            userPoolId: Config.USER_POOL_ID,
            identityPoolId: Config.IDENTITY_POOL_ID,
          },
        });
      } else {
        // Try to get current user
        const user = await authService.getCurrentUser();

        this.results.push({
          name: 'Cognito',
          connected: true,
          details: {
            userPoolId: Config.USER_POOL_ID,
            identityPoolId: Config.IDENTITY_POOL_ID,
            hasUser: !!user,
          },
        });
      }
    } catch (error: unknown) {
      this.results.push({
        name: 'Cognito',
        connected: false,
        error: error.message,
        details: {
          userPoolId: Config.USER_POOL_ID,
          identityPoolId: Config.IDENTITY_POOL_ID,
        },
      });
    }
  }

  /**
   * Check DynamoDB connectivity
   */
  private async checkDynamoDB(): Promise<void> {
    // Temporarily disabled to fix bundling error
    this.results.push({
      name: 'DynamoDB',
      connected: false,
      error: 'DynamoDB check temporarily disabled',
      details: {
        region: Config.AWS_REGION,
        reason: 'AWS SDK import issue',
      },
    });
    return;

    /* Original implementation - restore after fixing bundling issue
    try {
      logger.info('Checking DynamoDB...');
      
      if (!isAWSConfigured()) {
        this.results.push({
          name: 'DynamoDB',
          connected: false,
          error: 'AWS not configured',
          details: { configured: false },
        });
        return;
      }
      
      const client = new DynamoDBClient(getAWSConfig());

      // Check if tables exist
      const tables = [Config.GAMES_TABLE, Config.USERS_TABLE];
      const tableStatuses: unknown[] = [];

      for (let i = 0; i < tables.length; i++) { const tableName = tables[i]; {
        try {
          const command = new DescribeTableCommand({ TableName: tableName  });
          const response = await client.send(command);
          tableStatuses.push({
            table: tableName,
            status: response.Table?.TableStatus || 'Unknown',
          });
        } catch (error) {
          tableStatuses.push({
            table: tableName,
            status: 'Not accessible',
          });
        }
      }

      const allTablesAccessible = tableStatuses.every(t => t.status === 'ACTIVE');

      this.results.push({
        name: 'DynamoDB',
        connected: allTablesAccessible,
        error: allTablesAccessible ? undefined : 'Some tables not accessible',
        details: {
          region: Config.AWS_REGION,
          tables: tableStatuses,
        },
      });
    } catch (error: unknown) {
      this.results.push({
        name: 'DynamoDB',
        connected: false,
        error: error.message,
        details: {
          region: Config.AWS_REGION,
        },
      });
    }
    */
  }

  /**
   * Check S3 buckets connectivity
   */
  private async checkS3Buckets(): Promise<void> {
    // Temporarily disabled to fix bundling error
    this.results.push({
      name: 'S3',
      connected: false,
      error: 'S3 check temporarily disabled',
      details: {
        region: Config.AWS_REGION,
        reason: 'AWS SDK import issue',
      },
    });
    return;

    /* Original implementation - restore after fixing bundling issue
    try {
      logger.info('Checking S3 Buckets...');
      
      if (!isAWSConfigured()) {
        this.results.push({
          name: 'S3',
          connected: false,
          error: 'AWS not configured',
          details: { configured: false },
        });
        return;
      }
      
      const client = new S3Client(getAWSConfig());

      // Check if buckets exist
      const buckets = [
        Config.S3_GAMES_BUCKET,
        Config.S3_UPLOADS_BUCKET,
        Config.S3_ANALYTICS_BUCKET,
      ];
      const bucketStatuses: unknown[] = [];

      for (let i = 0; i < buckets.length; i++) { const bucketName = buckets[i]; {
        try {
          const command = new HeadBucketCommand({ Bucket: bucketName  });
          await client.send(command);
          bucketStatuses.push({
            bucket: bucketName,
            status: 'Accessible',
          });
        } catch (error) {
          bucketStatuses.push({
            bucket: bucketName,
            status: 'Not accessible',
          });
        }
      }

      const allBucketsAccessible = bucketStatuses.every(b => b.status === 'Accessible');

      this.results.push({
        name: 'S3',
        connected: allBucketsAccessible,
        error: allBucketsAccessible ? undefined : 'Some buckets not accessible',
        details: {
          region: Config.AWS_REGION,
          buckets: bucketStatuses,
        },
      });
    } catch (error: unknown) {
      this.results.push({
        name: 'S3',
        connected: false,
        error: error.message,
        details: {
          region: Config.AWS_REGION,
        },
      });
    }
    */
  }

  /**
   * Get connection summary
   */
  getConnectionSummary(): {
    totalServices: number;
    connectedServices: number;
    disconnectedServices: string[];
  } {
    const connected = this.results.filter(r => r.connected);
    const disconnected = this.results.filter(r => !r.connected).map(r => r.name);

    return {
      totalServices: this.results.length,
      connectedServices: connected.length,
      disconnectedServices: disconnected,
    };
  }
}

// Export singleton instance
export const awsConnectionChecker = new AWSConnectionChecker();
