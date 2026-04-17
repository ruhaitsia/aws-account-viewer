import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
} from '@aws-sdk/client-ecs';
import {
  EKSClient,
  ListClustersCommand as EKSListClustersCommand,
  DescribeClusterCommand,
} from '@aws-sdk/client-eks';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface ECSCluster {
  clusterName: string;
  status: string;
  runningServicesCount: number;
  runningTasksCount: number;
  registeredContainerInstancesCount: number;
}

interface ECSService {
  serviceName: string;
  desiredCount: number;
  runningCount: number;
  deploymentStatus: string;
}

interface EKSCluster {
  clusterName: string;
  kubernetesVersion: string;
  status: string;
  endpoint: string;
  platformVersion: string;
}

interface ContainerData {
  ecsClusters: ECSCluster[];
  eksClusters: EKSCluster[];
}

interface FetchResult<T> {
  data: T;
  timestamp: number;
  region: string;
  error?: { code: string; message: string };
}

interface ClientConfig {
  credentials: { accessKeyId: string; secretAccessKey: string };
  region: string;
}

/**
 * Transform raw AWS DescribeClusters response into ECSCluster[].
 */
export function transformECSClustersResponse(clusters: any[]): ECSCluster[] {
  return clusters.map((c) => ({
    clusterName: c.clusterName ?? '',
    status: c.status ?? 'UNKNOWN',
    runningServicesCount: c.activeServicesCount ?? 0,
    runningTasksCount: c.runningTasksCount ?? 0,
    registeredContainerInstancesCount: c.registeredContainerInstancesCount ?? 0,
  }));
}

/**
 * Transform raw AWS DescribeCluster responses into EKSCluster[].
 */
export function transformEKSClustersResponse(clusters: any[]): EKSCluster[] {
  return clusters.map((c) => ({
    clusterName: c.name ?? '',
    kubernetesVersion: c.version ?? '',
    status: c.status ?? 'UNKNOWN',
    endpoint: c.endpoint ?? '',
    platformVersion: c.platformVersion ?? '',
  }));
}

/**
 * Transform raw AWS DescribeServices response into ECSService[].
 */
export function transformECSServicesResponse(services: any[]): ECSService[] {
  return services.map((s) => {
    const primaryDeployment = (s.deployments ?? []).find((d: any) => d.status === 'PRIMARY');
    return {
      serviceName: s.serviceName ?? '',
      desiredCount: s.desiredCount ?? 0,
      runningCount: s.runningCount ?? 0,
      deploymentStatus: primaryDeployment?.rolloutState ?? primaryDeployment?.status ?? 'UNKNOWN',
    };
  });
}

/**
 * Fetch ECS and EKS cluster data for the current region.
 */
export async function fetchContainerData(
  clientConfig: ClientConfig,
): Promise<FetchResult<ContainerData>> {
  try {
    const ecs = new ECSClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });
    const eks = new EKSClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    // Fetch ECS clusters
    const ecsListResp = await ecs.send(new ListClustersCommand({}));
    const clusterArns = ecsListResp.clusterArns ?? [];
    let ecsClusters: ECSCluster[] = [];
    if (clusterArns.length > 0) {
      const descResp = await ecs.send(
        new DescribeClustersCommand({ clusters: clusterArns }),
      );
      ecsClusters = transformECSClustersResponse(descResp.clusters ?? []);
    }

    // Fetch EKS clusters
    const eksListResp = await eks.send(new EKSListClustersCommand({}));
    const eksClusterNames = eksListResp.clusters ?? [];
    const eksDescriptions = await Promise.all(
      eksClusterNames.map(async (name) => {
        const resp = await eks.send(new DescribeClusterCommand({ name }));
        return resp.cluster;
      }),
    );
    const eksClusters = transformEKSClustersResponse(
      eksDescriptions.filter(Boolean),
    );

    return {
      data: { ecsClusters, eksClusters },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { ecsClusters: [], eksClusters: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch container data',
      },
    };
  }
}

/**
 * Fetch services for a specific ECS cluster.
 */
export async function fetchECSServices(
  clientConfig: ClientConfig,
  clusterArn: string,
): Promise<FetchResult<ECSService[]>> {
  try {
    const ecs = new ECSClient({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const listResp = await ecs.send(
      new ListServicesCommand({ cluster: clusterArn }),
    );
    const serviceArns = listResp.serviceArns ?? [];
    let services: ECSService[] = [];
    if (serviceArns.length > 0) {
      const descResp = await ecs.send(
        new DescribeServicesCommand({ cluster: clusterArn, services: serviceArns }),
      );
      services = transformECSServicesResponse(descResp.services ?? []);
    }

    return {
      data: services,
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: [],
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch ECS services',
      },
    };
  }
}
