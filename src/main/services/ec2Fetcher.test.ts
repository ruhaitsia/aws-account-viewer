import { describe, it, expect } from 'vitest';
import { transformEC2Response } from './ec2Fetcher';

describe('transformEC2Response', () => {
  it('should transform reservations into EC2Instance list', () => {
    const reservations = [
      {
        Instances: [
          {
            InstanceId: 'i-abc123',
            InstanceType: 't3.micro',
            State: { Name: 'running' },
            Placement: { AvailabilityZone: 'us-east-1a' },
            PublicIpAddress: '1.2.3.4',
            PrivateIpAddress: '10.0.0.1',
            Tags: [{ Key: 'Name', Value: 'web-server' }],
          },
        ],
      },
    ];

    const result = transformEC2Response(reservations);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      instanceId: 'i-abc123',
      name: 'web-server',
      instanceType: 't3.micro',
      state: 'running',
      availabilityZone: 'us-east-1a',
      publicIp: '1.2.3.4',
      privateIp: '10.0.0.1',
    });
  });

  it('should handle multiple reservations with multiple instances', () => {
    const reservations = [
      {
        Instances: [
          { InstanceId: 'i-1', State: { Name: 'running' }, InstanceType: 't2.micro', Placement: { AvailabilityZone: 'us-east-1a' }, PrivateIpAddress: '10.0.0.1', Tags: [] },
          { InstanceId: 'i-2', State: { Name: 'stopped' }, InstanceType: 't2.small', Placement: { AvailabilityZone: 'us-east-1b' }, PrivateIpAddress: '10.0.0.2', Tags: [] },
        ],
      },
      {
        Instances: [
          { InstanceId: 'i-3', State: { Name: 'terminated' }, InstanceType: 'm5.large', Placement: { AvailabilityZone: 'us-east-1c' }, PrivateIpAddress: '10.0.0.3', Tags: [] },
        ],
      },
    ];

    const result = transformEC2Response(reservations);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.instanceId)).toEqual(['i-1', 'i-2', 'i-3']);
  });

  it('should handle empty reservations', () => {
    expect(transformEC2Response([])).toEqual([]);
  });

  it('should handle missing Name tag gracefully', () => {
    const reservations = [
      {
        Instances: [
          { InstanceId: 'i-noname', State: { Name: 'running' }, InstanceType: 't2.micro', Placement: { AvailabilityZone: 'us-east-1a' }, PrivateIpAddress: '10.0.0.1' },
        ],
      },
    ];

    const result = transformEC2Response(reservations);
    expect(result[0].name).toBe('');
  });

  it('should handle missing optional fields', () => {
    const reservations = [
      {
        Instances: [
          { InstanceId: 'i-minimal', State: { Name: 'pending' }, InstanceType: 't2.nano', Placement: { AvailabilityZone: 'eu-west-1a' }, PrivateIpAddress: '10.0.0.5' },
        ],
      },
    ];

    const result = transformEC2Response(reservations);
    expect(result[0].publicIp).toBeUndefined();
    expect(result[0].state).toBe('pending');
  });
});
