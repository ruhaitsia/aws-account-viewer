import { describe, it, expect } from 'vitest';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should be a valid React component', () => {
    expect(typeof LoadingSpinner).toBe('function');
  });

  it('should render with default tip', () => {
    const element = LoadingSpinner({});
    expect(element).toBeDefined();
  });

  it('should accept custom tip', () => {
    const element = LoadingSpinner({ tip: '正在加载数据...' });
    expect(element).toBeDefined();
  });
});
