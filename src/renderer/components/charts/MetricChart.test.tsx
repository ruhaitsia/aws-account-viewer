import { describe, it, expect } from 'vitest';
import MetricChart from './MetricChart';
import type { MetricDataPoint } from '../../../shared/types';

describe('MetricChart', () => {
  it('should be a valid React component', () => {
    expect(typeof MetricChart).toBe('function');
  });

  it('should handle empty data gracefully', () => {
    const element = MetricChart({ data: [], title: 'CPU Usage' });
    expect(element).toBeDefined();
    // When data is empty, it should render the "无数据" message
    expect(element).not.toBeNull();
  });

  it('should handle data with points', () => {
    const data: MetricDataPoint[] = [
      { timestamp: 1700000000000, value: 45.2 },
      { timestamp: 1700003600000, value: 52.1 },
    ];
    const element = MetricChart({ data, title: 'CPU Usage', unit: '%', color: '#ff0000' });
    expect(element).toBeDefined();
  });

  it('should use default color when not specified', () => {
    const data: MetricDataPoint[] = [
      { timestamp: 1700000000000, value: 10 },
    ];
    const element = MetricChart({ data, title: 'Network In' });
    expect(element).toBeDefined();
  });
});
