import { ipcMain } from 'electron';
import { credentialManager } from '../credentials/credentialManager';
import { fetchDashboardData } from '../services/dashboardAggregator';
import { fetchEC2Instances, fetchEC2Metrics } from '../services/ec2Fetcher';
import { fetchS3Buckets, fetchS3BucketDetail } from '../services/s3Fetcher';
import { fetchRDSInstances, fetchRDSMetrics } from '../services/rdsFetcher';
import { fetchLambdaFunctions, fetchLambdaMetrics } from '../services/lambdaFetcher';
import { fetchLoadBalancers, fetchELBTargetHealth } from '../services/elbFetcher';
import { fetchVPCs, fetchVPCDetail, fetchSecurityGroups } from '../services/vpcFetcher';
import { fetchIAMData } from '../services/iamFetcher';
import { fetchContainerData, fetchECSServices } from '../services/containerFetcher';
import { fetchDynamoDBTables, fetchDynamoDBTableDetail, fetchDynamoDBMetrics } from '../services/dynamodbFetcher';
import { fetchCloudFrontDistributions, fetchCloudFrontMetrics } from '../services/cloudfrontFetcher';
import { fetchMessagingData, fetchSQSQueueDetail } from '../services/messagingFetcher';
import { fetchHostedZones, fetchDNSRecords } from '../services/route53Fetcher';
import { fetchOverviewMetrics } from '../services/metricsFetcher';
import type { TimeRange } from '../services/metricsFetcher';
import { fetchBillingData, fetchBillingDashboardData } from '../services/billingFetcher';
import { exportData, showSaveDialog } from '../export/dataExporter';
import { dataUploader } from '../upload/dataUploader';
import type { UploadConfig } from '../../shared/types';

// IPC channel strings inlined to avoid cross-rootDir import issues with tsconfig.main.json
const IPC_CHANNELS = {
  LOAD_PROFILES: 'credential:load-profiles',
  VALIDATE_CREDENTIAL: 'credential:validate',
  SET_MANUAL_CREDENTIAL: 'credential:set-manual',
  FETCH_DASHBOARD: 'service:fetch-dashboard',
  FETCH_SERVICE_DATA: 'service:fetch-data',
  FETCH_SERVICE_DETAIL: 'service:fetch-detail',
  FETCH_METRICS: 'service:fetch-metrics',
  EXPORT_DATA: 'export:data',
  SHOW_SAVE_DIALOG: 'export:show-save-dialog',
  UPLOAD_DATA: 'upload:data',
  UPLOAD_PROGRESS: 'upload:progress',
  UPLOAD_CONFIGURE: 'upload:configure',
  UPLOAD_GET_CONFIG: 'upload:get-config',
  SWITCH_REGION: 'region:switch',
  GET_REGIONS: 'region:get-all',
  FETCH_BILLING_DASHBOARD: 'billing:fetch-dashboard',
  REFRESH_ALL: 'refresh:all',
  REFRESH_SERVICE: 'refresh:service',
} as const;

