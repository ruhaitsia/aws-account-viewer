import { describe, it, expect } from 'vitest';
import { transformLambdaResponse } from './lambdaFetcher';

describe('transformLambdaResponse', () => {
  it('should transform Lambda functions into LambdaFunction list', () => {
    const functions = [
      {
        FunctionName: 'my-function',
        Runtime: 'nodejs18.x',
        MemorySize: 256,
        Timeout: 30,
        CodeSize: 1048576,
        LastModified: '2024-01-15T10:30:00.000+0000',
        Description: 'A test function',
      },
    ];

    const result = transformLambdaResponse(functions);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      functionName: 'my-function',
      runtime: 'nodejs18.x',
      memorySize: 256,
      timeout: 30,
      codeSize: 1048576,
      lastModified: '2024-01-15T10:30:00.000+0000',
      description: 'A test function',
    });
  });

  it('should handle multiple functions', () => {
    const functions = [
      { FunctionName: 'fn-1', Runtime: 'python3.12', MemorySize: 128, Timeout: 10, CodeSize: 5000, LastModified: '2024-01-01', Description: 'First' },
      { FunctionName: 'fn-2', Runtime: 'java21', MemorySize: 512, Timeout: 60, CodeSize: 20000000, LastModified: '2024-02-01', Description: 'Second' },
      { FunctionName: 'fn-3', Runtime: 'nodejs20.x', MemorySize: 1024, Timeout: 900, CodeSize: 100000, LastModified: '2024-03-01', Description: '' },
    ];

    const result = transformLambdaResponse(functions);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.functionName)).toEqual(['fn-1', 'fn-2', 'fn-3']);
  });

  it('should handle empty functions array', () => {
    expect(transformLambdaResponse([])).toEqual([]);
  });

  it('should handle missing optional fields with defaults', () => {
    const functions = [
      { FunctionName: 'minimal-fn' },
    ];

    const result = transformLambdaResponse(functions);
    expect(result[0]).toEqual({
      functionName: 'minimal-fn',
      runtime: 'unknown',
      memorySize: 0,
      timeout: 0,
      codeSize: 0,
      lastModified: '',
      description: '',
    });
  });

  it('should handle completely empty function objects', () => {
    const functions = [{}];

    const result = transformLambdaResponse(functions);
    expect(result[0]).toEqual({
      functionName: '',
      runtime: 'unknown',
      memorySize: 0,
      timeout: 0,
      codeSize: 0,
      lastModified: '',
      description: '',
    });
  });

  it('should preserve output length equal to input length', () => {
    const functions = Array.from({ length: 50 }, (_, i) => ({
      FunctionName: `fn-${i}`,
      Runtime: 'python3.12',
      MemorySize: 128,
      Timeout: 30,
      CodeSize: 1000,
      LastModified: '2024-01-01',
      Description: `Function ${i}`,
    }));

    const result = transformLambdaResponse(functions);
    expect(result).toHaveLength(50);
  });
});
