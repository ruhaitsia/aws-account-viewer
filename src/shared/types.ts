// ===== 通用类型 =====

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export interface MetricSeries {
  label: string;
  unit: string;
  dataPoints: MetricDataPoint[];
}

export type HealthStatus = 'healthy' | 'warning' | 'error';

// ===== EC2 =====

export interface EC2Instance {
  instanceId: string;
  name: string;
  instanceType: string;
  state: 'running' | 'stopped' | 'terminated' | 'pending' | 'shutting-down' | 'stopping';
  availabilityZone: string;
  publicIp?: string;
  privateIp: string;
}

// ===== S3 =====

export interface S3Bucket {
  name: string;
  creationDate: string;
  region: string;
  objectCount: number;
  totalSize: number;
  storageClassDistribution: Record<string, number>;
}

export interface S3BucketDetail {
  accessPolicy: 'public' | 'private';
  versioningEnabled: boolean;
  encryptionConfig: string;
  lifecycleRules: string[];
}

// ===== RDS =====

export interface RDSInstance {
  instanceId: string;
  engine: string;
  engineVersion: string;
  instanceClass: string;
  status: string;
  storageSize: number;
  multiAZ: boolean;
  endpoint: string;
}

// ===== Lambda =====

export interface LambdaFunction {
  functionName: string;
  runtime: string;
  memorySize: number;
  timeout: number;
  codeSize: number;
  lastModified: string;
  description: string;
}

// ===== ELB =====

export interface LoadBalancer {
  name: string;
  type: 'application' | 'network' | 'classic';
  state: string;
  dnsName: string;
  vpcId: string;
  availabilityZones: string[];
  listenerSummary: string;
}

export interface TargetGroupHealth {
  targetGroupName: string;
  healthyCount: number;
  unhealthyCount: number;
}

// ===== VPC =====

export interface VPC {
  vpcId: string;
  name: string;
  cidrBlock: string;
  subnetCount: number;
  isDefault: boolean;
  state: string;
}

export interface Subnet {
  subnetId: string;
  cidrBlock: string;
  availabilityZone: string;
  availableIpCount: number;
}

export interface VPCDetail {
  subnets: Subnet[];
  routeTables: { id: string; name: string }[];
  internetGateways: { id: string; name: string }[];
  natGateways: { id: string; name: string; state: string }[];
}

export interface SecurityGroup {
  groupId: string;
  groupName: string;
  description: string;
  vpcId: string;
}

// ===== IAM =====

export interface IAMSummary {
  userCount: number;
  roleCount: number;
  policyCount: number;
  groupCount: number;
}

export interface IAMUser {
  userName: string;
  createDate: string;
  lastActivity?: string;
  mfaEnabled: boolean;
  accessKeyCount: number;
}

export interface IAMRole {
  roleName: string;
  createDate: string;
  description: string;
  trustedEntityType: string;
}

// ===== ECS/EKS =====

export interface ECSCluster {
  clusterName: string;
  status: string;
  runningServicesCount: number;
  runningTasksCount: number;
  registeredContainerInstancesCount: number;
}

export interface ECSService {
  serviceName: string;
  desiredCount: number;
  runningCount: number;
  deploymentStatus: string;
}

export interface EKSCluster {
  clusterName: string;
  kubernetesVersion: string;
  status: string;
  endpoint: string;
  platformVersion: string;
}

// ===== DynamoDB =====

export interface DynamoDBTable {
  tableName: string;
  status: string;
  partitionKey: string;
  sortKey?: string;
  billingMode: 'ON_DEMAND' | 'PROVISIONED';
  itemCount: number;
  tableSize: number;
}

export interface DynamoDBTableDetail {
  globalSecondaryIndexes: { indexName: string; keySchema: string; status: string }[];
  provisionedCapacity?: { readCapacityUnits: number; writeCapacityUnits: number };
}

// ===== CloudFront =====

export interface CloudFrontDistribution {
  distributionId: string;
  domainName: string;
  status: 'Deployed' | 'InProgress';
  aliases: string[];
  originSummary: string;
  priceClass: string;
}

