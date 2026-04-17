import {
  EC2Client,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand,
  DescribeRouteTablesCommand,
  DescribeInternetGatewaysCommand,
  DescribeNatGatewaysCommand,
} from '@aws-sdk/client-ec2';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface VPC {
  vpcId: string;
  name: string;
  cidrBlock: string;
  subnetCount: number;
  isDefault: boolean;
  state: string;
}

interface Subnet {
  subnetId: string;
  cidrBlock: string;
  availabilityZone: string;
  availableIpCount: number;
}

interface VPCDetail {
  subnets: Subnet[];
  routeTables: { id: string; name: string }[];
  internetGateways: { id: string; name: string }[];
  natGateways: { id: string; name: string; state: string }[];
}

interface SecurityGroup {
  groupId: string;
  groupName: string;
  description: string;
  vpcId: string;
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
 * Transform raw AWS DescribeVpcs response into VPC[].
 * subnetCounts is a map of vpcId → subnet count, pre-fetched by the caller.
 * Exported for testability.
 */
export function transformVPCResponse(
  vpcs: any[],
  subnetCounts: Record<string, number> = {},
): VPC[] {
  return vpcs.map((vpc) => {
    const nameTag = (vpc.Tags ?? []).find((t: any) => t.Key === 'Name');
    const vpcId = vpc.VpcId ?? '';
    return {
      vpcId,
      name: nameTag?.Value ?? '',
      cidrBlock: vpc.CidrBlock ?? '',
      subnetCount: subnetCounts[vpcId] ?? 0,
      isDefault: vpc.IsDefault ?? false,
      state: vpc.State ?? 'unknown',
    };
  });
}

/**
 * Transform raw AWS DescribeSecurityGroups response into SecurityGroup[].
 * Exported for testability.
 */
export function transformSecurityGroupResponse(groups: any[]): SecurityGroup[] {
  return groups.map((sg) => ({
    groupId: sg.GroupId ?? '',
    groupName: sg.GroupName ?? '',
    description: sg.Description ?? '',
    vpcId: sg.VpcId ?? '',
  }));
}

/**
 * Fetch all VPCs in the configured region, including subnet counts.
 */
export async function fetchVPCs(
  clientConfig: ClientConfig,
): Promise<FetchResult<VPC[]>> {
  try {
    const ec2 = new EC2Client({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    // Fetch all VPCs
    const vpcResponse = await ec2.send(new DescribeVpcsCommand({}));
    const rawVpcs = vpcResponse.Vpcs ?? [];

    // Fetch all subnets to count per VPC
    const subnetResponse = await ec2.send(new DescribeSubnetsCommand({}));
    const allSubnets = subnetResponse.Subnets ?? [];
    const subnetCounts: Record<string, number> = {};
    for (const subnet of allSubnets) {
      const vid = subnet.VpcId ?? '';
      subnetCounts[vid] = (subnetCounts[vid] ?? 0) + 1;
    }

    return {
      data: transformVPCResponse(rawVpcs, subnetCounts),
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
        message: err.message ?? 'Failed to fetch VPCs',
      },
    };
  }
}

/**
 * Fetch VPC detail: subnets, route tables, internet gateways, NAT gateways.
 */
export async function fetchVPCDetail(
  clientConfig: ClientConfig,
  vpcId: string,
): Promise<FetchResult<VPCDetail>> {
  try {
    const ec2 = new EC2Client({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const vpcFilter = [{ Name: 'vpc-id', Values: [vpcId] }];

    const [subnetRes, rtRes, igwRes, natRes] = await Promise.all([
      ec2.send(new DescribeSubnetsCommand({ Filters: vpcFilter })),
      ec2.send(new DescribeRouteTablesCommand({ Filters: vpcFilter })),
      ec2.send(
        new DescribeInternetGatewaysCommand({
          Filters: [{ Name: 'attachment.vpc-id', Values: [vpcId] }],
        }),
      ),
      ec2.send(
        new DescribeNatGatewaysCommand({
          Filter: [{ Name: 'vpc-id', Values: [vpcId] }],
        }),
      ),
    ]);

    const subnets: Subnet[] = (subnetRes.Subnets ?? []).map((s: any) => ({
      subnetId: s.SubnetId ?? '',
      cidrBlock: s.CidrBlock ?? '',
      availabilityZone: s.AvailabilityZone ?? '',
      availableIpCount: s.AvailableIpAddressCount ?? 0,
    }));

    const routeTables = (rtRes.RouteTables ?? []).map((rt: any) => {
      const nameTag = (rt.Tags ?? []).find((t: any) => t.Key === 'Name');
      return { id: rt.RouteTableId ?? '', name: nameTag?.Value ?? '' };
    });

    const internetGateways = (igwRes.InternetGateways ?? []).map((igw: any) => {
      const nameTag = (igw.Tags ?? []).find((t: any) => t.Key === 'Name');
      return { id: igw.InternetGatewayId ?? '', name: nameTag?.Value ?? '' };
    });

    const natGateways = (natRes.NatGateways ?? []).map((nat: any) => {
      const nameTag = (nat.Tags ?? []).find((t: any) => t.Key === 'Name');
      return {
        id: nat.NatGatewayId ?? '',
        name: nameTag?.Value ?? '',
        state: nat.State ?? 'unknown',
      };
    });

    return {
      data: { subnets, routeTables, internetGateways, natGateways },
      timestamp: Date.now(),
      region: clientConfig.region,
    };
  } catch (err: any) {
    return {
      data: { subnets: [], routeTables: [], internetGateways: [], natGateways: [] },
      timestamp: Date.now(),
      region: clientConfig.region,
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch VPC detail',
      },
    };
  }
}

/**
 * Fetch all security groups in the configured region.
 */
export async function fetchSecurityGroups(
  clientConfig: ClientConfig,
): Promise<FetchResult<SecurityGroup[]>> {
  try {
    const ec2 = new EC2Client({
      credentials: clientConfig.credentials,
      region: clientConfig.region,
    });

    const response = await ec2.send(new DescribeSecurityGroupsCommand({}));
    return {
      data: transformSecurityGroupResponse(response.SecurityGroups ?? []),
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
        message: err.message ?? 'Failed to fetch security groups',
      },
    };
  }
}
