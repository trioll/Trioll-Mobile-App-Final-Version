
/**
 * DynamoDB Service
 * Handles all DynamoDB operations through API Gateway with safety measures
 */

import { Config } from '../../config/environments';

import { analyticsService } from '../monitoring/analyticsEnhanced';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import { getLogger } from '../../utils/logger';

const logger = getLogger('DynamoDBService');

// DynamoDB table names from config
const TABLES = {
  GAMES: 'trioll-prod-games',
  USERS: 'trioll-prod-users',
  ANALYTICS: 'trioll-prod-analytics',
  USER_INTERACTIONS: 'trioll-prod-user-interactions',
};

// Safety flags for database testing
const DB_SAFETY = {
  USE_STAGING_ONLY: true,
  REQUIRE_TEST_PREFIX: true,
  MAX_TEST_RECORDS: 1000,
  AUTO_CLEANUP_ENABLED: true,
  READ_ONLY_MODE: false,
};

export interface DynamoDBConfig {
  region: string;
  endpoint?: string;
  tables: typeof TABLES;
}

export interface QueryOptions {
  limit?: number;
  nextToken?: string;
  filter?: Record<string, unknown>;
  index?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface BatchWriteItem {
  operation: 'put' | 'delete';
  item: Record<string, unknown>;
}

class DynamoDBService {
  private apiEndpoint: string;
  private isTestMode = false;
  private testDataPrefix = 'test_';

  constructor() {
    this.apiEndpoint = Config.API_BASE_URL;
    this.validateStagingEnvironment();
  }

  /**
   * Validates we're using staging environment for safety
   */
  private validateStagingEnvironment() {
    if (DB_SAFETY.USE_STAGING_ONLY && Config.ENV === 'production') {
      throw new Error('Database testing blocked: Production environment detected');
    }

    if (this.apiEndpoint.includes('prod') && !this.apiEndpoint.includes('staging')) {
      logger.info('Using API endpoint with prod stage', { endpoint: this.apiEndpoint });
    }

    logger.info('Database testing environment validated', { env: Config.ENV });
  }

  /**
   * Enable test mode for safe testing
   */
  enableTestMode() {
    this.isTestMode = true;
    logger.info('Database test mode enabled');
  }

  /**
   * Execute a DynamoDB query through API Gateway
   */
  async query<T>(
    tableName: string,
    keyCondition: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<{ items: T[]; nextToken?: string }> {
    const startTime = Date.now();

    try {
      // Build query parameters
      const params = {
        TableName: tableName,
        KeyConditionExpression: this.buildKeyConditionExpression(keyCondition),
        ExpressionAttributeValues: this.buildExpressionAttributeValues(keyCondition),
        Limit: options.limit || 20,
        ExclusiveStartKey: options.nextToken ? JSON.parse(options.nextToken) : undefined,
        IndexName: options.index,
        ScanIndexForward: options.sortOrder === 'ASC',
      };

      // Add filter if provided
      if (options.filter) {
        const filterExpression = this.buildFilterExpression(options.filter);
        params['FilterExpression'] = filterExpression.expression;
        Object.assign(params.ExpressionAttributeValues, filterExpression.values);
      }

      // Get auth token
      const token = await this.getAuthToken();

      // Make API request
      const response = await fetch(`${this.apiEndpoint}/dynamodb/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Track performance
      performanceMonitor.recordMetric('dynamodb_query_duration', Date.now() - startTime);
      analyticsService.track('dynamodb_query', {
        table: tableName,
        index: options.index,
        itemCount: data.Items?.length || 0,
        duration: Date.now() - startTime,
      });

      return {
        items: data.Items || [],
        nextToken: data.LastEvaluatedKey ? JSON.stringify(data.LastEvaluatedKey) : undefined,
      };
    } catch {
      performanceMonitor.recordMetric('dynamodb_query_error', 1);
      throw error;
    }
  }

  /**
   * Get a single item from DynamoDB
   */
  async getItem<T>(tableName: string, key: Record<string, unknown>): Promise<T | null> {
    const startTime = Date.now();

    try {
      const params = {
        TableName: tableName,
        Key: key,
      };

      const token = await this.getAuthToken();

      const response = await fetch(`${this.apiEndpoint}/dynamodb/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`GetItem failed: ${response.statusText}`);
      }

      const data = await response.json();

      performanceMonitor.recordMetric('dynamodb_get_duration', Date.now() - startTime);

      return data.Item || null;
    } catch {
      performanceMonitor.recordMetric('dynamodb_get_error', 1);
      throw error;
    }
  }

