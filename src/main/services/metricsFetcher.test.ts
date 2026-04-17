import { describe, it, expect } from 'vitest';
import { timeRangeToParams, type TimeRange } from './metricsFetcher';

describe('timeRangeToParams', () => {
  it('returns period 60 for 1h range', () => {
    const result = timeRangeToParams('1h');
    expect(result.period).toBe(60);
  });

  it('returns period 300 for 6h range', () => {
    const result = timeRangeToParams('6h');
    expect(result.period).toBe(300);
  });

  it('returns period 3600 for 24h range', () => {
    const result = timeRangeToParams('24h');
    expect(result.period).toBe(3600);
  });

  it('returns period 86400 for 7d range', () => {
    const result = timeRangeToParams('7d');
    expect(result.period).toBe(86400);
  });

  it('endTime does not exceed current time', () => {
    const before = Date.now();
    const result = timeRangeToParams('24h');
    const after = Date.now();
    expect(result.endTime.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.endTime.getTime()).toBeLessThanOrEqual(after);
  });

  it.each([
    ['1h', 1 * 60 * 60 * 1000],
    ['6h', 6 * 60 * 60 * 1000],
    ['24h', 24 * 60 * 60 * 1000],
    ['7d', 7 * 24 * 60 * 60 * 1000],
  ] as [TimeRange, number][])('duration for %s equals %d ms', (range, expectedMs) => {
    const result = timeRangeToParams(range);
    const diff = result.endTime.getTime() - result.startTime.getTime();
    expect(diff).toBe(expectedMs);
  });

  it('startTime is before endTime', () => {
    const ranges: TimeRange[] = ['1h', '6h', '24h', '7d'];
    for (const range of ranges) {
      const result = timeRangeToParams(range);
      expect(result.startTime.getTime()).toBeLessThan(result.endTime.getTime());
    }
  });
});
