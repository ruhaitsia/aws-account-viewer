import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  formatCurrency,
  matchServiceCosts,
  calculateForecast,
  calculateDailyAverage,
  getTopGrowthServices,
  getRecentDays,
} from './billingUtils';
import type { DailyCostData } from '../../shared/types';

// Helper: generate a valid YYYY-MM-DD date string arbitrary
const dateArb = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).map((d) => d.toISOString().slice(0, 10));

// Helper: generate a DailyCostData arbitrary
const dailyCostArb = fc.record({
  date: dateArb,
  amount: fc.float({ min: 0, max: Math.fround(100000), noNaN: true, noDefaultInfinity: true }),
});

// Helper: generate a safe service name that won't collide with Object prototype properties
const serviceNameArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
  (s) => !Object.prototype.hasOwnProperty.call(Object.prototype, s),
);

// Helper: generate a ServiceCost arbitrary
const serviceCostArb = fc.record({
  serviceName: serviceNameArb,
  cost: fc.float({ min: 0, max: Math.fround(100000), noNaN: true, noDefaultInfinity: true }),
});

// Feature: billing-dashboard-enhancement, Property 1: 费用格式化正确性
describe('formatCurrency – Property 1', () => {
  it('output starts with "$", has exactly 2 decimal places, and includes comma for >= 1000', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(1e9), noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          const result = formatCurrency(amount);

          // Starts with "$"
          expect(result.startsWith('$')).toBe(true);

          // Contains exactly 2 decimal places
          const dotIndex = result.lastIndexOf('.');
          expect(dotIndex).toBeGreaterThan(0);
          const decimals = result.slice(dotIndex + 1);
          expect(decimals.length).toBe(2);

          // For amounts >= 1000, should contain comma
          if (amount >= 1000) {
            const numericPart = result.slice(1); // remove "$"
            expect(numericPart).toContain(',');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: billing-dashboard-enhancement, Property 2: 服务费用匹配完整性
describe('matchServiceCosts – Property 2', () => {
  it('existing services map to their cost, non-existing services map to 0', () => {
    fc.assert(
      fc.property(
        fc.array(serviceCostArb, { minLength: 0, maxLength: 20 }),
        fc.array(fc.record({ serviceName: serviceNameArb }), {
          minLength: 0,
          maxLength: 20,
        }),
        (serviceCosts, serviceSummaries) => {
          const result = matchServiceCosts(serviceCosts, serviceSummaries);
          const costMap = new Map(serviceCosts.map((sc) => [sc.serviceName, sc.cost]));

          for (const summary of serviceSummaries) {
            if (costMap.has(summary.serviceName)) {
              expect(result[summary.serviceName]).toBe(costMap.get(summary.serviceName));
            } else {
              expect(result[summary.serviceName]).toBe(0);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: billing-dashboard-enhancement, Property 4: 费用预测线性外推正确性
describe('calculateForecast – Property 4', () => {
  it('returns (totalCost / days) * totalDaysInMonth for >= 3 days, null for < 3', () => {
    fc.assert(
      fc.property(
        fc.array(dailyCostArb, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 28, max: 31 }),
        (dailyCosts, totalDaysInMonth) => {
          const result = calculateForecast(dailyCosts, totalDaysInMonth);

          if (dailyCosts.length < 3) {
            expect(result).toBeNull();
          } else {
            expect(result).not.toBeNull();
            const totalCost = dailyCosts.reduce((sum, d) => sum + d.amount, 0);
            const expected = (totalCost / dailyCosts.length) * totalDaysInMonth;
            expect(result).toBeCloseTo(expected, 5);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: billing-dashboard-enhancement, Property 5: 日均费用计算正确性
describe('calculateDailyAverage – Property 5', () => {
  it('returns sum(amounts) / length for non-empty, 0 for empty', () => {
    fc.assert(
      fc.property(
        fc.array(dailyCostArb, { minLength: 0, maxLength: 50 }),
        (dailyCosts) => {
          const result = calculateDailyAverage(dailyCosts);

          if (dailyCosts.length === 0) {
            expect(result).toBe(0);
          } else {
            const sum = dailyCosts.reduce((s, d) => s + d.amount, 0);
            const expected = sum / dailyCosts.length;
            expect(result).toBeCloseTo(expected, 5);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: billing-dashboard-enhancement, Property 6: Top N 费用增长服务排序与过滤
describe('getTopGrowthServices – Property 6', () => {
  it('excludes zero-cost, marks new, sorts descending, length <= topN', () => {
    fc.assert(
      fc.property(
        fc.array(serviceCostArb, { minLength: 0, maxLength: 20 }),
        fc.array(serviceCostArb, { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (currentCosts, previousCosts, topN) => {
          const result = getTopGrowthServices(currentCosts, previousCosts, topN);

          // (a) No service with current cost = 0
          for (const item of result) {
            expect(item.currentCost).not.toBe(0);
          }

          // (b) Services with previous = 0 and current > 0 are marked "new"
          const prevMap = new Map(previousCosts.map((p) => [p.serviceName, p.cost]));
          for (const item of result) {
            if ((prevMap.get(item.serviceName) ?? 0) === 0 && item.currentCost > 0) {
              expect(item.growthLabel).toBe('new');
              expect(item.growthPercentage).toBeNull();
            }
          }

          // (c) Sorted by growth rate descending (new services first)
          for (let i = 1; i < result.length; i++) {
            const prev = result[i - 1];
            const curr = result[i];
            // new (null) should come before percentage values
            if (prev.growthPercentage === null) {
              // ok — null is first
            } else if (curr.growthPercentage === null) {
              // This shouldn't happen — null should be before non-null
              expect(prev.growthPercentage).toBeNull();
            } else {
              expect(prev.growthPercentage).toBeGreaterThanOrEqual(curr.growthPercentage);
            }
          }

          // (d) Length <= topN
          expect(result.length).toBeLessThanOrEqual(topN);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: billing-dashboard-enhancement, Property 7: 最近 N 天数据提取正确性
describe('getRecentDays – Property 7', () => {
  it('returns min(N, input.length) items with the largest dates, sorted ascending', () => {
    fc.assert(
      fc.property(
        fc.array(dailyCostArb, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 30 }),
        (dailyCosts, days) => {
          const result = getRecentDays(dailyCosts, days);

          // Length = min(N, input.length)
          expect(result.length).toBe(Math.min(days, dailyCosts.length));

          // Sorted by date ascending
          for (let i = 1; i < result.length; i++) {
            expect(result[i].date >= result[i - 1].date).toBe(true);
          }

          // Contains the N largest dates from input
          if (dailyCosts.length > 0 && result.length > 0) {
            const allDatesSorted = [...dailyCosts]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, days)
              .map((d) => d.date)
              .sort();
            const resultDates = result.map((d) => d.date).sort();
            expect(resultDates).toEqual(allDatesSorted);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
