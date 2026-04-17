import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface RDSInstance {
  instanceId: string;
  engine: string;
  engineVersion: string;
  instanceClass: string;
  status: string;
  storageSize: number;
  multiAZ: boolean;
  endpoint: string;
}

interface MetricDataPoint {
  timestamp: number;
  value: number;
}

interface RDSMetrics {
  cpuUtilization: MetricDataPoint[];
  connections: MetricDataPoint[];
  freeStorage: MetricDataPoint[];
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
 * Transform raw AWS DescribeDBInstances response into RDSInstance[].
 * Exported for testability.
 */
export function transformRDSResponse(dbInstances: any[]): RDSInstance[] {
  return dbInstances.map((inst) => ({
    instanceId: inst.DBInstanceIdentifier ?? '',
    engine: inst.Engine ?? '',
    engineVersion: inst.EngineVersion ?? '',
    instanceClass: inst.DBInstanceClass ?? '',
    status: inst.DBInstanceStatus ?? '',
    storageSize: inst.AllocatedStorage ?? 0,
    multiAZ: inst.MultiAZ ?? false,
    endpoint: inst.Endpoint?.Address ?? '',
  }));
}

/**
 * Fetch all RDS instances in the configured region.
 */
export async function fetchRDSInstances(
  clientConfig: ClientConfig,
): Promise<FetchResult<RDSInstance[]>> {
  try {
    const rds = new RDSClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const allInstances: RDSInstance[] = [];
    let marker: string | undefined;

    do {
      const response = await rds.send(
        new DescribeDBInstancesCommand({ Marker: marker }),
      );
      allInstances.push(
        ...transformRDSResponse(response.DBInstances ?? []),
      );
      marker = response.Marker;
    } while (marker);

    return {
      data: allInstances,
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: [],
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch RDS instances',
      },
    };
  }
}

/**
 * Fetch CloudWatch metrics for a specific RDS instance (last 1 hour).
 * Returns CPUUtilization, DatabaseConnections, and FreeStorageSpace.
 */
export async function fetchRDSMetrics(
  clientConfig: ClientConfig,
  instanceId: string,
): Promise<FetchResult<RDSMetrics>> {
  try {
    const cw = new CloudWatchClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour ago

    const response = await cw.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          {
            Id: 'cpu',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/RDS',
                MetricName: 'CPUUtilization',
                Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instanceId }],
              },
              Period: 300,
              Stat: 'Average',
            },
          },
          {
            Id: 'connections',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/RDS',
                MetricName: 'DatabaseConnections',
                Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instanceId }],
              },
              Period: 300,
              Stat: 'Average',
            },
          },
          {
            Id: 'freestorage',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/RDS',
                MetricName: 'FreeStorageSpace',
                Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instanceId }],
              },
              Period: 300,
              Stat: 'Average',
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
    const cpuResult = results.find((r) => r.Id === 'cpu');
    const connResult = results.find((r) => r.Id === 'connections');
    const storageResult = results.find((r) => r.Id === 'freestorage');

    return {
      data: {
        cpuUtilization: toDataPoints(cpuResult),
        connections: toDataPoints(connResult),
        freeStorage: toDataPoints(storageResult),
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { cpuUtilization: [], connections: [], freeStorage: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch RDS metrics',
      },
    };
  }
}
