import type {
  AWSProfile,
  CredentialValidationResult,
  ManualCredentialInput,
  ServiceSummary,
  FetchResult,
  ExportOptions,
  ExportResult,
  UploadResult,
  UploadProgress,
  BillingDashboardData,
} from '../../shared/types';

interface ElectronAPI {
  credential: {
    loadProfiles(): Promise<AWSProfile[]>;
    validate(profile: AWSProfile): Promise<CredentialValidationResult>;
    setManual(input: ManualCredentialInput): Promise<CredentialValidationResult>;
  };
  service: {
    fetchDashboard(): Promise<ServiceSummary[]>;
    fetchData(serviceName: string): Promise<FetchResult<unknown>>;
    fetchDetail(serviceName: string, resourceId: string): Promise<FetchResult<unknown>>;
    fetchMetrics(serviceName: string, resourceId: string, timeRange: string): Promise<FetchResult<unknown>>;
  };
  export: {
    exportData(options: ExportOptions): Promise<ExportResult>;
    showSaveDialog(defaultName: string): Promise<string | null>;
  };
  upload: {
    uploadData(): Promise<UploadResult>;
    configure(config: import('../../shared/types').UploadConfig): Promise<{ success: boolean }>;
    getConfig(): Promise<import('../../shared/types').UploadConfig | null>;
    onProgress(callback: (progress: UploadProgress) => void): void;
  };
  billing: {
    fetchDashboard(): Promise<FetchResult<BillingDashboardData>>;
  };
  region: {
    getAll(): Promise<string[]>;
    switch(region: string): Promise<{ region: string; globalServices: string[] }>;
  };
  refresh: {
    all(): Promise<{ summaries: import('../../shared/types').ServiceSummary[]; timestamp: number }>;
    service(serviceName: string): Promise<FetchResult<unknown>>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
