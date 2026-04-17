import { describe, it, expect } from 'vitest';
import { determineHealthStatus, fetchDashboardData } from './dashboardAggregator';

describe('determineHealthStatus', () => {
  it('returns healthy when resourceCount is 0', () => {
    expect(determineHealthStatus('ec2', { resourceCount: 0 })).toBe('healthy');
  });

  it('returns error when errorCount > 0', () => {
    expect(determineHealthStatus('ec2', { resourceCount: 5, errorCount: 1 })).toBe('error');
  });

  it('returns warning when warningCount > 0 and no errors', () => {
    expect(determineHealthStatus('ec2', { resourceCount: 5, warningCount: 2 })).toBe('warning');
  });

  it('returns healthy when resources exist with no errors or warnings', () => {
    expect(determineHealthStatus('s3', { resourceCount: 10 })).toBe('healthy');
  });

  it('returns error when both errorCount and warningCount > 0 (error takes priority)', () => {
    expect(determineHealthStatus('rds', { resourceCount: 3, errorCount: 1, warningCount: 1 })).toBe('error');
  });
});

describe('fetchDashboardData', () => {
  it('returns 13 service summaries', async () => {
    const result = await fetchDashboardData();
    expect(result).toHaveLength(13);
  });

  it('includes all required services', async () => {
    const result = await fetchDashboardData();
    const names = result.map((s) => s.serviceName);
    expect(names).toEqual([
      'ec2', 's3', 'rds', 'lambda', 'elb', 'vpc',
      'ecs', 'eks', 'dynamodb', 'cloudfront', 'sns', 'sqs', 'route53',
    ]);
  });

  it('marks global services correctly', async () => {
    const result = await fetchDashboardData();
    const globalServices = result.filter((s) => s.isGlobal).map((s) => s.serviceName);
    expect(globalServices).toEqual(['s3', 'cloudfront', 'route53']);
  });

  it('each summary has valid healthStatus', async () => {
    const result = await fetchDashboardData();
    for (const summary of result) {
      expect(['healthy', 'warning', 'error']).toContain(summary.healthStatus);
    }
  });

  it('each summary has required fields', async () => {
    const result = await fetchDashboardData();
    for (const summary of result) {
      expect(summary.serviceName).toBeTruthy();
      expect(summary.displayName).toBeTruthy();
      expect(summary.icon).toBeTruthy();
      expect(typeof summary.resourceCount).toBe('number');
      expect(typeof summary.isGlobal).toBe('boolean');
    }
  });
});
