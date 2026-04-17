import {
  DynamoDBClient,
  ListTablesCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
  CloudWatchClient,
  GetMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface DynamoDBTable {
  tableName: string;
  status: string;
  partitionKey: string;
  sortKey?: string;
  billingMode: 'ON_DEMAND' | 'PROVISIONED';
  itemCount: number;
  tableSize: number;
}

interface DynamoDBTableDetail {
  globalSecondaryIndexes: { indexName: string; keySchema: string; status: string }[];
  provisionedCapacity?: { readCapacityUnits: number; writeCapacityUnits: number };
}

interface MetricDataPoint {
  timestamp: number;
  value: number;
}

interface DynamoDBMetrics {
  readCapacity: MetricDataPoint[];
  writeCapacity: MetricDataPoint[];
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
 * Transform a raw AWS DescribeTable response into a DynamoDBTable object.
 * Exported for testability.
 */
export function transformDynamoDBTableResponse(table: any): DynamoDBTable {
  const keySchema: any[] = table.KeySchema ?? [];
  const partitionKeyDef = keySchema.find((k: any) => k.KeyType === 'HASH');
  const sortKeyDef = keySchema.find((k: any) => k.KeyType === 'RANGE');

  const attrDefs: any[] = table.AttributeDefinitions ?? [];
  const getAttrName = (keyDef: any) => {
    if (!keyDef) return '';
    return keyDef.AttributeName ?? '';
  };

  // Determine billing mode
  let billingMode: 'ON_DEMAND' | 'PROVISIONED' = 'PROVISIONED';
  if (table.BillingModeSummary?.BillingMode === 'PAY_PER_REQUEST') {
    billingMode = 'ON_DEMAND';
  }

  const result: DynamoDBTable = {
    tableName: table.TableName ?? '',
    status: table.TableStatus ?? '',
    partitionKey: getAttrName(partitionKeyDef),
    billingMode,
    itemCount: table.ItemCount ?? 0,
    tableSize: table.TableSizeBytes ?? 0,
  };

  const sortKeyName = getAttrName(sortKeyDef);
  if (sortKeyName) {
    result.sortKey = sortKeyName;
  }

  return result;
}

/**
 * Transform a raw AWS DescribeTable response into DynamoDBTableDetail.
 */
export function transformDynamoDBTableDetail(table: any): DynamoDBTableDetail {
  const gsis: any[] = table.GlobalSecondaryIndexes ?? [];
  const globalSecondaryIndexes = gsis.map((gsi: any) => {
    const keys = (gsi.KeySchema ?? [])
      .map((k: any) => `${k.AttributeName}(${k.KeyType})`)
      .join(', ');
    return {
      indexName: gsi.IndexName ?? '',
      keySchema: keys,
      status: gsi.IndexStatus ?? '',
    };
  });

  const detail: DynamoDBTableDetail = { globalSecondaryIndexes };

  const provisioned = table.ProvisionedThroughput;
  if (provisioned && (provisioned.ReadCapacityUnits > 0 || provisioned.WriteCapacityUnits > 0)) {
    detail.provisionedCapacity = {
      readCapacityUnits: provisioned.ReadCapacityUnits ?? 0,
      writeCapacityUnits: provisioned.WriteCapacityUnits ?? 0,
    };
  }

  return detail;
}

/**
 * Fetch all DynamoDB tables in the configured region.
 */
export async function fetchDynamoDBTables(
  clientConfig: ClientConfig,
): Promise<FetchResult<DynamoDBTable[]>> {
  try {
    const dynamodb = new DynamoDBClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    // Paginate through ListTables
    const allTableNames: string[] = [];
    let lastEvaluatedTableName: string | undefined;

    do {
      const listResponse = await dynamodb.send(
        new ListTablesCommand({
          ExclusiveStartTableName: lastEvaluatedTableName,
        }),
      );
      allTableNames.push(...(listResponse.TableNames ?? []));
      lastEvaluatedTableName = listResponse.LastEvaluatedTableName;
    } while (lastEvaluatedTableName);

    // Describe each table
    const tables: DynamoDBTable[] = [];
    for (const tableName of allTableNames) {
      const descResponse = await dynamodb.send(
        new DescribeTableCommand({ TableName: tableName }),
      );
      if (descResponse.Table) {
        tables.push(transformDynamoDBTableResponse(descResponse.Table));
      }
    }

    return {
      data: tables,
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
        message: err.message ?? 'Failed to fetch DynamoDB tables',
      },
    };
  }
}

/**
 * Fetch detail for a specific DynamoDB table (GSIs, provisioned capacity).
 */
export async function fetchDynamoDBTableDetail(
  clientConfig: ClientConfig,
  tableName: string,
): Promise<FetchResult<DynamoDBTableDetail>> {
  try {
    const dynamodb = new DynamoDBClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const response = await dynamodb.send(
      new DescribeTableCommand({ TableName: tableName }),
    );

    return {
      data: transformDynamoDBTableDetail(response.Table ?? {}),
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { globalSecondaryIndexes: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch DynamoDB table detail',
      },
    };
  }
}

/**
 * Fetch CloudWatch metrics for a DynamoDB table (last 1 hour).
 * Returns ConsumedReadCapacityUnits and ConsumedWriteCapacityUnits.
 */
export async function fetchDynamoDBMetrics(
  clientConfig: ClientConfig,
  tableName: string,
): Promise<FetchResult<DynamoDBMetrics>> {
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
            Id: 'readCapacity',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/DynamoDB',
                MetricName: 'ConsumedReadCapacityUnits',
                Dimensions: [{ Name: 'TableName', Value: tableName }],
              },
              Period: 300,
              Stat: 'Sum',
            },
          },
          {
            Id: 'writeCapacity',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/DynamoDB',
                MetricName: 'ConsumedWriteCapacityUnits',
                Dimensions: [{ Name: 'TableName', Value: tableName }],
              },
              Period: 300,
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
    const readResult = results.find((r) => r.Id === 'readCapacity');
    const writeResult = results.find((r) => r.Id === 'writeCapacity');

    return {
      data: {
        readCapacity: toDataPoints(readResult),
        writeCapacity: toDataPoints(writeResult),
      },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { readCapacity: [], writeCapacity: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch DynamoDB metrics',
      },
    };
  }
}
