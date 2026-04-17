import { describe, it, expect } from 'vitest';
import { transformRDSResponse } from './rdsFetcher';

describe('transformRDSResponse', () => {
  it('should transform DB instances into RDSInstance list', () => {
    const dbInstances = [
      {
        DBInstanceIdentifier: 'my-db-1',
        Engine: 'mysql',
        EngineVersion: '8.0.35',
        DBInstanceClass: 'db.t3.medium',
        DBInstanceStatus: 'available',
        AllocatedStorage: 100,
        MultiAZ: true,
        Endpoint: { Address: 'my-db-1.abc123.us-east-1.rds.amazonaws.com' },
      },
    ];

    const result = transformRDSResponse(dbInstances);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      instanceId: 'my-db-1',
      engine: 'mysql',
      engineVersion: '8.0.35',
      instanceClass: 'db.t3.medium',
      status: 'available',
      storageSize: 100,
      multiAZ: true,
      endpoint: 'my-db-1.abc123.us-east-1.rds.amazonaws.com',
    });
  });

  it('should handle multiple instances', () => {
    const dbInstances = [
      { DBInstanceIdentifier: 'db-1', Engine: 'mysql', EngineVersion: '8.0', DBInstanceClass: 'db.t3.micro', DBInstanceStatus: 'available', AllocatedStorage: 20, MultiAZ: false, Endpoint: { Address: 'db-1.example.com' } },
      { DBInstanceIdentifier: 'db-2', Engine: 'postgres', EngineVersion: '15.4', DBInstanceClass: 'db.r6g.large', DBInstanceStatus: 'stopped', AllocatedStorage: 500, MultiAZ: true, Endpoint: { Address: 'db-2.example.com' } },
      { DBInstanceIdentifier: 'db-3', Engine: 'aurora-mysql', EngineVersion: '3.04', DBInstanceClass: 'db.r5.xlarge', DBInstanceStatus: 'creating', AllocatedStorage: 0, MultiAZ: false, Endpoint: null },
    ];

    const result = transformRDSResponse(dbInstances);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.instanceId)).toEqual(['db-1', 'db-2', 'db-3']);
    expect(result.map((r) => r.engine)).toEqual(['mysql', 'postgres', 'aurora-mysql']);
  });

  it('should handle empty input', () => {
    expect(transformRDSResponse([])).toEqual([]);
  });

  it('should handle missing optional fields gracefully', () => {
    const dbInstances = [
      { DBInstanceIdentifier: 'db-minimal' },
    ];

    const result = transformRDSResponse(dbInstances);
    expect(result[0]).toEqual({
      instanceId: 'db-minimal',
      engine: '',
      engineVersion: '',
      instanceClass: '',
      status: '',
      storageSize: 0,
      multiAZ: false,
      endpoint: '',
    });
  });

  it('should handle null Endpoint object', () => {
    const dbInstances = [
      { DBInstanceIdentifier: 'db-no-endpoint', Engine: 'mysql', EngineVersion: '8.0', DBInstanceClass: 'db.t3.micro', DBInstanceStatus: 'creating', AllocatedStorage: 20, MultiAZ: false, Endpoint: null },
    ];

    const result = transformRDSResponse(dbInstances);
    expect(result[0].endpoint).toBe('');
  });
});
