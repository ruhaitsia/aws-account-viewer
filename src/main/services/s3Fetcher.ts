import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetBucketPolicyStatusCommand,
  GetBucketVersioningCommand,
  GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface S3Bucket {
  name: string;
  creationDate: string;
  region: string;
  objectCount: number;
  totalSize: number;
  storageClassDistribution: Record<string, number>;
}

interface S3BucketDetail {
  accessPolicy: 'public' | 'private';
  versioningEnabled: boolean;
  encryptionConfig: string;
  lifecycleRules: string[];
}

interface FetchResult<T> {
  data: T;
  timestamp: number;
  region: string;
  error?: { code: string; message: string };
}

interface ClientConfig {
  credentials: { accessKeyId: string; secretAccessKey: string };
  region: string;
}

/**
 * Transform raw AWS ListBuckets response into S3Bucket[].
 * Exported for testability.
 */
export function transformS3Response(
  buckets: any[],
  bucketRegions: Record<string, string>,
): S3Bucket[] {
  return buckets.map((bucket) => {
    const name = bucket.Name ?? '';
    return {
      name,
      creationDate: bucket.CreationDate
        ? new Date(bucket.CreationDate).toISOString()
        : '',
      region: bucketRegions[name] ?? '',
      objectCount: 0, // Requires CloudWatch or ListObjectsV2 (expensive); populated on-demand
      totalSize: 0,
      storageClassDistribution: {},
    };
  });
}

/**
 * Fetch all S3 buckets in the account (S3 is a global service).
 * For each bucket, attempts to resolve its region via GetBucketLocation.
 */
export async function fetchS3Buckets(
  clientConfig: ClientConfig,
): Promise<FetchResult<S3Bucket[]>> {
  try {
    const s3 = new S3Client({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const response = await s3.send(new ListBucketsCommand({}));
    const rawBuckets = response.Buckets ?? [];

    // Resolve regions for each bucket (best-effort)
    const bucketRegions: Record<string, string> = {};
    await Promise.all(
      rawBuckets.map(async (bucket) => {
        const name = bucket.Name ?? '';
        if (!name) return;
        try {
          const loc = await s3.send(
            new GetBucketLocationCommand({ Bucket: name }),
          );
          // LocationConstraint is null/undefined for us-east-1
          bucketRegions[name] = loc.LocationConstraint || 'us-east-1';
        } catch {
          bucketRegions[name] = 'unknown';
        }
      }),
    );

    return {
      data: transformS3Response(rawBuckets, bucketRegions),
      timestamp: Date.now(),
      region: 'global',
    };
  } catch (err: any) {
    return {
      data: [],
      timestamp: Date.now(),
      region: 'global',
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch S3 buckets',
      },
    };
  }
}


/**
 * Fetch detailed information for a specific S3 bucket.
 * Each sub-call handles AccessDenied gracefully.
 */
export async function fetchS3BucketDetail(
  clientConfig: ClientConfig,
  bucketName: string,
): Promise<FetchResult<S3BucketDetail>> {
  const s3 = new S3Client({
    credentials: clientConfig.credentials,
    region: clientConfig.region,
  });

  const detail: S3BucketDetail = {
    accessPolicy: 'private',
    versioningEnabled: false,
    encryptionConfig: '无',
    lifecycleRules: [],
  };

  // Access policy
  try {
    const policyStatus = await s3.send(
      new GetBucketPolicyStatusCommand({ Bucket: bucketName }),
    );
    detail.accessPolicy = policyStatus.PolicyStatus?.IsPublic ? 'public' : 'private';
  } catch (err: any) {
    // No bucket policy means private; AccessDenied is also treated as private
    if (err.name !== 'NoSuchBucketPolicy' && err.name !== 'AccessDenied') {
      // Unexpected error, still default to private
    }
  }

  // Versioning
  try {
    const versioning = await s3.send(
      new GetBucketVersioningCommand({ Bucket: bucketName }),
    );
    detail.versioningEnabled = versioning.Status === 'Enabled';
  } catch {
    // AccessDenied or other error — keep default
  }

  // Encryption
  try {
    const encryption = await s3.send(
      new GetBucketEncryptionCommand({ Bucket: bucketName }),
    );
    const rules = encryption.ServerSideEncryptionConfiguration?.Rules ?? [];
    if (rules.length > 0) {
      const algo = rules[0].ApplyServerSideEncryptionByDefault?.SSEAlgorithm ?? 'Unknown';
      detail.encryptionConfig = algo;
    }
  } catch (err: any) {
    if (err.name === 'ServerSideEncryptionConfigurationNotFoundError') {
      detail.encryptionConfig = '未启用';
    }
    // AccessDenied — keep default '无'
  }

  // Lifecycle rules
  try {
    const lifecycle = await s3.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName }),
    );
    detail.lifecycleRules = (lifecycle.Rules ?? []).map((rule) => {
      const status = rule.Status ?? 'Unknown';
      const id = rule.ID ?? '未命名';
      return `${id} (${status})`;
    });
  } catch (err: any) {
    if (err.name === 'NoSuchLifecycleConfiguration') {
      detail.lifecycleRules = [];
    }
    // AccessDenied — keep empty
  }

  return {
    data: detail,
    timestamp: Date.now(),
    region: 'global',
  };
}
