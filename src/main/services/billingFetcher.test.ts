import { describe, it, expect } from 'vitest';
import { calculateChangePercentage } from './billingFetcher';

describe('calculateChangePercentage', () => {
  it('returns positive percentage when current > previous', () => {
    expect(calculateChangePercentage(150, 100)).toBe(50);
  });

  it('returns negative percentage when current < previous', () => {
    expect(calculateChangePercentage(80, 100)).toBe(-20);
  });

  it('returns 0 when current equals previous', () => {
    expect(calculateChangePercentage(100, 100)).toBe(0);
  });

  it('returns null when previous is 0', () => {
    expect(calculateChangePercentage(100, 0)).toBeNull();
  });

  it('returns null when both are 0', () => {
    expect(calculateChangePercentage(0, 0)).toBeNull();
  });

  it('handles small decimal values correctly', () => {
    const result = calculateChangePercentage(1.5, 1.0);
    expect(result).toBeCloseTo(50, 5);
  });

  it('returns -100 when current is 0 and previous is positive', () => {
    expect(calculateChangePercentage(0, 50)).toBe(-100);
  });

  it('handles large values without overflow', () => {
    const result = calculateChangePercentage(2000000, 1000000);
    expect(result).toBe(100);
  });
});
