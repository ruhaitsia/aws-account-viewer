import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { filterServiceData, exportData } from './dataExporter';

function tmpFile(ext: string): string {
  return path.join(os.tmpdir(), `export-test-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
}

const sampleData: Record<string, unknown> = {
  ec2: [
    { instanceId: 'i-001', name: 'web-1', state: 'running' },
    { instanceId: 'i-002', name: 'web-2', state: 'stopped' },
  ],
  s3: [
    { name: 'my-bucket', region: 'us-east-1', objectCount: 42 },
  ],
  rds: [
    { instanceId: 'db-1', engine: 'mysql', status: 'available' },
  ],
};

const baseMetadata = {
  exportTimestamp: '2024-01-01T00:00:00.000Z',
  accountId: '123456789012',
  region: 'us-east-1',
};

const createdFiles: string[] = [];

afterEach(() => {
  for (const f of createdFiles) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
  createdFiles.length = 0;
});

// ===== filterServiceData tests =====

describe('filterServiceData', () => {
  it('returns all data when services array is empty', () => {
    const result = filterServiceData(sampleData, []);
    expect(result).toEqual(sampleData);
  });

  it('filters to specific services', () => {
    const result = filterServiceData(sampleData, ['ec2']);
    expect(Object.keys(result)).toEqual(['ec2']);
    expect(result.ec2).toEqual(sampleData.ec2);
  });

  it('filters to multiple services', () => {
    const result = filterServiceData(sampleData, ['ec2', 's3']);
    expect(Object.keys(result)).toEqual(['ec2', 's3']);
  });

  it('ignores services not present in data', () => {
    const result = filterServiceData(sampleData, ['ec2', 'lambda']);
    expect(Object.keys(result)).toEqual(['ec2']);
  });

  it('returns empty object when no services match', () => {
    const result = filterServiceData(sampleData, ['lambda', 'iam']);
    expect(result).toEqual({});
  });
});

// ===== JSON export tests =====

describe('exportData - JSON format', () => {
  it('exports valid JSON with metadata', async () => {
    const filePath = tmpFile('json');
    createdFiles.push(filePath);

    const result = await exportData(sampleData, {
      format: 'json',
      services: [],
      filePath,
    }, baseMetadata);

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(filePath);
    expect(result.fileSize).toBeGreaterThan(0);

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.metadata).toBeDefined();
    expect(content.metadata.exportTimestamp).toBe('2024-01-01T00:00:00.000Z');
    expect(content.metadata.accountId).toBe('123456789012');
    expect(content.metadata.region).toBe('us-east-1');
    expect(content.metadata.services).toContain('ec2');
    expect(content.metadata.services).toContain('s3');
    expect(content.metadata.services).toContain('rds');
    expect(content.data).toBeDefined();
  });

  it('sets dataType to full when exporting all services', async () => {
    const filePath = tmpFile('json');
    createdFiles.push(filePath);

    await exportData(sampleData, { format: 'json', services: [], filePath }, baseMetadata);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.metadata.dataType).toBe('full');
  });

  it('sets dataType to single-service when exporting one service', async () => {
    const filePath = tmpFile('json');
    createdFiles.push(filePath);

    await exportData(sampleData, { format: 'json', services: ['ec2'], filePath }, baseMetadata);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.metadata.dataType).toBe('single-service');
  });

  it('JSON round-trip preserves data', async () => {
    const filePath = tmpFile('json');
    createdFiles.push(filePath);

    await exportData(sampleData, { format: 'json', services: [], filePath }, baseMetadata);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.data).toEqual(sampleData);
  });
});

// ===== CSV export tests =====

describe('exportData - CSV format', () => {
  it('exports CSV with correct row count', async () => {
    const filePath = tmpFile('csv');
    createdFiles.push(filePath);

    const result = await exportData(sampleData, {
      format: 'csv',
      services: [],
      filePath,
    }, baseMetadata);

    expect(result.success).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8').trim();
    const lines = content.split('\n');
    // header + 2 ec2 + 1 s3 + 1 rds = 5 lines
    expect(lines.length).toBe(5);
  });

  it('CSV header includes service column', async () => {
    const filePath = tmpFile('csv');
    createdFiles.push(filePath);

    await exportData(sampleData, { format: 'csv', services: [], filePath }, baseMetadata);
    const content = fs.readFileSync(filePath, 'utf-8');
    const header = content.split('\n')[0];
    expect(header).toContain('service');
  });

  it('exports filtered CSV when services specified', async () => {
    const filePath = tmpFile('csv');
    createdFiles.push(filePath);

    await exportData(sampleData, { format: 'csv', services: ['ec2'], filePath }, baseMetadata);
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    const lines = content.split('\n');
    // header + 2 ec2 rows = 3 lines
    expect(lines.length).toBe(3);
  });
});

// ===== Error handling tests =====

describe('exportData - error handling', () => {
  it('returns error result for invalid path', async () => {
    const result = await exportData(sampleData, {
      format: 'json',
      services: [],
      filePath: '/nonexistent/deeply/nested/path/file.json',
    }, baseMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.fileSize).toBe(0);
  });
});
