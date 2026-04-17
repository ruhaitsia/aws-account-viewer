import { describe, it, expect } from 'vitest';
import { transformVPCResponse, transformSecurityGroupResponse } from './vpcFetcher';

describe('transformVPCResponse', () => {
  it('should transform VPCs with subnet counts', () => {
    const vpcs = [
      {
        VpcId: 'vpc-abc123',
        CidrBlock: '10.0.0.0/16',
        IsDefault: false,
        State: 'available',
        Tags: [{ Key: 'Name', Value: 'production' }],
      },
    ];
    const subnetCounts = { 'vpc-abc123': 4 };

    const result = transformVPCResponse(vpcs, subnetCounts);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      vpcId: 'vpc-abc123',
      name: 'production',
      cidrBlock: '10.0.0.0/16',
      subnetCount: 4,
      isDefault: false,
      state: 'available',
    });
  });

  it('should handle multiple VPCs', () => {
    const vpcs = [
      { VpcId: 'vpc-1', CidrBlock: '10.0.0.0/16', IsDefault: true, State: 'available', Tags: [] },
      { VpcId: 'vpc-2', CidrBlock: '172.16.0.0/16', IsDefault: false, State: 'available', Tags: [{ Key: 'Name', Value: 'dev' }] },
    ];
    const subnetCounts = { 'vpc-1': 2, 'vpc-2': 6 };

    const result = transformVPCResponse(vpcs, subnetCounts);
    expect(result).toHaveLength(2);
    expect(result[0].isDefault).toBe(true);
    expect(result[0].subnetCount).toBe(2);
    expect(result[1].name).toBe('dev');
    expect(result[1].subnetCount).toBe(6);
  });

  it('should handle empty VPC list', () => {
    expect(transformVPCResponse([])).toEqual([]);
  });

  it('should handle missing Name tag', () => {
    const vpcs = [
      { VpcId: 'vpc-noname', CidrBlock: '10.0.0.0/16', IsDefault: false, State: 'available' },
    ];
    const result = transformVPCResponse(vpcs);
    expect(result[0].name).toBe('');
  });

  it('should default subnetCount to 0 when not in subnetCounts map', () => {
    const vpcs = [
      { VpcId: 'vpc-orphan', CidrBlock: '10.0.0.0/16', IsDefault: false, State: 'available', Tags: [] },
    ];
    const result = transformVPCResponse(vpcs, {});
    expect(result[0].subnetCount).toBe(0);
  });

  it('should handle missing optional fields gracefully', () => {
    const vpcs = [{ VpcId: 'vpc-minimal' }];
    const result = transformVPCResponse(vpcs);
    expect(result[0]).toEqual({
      vpcId: 'vpc-minimal',
      name: '',
      cidrBlock: '',
      subnetCount: 0,
      isDefault: false,
      state: 'unknown',
    });
  });
});

describe('transformSecurityGroupResponse', () => {
  it('should transform security groups', () => {
    const groups = [
      {
        GroupId: 'sg-abc123',
        GroupName: 'web-sg',
        Description: 'Web server security group',
        VpcId: 'vpc-abc123',
      },
    ];

    const result = transformSecurityGroupResponse(groups);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      groupId: 'sg-abc123',
      groupName: 'web-sg',
      description: 'Web server security group',
      vpcId: 'vpc-abc123',
    });
  });

  it('should handle empty list', () => {
    expect(transformSecurityGroupResponse([])).toEqual([]);
  });

  it('should handle missing fields', () => {
    const groups = [{ GroupId: 'sg-minimal' }];
    const result = transformSecurityGroupResponse(groups);
    expect(result[0]).toEqual({
      groupId: 'sg-minimal',
      groupName: '',
      description: '',
      vpcId: '',
    });
  });

  it('should handle multiple security groups', () => {
    const groups = [
      { GroupId: 'sg-1', GroupName: 'sg-a', Description: 'A', VpcId: 'vpc-1' },
      { GroupId: 'sg-2', GroupName: 'sg-b', Description: 'B', VpcId: 'vpc-1' },
      { GroupId: 'sg-3', GroupName: 'sg-c', Description: 'C', VpcId: 'vpc-2' },
    ];
    const result = transformSecurityGroupResponse(groups);
    expect(result).toHaveLength(3);
    expect(result.map((sg) => sg.groupId)).toEqual(['sg-1', 'sg-2', 'sg-3']);
  });
});
