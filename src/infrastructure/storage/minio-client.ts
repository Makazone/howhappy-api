import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '@shared/config/env.js';
import { logger } from '@shared/logging/logger.js';

const storageLogger = logger.child({ module: 'storage' });

function resolveEndpoint(rawEndpoint: string, useSsl: boolean): string {
  try {
    const normalized = rawEndpoint.includes('://') ? rawEndpoint : `http://${rawEndpoint}`;
    const url = new URL(normalized);

    if (useSsl) {
      url.protocol = 'https:';
    }

    // Ensure trailing slash removed for aws sdk compatibility
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    storageLogger.warn(
      { rawEndpoint, error },
      'Failed to parse MINIO_ENDPOINT, falling back to default http scheme',
    );
    const prefix = useSsl ? 'https://' : 'http://';
    return `${prefix}${rawEndpoint.replace(/^https?:\/\//, '')}`;
  }
}

export class MinIOClient {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    const env = getEnv();

    const endpoint = resolveEndpoint(env.MINIO_ENDPOINT, env.MINIO_USE_SSL);

    const config: S3ClientConfig = {
      endpoint,
      region: 'us-east-1', // MinIO requires a region even though it's not used
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO
    };

    this.client = new S3Client(config);
    this.bucketName = env.MINIO_BUCKET_NAME;
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      storageLogger.debug({ bucket: this.bucketName }, 'Bucket exists');
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        storageLogger.info({ bucket: this.bucketName }, 'Bucket created');
      } catch (createError) {
        storageLogger.error(
          { error: createError, bucket: this.bucketName },
          'Failed to create bucket',
        );
        throw createError;
      }
    }
  }

  async uploadObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await this.client.send(command);
      storageLogger.debug({ key, bucket: this.bucketName }, 'Object uploaded');
    } catch (error) {
      storageLogger.error({ error, key, bucket: this.bucketName }, 'Failed to upload object');
      throw error;
    }
  }

  async getObject(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        const stream = response.Body as AsyncIterable<Uint8Array>;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      storageLogger.error({ error, key, bucket: this.bucketName }, 'Failed to get object');
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      storageLogger.debug({ key, bucket: this.bucketName }, 'Object deleted');
    } catch (error) {
      storageLogger.error({ error, key, bucket: this.bucketName }, 'Failed to delete object');
      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getPresignedUploadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}

let minioClient: MinIOClient | null = null;

export function getMinIOClient(): MinIOClient {
  if (!minioClient) {
    minioClient = new MinIOClient();
  }
  return minioClient;
}
