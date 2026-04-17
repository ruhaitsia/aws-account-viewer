import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface MetricDataPoint {
  timestamp: number;
  value: number;
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

export type TimeRange = '1h' | '6h' | '24h' | '7d';

export interface TimeRangeParams {
  startTime: Date;
  endTime: Date;
  period: number;
}

/**
 * Convert a time range selection to CloudWatch query parameters.
 * Exported for testability.
 */
export function timeRangeToParams(timeRange: TimeRange): TimeRangeParams {
  const endTime = new Date();
  let durationMs: number;
  let period: number;

  switch (timeRange) {
    case '1h':
      durationMs = 1 * 60 * 60 * 1000;
      period = 60;
      break;
    case '6h':
      durationMs = 6 * 60 * 60 * 1000;
      period = 300;
      break;
    case '24h':
      durationMs = 24 * 60 * 60 * 1000;
      period = 3600;
      break;
    case '7d':
      durationMs = 7 * 24 * 60 * 60 * 1000;
      period = 86400;
      break;
  }

  const startTime = new Date(endTime.getTime() - durationMs);
  return { startTime, endTime, period };
}

export type OverviewMetrics = Record<string, MetricDataPoint[]>;

/** Default metric definitions for the overview panel. */
const OVERVIEW_METRICS = [
  { id: 'ec2Cpu', namespace: 'AWS/EC2', metricName: 'CPUUtilization', stat: 'Average', label: 'EC2 平均 CPU 利用率', unit: '%' },
  { id: 'rdsCpu', namespace: 'AWS/RDS', metricName: 'CPUUtilization', stat: 'Average', label: 'RDS CPU 利用率', unit: '%' },
  { id: 'rdsConnections', namespace: 'AWS/RDS', metricName: 'DatabaseConnections', stat: 'Average', label: 'RDS 连接数', unit: 'Count' },
  { id: 'lambdaInvocations', namespace: 'AWS/Lambda', metricName: 'Invocations', stat: 'Sum', label: 'Lambda 调用次数', unit: 'Count' },
  { id: 'lambdaErrors', namespace: 'AWS/Lambda', metricName: 'Errors', stat: 'Sum', label: 'Lambda 错误次数', unit: 'Count' },
  { id: 'elbRequests', namespace: 'AWS/ApplicationELB', metricName: 'RequestCount', stat: 'Sum', label: 'ELB 请求数', unit: 'Count' },
  { id: 'elbLatency', namespace: 'AWS/ApplicationELB', metricName: 'TargetResponseTime', stat: 'Average', label: 'ELB 延迟', unit: 'Seconds' },
  { id: 'dynamodbRead', namespace: 'AWS/DynamoDB', metricName: 'ConsumedReadCapacityUnits', stat: 'Sum', label: 'DynamoDB 读容量', unit: 'Count' },
  { id: 'dynamodbWrite', namespace: 'AWS/DynamoDB', metricName: 'ConsumedWriteCapacityUnits', stat: 'Sum', label: 'DynamoDB 写容量', unit: 'Count' },
  { id: 'sqsDepth', namespace: 'AWS/SQS', metricName: 'ApproximateNumberOfMessagesVisible', stat: 'Average', label: 'SQS 队列深度', unit: 'Count' },
];

/**
 * Fetch overview metrics for the Metrics panel using search expressions
 * to aggregate across all resources in the region.
 */
export async function fetchOverviewMetrics(
  clientConfig: ClientConfig,
  timeRange: TimeRange,
): Promise<FetchResult<OverviewMetrics>> {
  try {
    const cw = new CloudWatchClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const { startTime, endTime, period } = timeRangeToParams(timeRange);

    const queries = OVERVIEW_METRICS.map((m) => ({
      Id: m.id,
      Expression: `SEARCH('{${m.namespace}} MetricName="${m.metricName}"', '${m.stat}', ${period})`,
      ReturnData: true,
    }));

    const response = await cw.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: queries,
      }),
    );

    const metricsMap: OverviewMetrics = {};

    for (const def of OVERVIEW_METRICS) {
      const results = (response.MetricDataResults ?? []).filter(
        (r) => r.Id === def.id || r.Id?.startsWith(`${def.id}_`),
      );

      // Merge all matching result series into aggregated data points
      const pointMap = new Map<number, number>();
      for (const result of results) {
        const timestamps: Date[] = result.Timestamps ?? [];
        const values: number[] = result.Values ?? [];
        for (let i = 0; i < timestamps.length; i++) {
          const ts = new Date(timestamps[i]).getTime();
          const existing = pointMap.get(ts) ?? 0;
          pointMap.set(ts, existing + (values[i] ?? 0));
        }
      }

      metricsMap[def.id] = Array.from(pointMap.entries())
        .map(([timestamp, value]) => ({ timestamp, value }))
        .sort((a, b) => a.timestamp - b.timestamp);
    }

    return {
      data: metricsMap,
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    // Return empty metrics on error
    const emptyMap: OverviewMetrics = {};
    for (const def of OVERVIEW_METRICS) {
      emptyMap[def.id] = [];
    }
    return {
      data: emptyMap,
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch overview metrics',
      },
    };
  }
}

/** Exported for use by MetricsPanel to display labels/units. */
export const METRIC_DEFINITIONS = OVERVIEW_METRICS.map((m) => ({
  id: m.id,
  label: m.label,
  unit: m.unit,
}));