// ===== SNS/SQS =====

export interface SNSTopic {
  topicName: string;
  topicArn: string;
  subscriptionCount: number;
  displayName: string;
}

export interface SQSQueue {
  queueName: string;
  queueUrl: string;
  queueType: 'standard' | 'fifo';
  visibleMessages: number;
  invisibleMessages: number;
  delayedMessages: number;
}

export interface SQSQueueDetail {
  visibilityTimeout: number;
  messageRetentionPeriod: number;
  maxMessageSize: number;
  deadLetterQueue?: string;
}

// ===== Route 53 =====

export interface HostedZone {
  domainName: string;
  hostedZoneId: string;
  type: 'public' | 'private';
  recordSetCount: number;
  description: string;
}

export interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  value: string;
}

// ===== Billing =====

export interface BillingSummary {
  totalCost: number;
  currency: string;
  period: string;
  serviceCosts: { serviceName: string; cost: number }[];
  previousMonthComparison: {
    previousTotal: number;
    changePercentage: number;
  };
}

/** 按日费用数据 */
export interface DailyCostData {
  date: string;    // YYYY-MM-DD 格式
  amount: number;  // 费用金额（美元）
}

/** Dashboard 账单综合数据 */
export interface BillingDashboardData {
  currentMonthServiceCosts: { serviceName: string; cost: number }[];
  totalCost: number;
  currency: string;
  previousMonthTotal: number;
  changePercentage: number;
  dailyCosts: DailyCostData[];
  previousMonthServiceCosts: { serviceName: string; cost: number }[];
}

/** 服务费用增长信息 */
export interface ServiceGrowth {
  serviceName: string;
  currentCost: number;
  previousCost: number;
  growthPercentage: number | null;  // null 表示 "新增"
  growthLabel: 'new' | 'percentage';
}

// ===== Dashboard =====

export interface ServiceSummary {
  serviceName: string;
  displayName: string;
  resourceCount: number;
  healthStatus: HealthStatus;
  icon: string;
  isGlobal: boolean;
}

// ===== FetchResult =====

export interface FetchResult<T> {
  data: T;
  timestamp: number;
  region: string;
  error?: {
    code: string;
    message: string;
  };
}

// ===== 导出数据结构 =====

export interface ExportMetadata {
  exportTimestamp: string;
  accountId: string;
  region: string;
  dataType: 'full' | 'single-service';
  services: string[];
}

export interface ExportData {
  metadata: ExportMetadata;
  data: Record<string, unknown>;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  services: string[];
  filePath: string;
}

export interface ExportResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  error?: string;
}

// ===== 上传 =====

export interface UploadConfig {
  apiEndpoint: string;
  authToken: string;
}

export interface UploadProgress {
  percentage: number;
  bytesUploaded: number;
  totalBytes: number;
}

export interface UploadResult {
  success: boolean;
  dataSize: number;
  duration: number;
  error?: string;
}

// ===== 凭证 =====

export interface AWSProfile {
  name: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  source: 'file' | 'manual';
}

export interface CredentialValidationResult {
  valid: boolean;
  accountId?: string;
  accountAlias?: string;
  error?: {
    type: string;
    message: string;
    suggestion: string;
  };
}

export interface ManualCredentialInput {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

// ===== App State =====

export interface AppState {
  // 凭证状态
  profiles: AWSProfile[];
  activeProfile: AWSProfile | null;
  credentialStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  accountId: string | null;
  accountAlias: string | null;

  // Region 状态
  currentRegion: string;
  availableRegions: string[];

  // Dashboard 状态
  serviceSummaries: ServiceSummary[];
  lastRefreshTime: number | null;

  // 各服务面板数据
  serviceData: Record<string, FetchResult<unknown>>;

  // 加载状态
  loadingServices: Set<string>;
  errors: Record<string, string>;

  // 上传配置
  uploadConfig: UploadConfig | null;
}
