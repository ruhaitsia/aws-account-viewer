import { describe, it, expect } from 'vitest';
import { transformDynamoDBTableResponse, transformDynamoDBTableDetail } from './dynamodbFetcher';

describe('transformDynamoDBTableResponse', () => {
  it('should transform a full DescribeTable response', () => {
    const table = {
      TableName: 'Users',
      TableStatus: 'ACTIVE',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'createdAt', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'N' },
      ],
      BillingModeSummary: { BillingMode: 'PAY_PER_REQUEST' },
      ItemCount: 15000,
      TableSizeBytes: 2048000,
    };

    const result = transformDynamoDBTableResponse(table);
    expect(result).toEqual({
      tableName: 'Users',
      status: 'ACTIVE',
      partitionKey: 'userId',
      sortKey: 'createdAt',
      billingMode: 'ON_DEMAND',
      itemCount: 15000,
      tableSize: 2048000,
    });
  });

  it('should handle table without sort key', () => {
    const table = {
      TableName: 'Sessions',
      TableStatus: 'ACTIVE',
      KeySchema: [{ AttributeName: 'sessionId', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'sessionId', AttributeType: 'S' }],
      ItemCount: 500,
      TableSizeBytes: 102400,
    };

    const result = transformDynamoDBTableResponse(table);
    expect(result.tableName).toBe('Sessions');
    expect(result.partitionKey).toBe('sessionId');
    expect(result.sortKey).toBeUndefined();
    expect(result.billingMode).toBe('PROVISIONED');
  });

  it('should handle empty/missing fields with defaults', () => {
    const result = transformDynamoDBTableResponse({});
    expect(result).toEqual({
      tableName: '',
      status: '',
      partitionKey: '',
      billingMode: 'PROVISIONED',
      itemCount: 0,
      tableSize: 0,
    });
  });

  it('should handle provisioned billing mode (no BillingModeSummary)', () => {
    const table = {
      TableName: 'Orders',
      TableStatus: 'ACTIVE',
      KeySchema: [{ AttributeName: 'orderId', KeyType: 'HASH' }],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      ItemCount: 1000,
      TableSizeBytes: 50000,
    };

    const result = transformDynamoDBTableResponse(table);
    expect(result.billingMode).toBe('PROVISIONED');
  });

  it('should preserve output for multiple tables', () => {
    const tables = [
      { TableName: 'T1', TableStatus: 'ACTIVE', KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }], ItemCount: 10, TableSizeBytes: 100 },
      { TableName: 'T2', TableStatus: 'CREATING', KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }], ItemCount: 0, TableSizeBytes: 0 },
    ];

    const results = tables.map(transformDynamoDBTableResponse);
    expect(results).toHaveLength(2);
    expect(results[0].tableName).toBe('T1');
    expect(results[1].tableName).toBe('T2');
  });
});

describe('transformDynamoDBTableDetail', () => {
  it('should extract GSIs and provisioned capacity', () => {
    const table = {
      GlobalSecondaryIndexes: [
        {
          IndexName: 'email-index',
          KeySchema: [
            { AttributeName: 'email', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
          IndexStatus: 'ACTIVE',
        },
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 10, WriteCapacityUnits: 5 },
    };

    const result = transformDynamoDBTableDetail(table);
    expect(result.globalSecondaryIndexes).toHaveLength(1);
    expect(result.globalSecondaryIndexes[0]).toEqual({
      indexName: 'email-index',
      keySchema: 'email(HASH), createdAt(RANGE)',
      status: 'ACTIVE',
    });
    expect(result.provisionedCapacity).toEqual({
      readCapacityUnits: 10,
      writeCapacityUnits: 5,
    });
  });

  it('should handle table with no GSIs', () => {
    const result = transformDynamoDBTableDetail({});
    expect(result.globalSecondaryIndexes).toEqual([]);
    expect(result.provisionedCapacity).toBeUndefined();
  });

  it('should omit provisionedCapacity when both are 0', () => {
    const table = {
      ProvisionedThroughput: { ReadCapacityUnits: 0, WriteCapacityUnits: 0 },
    };
    const result = transformDynamoDBTableDetail(table);
    expect(result.provisionedCapacity).toBeUndefined();
  });

  it('should handle multiple GSIs', () => {
    const table = {
      GlobalSecondaryIndexes: [
        { IndexName: 'idx-1', KeySchema: [{ AttributeName: 'a', KeyType: 'HASH' }], IndexStatus: 'ACTIVE' },
        { IndexName: 'idx-2', KeySchema: [{ AttributeName: 'b', KeyType: 'HASH' }], IndexStatus: 'CREATING' },
      ],
    };

    const result = transformDynamoDBTableDetail(table);
    expect(result.globalSecondaryIndexes).toHaveLength(2);
    expect(result.globalSecondaryIndexes[0].indexName).toBe('idx-1');
    expect(result.globalSecondaryIndexes[1].indexName).toBe('idx-2');
    expect(result.globalSecondaryIndexes[1].status).toBe('CREATING');
  });
});
