import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseDailyResponse, calculateChangePercentage } from './billingFetcher';

// Feature: billing-dashboard-enhancement, Property 3: 按日费用数据解析与排序
describe('parseDailyResponse – Property 3', () => {
  it('output is sorted by date ascending with valid YYYY-MM-DD dates and numeric amounts', () => {
    // Arbitrary for a ResultByTime-like entry
    const resultByTimeArb = fc.record({
      TimePeriod: fc.record({
        Start: fc.date({
          min: new Date('2020-01-01'),
          max: new Date('2030-12-31'),
        }).map((d) => d.toISOString().slice(0, 10)),
      }),
      Total: fc.record({
        UnblendedCost: fc.record({
          Amount: fc.float({ min: 0, max: Math.fround(100000), noNaN: true, noDefaultInfinity: true }).map(String),
          Unit: fc.constant('USD'),
        }),
      }),
    });

    fc.assert(
      fc.property(fc.array(resultByTimeArb, { minLength: 0, maxLength: 50 }), (entries) => {
        const result = parseDailyResponse(entries as any);

        // Every entry has a valid YYYY-MM-DD date and numeric amount
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        for (const item of result) {
          expect(item.date).toMatch(dateRegex);
          expect(typeof item.amount).toBe('number');
          expect(Number.isFinite(item.amount)).toBe(true);
        }

        // Output is sorted by date ascending
        for (let i = 1; i < result.length; i++) {
          expect(result[i].date >= result[i - 1].date).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: billing-dashboard-enhancement, Property 8: 费用变化百分比计算正确性
describe('calculateChangePercentage – Property 8', () => {
  it('returns (current - previous) / previous * 100 when previous > 0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(1e9), noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(1e9), noNaN: true, noDefaultInfinity: true }), // previous > 0
        (current, previous) => {
          const result = calculateChangePercentage(current, previous);
          expect(result).not.toBeNull();
          const expected = ((current - previous) / previous) * 100;
          expect(result).toBeCloseTo(expected, 3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns null when previous is 0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(1e9), noNaN: true, noDefaultInfinity: true }),
        (current) => {
          const result = calculateChangePercentage(current, 0);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
