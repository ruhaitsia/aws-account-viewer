import { describe, it, expect } from 'vitest';
import { transformCloudFrontResponse } from './cloudfrontFetcher';

describe('transformCloudFrontResponse', () => {
  it('should transform a full distribution list', () => {
    const items = [
      {
        Id: 'E1ABC2DEF3GH',
        DomainName: 'd111111abcdef8.cloudfront.net',
        Status: 'Deployed',
        Aliases: { Quantity: 2, Items: ['cdn.example.com', 'assets.example.com'] },
        Origins: {
          Quantity: 1,
          Items: [{ DomainName: 'my-bucket.s3.amazonaws.com' }],
        },
        PriceClass: 'PriceClass_100',
      },
    ];

    const result = transformCloudFrontResponse(items);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      distributionId: 'E1ABC2DEF3GH',
      domainName: 'd111111abcdef8.cloudfront.net',
      status: 'Deployed',
      aliases: ['cdn.example.com', 'assets.example.com'],
      originSummary: 'my-bucket.s3.amazonaws.com',
      priceClass: 'PriceClass_100',
    });
  });

  it('should handle InProgress status', () => {
    const items = [
      {
        Id: 'E2XYZ',
        DomainName: 'd222.cloudfront.net',
        Status: 'InProgress',
        Aliases: { Quantity: 0, Items: [] },
        Origins: { Quantity: 0, Items: [] },
        PriceClass: 'PriceClass_All',
      },
    ];

    const result = transformCloudFrontResponse(items);
    expect(result[0].status).toBe('InProgress');
  });

  it('should handle empty/missing fields with defaults', () => {
    const result = transformCloudFrontResponse([{}]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      distributionId: '',
      domainName: '',
      status: 'InProgress',
      aliases: [],
      originSummary: '-',
      priceClass: '',
    });
  });

  it('should handle null/undefined input', () => {
    expect(transformCloudFrontResponse(null as any)).toEqual([]);
    expect(transformCloudFrontResponse(undefined as any)).toEqual([]);
  });

  it('should handle multiple distributions', () => {
    const items = [
      { Id: 'D1', DomainName: 'd1.cloudfront.net', Status: 'Deployed', PriceClass: 'PriceClass_100' },
      { Id: 'D2', DomainName: 'd2.cloudfront.net', Status: 'InProgress', PriceClass: 'PriceClass_200' },
      { Id: 'D3', DomainName: 'd3.cloudfront.net', Status: 'Deployed', PriceClass: 'PriceClass_All' },
    ];

    const result = transformCloudFrontResponse(items);
    expect(result).toHaveLength(3);
    expect(result[0].distributionId).toBe('D1');
    expect(result[1].distributionId).toBe('D2');
    expect(result[2].distributionId).toBe('D3');
  });

  it('should join multiple origin domain names', () => {
    const items = [
      {
        Id: 'D1',
        DomainName: 'd1.cloudfront.net',
        Status: 'Deployed',
        Origins: {
          Quantity: 2,
          Items: [
            { DomainName: 'bucket1.s3.amazonaws.com' },
            { DomainName: 'api.example.com' },
          ],
        },
      },
    ];

    const result = transformCloudFrontResponse(items);
    expect(result[0].originSummary).toBe('bucket1.s3.amazonaws.com, api.example.com');
  });

  it('should filter out falsy aliases', () => {
    const items = [
      {
        Id: 'D1',
        DomainName: 'd1.cloudfront.net',
        Status: 'Deployed',
        Aliases: { Quantity: 3, Items: ['cdn.example.com', null, 'assets.example.com'] },
      },
    ];

    const result = transformCloudFrontResponse(items);
    expect(result[0].aliases).toEqual(['cdn.example.com', 'assets.example.com']);
  });

  it('should handle distribution with no Aliases key', () => {
    const items = [{ Id: 'D1', DomainName: 'd1.cloudfront.net', Status: 'Deployed' }];
    const result = transformCloudFrontResponse(items);
    expect(result[0].aliases).toEqual([]);
  });
});