  /**
   * Put an item into DynamoDB (test mode only)
   */
  async putItem(tableName: string, item: Record<string, any>): Promise<void> {
    if (!this.isTestMode) {
      throw new Error('Write operations require test mode to be enabled');
    }

    if (DB_SAFETY.READ_ONLY_MODE) {
      throw new Error('Database is in read-only mode');
    }

    const startTime = Date.now();

    try {
      // Add test prefix to prevent production data conflicts
      if (DB_SAFETY.REQUIRE_TEST_PREFIX && item.id) {
        item.id = this.ensureTestPrefix(item.id);
      }

      const params = {
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)', // Prevent overwrites
      };

      const token = await this.getAuthToken();

      const response = await fetch(`${this.apiEndpoint}/dynamodb/put`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`PutItem failed: ${response.statusText}`);
      }

      performanceMonitor.recordMetric('dynamodb_put_duration', Date.now() - startTime);
      analyticsService.track('dynamodb_put', {
        table: tableName,
        duration: Date.now() - startTime,
      });
    } catch {
      performanceMonitor.recordMetric('dynamodb_put_error', 1);
      throw error;
    }
  }

  /**
   * Update an item in DynamoDB (test mode only)
   */
  async updateItem(
    tableName: string,
    key: Record<string, any>,
    updates: Record<string, any>
  ): Promise<void> {
    if (!this.isTestMode) {
      throw new Error('Write operations require test mode to be enabled');
    }

    if (DB_SAFETY.READ_ONLY_MODE) {
      throw new Error('Database is in read-only mode');
    }

    const startTime = Date.now();

    try {
      const updateExpression = this.buildUpdateExpression(updates);

      const params = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression.expression,
        ExpressionAttributeValues: updateExpression.values,
        ExpressionAttributeNames: updateExpression.names,
        ReturnValues: 'ALL_NEW',
      };

      const token = await this.getAuthToken();

      const response = await fetch(`${this.apiEndpoint}/dynamodb/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`UpdateItem failed: ${response.statusText}`);
      }

      performanceMonitor.recordMetric('dynamodb_update_duration', Date.now() - startTime);
    } catch {
      performanceMonitor.recordMetric('dynamodb_update_error', 1);
      throw error;
    }
  }

  /**
   * Delete an item from DynamoDB (test mode only)
   */
  async deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
    if (!this.isTestMode) {
      throw new Error('Delete operations require test mode to be enabled');
    }

    if (DB_SAFETY.READ_ONLY_MODE) {
      throw new Error('Database is in read-only mode');
    }

    // Verify test prefix for safety
    if (DB_SAFETY.REQUIRE_TEST_PREFIX && key.id && !key.id.startsWith(this.testDataPrefix)) {
      throw new Error('Can only delete test data');
    }

    const startTime = Date.now();

    try {
      const params = {
        TableName: tableName,
        Key: key,
      };

      const token = await this.getAuthToken();

      const response = await fetch(`${this.apiEndpoint}/dynamodb/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`DeleteItem failed: ${response.statusText}`);
      }

      performanceMonitor.recordMetric('dynamodb_delete_duration', Date.now() - startTime);
    } catch {
      performanceMonitor.recordMetric('dynamodb_delete_error', 1);
      throw error;
    }
  }

  /**
   * Batch write operations (test mode only)
   */
  async batchWrite(tableName: string, items: BatchWriteItem[]): Promise<void> {
    if (!this.isTestMode) {
      throw new Error('Batch write operations require test mode to be enabled');
    }

    if (DB_SAFETY.READ_ONLY_MODE) {
      throw new Error('Database is in read-only mode');
    }

    if (items.length > 25) {
      throw new Error('Batch write limited to 25 items per request');
    }

    const startTime = Date.now();

    try {
      const requestItems = {
        [tableName]: items.map(item => {
          if (item.operation === 'put') {
            // Add test prefix
            if (DB_SAFETY.REQUIRE_TEST_PREFIX && item.item.id) {
              item.item.id = this.ensureTestPrefix(item.item.id);
            }
            return {
              PutRequest: { Item: item.item },
            };
          } else {
            // Verify test prefix for deletes
            if (
              DB_SAFETY.REQUIRE_TEST_PREFIX &&
              item.item.id &&
              !item.item.id.startsWith(this.testDataPrefix)
            ) {
              throw new Error('Can only delete test data');
            }
            return {
              DeleteRequest: { Key: item.item },
            };
          }
        }),
      };

      const params = {
        RequestItems: requestItems,
      };

      const token = await this.getAuthToken();

      const response = await fetch(`${this.apiEndpoint}/dynamodb/batch-write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`BatchWrite failed: ${response.statusText}`);
      }

      performanceMonitor.recordMetric('dynamodb_batch_write_duration', Date.now() - startTime);
      analyticsService.track('dynamodb_batch_write', {
        table: tableName,
        itemCount: items.length,
        duration: Date.now() - startTime,
      });
    } catch {
      performanceMonitor.recordMetric('dynamodb_batch_write_error', 1);
      throw error;
    }
  }

  /**
   * Scan table (use sparingly, expensive operation)
   */
  async scan<T>(
    tableName: string,
    options: {
      limit?: number;
      filter?: Record<string, unknown>;
      nextToken?: string;
    } = {}
  ): Promise<{ items: T[]; nextToken?: string }> {
    logger.warn('Scan operation is expensive - use query when possible');

    const startTime = Date.now();

    try {
      const params: Record<string, unknown> = {
        TableName: tableName,
        Limit: options.limit || 20,
        ExclusiveStartKey: options.nextToken ? JSON.parse(options.nextToken) : undefined,
      };

      if (options.filter) {
        const filterExpression = this.buildFilterExpression(options.filter);
        params.FilterExpression = filterExpression.expression;
        params.ExpressionAttributeValues = filterExpression.values;
      }

      const token = await this.getAuthToken();

      const response = await fetch(`${this.apiEndpoint}/dynamodb/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.statusText}`);
      }

      const data = await response.json();

      performanceMonitor.recordMetric('dynamodb_scan_duration', Date.now() - startTime);
      analyticsService.track('dynamodb_scan', {
        table: tableName,
        itemCount: data.Items?.length || 0,
        duration: Date.now() - startTime,
      });

      return {
        items: data.Items || [],
        nextToken: data.LastEvaluatedKey ? JSON.stringify(data.LastEvaluatedKey) : undefined,
      };
    } catch {
      performanceMonitor.recordMetric('dynamodb_scan_error', 1);
      throw error;
    }
  }

  /**
   * Clean up test data (test mode only)
   */
  async cleanupTestData(tableName: string): Promise<number> {
    if (!this.isTestMode || !DB_SAFETY.AUTO_CLEANUP_ENABLED) {
      throw new Error('Test cleanup only available in test mode');
    }

    logger.info(`Cleaning up test data from ${tableName}...`);

    const deletedCount = 0;
    let nextToken: string | undefined;

    try {
      do {
        // Scan for test data
        const { items, nextToken: next } = await this.scan(tableName, {
          filter: {
            id: { beginsWith: this.testDataPrefix },
          },
          nextToken,
        });

        if (items.length > 0) {
          // Batch delete test items
          const deleteItems = items.map(item => ({
            operation: 'delete' as const,
            item: { id: (item as Record<string, unknown>).id },
          }));

          // Process in batches of 25
          for (const i = 0; i < deleteItems.length; i += 25) {
            const batch = deleteItems.slice(i, i + 25);
            await this.batchWrite(tableName, batch);
            deletedCount += batch.length;
          }
        }

        nextToken = next;
      } while (nextToken);

      logger.info(`Cleaned up ${deletedCount} test records from ${tableName}`);
      return deletedCount;
    } catch {
      logger.error('Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    const isAuthenticated = await authService.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Authentication required for database operations');
    }

    // Get current session tokens
    const tokens = await authService.getCurrentUser();
    if (!tokens) {
      throw new Error('No valid authentication tokens');
    }

    // Return the access token
    return 'mock-token'; // In real implementation, return actual token
  }

  /**
   * Build key condition expression
   */
  private buildKeyConditionExpression(keyCondition: Record<string, any>): string {
    return Object.keys(keyCondition)
      .map(key => `${key} = :${key}`)
      .join(' AND ');
  }

  /**
   * Build expression attribute values
   */
  private buildExpressionAttributeValues(values: Record<string, any>): Record<string, any> {
    const expressionValues: Record<string, any> = {};
    Object.keys(values).forEach((key) => { const value = values[key];
      expressionValues[`:${key}`] = value;
    });
    return expressionValues;
  }

  /**
   * Build filter expression
   */
  private buildFilterExpression(filter: Record<string, any>): {
    expression: string;
    values: Record<string, any>;
  } {
    const expressions: string[] = [];
    const values: Record<string, any> = {};

    Object.keys(filter).forEach((key) => { const value = filter[key];
      if (typeof value === 'object' && value !== null) {
        // Handle complex filters
        const operator = Object.keys(value)[0];
        const operandValue = value[operator];

        switch (operator) {
          case 'beginsWith':
            expressions.push(`begins_with(${key}, :${key})`);
            values[`:${key}`] = operandValue;
            break;
          case 'contains':
            expressions.push(`contains(${key}, :${key})`);
            values[`:${key}`] = operandValue;
            break;
          case 'between':
            expressions.push(`${key} BETWEEN :${key}Min AND :${key}Max`);
            values[`:${key}Min`] = operandValue[0];
            values[`:${key}Max`] = operandValue[1];
            break;
          default:
            expressions.push(`${key} = :${key}`);
            values[`:${key}`] = operandValue;
        }
      } else {
        // Simple equality
        expressions.push(`${key} = :${key}`);
        values[`:${key}`] = value;
      }
    });

    return {
      expression: expressions.join(' AND '),
      values,
    };
  }

  /**
   * Build update expression
   */
  private buildUpdateExpression(updates: Record<string, any>): {
    expression: string;
    values: Record<string, any>;
    names: Record<string, string>;
  } {
    const setExpressions: string[] = [];
    const values: Record<string, any> = {};
    const names: Record<string, string> = {};

    Object.keys(updates).forEach((key) => { const value = updates[key];
      const attrName = `#${key}`;
      const attrValue = `:${key}`;

      setExpressions.push(`${attrName} = ${attrValue}`);
      names[attrName] = key;
      values[attrValue] = value;
    });

    return {
      expression: `SET ${setExpressions.join(', ')}`,
      values,
      names,
    };
  }

  /**
   * Ensure test prefix for safety
   */
  private ensureTestPrefix(id: string): string {
    if (!id.startsWith(this.testDataPrefix)) {
      return `${this.testDataPrefix}${id}`;
    }
    return id;
  }

  /**
   * Get table configuration
   */
  getTables(): typeof TABLES {
    return TABLES;
  }
}

// Export singleton instance
export const dynamoDBService = new DynamoDBService();

// Export for testing
export { DynamoDBService, TABLES };
