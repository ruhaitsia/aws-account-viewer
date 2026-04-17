import {
  CloudFrontClient,
  ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront';
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface CloudFrontDistribution {
  distributionId: string;
  domainName: string;
  status: 'Deployed' | 'InProgress';
  aliases: string[];
  originSummary: string;
  priceClass: string;
}

interface MetricDataPoint {
  timestamp: number;
  value: number;
}

interface CloudFrontMetrics {
  requests: MetricDataPoint[];
  bytesDownloaded: MetricDataPoint[];
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
 * Transform raw AWS ListDistributions items into CloudFrontDistribution[].
 * Exported for testability.
 */
export function transformCloudFrontResponse(distributionItems: any[]): CloudFrontDistribution[] {
  return (distributionItems ?? []).map((item: any) => {
    const aliases: string[] = [];
    const aliasList = item.Aliases?.Items ?? [];
    for (const alias of aliasList) {
      if (alias) aliases.push(alias);
    }

    const origins = item.Origins?.Items ?? [];
    const originSummary = origins
      .map((o: any) => o.DomainName ?? '')
      .filter(Boolean)
      .join(', ');

    const rawStatus = item.Status ?? '';
    const status: 'Deployed' | 'InProgress' =
      rawStatus === 'Deployed' ? 'Deployed' : 'InProgress';

    return {
      distributionId: item.Id ?? '',
      domainName: item.DomainName ?? '',
      status,
      aliases,
      originSummary: originSummary || '-',
      priceClass: item.PriceClass ?? '',
    };
  });
}

/**
 * Fetch all CloudFront distributions.
 * CloudFront is a global service — always uses us-east-1.
 */
export async function fetchCloudFrontDistributions(
  clientConfig: ClientConfig,
): Promise<FetchResult<CloudFrontDistribution[]>> {
  try {
    const cf = new CloudFrontClient({
      credentials: clientConfig.credentials,
      region: 'us-east-1',
    });

    const allItems: any[] = [];
    let marker: string | undefined;

    do {
      const response = await cf.send(
        new ListDistributionsCommand({ Marker: marker }),
      );
      const list = response.DistributionList;
      const items = list?.Items ?? [];
      allItems.push(...items);
      marker = list?.IsTruncated ? list.NextMarker : undefined;
    } while (marker);

    return {
      data: transformCloudFrontResponse(allItems),
      timestamp: Date.now(),
      region: 'us-east-1',
    };
  } catch (err: any) {
    return {
      data: [],
      timestamp: Date.now(),
      region: 'us-east-1',
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch CloudFront distributions',
      },
    };
  }
}

/**
 * Fetch CloudWatch metrics for a CloudFront distribution (last 24 hours).
 * Returns Requests and BytesDownloaded.
 * CloudFront metrics are in us-east-1.
 */
export async function fetchCloudFrontMetrics(
  clientConfig: ClientConfig,
  distributionId: string,
): Promise<FetchResult<CloudFrontMetrics>> {
  try {
    const cw = new CloudWatchClient({
      credentials: clientConfig.credentials,
      region: 'us-east-1',
    });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const response = await cw.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          {
            Id: 'requests',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/CloudFront',
                MetricName: 'Requests',
                Dimensions: [
                  { Name: 'DistributionId', Value: distributionId },
                  { Name: 'Region', Value: 'Global' },
                ],
              },
              Period: 3600,
              Stat: 'Sum',
            },
          },
          {
            Id: 'bytesDownloaded',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/CloudFront',
                MetricName: 'BytesDownloaded',
                Dimensions: [
                  { Name: 'DistributionId', Value: distributionId },
                  { Name: 'Region', Value: 'Global' },
                ],
              },
              Period: 3600,
              Stat: 'Sum',
            },
          },
        ],
      }),
    );

    const toDataPoints = (result: any): MetricDataPoint[] => {
      const timestamps: Date[] = result?.Timestamps ?? [];
      const values: number[] = result?.Values ?? [];
      return timestamps
        .map((ts: Date, i: number) => ({
          timestamp: new Date(ts).getTime(),
          value: values[i] ?? 0,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    };

    const results = response.MetricDataResults ?? [];
    const requestsResult = results.find((r) => r.Id === 'requests');
    const bytesResult = results.find((r) => r.Id === 'bytesDownloaded');

    return {
      data: {
        requests: toDataPoints(requestsResult),
        bytesDownloaded: toDataPoints(bytesResult),
      },
      timestamp: Date.now(),
      region: 'us-east-1',
    };
  } catch (err: any) {
    return {
      data: { requests: [], bytesDownloaded: [] },
      timestamp: Date.now(),
      region: 'us-east-1',
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch CloudFront metrics',
      },
    };
  }
}
