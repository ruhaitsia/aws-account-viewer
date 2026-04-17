import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface EC2Instance {
  instanceId: string;
  name: string;
  instanceType: string;
  state: 'running' | 'stopped' | 'terminated' | 'pending' | 'shutting-down' | 'stopping';
  availabilityZone: string;
  publicIp?: string;
  privateIp: string;
}

interface MetricDataPoint {
  timestamp: number;
  value: number;
}

interface EC2Metrics {
  cpuUtilization: MetricDataPoint[];
  networkIn: MetricDataPoint[];
  networkOut: MetricDataPoint[];
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
 * Transform raw AWS DescribeInstances Reservations into EC2Instance[].
 * Exported for testability.
 */
export function transformEC2Response(reservations: any[]): EC2Instance[] {
  const instances: EC2Instance[] = [];
  for (const reservation of reservations) {
    for (const inst of reservation.Instances ?? []) {
      const nameTag = (inst.Tags ?? []).find(
        (t: any) => t.Key === 'Name',
      );
      instances.push({
        instanceId: inst.InstanceId ?? '',
        name: nameTag?.Value ?? '',
        instanceType: inst.InstanceType ?? '',
        state: (inst.State?.Name ?? 'pending') as EC2Instance['state'],
        availabilityZone: inst.Placement?.AvailabilityZone ?? '',
        publicIp: inst.PublicIpAddress,
        privateIp: inst.PrivateIpAddress ?? '',
      });
    }
  }
  return instances;
}

/**
 * Fetch all EC2 instances in the configured region.
 */
export async function fetchEC2Instances(
  clientConfig: ClientConfig,
): Promise<FetchResult<EC2Instance[]>> {
  try {
    const ec2 = new EC2Client({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const allInstances: EC2Instance[] = [];
    let nextToken: string | undefined;

    do {
      const response = await ec2.send(
        new DescribeInstancesCommand({ NextToken: nextToken }),
      );
      allInstances.push(
        ...transformEC2Response(response.Reservations ?? []),
      );
      nextToken = response.NextToken;
    } while (nextToken);

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
        message: err.message ?? 'Failed to fetch EC2 instances',
      },
    };
  }
}

/**
 * Fetch CloudWatch metrics for a specific EC2 instance (last 1 hour).
 * Returns CPUUtilization, NetworkIn, and NetworkOut.
 */
export async function fetchEC2Metrics(
  clientConfig: ClientConfig,
  instanceId: string,
): Promise<FetchResult<EC2Metrics>> {
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
                Namespace: 'AWS/EC2',
                MetricName: 'CPUUtilization',
                Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
              },
              Period: 300,
              Stat: 'Average',
            },
          },
          {
            Id: 'netin',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/EC2',
                MetricName: 'NetworkIn',
                Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
              },
              Period: 300,
              Stat: 'Average',
            },
          },
          {
            Id: 'netout',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/EC2',
                MetricName: 'NetworkOut',
                Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
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
    const netInResult = results.find((r) => r.Id === 'netin');
    const netOutResult = results.find((r) => r.Id === 'netout');

    return {
      data: {
        cpuUtilization: toDataPoints(cpuResult),
        networkIn: toDataPoints(netInResult),
        networkOut: toDataPoints(netOutResult),
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { cpuUtilization: [], networkIn: [], networkOut: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch EC2 metrics',
      },
    };
  }
}