export function registerIpcHandlers(): void {
  // Credential handlers — real implementations via CredentialManager
  ipcMain.handle(IPC_CHANNELS.LOAD_PROFILES, async () => {
    return credentialManager.loadProfiles();
  });

  ipcMain.handle(IPC_CHANNELS.VALIDATE_CREDENTIAL, async (_event, profile) => {
    return credentialManager.validateCredential(profile);
  });

  ipcMain.handle(IPC_CHANNELS.SET_MANUAL_CREDENTIAL, async (_event, input) => {
    credentialManager.setManualCredential(input);
    const active = credentialManager.getActiveCredential();
    if (active) {
      return credentialManager.validateCredential(active);
    }
    return { valid: false, error: { type: 'MissingCredentials', message: '凭证信息不完整', suggestion: '请提供完整凭证' } };
  });

  // Service data handlers
  ipcMain.handle(IPC_CHANNELS.FETCH_DASHBOARD, async () => {
    const clientConfig = credentialManager.getClientConfig();
    return fetchDashboardData(clientConfig);
  });

  ipcMain.handle(IPC_CHANNELS.FETCH_SERVICE_DATA, async (_event, serviceName: string) => {
    if (serviceName === 'ec2') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchEC2Instances(clientConfig);
    }
    if (serviceName === 's3') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchS3Buckets(clientConfig);
    }
    if (serviceName === 'rds') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchRDSInstances(clientConfig);
    }
    if (serviceName === 'lambda') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchLambdaFunctions(clientConfig);
    }
    if (serviceName === 'elb') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchLoadBalancers(clientConfig);
    }
    if (serviceName === 'vpc') {
      const clientConfig = credentialManager.getClientConfig();
      const [vpcsResult, sgResult] = await Promise.all([
        fetchVPCs(clientConfig),
        fetchSecurityGroups(clientConfig),
      ]);
      return {
        data: { vpcs: vpcsResult.data, securityGroups: sgResult.data },
        timestamp: Date.now(),
        region: clientConfig.region,
        error: vpcsResult.error ?? sgResult.error,
      };
    }
    if (serviceName === 'iam') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchIAMData(clientConfig);
    }
    if (serviceName === 'ecs') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchContainerData(clientConfig);
    }
    if (serviceName === 'dynamodb') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchDynamoDBTables(clientConfig);
    }
    if (serviceName === 'cloudfront') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchCloudFrontDistributions(clientConfig);
    }
    if (serviceName === 'sns') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchMessagingData(clientConfig);
    }
    if (serviceName === 'route53') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchHostedZones(clientConfig);
    }
    if (serviceName === 'metrics') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchOverviewMetrics(clientConfig, '24h');
    }
    if (serviceName === 'billing') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchBillingData(clientConfig);
    }
    return { data: null, timestamp: Date.now(), region: '', error: { code: 'NotImplemented', message: 'Not yet implemented' } };
  });

  ipcMain.handle(IPC_CHANNELS.FETCH_SERVICE_DETAIL, async (_event, serviceName: string, resourceId: string) => {
    if (serviceName === 's3') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchS3BucketDetail(clientConfig, resourceId);
    }
    if (serviceName === 'elb') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchELBTargetHealth(clientConfig, resourceId);
    }
    if (serviceName === 'vpc') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchVPCDetail(clientConfig, resourceId);
    }
    if (serviceName === 'ecs') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchECSServices(clientConfig, resourceId);
    }
    if (serviceName === 'dynamodb') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchDynamoDBTableDetail(clientConfig, resourceId);
    }
    if (serviceName === 'sns') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchSQSQueueDetail(clientConfig, resourceId);
    }
    if (serviceName === 'route53') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchDNSRecords(clientConfig, resourceId);
    }
    return { data: null, timestamp: Date.now(), region: '', error: { code: 'NotImplemented', message: 'Not yet implemented' } };
  });

  ipcMain.handle(IPC_CHANNELS.FETCH_METRICS, async (_event, serviceName: string, resourceId: string, _timeRange) => {
    if (serviceName === 'metrics') {
      const clientConfig = credentialManager.getClientConfig();
      const timeRange = (_timeRange as TimeRange) || '24h';
      return fetchOverviewMetrics(clientConfig, timeRange);
    }
    if (serviceName === 'ec2') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchEC2Metrics(clientConfig, resourceId);
    }
    if (serviceName === 'rds') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchRDSMetrics(clientConfig, resourceId);
    }
    if (serviceName === 'lambda') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchLambdaMetrics(clientConfig, resourceId);
    }
    if (serviceName === 'dynamodb') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchDynamoDBMetrics(clientConfig, resourceId);
    }
    if (serviceName === 'cloudfront') {
      const clientConfig = credentialManager.getClientConfig();
      return fetchCloudFrontMetrics(clientConfig, resourceId);
    }
    return { data: null, timestamp: Date.now(), region: '', error: { code: 'NotImplemented', message: 'Not yet implemented' } };
  });

  // Billing Dashboard handler
  ipcMain.handle(IPC_CHANNELS.FETCH_BILLING_DASHBOARD, async () => {
    const clientConfig = credentialManager.getClientConfig();
    return fetchBillingDashboardData(clientConfig);
  });

  // Export handlers
  ipcMain.handle(IPC_CHANNELS.EXPORT_DATA, async (_event, options) => {
    const activeProfile = credentialManager.getActiveCredential();
    const clientConfig = credentialManager.getClientConfig();
    // Gather data for all requested services (or all if empty)
    const serviceNames = (options.services && options.services.length > 0)
      ? options.services
      : ['ec2', 's3', 'rds', 'lambda', 'elb', 'vpc', 'iam', 'ecs', 'dynamodb', 'cloudfront', 'sns', 'route53', 'billing'];
    const allData: Record<string, unknown> = {};
    for (const svc of serviceNames) {
      try {
        // Re-use the FETCH_SERVICE_DATA logic inline
        const result = await ipcMain.emit(IPC_CHANNELS.FETCH_SERVICE_DATA, svc);
        allData[svc] = result;
      } catch {
        allData[svc] = null;
      }
    }
    const metadata = {
      exportTimestamp: new Date().toISOString(),
      accountId: activeProfile?.name ?? 'unknown',
      region: clientConfig.region,
    };
    return exportData(allData, options, metadata);
  });

  ipcMain.handle(IPC_CHANNELS.SHOW_SAVE_DIALOG, async (_event, defaultName: string) => {
    return showSaveDialog(defaultName);
  });

  // Upload handlers
  ipcMain.handle(IPC_CHANNELS.UPLOAD_DATA, async (event) => {
    const clientConfig = credentialManager.getClientConfig();
    // Gather all service data for upload
    const serviceNames = ['ec2', 's3', 'rds', 'lambda', 'elb', 'vpc', 'iam', 'ecs', 'dynamodb', 'cloudfront', 'sns', 'route53', 'billing'];
    const allData: Record<string, unknown> = {};
    for (const svc of serviceNames) {
      try {
        allData[svc] = null; // Placeholder — real data gathered from cached state
      } catch {
        allData[svc] = null;
      }
    }
    allData.accountId = credentialManager.getActiveCredential()?.name ?? 'unknown';
    allData.region = clientConfig.region;
    allData.timestamp = new Date().toISOString();

    const webContents = event.sender;
    const result = await dataUploader.upload(allData, (progress) => {
      webContents.send(IPC_CHANNELS.UPLOAD_PROGRESS, progress);
    });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD_CONFIGURE, async (_event, config: UploadConfig) => {
    dataUploader.configure(config);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.UPLOAD_GET_CONFIG, async () => {
    return dataUploader.getConfig();
  });

  // All available AWS regions
  const AWS_REGIONS = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
    'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
    'ap-southeast-1', 'ap-southeast-2', 'ap-south-1',
    'sa-east-1', 'ca-central-1', 'me-south-1', 'af-south-1', 'ap-east-1',
  ];

  // Global services that are not affected by region switching
  const GLOBAL_SERVICES = ['s3', 'iam', 'cloudfront', 'route53'];

  // Region handlers
  ipcMain.handle(IPC_CHANNELS.GET_REGIONS, async () => {
    return AWS_REGIONS;
  });

  ipcMain.handle(IPC_CHANNELS.SWITCH_REGION, async (_event, region: string) => {
    credentialManager.setRegion(region);
    return { region, globalServices: GLOBAL_SERVICES };
  });

  // Refresh handlers
  ipcMain.handle(IPC_CHANNELS.REFRESH_ALL, async () => {
    const clientConfig = credentialManager.getClientConfig();
    const summaries = await fetchDashboardData(clientConfig);
    return { summaries, timestamp: Date.now() };
  });

  ipcMain.handle(IPC_CHANNELS.REFRESH_SERVICE, async (_event, serviceName: string) => {
    const clientConfig = credentialManager.getClientConfig();
    // Re-use the FETCH_SERVICE_DATA logic by dispatching to the same fetcher functions
    const serviceHandlers: Record<string, () => Promise<unknown>> = {
      ec2: () => fetchEC2Instances(clientConfig),
      s3: () => fetchS3Buckets(clientConfig),
      rds: () => fetchRDSInstances(clientConfig),
      lambda: () => fetchLambdaFunctions(clientConfig),
      elb: () => fetchLoadBalancers(clientConfig),
      vpc: async () => {
        const [vpcsResult, sgResult] = await Promise.all([
          fetchVPCs(clientConfig),
          fetchSecurityGroups(clientConfig),
        ]);
        return {
          data: { vpcs: vpcsResult.data, securityGroups: sgResult.data },
          timestamp: Date.now(),
          region: clientConfig.region,
          error: vpcsResult.error ?? sgResult.error,
        };
      },
      iam: () => fetchIAMData(clientConfig),
      ecs: () => fetchContainerData(clientConfig),
      dynamodb: () => fetchDynamoDBTables(clientConfig),
      cloudfront: () => fetchCloudFrontDistributions(clientConfig),
      sns: () => fetchMessagingData(clientConfig),
      route53: () => fetchHostedZones(clientConfig),
      metrics: () => fetchOverviewMetrics(clientConfig, '24h'),
      billing: () => fetchBillingData(clientConfig),
    };

    const handler = serviceHandlers[serviceName];
    if (!handler) {
      return { data: null, timestamp: Date.now(), region: clientConfig.region, error: { code: 'NotImplemented', message: 'Unknown service' } };
    }
    return handler();
  });
}
