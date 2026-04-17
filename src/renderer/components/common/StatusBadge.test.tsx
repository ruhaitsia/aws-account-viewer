import { describe, it, expect } from 'vitest';
import StatusBadge from './StatusBadge';
import type { HealthStatus } from '../../../shared/types';
import { HEALTH_STATUS_COLOR } from '../../types';

describe('StatusBadge', () => {
  it('should be a valid React component', () => {
    expect(typeof StatusBadge).toBe('function');
  });

  it.each<HealthStatus>(['healthy', 'warning', 'error'])(
    'should render with status "%s"',
    (status) => {
      const element = StatusBadge({ status });
      expect(element).toBeDefined();
    }
  );

  it('should render with optional text', () => {
    const element = StatusBadge({ status: 'healthy', text: '正常' });
    expect(element).toBeDefined();
  });

  it('should map health statuses to correct colors', () => {
    expect(HEALTH_STATUS_COLOR.healthy).toBe('#52c41a');
    expect(HEALTH_STATUS_COLOR.warning).toBe('#faad14');
    expect(HEALTH_STATUS_COLOR.error).toBe('#f5222d');
  });
});
