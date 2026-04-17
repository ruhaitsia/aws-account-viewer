import { describe, it, expect } from 'vitest';
import { sanitizeData } from './dataUploader';

describe('sanitizeData', () => {
  it('redacts AWS Access Key ID pattern (AKIA...)', () => {
    const data = { key: 'AKIAIOSFODNN7EXAMPLE' };
    const result = sanitizeData(data);
    expect(result.key).toBe('[REDACTED_ACCESS_KEY]');
  });

  it('redacts access key embedded in a longer string', () => {
    const data = { config: 'aws_access_key_id = AKIAIOSFODNN7EXAMPLE and more' };
    const result = sanitizeData(data);
    expect(result.config).not.toMatch(/AKIA[A-Z0-9]{16}/);
    expect(result.config).toContain('[REDACTED_ACCESS_KEY]');
  });

  it('redacts secret key fields by name', () => {
    const data = {
      aws_secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      secretAccessKey: 'anotherSecretValue123',
    };
    const result = sanitizeData(data);
    expect(result.aws_secret_access_key).toBe('[REDACTED_SECRET_KEY]');
    expect(result.secretAccessKey).toBe('[REDACTED_SECRET_KEY]');
  });

  it('preserves non-sensitive data', () => {
    const data = {
      instanceId: 'i-0123456789abcdef0',
      name: 'my-instance',
      count: 42,
      active: true,
    };
    const result = sanitizeData(data);
    expect(result).toEqual(data);
  });

  it('handles nested objects recursively', () => {
    const data = {
      level1: {
        level2: {
          secretAccessKey: 'mySecret123',
          normalField: 'hello',
        },
      },
    };
    const result = sanitizeData(data);
    const level2 = (result.level1 as Record<string, unknown>).level2 as Record<string, unknown>;
    expect(level2.secretAccessKey).toBe('[REDACTED_SECRET_KEY]');
    expect(level2.normalField).toBe('hello');
  });

  it('handles arrays with sensitive data', () => {
    const data = {
      credentials: [
        { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'secret1' },
        { accessKeyId: 'AKIAI44QH8DHBEXAMPLE', secretAccessKey: 'secret2' },
      ],
    };
    const result = sanitizeData(data);
    const creds = result.credentials as Record<string, unknown>[];
    expect(creds[0].accessKeyId).toBe('[REDACTED_ACCESS_KEY]');
    expect(creds[0].secretAccessKey).toBe('[REDACTED_SECRET_KEY]');
    expect(creds[1].accessKeyId).toBe('[REDACTED_ACCESS_KEY]');
    expect(creds[1].secretAccessKey).toBe('[REDACTED_SECRET_KEY]');
  });

  it('handles null and undefined values', () => {
    const data = { a: null, b: undefined, c: 'normal' };
    const result = sanitizeData(data);
    expect(result.a).toBeNull();
    expect(result.b).toBeUndefined();
    expect(result.c).toBe('normal');
  });

  it('does not modify the original data', () => {
    const original = {
      secretAccessKey: 'mySecret',
      key: 'AKIAIOSFODNN7EXAMPLE',
    };
    const originalCopy = JSON.parse(JSON.stringify(original));
    sanitizeData(original);
    expect(original).toEqual(originalCopy);
  });

  it('handles empty objects and arrays', () => {
    expect(sanitizeData({})).toEqual({});
    const data = { items: [], nested: {} };
    const result = sanitizeData(data);
    expect(result.items).toEqual([]);
    expect(result.nested).toEqual({});
  });

  it('handles multiple access keys in a single string', () => {
    const data = {
      log: 'Key1: AKIAIOSFODNN7EXAMPLE Key2: AKIAI44QH8DHBEXAMPLE',
    };
    const result = sanitizeData(data);
    expect(result.log).not.toMatch(/AKIA[A-Z0-9]{16}/);
    expect((result.log as string).match(/\[REDACTED_ACCESS_KEY\]/g)?.length).toBe(2);
  });
});
