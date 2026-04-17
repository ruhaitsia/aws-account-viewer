import { describe, it, expect } from 'vitest';
import { parseIniFile, mapAwsError } from './credentialManager';

describe('parseIniFile', () => {
  it('parses a credentials file with multiple profiles', () => {
    const content = `[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region = us-east-1

[production]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
`;
    const result = parseIniFile(content, false);
    expect(Object.keys(result)).toEqual(['default', 'production']);
    expect(result['default']['aws_access_key_id']).toBe('AKIAIOSFODNN7EXAMPLE');
    expect(result['default']['aws_secret_access_key']).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(result['default']['region']).toBe('us-east-1');
    expect(result['production']['aws_access_key_id']).toBe('AKIAI44QH8DHBEXAMPLE');
  });

  it('parses a config file with [profile xxx] prefix', () => {
    const content = `[default]
region = us-west-2

[profile staging]
region = eu-west-1

[profile production]
region = ap-northeast-1
`;
    const result = parseIniFile(content, true);
    expect(Object.keys(result)).toEqual(['default', 'staging', 'production']);
    expect(result['default']['region']).toBe('us-west-2');
    expect(result['staging']['region']).toBe('eu-west-1');
    expect(result['production']['region']).toBe('ap-northeast-1');
  });

  it('skips comments and blank lines', () => {
    const content = `# This is a comment
; Another comment

[default]
aws_access_key_id = AKIAEXAMPLE

# inline comment section
`;
    const result = parseIniFile(content, false);
    expect(Object.keys(result)).toEqual(['default']);
    expect(result['default']['aws_access_key_id']).toBe('AKIAEXAMPLE');
  });

  it('returns empty object for empty content', () => {
    const result = parseIniFile('', false);
    expect(result).toEqual({});
  });

  it('handles values with equals signs', () => {
    const content = `[default]
aws_access_key_id = KEY=WITH=EQUALS
`;
    const result = parseIniFile(content, false);
    expect(result['default']['aws_access_key_id']).toBe('KEY=WITH=EQUALS');
  });
});

describe('mapAwsError', () => {
  it('maps known error codes to structured results', () => {
    const result = mapAwsError('InvalidClientTokenId');
    expect(result.type).toBe('InvalidClientTokenId');
    expect(result.message).toBe('Access Key ID 无效');
    expect(result.suggestion).toBeTruthy();
  });

  it('maps SignatureDoesNotMatch', () => {
    const result = mapAwsError('SignatureDoesNotMatch');
    expect(result.type).toBe('SignatureDoesNotMatch');
    expect(result.message).toBe('Secret Access Key 不匹配');
  });

  it('maps ExpiredToken', () => {
    const result = mapAwsError('ExpiredToken');
    expect(result.type).toBe('ExpiredToken');
    expect(result.message).toBe('临时凭证已过期');
  });

  it('maps AccessDenied', () => {
    const result = mapAwsError('AccessDenied');
    expect(result.type).toBe('AccessDenied');
    expect(result.message).toBe('权限不足');
  });

  it('handles unknown error codes gracefully', () => {
    const result = mapAwsError('SomeRandomError');
    expect(result.type).toBe('SomeRandomError');
    expect(result.message).toContain('SomeRandomError');
    expect(result.suggestion).toBeTruthy();
  });

  it('always returns type, message, and suggestion fields', () => {
    for (const code of ['InvalidClientTokenId', 'SignatureDoesNotMatch', 'ExpiredToken', 'AccessDenied', 'UnknownCode']) {
      const result = mapAwsError(code);
      expect(result.type).toBeTruthy();
      expect(result.message).toBeTruthy();
      expect(result.suggestion).toBeTruthy();
    }
  });
});

describe('CredentialManager region management', () => {
  // We need to test the class directly, so import it
  // The singleton is already exported, but we want a fresh instance for isolation
  it('setRegion updates getCurrentRegion', async () => {
    const { CredentialManager } = await import('./credentialManager');
    const cm = new CredentialManager();
    // Default region when no profile and no override
    expect(cm.getCurrentRegion()).toBe('us-east-1');

    cm.setRegion('eu-west-1');
    expect(cm.getCurrentRegion()).toBe('eu-west-1');

    cm.setRegion('ap-northeast-1');
    expect(cm.getCurrentRegion()).toBe('ap-northeast-1');
  });

  it('getClientConfig uses currentRegion override', async () => {
    const { CredentialManager } = await import('./credentialManager');
    const cm = new CredentialManager();
    cm.setManualCredential({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-west-2',
    });

    // Without region override, uses profile region
    expect(cm.getClientConfig().region).toBe('us-west-2');

    // After setRegion, uses the override
    cm.setRegion('eu-central-1');
    expect(cm.getClientConfig().region).toBe('eu-central-1');

    // Explicit region param still takes precedence
    expect(cm.getClientConfig('ap-south-1').region).toBe('ap-south-1');
  });

  it('getCurrentRegion falls back to profile region', async () => {
    const { CredentialManager } = await import('./credentialManager');
    const cm = new CredentialManager();
    cm.setManualCredential({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'ap-southeast-1',
    });
    // No setRegion called, should fall back to profile region
    expect(cm.getCurrentRegion()).toBe('ap-southeast-1');
  });
});
