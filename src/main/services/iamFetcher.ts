import {
  IAMClient,
  GetAccountSummaryCommand,
  ListUsersCommand,
  ListRolesCommand,
  ListMFADevicesCommand,
  ListAccessKeysCommand,
} from '@aws-sdk/client-iam';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface IAMSummary {
  userCount: number;
  roleCount: number;
  policyCount: number;
  groupCount: number;
}

interface IAMUser {
  userName: string;
  createDate: string;
  lastActivity?: string;
  mfaEnabled: boolean;
  accessKeyCount: number;
}

interface IAMRole {
  roleName: string;
  createDate: string;
  description: string;
  trustedEntityType: string;
}

interface IAMData {
  summary: IAMSummary;
  users: IAMUser[];
  roles: IAMRole[];
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
 * Transform raw AWS ListUsers response into IAMUser[].
 * Does NOT include MFA/access-key enrichment — that is done separately.
 */
export function transformIAMUsersResponse(users: any[]): IAMUser[] {
  return users.map((u) => ({
    userName: u.UserName ?? '',
    createDate: u.CreateDate ? new Date(u.CreateDate).toISOString() : '',
    lastActivity: u.PasswordLastUsed
      ? new Date(u.PasswordLastUsed).toISOString()
      : undefined,
    mfaEnabled: false,
    accessKeyCount: 0,
  }));
}

/**
 * Transform raw AWS ListRoles response into IAMRole[].
 */
export function transformIAMRolesResponse(roles: any[]): IAMRole[] {
  return roles.map((r) => ({
    roleName: r.RoleName ?? '',
    createDate: r.CreateDate ? new Date(r.CreateDate).toISOString() : '',
    description: r.Description ?? '',
    trustedEntityType: parseTrustedEntityType(r.AssumeRolePolicyDocument),
  }));
}

/**
 * Parse the AssumeRolePolicyDocument to determine the trusted entity type.
 */
function parseTrustedEntityType(policyDoc: string | undefined): string {
  if (!policyDoc) return 'Unknown';
  try {
    const doc = JSON.parse(decodeURIComponent(policyDoc));
    const statements = doc.Statement ?? [];
    for (const stmt of statements) {
      const principal = stmt.Principal ?? {};
      if (principal.Service) return 'AWS Service';
      if (principal.AWS) return 'AWS Account';
      if (principal.Federated) return 'Federated';
    }
    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Fetch IAM data: account summary, users (with MFA + access key enrichment), and roles.
 * IAM is a global service — always uses us-east-1.
 */
export async function fetchIAMData(
  clientConfig: ClientConfig,
): Promise<FetchResult<IAMData>> {
  try {
    const iam = new IAMClient({
      credentials: clientConfig.credentials,
      region: 'us-east-1',
    });

    // 1. Get account summary for counts
    const summaryResponse = await iam.send(new GetAccountSummaryCommand({}));
    const summaryMap = summaryResponse.SummaryMap ?? {};
    const summary: IAMSummary = {
      userCount: summaryMap.Users ?? 0,
      roleCount: summaryMap.Roles ?? 0,
      policyCount: summaryMap.Policies ?? 0,
      groupCount: summaryMap.Groups ?? 0,
    };

    // 2. List users (paginated)
    const allRawUsers: any[] = [];
    let userMarker: string | undefined;
    do {
      const resp = await iam.send(
        new ListUsersCommand({ Marker: userMarker, MaxItems: 100 }),
      );
      allRawUsers.push(...(resp.Users ?? []));
      userMarker = resp.IsTruncated ? resp.Marker : undefined;
    } while (userMarker);

    const users = transformIAMUsersResponse(allRawUsers);

    // 3. Enrich users with MFA and access key info (best-effort, limit to first 100)
    const usersToEnrich = users.slice(0, 100);
    await Promise.all(
      usersToEnrich.map(async (user) => {
        try {
          const [mfaResp, akResp] = await Promise.all([
            iam.send(new ListMFADevicesCommand({ UserName: user.userName })),
            iam.send(new ListAccessKeysCommand({ UserName: user.userName })),
          ]);
          user.mfaEnabled = (mfaResp.MFADevices ?? []).length > 0;
          user.accessKeyCount = (akResp.AccessKeyMetadata ?? []).length;
        } catch {
          // best-effort — leave defaults
        }
      }),
    );

    // 4. List roles (paginated)
    const allRawRoles: any[] = [];
    let roleMarker: string | undefined;
    do {
      const resp = await iam.send(
        new ListRolesCommand({ Marker: roleMarker, MaxItems: 100 }),
      );
      allRawRoles.push(...(resp.Roles ?? []));
      roleMarker = resp.IsTruncated ? resp.Marker : undefined;
    } while (roleMarker);

    const roles = transformIAMRolesResponse(allRawRoles);

    return {
      data: { summary, users, roles },
      timestamp: Date.now(),
      region: 'us-east-1',
    };
  } catch (err: any) {
    return {
      data: {
        summary: { userCount: 0, roleCount: 0, policyCount: 0, groupCount: 0 },
        users: [],
        roles: [],
      },
      timestamp: Date.now(),
      region: 'us-east-1',
      error: {
        code: err.name ?? 'UnknownError',
        message: err.message ?? 'Failed to fetch IAM data',
      },
    };
  }
}
