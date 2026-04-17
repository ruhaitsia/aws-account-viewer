import { describe, it, expect } from 'vitest';
import { transformELBResponse } from './elbFetcher';

describe('transformELBResponse', () => {
  it('should transform ALB response into LoadBalancer list', () => {
    const lbs = [
      {
        LoadBalancerName: 'my-alb',
        Type: 'application',
        State: { Code: 'active' },
        DNSName: 'my-alb-123.us-east-1.elb.amazonaws.com',
        VpcId: 'vpc-abc123',
        AvailabilityZones: [
          { ZoneName: 'us-east-1a' },
          { ZoneName: 'us-east-1b' },
        ],
      },
    ];

    const result = transformELBResponse(lbs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'my-alb',
      type: 'application',
      state: 'active',
      dnsName: 'my-alb-123.us-east-1.elb.amazonaws.com',
      vpcId: 'vpc-abc123',
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      listenerSummary: '',
    });
  });

  it('should transform NLB response correctly', () => {
    const lbs = [
      {
        LoadBalancerName: 'my-nlb',
        Type: 'network',
        State: { Code: 'active' },
        DNSName: 'my-nlb-456.us-west-2.elb.amazonaws.com',
        VpcId: 'vpc-def456',
        AvailabilityZones: [{ ZoneName: 'us-west-2a' }],
      },
    ];

    const result = transformELBResponse(lbs);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('network');
    expect(result[0].name).toBe('my-nlb');
  });

  it('should handle multiple load balancers', () => {
    const lbs = [
      {
        LoadBalancerName: 'alb-1',
        Type: 'application',
        State: { Code: 'active' },
        DNSName: 'alb-1.elb.amazonaws.com',
        VpcId: 'vpc-1',
        AvailabilityZones: [{ ZoneName: 'us-east-1a' }],
      },
      {
        LoadBalancerName: 'nlb-1',
        Type: 'network',
        State: { Code: 'provisioning' },
        DNSName: 'nlb-1.elb.amazonaws.com',
        VpcId: 'vpc-2',
        AvailabilityZones: [{ ZoneName: 'us-east-1b' }],
      },
    ];

    const result = transformELBResponse(lbs);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['alb-1', 'nlb-1']);
    expect(result.map((r) => r.type)).toEqual(['application', 'network']);
  });

  it('should handle empty input', () => {
    expect(transformELBResponse([])).toEqual([]);
  });

  it('should handle missing optional fields gracefully', () => {
    const lbs = [
      {
        LoadBalancerName: 'minimal-lb',
      },
    ];

    const result = transformELBResponse(lbs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'minimal-lb',
      type: 'application',
      state: 'unknown',
      dnsName: '',
      vpcId: '',
      availabilityZones: [],
      listenerSummary: '',
    });
  });

  it('should handle missing AZ ZoneName', () => {
    const lbs = [
      {
        LoadBalancerName: 'lb-no-zone',
        Type: 'application',
        State: { Code: 'active' },
        DNSName: 'lb.elb.amazonaws.com',
        VpcId: 'vpc-1',
        AvailabilityZones: [{ ZoneName: 'us-east-1a' }, {}],
      },
    ];

    const result = transformELBResponse(lbs);
    expect(result[0].availabilityZones).toEqual(['us-east-1a', '']);
  });
});
