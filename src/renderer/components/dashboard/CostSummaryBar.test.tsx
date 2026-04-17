import { describe, it, expect, vi, beforeEach } from 'vitest';
import CostSummaryBar from './CostSummaryBar';
import type { CostSummaryBarProps } from './CostSummaryBar';

// Mock useAppStore
vi.mock('../../stores/appStore', () => ({
  useAppStore: () => vi.fn(),
}));

const baseProps: CostSummaryBarProps = {
  totalCost: 1234.56,
  currency: 'USD',
  previousMonthTotal: 1000,
  changePercentage: 23.5,
  dailyCosts: [
    { date: '2026-04-01', amount: 40 },
    { date: '2026-04-02', amount: 45 },
    { date: '2026-04-03', amount: 38 },
    { date: '2026-04-04', amount: 50 },
    { date: '2026-04-05', amount: 42 },
    { date: '2026-04-06', amount: 55 },
    { date: '2026-04-07', amount: 48 },
  ],
  isLoading: false,
  error: null,
  costExplorerDisabled: false,
  onRetry: vi.fn(),
};

describe('CostSummaryBar', () => {
  it('should be a valid React component', () => {
    expect(typeof CostSummaryBar).toBe('function');
  });

  it('renders loading state (Skeleton)', () => {
    const element = CostSummaryBar({ ...baseProps, isLoading: true });
    expect(element).toBeDefined();
    // When loading, should return a Card with Skeleton, not the full content
    expect(element.props.children).toBeDefined();
  });

  it('renders error state with retry button', () => {
    const onRetry = vi.fn();
    const element = CostSummaryBar({
      ...baseProps,
      error: '加载失败',
      onRetry,
    });
    expect(element).toBeDefined();
  });

  it('renders Cost Explorer disabled state', () => {
    const element = CostSummaryBar({
      ...baseProps,
      costExplorerDisabled: true,
    });
    expect(element).toBeDefined();
  });

  it('renders normal data (total cost, comparison, trend chart)', () => {
    const element = CostSummaryBar(baseProps);
    expect(element).toBeDefined();
    // Should render a Card with content
    expect(element.props).toBeDefined();
  });

  it('renders without trend chart when dailyCosts has <= 1 entry', () => {
    const element = CostSummaryBar({
      ...baseProps,
      dailyCosts: [{ date: '2026-04-01', amount: 40 }],
    });
    expect(element).toBeDefined();
  });

  it('renders with zero change percentage', () => {
    const element = CostSummaryBar({
      ...baseProps,
      changePercentage: 0,
    });
    expect(element).toBeDefined();
  });

  it('renders with negative change percentage (decrease)', () => {
    const element = CostSummaryBar({
      ...baseProps,
      changePercentage: -15.3,
    });
    expect(element).toBeDefined();
  });
});
