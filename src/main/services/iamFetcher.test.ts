import { describe, it, expect } from 'vitest';
import { transformIAMUsersResponse, transformIAMRolesResponse } from './iamFetcher';

describe('transformIAMUsersResponse', () => {
  it('should transform raw users into IAMUser list', () => {
    const rawUsers = [
      {
        UserName: 'alice',
        CreateDate: new Date('2023-01-15T10:00:00Z'),
        PasswordLastUsed: new Date('2024-06-01T08:30:00Z'),
      },
    ];

    const result = transformIAMUsersResponse(rawUsers);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      userName: 'alice',
      createDate: '2023-01-15T10:00:00.000Z',
      lastActivity: '2024-06-01T08:30:00.000Z',
      mfaEnabled: false,
      accessKeyCount: 0,
    });
  });

  it('should handle missing PasswordLastUsed', () => {
    const rawUsers = [
      {
        UserName: 'bob',
        CreateDate: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    const result = transformIAMUsersResponse(rawUsers);
    expect(result[0].lastActivity).toBeUndefined();
  });

  it('should handle empty user list', () => {
    expect(transformIAMUsersResponse([])).toEqual([]);
  });

  it('should handle missing fields gracefully', () => {
    const rawUsers = [{}];
    const result = transformIAMUsersResponse(rawUsers);
    expect(result).toHaveLength(1);
    expect(result[0].userName).toBe('');
    expect(result[0].createDate).toBe('');
    expect(result[0].mfaEnabled).toBe(false);
    expect(result[0].accessKeyCount).toBe(0);
  });

  it('should transform multiple users', () => {
    const rawUsers = [
      { UserName: 'user1', CreateDate: new Date('2023-01-01') },
      { UserName: 'user2', CreateDate: new Date('2023-06-01') },
      { UserName: 'user3', CreateDate: new Date('2024-01-01') },
    ];

    const result = transformIAMUsersResponse(rawUsers);
    expect(result).toHaveLength(3);
    expect(result.map((u) => u.userName)).toEqual(['user1', 'user2', 'user3']);
  });
});

describe('transformIAMRolesResponse', () => {
  it('should transform raw roles into IAMRole list', () => {
    const rawRoles = [
      {
        RoleName: 'AdminRole',
        CreateDate: new Date('2023-03-10T12:00:00Z'),
        Description: 'Admin access role',
        AssumeRolePolicyDocument: encodeURIComponent(
          JSON.stringify({
            Statement: [{ Principal: { AWS: 'arn:aws:iam::123456789012:root' } }],
          }),
        ),
      },
    ];

    const result = transformIAMRolesResponse(rawRoles);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      roleName: 'AdminRole',
      createDate: '2023-03-10T12:00:00.000Z',
      description: 'Admin access role',
      trustedEntityType: 'AWS Account',
    });
  });

  it('should detect AWS Service trusted entity', () => {
    const rawRoles = [
      {
        RoleName: 'LambdaExecRole',
        CreateDate: new Date('2023-01-01'),
        Description: '',
        AssumeRolePolicyDocument: encodeURIComponent(
          JSON.stringify({
            Statement: [{ Principal: { Service: 'lambda.amazonaws.com' } }],
          }),
        ),
      },
    ];

    const result = transformIAMRolesResponse(rawRoles);
    expect(result[0].trustedEntityType).toBe('AWS Service');
  });

  it('should detect Federated trusted entity', () => {
    const rawRoles = [
      {
        RoleName: 'FederatedRole',
        CreateDate: new Date('2023-01-01'),
        AssumeRolePolicyDocument: encodeURIComponent(
          JSON.stringify({
            Statement: [{ Principal: { Federated: 'cognito-identity.amazonaws.com' } }],
          }),
        ),
      },
    ];

    const result = transformIAMRolesResponse(rawRoles);
    expect(result[0].trustedEntityType).toBe('Federated');
  });

  it('should return Unknown for missing policy document', () => {
    const rawRoles = [
      {
        RoleName: 'NoPolicy',
        CreateDate: new Date('2023-01-01'),
      },
    ];

    const result = transformIAMRolesResponse(rawRoles);
    expect(result[0].trustedEntityType).toBe('Unknown');
  });

  it('should return Unknown for invalid policy document', () => {
    const rawRoles = [
      {
        RoleName: 'BadPolicy',
        CreateDate: new Date('2023-01-01'),
        AssumeRolePolicyDocument: 'not-valid-json',
      },
    ];

    const result = transformIAMRolesResponse(rawRoles);
    expect(result[0].trustedEntityType).toBe('Unknown');
  });

  it('should handle empty role list', () => {
    expect(transformIAMRolesResponse([])).toEqual([]);
  });

  it('should handle missing description', () => {
    const rawRoles = [
      {
        RoleName: 'NoDesc',
        CreateDate: new Date('2023-01-01'),
        AssumeRolePolicyDocument: encodeURIComponent(
          JSON.stringify({ Statement: [{ Principal: { Service: 'ec2.amazonaws.com' } }] }),
        ),
      },
    ];

    const result = transformIAMRolesResponse(rawRoles);
    expect(result[0].description).toBe('');
  });
});
