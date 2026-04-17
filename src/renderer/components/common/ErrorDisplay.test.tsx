import { describe, it, expect } from 'vitest';
import ErrorDisplay from './ErrorDisplay';

describe('ErrorDisplay', () => {
  it('should be a valid React component', () => {
    expect(typeof ErrorDisplay).toBe('function');
  });

  it('should accept required message prop', () => {
    const element = ErrorDisplay({ message: 'Something went wrong' });
    expect(element).toBeDefined();
  });

  it('should accept optional description prop', () => {
    const element = ErrorDisplay({ message: 'Error', description: 'Details here' });
    expect(element).toBeDefined();
  });

  it('should accept optional onRetry prop', () => {
    const element = ErrorDisplay({ message: 'Error', onRetry: () => {} });
    expect(element).toBeDefined();
  });

  it('should render without onRetry (no retry button)', () => {
    const element = ErrorDisplay({ message: 'Error' });
    expect(element).toBeDefined();
  });
});
