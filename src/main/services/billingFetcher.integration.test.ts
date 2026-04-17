import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseDailyResponse, calculateChangePercentage } from './billingFetcher';

/**
 * Integration tests for billing dashboard data flow.
 * Tests parseDailyResponse and calculateChangePercentage with realistic mock data
 * simulating actual Cost Explorer API responses.
 */

describe('fetchBillingDashboardData integration', () => {
  describe('parseDailyResponse with mock Cost Explorer DAILY response', () => {
    it('parses a typical multi-day response correctly', () => {
      const mockResultsByTime = [
        {
          TimePeriod: { Start: '2026-04-03', End: '2026-04-04' },
          Total: { UnblendedCost: { Amount: '45.67', Unit: 'USD' } },
        },
        {
          TimePeriod: { Start: '2026-04-01', End: '2026-04-02' },
          Total: { UnblendedCost: { Amount: '32.10', Unit: 'USD' } },
        },
        {
          TimePeriod: { Start: '2026-04-02', End: '2026-04-03' },
          Total: { UnblendedCost: { Amount: '28.50', Unit: 'USD' } },
        },
      ];

      const result = parseDailyResponse(mockResultsByTime as any);

      // Should have 3 entries
      expect(result).toHaveLength(3);

      // Should be sorted by date ascending
      expect(result[0].date).toBe('2026-04-01');
      expect(result[1].date).toBe('2026-04-02');
      expect(result[2].date).toBe('2026-04-03');

      // Amounts should be parsed correctly
      expect(result[0].amount).toBeCloseTo(32.10, 2);
      expect(result[1].amount).toBeCloseTo(28.50, 2);
      expect(result[2].amount).toBeCloseTo(45.67, 2);
    });

    it('handles empty response', () => {
      const result = parseDailyResponse([]);
      expect(result).toEqual([]);
    });

    it('handles response with missing fields gracefully', () => {
      const mockResultsByTime = [
        {
          TimePeriod: { Start: '2026-04-01' },
          Total: {},
        },
        {
          TimePeriod: {},
          Total: { UnblendedCost: { Amount: '10.00' } },
        },
      ];

      const result = parseDailyResponse(mockResultsByTime as any);
      expect(result).toHaveLength(2);

      // Missing amount defaults to 0
      expect(result.find((d) => d.date === '2026-04-01')?.amount).toBe(0);

      // Missing date defaults to empty string
      const emptyDateEntry = result.find((d) => d.date === '');
      expect(emptyDateEntry).toBeDefined();
      expect(emptyDateEntry!.amount).toBe(10);
    });

    it('handles single-day response', () => {
      const mockResultsByTime = [
        {
          TimePeriod: { Start: '2026-04-15', End: '2026-04-16' },
          Total: { UnblendedCost: { Amount: '100.00', Unit: 'USD' } },
        },
      ];

      const result = parseDailyResponse(mockResultsByTime as any);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ date: '2026-04-15', amount: 100 });
    });

    it('handles a full month of data', () => {
      const mockResultsByTime = Array.from({ length: 30 }, (_, i) => ({
        TimePeriod: {
          Start: `2026-04-${String(i + 1).padStart(2, '0')}`,
          End: `2026-04-${String(i + 2).padStart(2, '0')}`,
        },
        Total: {
          UnblendedCost: {
            Amount: String((i + 1) * 10),
            Unit: 'USD',
          },
        },
      }));

      const result = parseDailyResponse(mockResultsByTime as any);
      expect(result).toHaveLength(30);

      // First day
      expect(result[0].date).toBe('2026-04-01');
      expect(result[0].amount).toBe(10);

      // Last day
      expect(result[29].date).toBe('2026-04-30');
      expect(result[29].amount).toBe(300);

      // Verify ascending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date > result[i - 1].date).toBe(true);
      }
    });
  });

  describe('calculateChangePercentage integration with billing data', () => {
    it('calculates correct percentage for typical month-over-month comparison', () => {
      // Current month: $1,500, Previous month: $1,200
      const result = calculateChangePercentage(1500, 1200);
      expect(result).toBeCloseTo(25, 1);
    });

    it('calculates correct percentage for cost decrease', () => {
      // Current month: $800, Previous month: $1,000
      const result = calculateChangePercentage(800, 1000);
      expect(result).toBeCloseTo(-20, 1);
    });

    it('handles first month with no previous data', () => {
      // Previous month: $0 (new account)
      const result = calculateChangePercentage(500, 0);
      expect(result).toBeNull();
    });

    it('handles zero cost in both months', () => {
      const result = calculateChangePercentage(0, 0);
      expect(result).toBeNull();
    });

    it('handles very small cost changes', () => {
      const result = calculateChangePercentage(100.01, 100.00);
      expect(result).toBeCloseTo(0.01, 1);
    });
  });
});
