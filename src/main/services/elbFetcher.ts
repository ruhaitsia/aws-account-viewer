import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
  DescribeTargetHealthCommand,
  DescribeListenersCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface LoadBalancer {
  name: string;
  type: 'application' | 'network' | 'classic';
  state: string;
  dnsName: string;
  vpcId: string;
  availabilityZones: string[];
  listenerSummary: string;
}

interface TargetGroupHealth {
  targetGroupName: string;
  healthyCount: number;
  unhealthyCount: number;
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

const TYPE_MAP: Record<string, LoadBalancer['type']> = {
  application: 'application',
  network: 'network',
};

/**
 * Transform raw AWS DescribeLoadBalancers response into LoadBalancer[].
 * Exported for testability.
 */
export function transformELBResponse(loadBalancers: any[]): LoadBalancer[] {
  return loadBalancers.map((lb) => ({
    name: lb.LoadBalancerName ?? '',
    type: TYPE_MAP[lb.Type?.toLowerCase() ?? ''] ?? 'application',
    state: lb.State?.Code ?? 'unknown',
    dnsName: lb.DNSName ?? '',
    vpcId: lb.VpcId ?? '',
    availabilityZones: (lb.AvailabilityZones ?? []).map((az: any) => az.ZoneName ?? ''),
    listenerSummary: '',
  }));
}

/**
 * Build a short listener summary string for a load balancer.
 */
async function getListenerSummary(
  client: ElasticLoadBalancingV2Client,
  loadBalancerArn: string,
): Promise<string> {
  try {
    const response = await client.send(
      new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn }),
    );
    const listeners = response.Listeners ?? [];
    if (listeners.length === 0) return '无监听器';
    const ports = listeners.map((l) => `${l.Protocol ?? ''}:${l.Port ?? ''}`);
    return ports.join(', ');
  } catch {
    return '';
  }
}

/**
 * Fetch all v2 load balancers (ALB/NLB) in the configured region.
 * Note: Classic ELBs use a different SDK client. TODO: add classic ELB support.
 */
export async function fetchLoadBalancers(
  clientConfig: ClientConfig,
): Promise<FetchResult<LoadBalancer[]>> {
  try {
    const elbv2 = new ElasticLoadBalancingV2Client({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const allLBs: any[] = [];
    let marker: string | undefined;

    do {
      const response = await elbv2.send(
        new DescribeLoadBalancersCommand({ Marker: marker }),
      );
      allLBs.push(...(response.LoadBalancers ?? []));
      marker = response.NextMarker;
    } while (marker);

    const loadBalancers = transformELBResponse(allLBs);

    // Enrich with listener summaries
    for (let i = 0; i < allLBs.length; i++) {
      const arn = allLBs[i].LoadBalancerArn;
      if (arn) {
        loadBalancers[i].listenerSummary = await getListenerSummary(elbv2, arn);
      }
    }

    return {
      data: loadBalancers,
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
        message: err.message ?? 'Failed to fetch load balancers',
      },
    };
  }
}

/**
 * Fetch target group health for a specific load balancer.
 */
export async function fetchELBTargetHealth(
  clientConfig: ClientConfig,
  loadBalancerArn: string,
): Promise<FetchResult<TargetGroupHealth[]>> {
  try {
    const elbv2 = new ElasticLoadBalancingV2Client({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const tgResponse = await elbv2.send(
      new DescribeTargetGroupsCommand({ LoadBalancerArn: loadBalancerArn }),
    );
    const targetGroups = tgResponse.TargetGroups ?? [];

    const healthResults: TargetGroupHealth[] = [];

    for (const tg of targetGroups) {
      const healthResponse = await elbv2.send(
        new DescribeTargetHealthCommand({ TargetGroupArn: tg.TargetGroupArn }),
      );
      const descriptions = healthResponse.TargetHealthDescriptions ?? [];
      let healthyCount = 0;
      let unhealthyCount = 0;
      for (const desc of descriptions) {
        if (desc.TargetHealth?.State === 'healthy') {
          healthyCount++;
        } else {
          unhealthyCount++;
        }
      }
      healthResults.push({
        targetGroupName: tg.TargetGroupName ?? '',
        healthyCount,
        unhealthyCount,
      });
    }

    return {
      data: healthResults,
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
        message: err.message ?? 'Failed to fetch target group health',
      },
    };
  }
}
