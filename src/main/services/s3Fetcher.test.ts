import { describe, it, expect } from 'vitest';
import { transformS3Response } from './s3Fetcher';

describe('transformS3Response', () => {
  it('should transform raw buckets into S3Bucket list', () => {
    const buckets = [
      { Name: 'my-bucket', CreationDate: new Date('2024-01-15T10:00:00Z') },
    ];
    const regions = { 'my-bucket': 'us-west-2' };

    const result = transformS3Response(buckets, regions);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'my-bucket',
      creationDate: '2024-01-15T10:00:00.000Z',
      region: 'us-west-2',
      objectCount: 0,
      totalSize: 0,
      storageClassDistribution: {},
    });
  });

  it('should handle multiple buckets', () => {
    const buckets = [
      { Name: 'bucket-a', CreationDate: new Date('2023-06-01') },
      { Name: 'bucket-b', CreationDate: new Date('2023-07-01') },
      { Name: 'bucket-c', CreationDate: new Date('2023-08-01') },
    ];
    const regions = {
      'bucket-a': 'us-east-1',
      'bucket-b': 'eu-west-1',
      'bucket-c': 'ap-southeast-1',
    };

    const result = transformS3Response(buckets, regions);
    expect(result).toHaveLength(3);
    expect(result.map((b) => b.name)).toEqual(['bucket-a', 'bucket-b', 'bucket-c']);
    expect(result.map((b) => b.region)).toEqual(['us-east-1', 'eu-west-1', 'ap-southeast-1']);
  });

  it('should handle empty bucket list', () => {
    expect(transformS3Response([], {})).toEqual([]);
  });

  it('should handle missing Name gracefully', () => {
    const buckets = [{ CreationDate: new Date('2024-01-01') }];
    const result = transformS3Response(buckets, {});
    expect(result[0].name).toBe('');
    expect(result[0].region).toBe('');
  });

  it('should handle missing CreationDate', () => {
    const buckets = [{ Name: 'no-date' }];
    const regions = { 'no-date': 'us-east-1' };
    const result = transformS3Response(buckets, regions);
    expect(result[0].creationDate).toBe('');
  });

  it('should default region to empty string when not in regions map', () => {
    const buckets = [{ Name: 'orphan', CreationDate: new Date() }];
    const result = transformS3Response(buckets, {});
    expect(result[0].region).toBe('');
  });

  it('should set objectCount and totalSize to 0', () => {
    const buckets = [{ Name: 'test', CreationDate: new Date() }];
    const result = transformS3Response(buckets, { test: 'us-east-1' });
    expect(result[0].objectCount).toBe(0);
    expect(result[0].totalSize).toBe(0);
    expect(result[0].storageClassDistribution).toEqual({});
  });
});
