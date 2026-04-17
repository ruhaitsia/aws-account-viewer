import { describe, it, expect } from 'vitest';
import {
  transformECSClustersResponse,
  transformEKSClustersResponse,
  transformECSServicesResponse,
} from './containerFetcher';

describe('transformECSClustersResponse', () => {
  it('should transform raw ECS clusters', () => {
    const raw = [
      {
        clusterName: 'my-cluster',
        status: 'ACTIVE',
        activeServicesCount: 3,
        runningTasksCount: 5,
        registeredContainerInstancesCount: 2,
      },
    ];
    const result = transformECSClustersResponse(raw);
    expect(result).toEqual([
      {
        clusterName: 'my-cluster',
        status: 'ACTIVE',
        runningServicesCount: 3,
        runningTasksCount: 5,
        registeredContainerInstancesCount: 2,
      },
    ]);
  });

  it('should handle missing fields gracefully', () => {
    const raw = [{}];
    const result = transformECSClustersResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      clusterName: '',
      status: 'UNKNOWN',
      runningServicesCount: 0,
      runningTasksCount: 0,
      registeredContainerInstancesCount: 0,
    });
  });

  it('should handle empty list', () => {
    expect(transformECSClustersResponse([])).toEqual([]);
  });

  it('should transform multiple clusters', () => {
    const raw = [
      { clusterName: 'c1', status: 'ACTIVE', activeServicesCount: 1, runningTasksCount: 2, registeredContainerInstancesCount: 1 },
      { clusterName: 'c2', status: 'INACTIVE', activeServicesCount: 0, runningTasksCount: 0, registeredContainerInstancesCount: 0 },
    ];
    const result = transformECSClustersResponse(raw);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.clusterName)).toEqual(['c1', 'c2']);
  });
});

describe('transformEKSClustersResponse', () => {
  it('should transform raw EKS clusters', () => {
    const raw = [
      {
        name: 'eks-prod',
        version: '1.28',
        status: 'ACTIVE',
        endpoint: 'https://eks.example.com',
        platformVersion: 'eks.5',
      },
    ];
    const result = transformEKSClustersResponse(raw);
    expect(result).toEqual([
      {
        clusterName: 'eks-prod',
        kubernetesVersion: '1.28',
        status: 'ACTIVE',
        endpoint: 'https://eks.example.com',
        platformVersion: 'eks.5',
      },
    ]);
  });

  it('should handle missing fields gracefully', () => {
    const raw = [{}];
    const result = transformEKSClustersResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      clusterName: '',
      kubernetesVersion: '',
      status: 'UNKNOWN',
      endpoint: '',
      platformVersion: '',
    });
  });

  it('should handle empty list', () => {
    expect(transformEKSClustersResponse([])).toEqual([]);
  });

  it('should transform multiple EKS clusters', () => {
    const raw = [
      { name: 'eks-1', version: '1.27', status: 'ACTIVE', endpoint: 'https://a.com', platformVersion: 'eks.4' },
      { name: 'eks-2', version: '1.28', status: 'CREATING', endpoint: '', platformVersion: '' },
    ];
    const result = transformEKSClustersResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].clusterName).toBe('eks-1');
    expect(result[1].status).toBe('CREATING');
  });
});

describe('transformECSServicesResponse', () => {
  it('should transform raw ECS services with PRIMARY deployment', () => {
    const raw = [
      {
        serviceName: 'web-service',
        desiredCount: 3,
        runningCount: 3,
        deployments: [
          { status: 'PRIMARY', rolloutState: 'COMPLETED' },
        ],
      },
    ];
    const result = transformECSServicesResponse(raw);
    expect(result).toEqual([
      {
        serviceName: 'web-service',
        desiredCount: 3,
        runningCount: 3,
        deploymentStatus: 'COMPLETED',
      },
    ]);
  });

  it('should fall back to deployment status when rolloutState is missing', () => {
    const raw = [
      {
        serviceName: 'api-service',
        desiredCount: 2,
        runningCount: 1,
        deployments: [
          { status: 'PRIMARY' },
        ],
      },
    ];
    const result = transformECSServicesResponse(raw);
    expect(result[0].deploymentStatus).toBe('PRIMARY');
  });

  it('should return UNKNOWN when no deployments exist', () => {
    const raw = [
      {
        serviceName: 'orphan-service',
        desiredCount: 1,
        runningCount: 0,
        deployments: [],
      },
    ];
    const result = transformECSServicesResponse(raw);
    expect(result[0].deploymentStatus).toBe('UNKNOWN');
  });

  it('should handle missing fields gracefully', () => {
    const raw = [{}];
    const result = transformECSServicesResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      serviceName: '',
      desiredCount: 0,
      runningCount: 0,
      deploymentStatus: 'UNKNOWN',
    });
  });

  it('should handle empty list', () => {
    expect(transformECSServicesResponse([])).toEqual([]);
  });

  it('should pick PRIMARY deployment from multiple deployments', () => {
    const raw = [
      {
        serviceName: 'svc',
        desiredCount: 2,
        runningCount: 2,
        deployments: [
          { status: 'ACTIVE', rolloutState: 'IN_PROGRESS' },
          { status: 'PRIMARY', rolloutState: 'COMPLETED' },
        ],
      },
    ];
    const result = transformECSServicesResponse(raw);
    expect(result[0].deploymentStatus).toBe('COMPLETED');
  });
});
