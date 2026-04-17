import {
  Route53Client,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
} from '@aws-sdk/client-route-53';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface HostedZone {
  domainName: string;
  hostedZoneId: string;
  type: 'public' | 'private';
  recordSetCount: number;
  description: string;
}

interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  value: string;
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
 * Transform raw AWS ListHostedZones items into HostedZone[].
 * Exported for testability.
 */
export function transformHostedZonesResponse(zones: any[]): HostedZone[] {
  return (zones ?? []).map((zone: any) => {
    const rawId = zone.Id ?? '';
    const hostedZoneId = rawId.replace('/hostedzone/', '');
    const isPrivate = zone.Config?.PrivateZone === true;

    return {
      domainName: zone.Name ?? '',
      hostedZoneId,
      type: isPrivate ? 'private' : 'public',
      recordSetCount: zone.ResourceRecordSetCount ?? 0,
      description: zone.Config?.Comment ?? '',
    };
  });
}

/**
 * Fetch all Route 53 hosted zones.
 * Route 53 is a global service — always uses us-east-1.
 */
export async function fetchHostedZones(
  clientConfig: ClientConfig,
): Promise<FetchResult<HostedZone[]>> {
  try {
    const r53 = new Route53Client({
      credentials: clientConfig.credentials,
      region: 'us-east-1',
    });

    const allZones: any[] = [];
    let marker: string | undefined;

    do {
      const response = await r53.send(
        new ListHostedZonesCommand({ Marker: marker }),
      );
      const zones = response.HostedZones ?? [];
      allZones.push(...zones);
      marker = response.IsTruncated ? response.NextMarker : undefined;
    } while (marker);

    return {
      data: transformHostedZonesResponse(allZones),
      timestamp: Date.now(),
      region: 'us-east-1',
    };
  } catch (err: any) {
    return {
      data: [],
      timestamp: Date.now(),
      region: 'us-east-1',
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch Route 53 hosted zones',
      },
    };
  }
}

/**
 * Fetch DNS records for a specific hosted zone.
 * Route 53 is a global service — always uses us-east-1.
 */
export async function fetchDNSRecords(
  clientConfig: ClientConfig,
  hostedZoneId: string,
): Promise<FetchResult<DNSRecord[]>> {
  try {
    const r53 = new Route53Client({
      credentials: clientConfig.credentials,
      region: 'us-east-1',
    });

    const allRecords: any[] = [];
    let startRecordName: string | undefined;
    let startRecordType: string | undefined;

    do {
      const response = await r53.send(
        new ListResourceRecordSetsCommand({
          HostedZoneId: hostedZoneId,
          StartRecordName: startRecordName,
          StartRecordType: startRecordType as any,
        }),
      );
      const records = response.ResourceRecordSets ?? [];
      allRecords.push(...records);
      if (response.IsTruncated) {
        startRecordName = response.NextRecordName;
        startRecordType = response.NextRecordType;
      } else {
        startRecordName = undefined;
      }
    } while (startRecordName);

    const dnsRecords: DNSRecord[] = allRecords.map((r: any) => ({
      name: r.Name ?? '',
      type: r.Type ?? '',
      ttl: r.TTL ?? 0,
      value: (r.ResourceRecords ?? [])
        .map((rr: any) => rr.Value ?? '')
        .filter(Boolean)
        .join(', ') || (r.AliasTarget?.DNSName ?? ''),
    }));

    return {
      data: dnsRecords,
      timestamp: Date.now(),
      region: 'us-east-1',
    };
  } catch (err: any) {
    return {
      data: [],
      timestamp: Date.now(),
      region: 'us-east-1',
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch DNS records',
      },
    };
  }
}
