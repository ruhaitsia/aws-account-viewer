import { describe, it, expect } from 'vitest';
import { transformHostedZonesResponse } from './route53Fetcher';

describe('transformHostedZonesResponse', () => {
  it('should transform a full hosted zone list', () => {
    const zones = [
      {
        Id: '/hostedzone/Z1234567890',
        Name: 'example.com.',
        Config: { PrivateZone: false, Comment: 'Main domain' },
        ResourceRecordSetCount: 12,
      },
    ];

    const result = transformHostedZonesResponse(zones);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      domainName: 'example.com.',
      hostedZoneId: 'Z1234567890',
      type: 'public',
      recordSetCount: 12,
      description: 'Main domain',
    });
  });

  it('should identify private zones', () => {
    const zones = [
      {
        Id: '/hostedzone/ZPRIVATE1',
        Name: 'internal.corp.',
        Config: { PrivateZone: true, Comment: 'Internal' },
        ResourceRecordSetCount: 5,
      },
    ];

    const result = transformHostedZonesResponse(zones);
    expect(result[0].type).toBe('private');
  });

  it('should strip /hostedzone/ prefix from Id', () => {
    const zones = [{ Id: '/hostedzone/ZABC123', Name: 'test.com.' }];
    const result = transformHostedZonesResponse(zones);
    expect(result[0].hostedZoneId).toBe('ZABC123');
  });

  it('should handle Id without prefix', () => {
    const zones = [{ Id: 'ZABC123', Name: 'test.com.' }];
    const result = transformHostedZonesResponse(zones);
    expect(result[0].hostedZoneId).toBe('ZABC123');
  });

  it('should handle empty/missing fields with defaults', () => {
    const result = transformHostedZonesResponse([{}]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      domainName: '',
      hostedZoneId: '',
      type: 'public',
      recordSetCount: 0,
      description: '',
    });
  });

  it('should handle null/undefined input', () => {
    expect(transformHostedZonesResponse(null as any)).toEqual([]);
    expect(transformHostedZonesResponse(undefined as any)).toEqual([]);
  });

  it('should handle multiple zones with mixed types', () => {
    const zones = [
      { Id: '/hostedzone/Z1', Name: 'a.com.', Config: { PrivateZone: false }, ResourceRecordSetCount: 3 },
      { Id: '/hostedzone/Z2', Name: 'b.internal.', Config: { PrivateZone: true }, ResourceRecordSetCount: 7 },
      { Id: '/hostedzone/Z3', Name: 'c.com.', Config: { PrivateZone: false }, ResourceRecordSetCount: 1 },
    ];

    const result = transformHostedZonesResponse(zones);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('public');
    expect(result[1].type).toBe('private');
    expect(result[2].type).toBe('public');
  });

  it('should default to public when Config is missing', () => {
    const zones = [{ Id: '/hostedzone/Z1', Name: 'test.com.' }];
    const result = transformHostedZonesResponse(zones);
    expect(result[0].type).toBe('public');
  });

  it('should handle missing Comment in Config', () => {
    const zones = [{ Id: '/hostedzone/Z1', Name: 'test.com.', Config: { PrivateZone: false } }];
    const result = transformHostedZonesResponse(zones);
    expect(result[0].description).toBe('');
  });
});
