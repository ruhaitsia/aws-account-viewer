import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { IAMClient, ListAccountAliasesCommand } from '@aws-sdk/client-iam';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Types inlined to avoid cross-rootDir import issues with tsconfig.main.json
interface AWSProfile {
  name: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  source: 'file' | 'manual';
}

interface CredentialValidationResult {
  valid: boolean;
  accountId?: string;
  accountAlias?: string;
  error?: {
    type: string;
    message: string;
    suggestion: string;
  };
}

interface ManualCredentialInput {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

const ERROR_MAP: Record<string, { message: string; suggestion: string }> = {
  InvalidClientTokenId: {
    message: 'Access Key ID 无效',
    suggestion: '请检查 Access Key ID 是否正确，或该密钥是否已被删除',
  },
  SignatureDoesNotMatch: {
    message: 'Secret Access Key 不匹配',
    suggestion: '请检查 Secret Access Key 是否正确',
  },
  ExpiredToken: {
    message: '临时凭证已过期',
    suggestion: '请重新获取临时凭证或使用长期凭证',
  },
  AccessDenied: {
    message: '权限不足',
    suggestion: '当前凭证缺少所需的 IAM 权限，请联系管理员添加相应权限',
  },
};

export function mapAwsError(errorCode: string): { type: string; message: string; suggestion: string } {
  const mapped = ERROR_MAP[errorCode];
  if (mapped) {
    return { type: errorCode, ...mapped };
  }
  return {
    type: errorCode,
    message: `AWS 错误: ${errorCode}`,
    suggestion: '请检查凭证配置和网络连接，如问题持续请联系管理员',
  };
}

/**
 * Parse an INI-format file into a map of section -> key/value pairs.
 * Handles comments (#, ;), blank lines, and [section] headers.
 * For ~/.aws/config, section headers look like [profile xxx] (except [default]).
 */
export function parseIniFile(content: string, isConfig: boolean): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  let currentSection: string | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    // Section header
    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      let sectionName = sectionMatch[1].trim();
      if (isConfig) {
        // In config file, sections are [profile xxx] except [default]
        const profilePrefix = sectionName.match(/^profile\s+(.+)$/);
        if (profilePrefix) {
          sectionName = profilePrefix[1].trim();
        }
        // [default] stays as "default"
      }
      currentSection = sectionName;
      if (!result[currentSection]) {
        result[currentSection] = {};
      }
      continue;
    }

    // Key = value pair
    if (currentSection) {
      const kvMatch = line.match(/^([^=]+?)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        result[currentSection][key] = value;
      }
    }
  }

  return result;
}

class CredentialManager {
  private activeProfile: AWSProfile | null = null;
  private currentRegion: string | null = null;

  /**
   * Load all profiles from ~/.aws/credentials and ~/.aws/config.
   * Merges data from both files (credentials has keys, config has region).
   */
  async loadProfiles(): Promise<AWSProfile[]> {
    const awsDir = path.join(os.homedir(), '.aws');
    const credentialsPath = path.join(awsDir, 'credentials');
    const configPath = path.join(awsDir, 'config');

    const profiles: Map<string, AWSProfile> = new Map();

    // Parse credentials file
    try {
      const credContent = fs.readFileSync(credentialsPath, 'utf-8');
      const credSections = parseIniFile(credContent, false);
      for (const [name, values] of Object.entries(credSections)) {
        profiles.set(name, {
          name,
          accessKeyId: values['aws_access_key_id'],
          secretAccessKey: values['aws_secret_access_key'],
          region: values['region'],
          source: 'file',
        });
      }
    } catch {
      // File doesn't exist or can't be read — that's fine
    }

    // Parse config file and merge
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const configSections = parseIniFile(configContent, true);
      for (const [name, values] of Object.entries(configSections)) {
        const existing = profiles.get(name);
        if (existing) {
          // Merge region from config if not already set
          if (!existing.region && values['region']) {
            existing.region = values['region'];
          }
        } else {
          profiles.set(name, {
            name,
            accessKeyId: values['aws_access_key_id'],
            secretAccessKey: values['aws_secret_access_key'],
            region: values['region'],
            source: 'file',
          });
        }
      }
    } catch {
      // File doesn't exist or can't be read — that's fine
    }

    return Array.from(profiles.values());
  }

  /**
   * Validate a credential by calling STS GetCallerIdentity with a 5-second timeout.
   * Also attempts to fetch account alias via IAM.
   */
  async validateCredential(profile: AWSProfile): Promise<CredentialValidationResult> {
    if (!profile.accessKeyId || !profile.secretAccessKey) {
      return {
        valid: false,
        error: {
          type: 'MissingCredentials',
          message: '凭证信息不完整',
          suggestion: '请提供 Access Key ID 和 Secret Access Key',
        },
      };
    }

    const credentials = {
      accessKeyId: profile.accessKeyId,
      secretAccessKey: profile.secretAccessKey,
    };
    const region = profile.region || 'us-east-1';

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 5000);

    try {
      const stsClient = new STSClient({
        credentials,
        region,
        requestHandler: { metadata: { handlerProtocol: '' } } as any,
      });

      const identity = await stsClient.send(
        new GetCallerIdentityCommand({}),
        { abortSignal: abortController.signal }
      );

      // Set as active profile on successful validation
      this.activeProfile = profile;

      // Try to get account alias (best-effort)
      let accountAlias: string | undefined;
      try {
        const iamClient = new IAMClient({ credentials, region });
        const aliasResponse = await iamClient.send(new ListAccountAliasesCommand({}));
        if (aliasResponse.AccountAliases && aliasResponse.AccountAliases.length > 0) {
          accountAlias = aliasResponse.AccountAliases[0];
        }
      } catch {
        // Alias fetch is best-effort, ignore errors
      }

      return {
        valid: true,
        accountId: identity.Account,
        accountAlias,
      };
    } catch (err: any) {
      const errorCode = err.name || err.Code || 'UnknownError';
      const mapped = mapAwsError(errorCode);
      return {
        valid: false,
        error: mapped,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Set a manually entered credential. Stored in memory only.
   */
  setManualCredential(input: ManualCredentialInput): void {
    this.activeProfile = {
      name: 'manual',
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
      region: input.region,
      source: 'manual',
    };
  }

  /**
   * Get the currently active credential profile.
   */
  getActiveCredential(): AWSProfile | null {
    return this.activeProfile;
  }

  /**
   * Set the current region override. Used when user switches region in the UI.
   */
  setRegion(region: string): void {
    this.currentRegion = region;
  }

  /**
   * Get the current region (override or profile default).
   */
  getCurrentRegion(): string {
    return this.currentRegion || this.activeProfile?.region || 'us-east-1';
  }

  /**
   * Get AWS SDK client configuration from the active profile.
   * Optionally override the region.
   */
  getClientConfig(region?: string): { credentials: { accessKeyId: string; secretAccessKey: string }; region: string } {
    if (!this.activeProfile || !this.activeProfile.accessKeyId || !this.activeProfile.secretAccessKey) {
      throw new Error('No active credential configured');
    }
    return {
      credentials: {
        accessKeyId: this.activeProfile.accessKeyId,
        secretAccessKey: this.activeProfile.secretAccessKey,
      },
      region: region || this.currentRegion || this.activeProfile.region || 'us-east-1',
    };
  }
}

export const credentialManager = new CredentialManager();
export { CredentialManager, AWSProfile, CredentialValidationResult, ManualCredentialInput };
