import { fetchEC2Instances } from './ec2Fetcher';
import { fetchS3Buckets } from './s3Fetcher';
import { fetchRDSInstances } from './rdsFetcher';
import { fetchLambdaFunctions } from './lambdaFetcher';
import { fetchLoadBalancers } from './elbFetcher';
import { fetchVPCs } from './vpcFetcher';
import { fetchContainerData } from './containerFetcher';
import { fetchDynamoDBTables } from './dynamodbFetcher';
import { fetchCloudFrontDistributions } from './cloudfrontFetcher';
import { fetchMessagingData } from './messagingFetcher';
import { fetchHostedZones } from './route53Fetcher';

type HealthStatus = 'healthy' | 'warning' | 'error';

interface ServiceSummary {
  serviceName: string;
  displayName: string;
  resourceCount: number;
  healthStatus: HealthStatus;
  icon: string;
  isGlobal: boolean;
}

interface ClientConfig {
  credentials: { accessKeyId: string; secretAccessKey: string };
  region: string;
}

export function determineHealthStatus(
  _serviceName: string,
  data: { resourceCount: number; errorCount?: number; warningCount?: number },
): HealthStatus {
  if (data.resourceCount === 0) return 'healthy';
  if (data.errorCount && data.errorCount > 0) return 'error';
  if (data.warningCount && data.warningCount > 0) return 'warning';
  return 'healthy';
}

const SERVICE_DEFINITIONS: Array<{
  serviceName: string;
  displayName: string;
  icon: string;
  isGlobal: boolean;
}> = [
  { serviceName: 'ec2', displayName: 'Amazon EC2', icon: 'cloud-server', isGlobal: false },
  { serviceName: 's3', displayName: 'Amazon S3', icon: 'database', isGlobal: true },
  { serviceName: 'rds', displayName: 'Amazon RDS', icon: 'hdd', isGlobal: false },
  { serviceName: 'lambda', displayName: 'AWS Lambda', icon: 'function', isGlobal: false },
  { serviceName: 'elb', displayName: 'Elastic Load Balancing', icon: 'gateway', isGlobal: false },
  { serviceName: 'vpc', displayName: 'Amazon VPC', icon: 'apartment', isGlobal: false },
  { serviceName: 'ecs', displayName: 'Amazon ECS', icon: 'container', isGlobal: false },
  { serviceName: 'eks', displayName: 'Amazon EKS', icon: 'cluster', isGlobal: false },
  { serviceName: 'dynamodb', displayName: 'Amazon DynamoDB', icon: 'table', isGlobal: false },
  { serviceName: 'cloudfront', displayName: 'Amazon CloudFront', icon: 'global', isGlobal: true },
  { serviceName: 'sns', displayName: 'Amazon SNS', icon: 'notification', isGlobal: false },
  { serviceName: 'sqs', displayName: 'Amazon SQS', icon: 'message', isGlobal: false },
  { serviceName: 'route53', displayName: 'Amazon Route 53', icon: 'compass', isGlobal: true },
];


async function fetchServiceCount(
  serviceName: string,
  clientConfig: ClientConfig,
): Promise<{ count: number; errorCount?: number; warningCount?: number }> {
  try {
    switch (serviceName) {
      case 'ec2': {
        const r = await fetchEC2Instances(clientConfig);
        const instances = r.data ?? [];
        const stopped = instances.filter((i: any) => i.state === 'stopped' || i.state === 'terminated').length;
        return { count: instances.length, warningCount: stopped > 0 ? stopped : undefined };
      }
      case 's3': {
        const r = await fetchS3Buckets(clientConfig);
        return { count: (r.data ?? []).length };
      }
      case 'rds': {
        const r = await fetchRDSInstances(clientConfig);
        return { count: (r.data ?? []).length };
      }
      case 'lambda': {
        const r = await fetchLambdaFunctions(clientConfig);
        return { count: (r.data ?? []).length };
      }
      case 'elb': {
        const r = await fetchLoadBalancers(clientConfig);
        return { count: (r.data ?? []).length };
      }
      case 'vpc': {
        const r = await fetchVPCs(clientConfig);
        return { count: (r.data ?? []).length };
      }
      case 'ecs': {
        const r = await fetchContainerData(clientConfig);
        return { count: (r.data?.ecsClusters ?? []).length };
      }
      case 'eks': {
        const r = await fetchContainerData(clientConfig);
        return { count: (r.data?.eksClusters ?? []).length };
      }
      case 'dynamodb': {
        const r = await fetchDynamoDBTables(clientConfig);
        return { count: (r.data ?? []).length };
      }
      case 'cloudfront': {
        const r = await fetchCloudFrontDistributions(clientConfig);
        return { count: (r.data ?? []).length };
      }
      case 'sns': {
        const r = await fetchMessagingData(clientConfig);
        return { count: (r.data?.topics ?? []).length };
      }
      case 'sqs': {
        const r = await fetchMessagingData(clientConfig);
        return { count: (r.data?.queues ?? []).length };
      }
      case 'route53': {
        const r = await fetchHostedZones(clientConfig);
        return { count: (r.data ?? []).length };
      }
      default:
        return { count: 0 };
    }
  } catch {
    return { count: 0 };
  }
}

/**
 * Fetch dashboard data by calling real AWS API fetchers in parallel.
 */
export async function fetchDashboardData(
  clientConfig?: unknown,
): Promise<ServiceSummary[]> {
  const config = clientConfig as ClientConfig;

  const results = await Promise.all(
    SERVICE_DEFINITIONS.map(async (def) => {
      const data = await fetchServiceCount(def.serviceName, config);
      return {
        serviceName: def.serviceName,
        displayName: def.displayName,
        resourceCount: data.count,
        healthStatus: determineHealthStatus(def.serviceName, {
          resourceCount: data.count,
          errorCount: data.errorCount,
          warningCount: data.warningCount,
        }),
        icon: def.icon,
        isGlobal: def.isGlobal,
      };
    }),
  );

  return results;
}