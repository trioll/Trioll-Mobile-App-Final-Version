
/**
 * Secure S3 Service
 * Implements user isolation and secure file storage using Cognito credentials
 * NO HARDCODED CREDENTIALS - All access via Cognito Identity Pool
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { CognitoIdentityClient, GetIdCommand } from '@aws-sdk/client-cognito-identity';
import { cognitoConfig, getCognitoLogins } from '../auth/cognitoConfig';
import { authService } from '../auth/authServiceAdapter';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import { crashReporter } from '../monitoring/crashReporter';

interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

interface SecureFile {
  key: string;
  size: number;
  lastModified: Date;
  url: string;
}

class SecureS3Service {
  private s3Client: S3Client | null = null;
  private identityClient: CognitoIdentityClient;
  private cognitoIdentityId: string | null = null;

  constructor() {
    this.identityClient = new CognitoIdentityClient({
      region: cognitoConfig.region,
    });
  }

  /**
   * Get or create S3 client with Cognito credentials
   */
  private async getClient(): Promise<S3Client> {
    if (!this.s3Client) {
      try {
        const idToken = await authService.getIdToken();
        const logins = idToken ? getCognitoLogins(idToken) : undefined;

        this.s3Client = new S3Client({
          region: cognitoConfig.region,
          credentials: fromCognitoIdentityPool({
            client: this.identityClient,
            identityPoolId: cognitoConfig.identityPoolId,
            logins,
          }),
        });
      } catch {
        crashReporter.captureException(error as Error, {
          tags: { component: 'SecureS3Service', operation: 'initializeS3Client' },
        });
        throw new Error('Unable to establish secure connection to storage');
      }
    }
    return this.s3Client;
  }

  /**
   * Get Cognito Identity ID for user isolation
   */
  private async getCognitoIdentityId(): Promise<string> {
    if (!this.cognitoIdentityId) {
      try {
        const idToken = await authService.getIdToken();
        const logins = idToken ? getCognitoLogins(idToken) : undefined;

        const response = await this.identityClient.send(
          new GetIdCommand({
            IdentityPoolId: cognitoConfig.identityPoolId,
            Logins: logins,
          })
        );

        this.cognitoIdentityId = response.IdentityId!;
      } catch {
        crashReporter.captureException(error as Error, {
          tags: { component: 'SecureS3Service', operation: 'getCognitoIdentityId' },
        });
        throw new Error('Unable to establish user identity');
      }
    }
    return this.cognitoIdentityId;
  }

  /**
   * Upload file with user isolation
   */
  async uploadSecure(
    fileName: string,
    data: Buffer | Blob | string,
    options: UploadOptions = {}
  ): Promise<SecureFile> {
    const operation = performanceMonitor.startOperation('s3Upload');

    try {
      const client = await this.getClient();
      const identityId = await this.getCognitoIdentityId();

      // User isolation - files stored under user's identity ID
      const secureKey = `${identityId}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.getBucketName(),
        Key: secureKey,
        Body: data,
        ContentType: options.contentType || 'application/octet-stream',
        ServerSideEncryption: 'AES256',
        Metadata: {
          ...options.metadata,
          uploadedBy: identityId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await client.send(command);

      performanceMonitor.endOperation(operation);

      return {
        key: secureKey,
        size: data instanceof Buffer ? data.length : 0,
        lastModified: new Date(),
        url: await this.getSecureUrl(fileName),
      };
    } catch {
      performanceMonitor.endOperation(operation, false);
      crashReporter.captureException(error as Error, {
        tags: { component: 'SecureS3Service', operation: 's3Upload' },
      });
      throw error;
    }
  }

  /**
   * Get secure download URL
   */
  async getSecureUrl(fileName: string): Promise<string> {
    const identityId = await this.getCognitoIdentityId();
    const secureKey = `${identityId}/${fileName}`;

    // For now, return the S3 URL structure
    // In production, use pre-signed URLs or CloudFront
    return `https://${this.getBucketName()}.s3.amazonaws.com/${secureKey}`;
  }

  /**
   * Download file with user verification
   */
  async downloadSecure(fileName: string): Promise<Buffer> {
    const operation = performanceMonitor.startOperation('s3Download');

    try {
      const client = await this.getClient();
      const identityId = await this.getCognitoIdentityId();
      const secureKey = `${identityId}/${fileName}`;

      const command = new GetObjectCommand({
        Bucket: this.getBucketName(),
        Key: secureKey,
      });

      const response = await client.send(command);
      const data = await response.Body!.transformToByteArray();

      performanceMonitor.endOperation(operation);
      return Buffer.from(data);
    } catch {
      performanceMonitor.endOperation(operation, false);
      crashReporter.captureException(error as Error, {
        tags: { component: 'SecureS3Service', operation: 's3Download' },
      });
      throw error;
    }
  }

  /**
   * Delete file with ownership verification
   */
  async deleteSecure(fileName: string): Promise<void> {
    try {
      const client = await this.getClient();
      const identityId = await this.getCognitoIdentityId();
      const secureKey = `${identityId}/${fileName}`;

      const command = new DeleteObjectCommand({
        Bucket: this.getBucketName(),
        Key: secureKey,
      });

      await client.send(command);
    } catch {
      crashReporter.captureException(error as Error, {
        tags: { component: 'SecureS3Service', operation: 's3Delete' },
      });
      throw error;
    }
  }

  /**
   * List user's files
   */
  async listUserFiles(): Promise<SecureFile[]> {
    try {
      const client = await this.getClient();
      const identityId = await this.getCognitoIdentityId();

      const command = new ListObjectsV2Command({
        Bucket: this.getBucketName(),
        Prefix: `${identityId}/`,
      });

      const response = await client.send(command);

      return (response.Contents || []).map(object => ({
        key: object.Key!,
        size: object.Size || 0,
        lastModified: object.LastModified!,
        url: `https://${this.getBucketName()}.s3.amazonaws.com/${object.Key}`,
      }));
    } catch {
      crashReporter.captureException(error as Error, {
        tags: { component: 'SecureS3Service', operation: 's3List' },
      });
      throw error;
    }
  }

  /**
   * Get environment-specific bucket name
   */
  private getBucketName(): string {
    const env = cognitoConfig.region === 'us-east-1' ? 'prod' : 'dev';
    return `trioll-${env}-uploads-us-east-1`;
  }

  /**
   * Clear cached credentials (on logout)
   */
  clearCredentials(): void {
    this.s3Client = null;
    this.cognitoIdentityId = null;
  }
}

// Export singleton instance
export const secureS3Service = new SecureS3Service();

/**
 * Security features implemented:
 * 1. User isolation via Cognito Identity ID
 * 2. Server-side encryption (AES256)
 * 3. No hardcoded credentials
 * 4. Automatic credential rotation
 * 5. File access restricted to owner
 * 6. Comprehensive error handling
 * 7. Performance monitoring
 */
