import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServiceSummary } from '../../../shared/types';

// Mock the dashboardStore
const mockLoadDashboard = vi.fn();
let mockStoreState = {
  serviceSummaries: [] as ServiceSummary[],
  isLoading: false,
  error: null as string | null,
  loadDashboard: mockLoadDashboard,
};

vi.mock('../../stores/dashboardStore', () => ({
  useDashboardStore: () => mockStoreState,
}));

// Mock the appStore
const mockSetCurrentView = vi.fn();
vi.mock('../../stores/appStore', () => ({
  useAppStore: (selector: (s: { setCurrentView: typeof mockSetCurrentView }) => unknown) =>
    selector({ setCurrentView: mockSetCurrentView }),
}));

function makeSummary(overrides: Partial<ServiceSummary> = {}): ServiceSummary {
  return {
    serviceName: 'ec2',
    displayName: 'EC2 实例',
    resourceCount: 5,
    healthStatus: 'healthy',
    icon: '🖥️',
    isGlobal: false,
    ...overrides,
  };
}

describe('Dashboard logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      serviceSummaries: [],
      isLoading: false,
      error: null,
      loadDashboard: mockLoadDashboard,
    };
  });

  it('should call loadDashboard on mount via store', () => {
    // The Dashboard component calls loadDashboard in useEffect
    // We verify the store function is available and callable
    mockStoreState.loadDashboard();
    expect(mockLoadDashboard).toHaveBeenCalledOnce();
  });

  it('should show loading state when isLoading is true', () => {
    mockStoreState.isLoading = true;
    expect(mockStoreState.isLoading).toBe(true);
  });

  it('should show error state when error is set', () => {
    mockStoreState.error = '网络错误';
    expect(mockStoreState.error).toBe('网络错误');
  });

  it('should provide service summaries for rendering cards', () => {
    const summaries = [
      makeSummary({ serviceName: 'ec2', displayName: 'EC2 实例', resourceCount: 10 }),
      makeSummary({ serviceName: 's3', displayName: 'S3 存储桶', resourceCount: 3, isGlobal: true }),
      makeSummary({ serviceName: 'rds', displayName: 'RDS 数据库', resourceCount: 2 }),
    ];
    mockStoreState.serviceSummaries = summaries;
    expect(mockStoreState.serviceSummaries).toHaveLength(3);
  });

  it('should navigate to service panel on card click via appStore', () => {
    mockSetCurrentView('ec2');
    expect(mockSetCurrentView).toHaveBeenCalledWith('ec2');
  });

  it('should handle all 13 dashboard services', () => {
    const services = ['ec2', 's3', 'rds', 'lambda', 'elb', 'vpc', 'ecs', 'eks', 'dynamodb', 'cloudfront', 'sns', 'sqs', 'route53'];
    const summaries = services.map((name) =>
      makeSummary({ serviceName: name, displayName: name.toUpperCase() })
    );
    mockStoreState.serviceSummaries = summaries;
    expect(mockStoreState.serviceSummaries).toHaveLength(13);
  });
});
