import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface LambdaFunction {
  functionName: string;
  runtime: string;
  memorySize: number;
  timeout: number;
  codeSize: number;
  lastModified: string;
  description: string;
}

interface MetricDataPoint {
  timestamp: number;
  value: number;
}

interface LambdaMetrics {
  invocations: MetricDataPoint[];
  errors: MetricDataPoint[];
  duration: MetricDataPoint[];
  throttles: MetricDataPoint[];
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
 * Transform raw AWS ListFunctions response into LambdaFunction[].
 * Exported for testability.
 */
export function transformLambdaResponse(functions: any[]): LambdaFunction[] {
  return functions.map((fn) => ({
    functionName: fn.FunctionName ?? '',
    runtime: fn.Runtime ?? 'unknown',
    memorySize: fn.MemorySize ?? 0,
    timeout: fn.Timeout ?? 0,
    codeSize: fn.CodeSize ?? 0,
    lastModified: fn.LastModified ?? '',
    description: fn.Description ?? '',
  }));
}

/**
 * Fetch all Lambda functions in the configured region.
 */
export async function fetchLambdaFunctions(
  clientConfig: ClientConfig,
): Promise<FetchResult<LambdaFunction[]>> {
  try {
    const lambda = new LambdaClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const allFunctions: LambdaFunction[] = [];
    let marker: string | undefined;

    do {
      const response = await lambda.send(
        new ListFunctionsCommand({ Marker: marker }),
      );
      allFunctions.push(
        ...transformLambdaResponse(response.Functions ?? []),
      );
      marker = response.NextMarker;
    } while (marker);

    return {
      data: allFunctions,
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
        message: err.message ?? 'Failed to fetch Lambda functions',
      },
    };
  }
}

/**
 * Fetch CloudWatch metrics for a specific Lambda function (last 24 hours).
 * Returns Invocations, Errors, Duration (Average), and Throttles.
 */
export async function fetchLambdaMetrics(
  clientConfig: ClientConfig,
  functionName: string,
): Promise<FetchResult<LambdaMetrics>> {
  try {
    const cw = new CloudWatchClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const response = await cw.send(
      new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: endTime,
        MetricDataQueries: [
          {
            Id: 'invocations',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/Lambda',
                MetricName: 'Invocations',
                Dimensions: [{ Name: 'FunctionName', Value: functionName }],
              },
              Period: 3600,
              Stat: 'Sum',
            },
          },
          {
            Id: 'errors',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/Lambda',
                MetricName: 'Errors',
                Dimensions: [{ Name: 'FunctionName', Value: functionName }],
              },
              Period: 3600,
              Stat: 'Sum',
            },
          },
          {
            Id: 'duration',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/Lambda',
                MetricName: 'Duration',
                Dimensions: [{ Name: 'FunctionName', Value: functionName }],
              },
              Period: 3600,
              Stat: 'Average',
            },
          },
          {
            Id: 'throttles',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/Lambda',
                MetricName: 'Throttles',
                Dimensions: [{ Name: 'FunctionName', Value: functionName }],
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
    const invResult = results.find((r) => r.Id === 'invocations');
    const errResult = results.find((r) => r.Id === 'errors');
    const durResult = results.find((r) => r.Id === 'duration');
    const thrResult = results.find((r) => r.Id === 'throttles');

    return {
      data: {
        invocations: toDataPoints(invResult),
        errors: toDataPoints(errResult),
        duration: toDataPoints(durResult),
        throttles: toDataPoints(thrResult),
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { invocations: [], errors: [], duration: [], throttles: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch Lambda metrics',
      },
    };
  }
}
