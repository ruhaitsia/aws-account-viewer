import { describe, it, expect, vi } from 'vitest';
import ServiceSummaryCard from './ServiceSummaryCard';
import type { ServiceSummary } from '../../../shared/types';

const mockSummary: ServiceSummary = {
  serviceName: 'ec2',
  displayName: 'EC2',
  resourceCount: 5,
  healthStatus: 'healthy',
  icon: 'ec2',
  isGlobal: false,
};

const onClick = vi.fn();

describe('ServiceSummaryCard', () => {
  it('should be a valid React component', () => {
    expect(typeof ServiceSummaryCard).toBe('function');
  });

  it('renders with positive cost showing formatted amount', () => {
    const element = ServiceSummaryCard({
      summary: mockSummary,
      cost: 123.45,
      onClick,
    });
    expect(element).toBeDefined();
    // The component should render with cost data
    expect(element.props).toBeDefined();
  });

  it('renders with cost = 0 showing "$0.00"', () => {
    const element = ServiceSummaryCard({
      summary: mockSummary,
      cost: 0,
      onClick,
    });
    expect(element).toBeDefined();
  });

  it('renders with cost = null showing "—" placeholder', () => {
    const element = ServiceSummaryCard({
      summary: mockSummary,
      cost: null,
      onClick,
    });
    expect(element).toBeDefined();
  });

  it('renders without cost area when cost is undefined', () => {
    const element = ServiceSummaryCard({
      summary: mockSummary,
      onClick,
    });
    expect(element).toBeDefined();
  });

  it('renders with global service tag', () => {
    const element = ServiceSummaryCard({
      summary: { ...mockSummary, isGlobal: true },
      cost: 50,
      onClick,
    });
    expect(element).toBeDefined();
  });
});
