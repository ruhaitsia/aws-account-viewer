import type { HealthStatus } from '../../shared/types';

// ===== 导航状态 =====

export type ServiceCategory =
  | 'compute'
  | 'storage'
  | 'database'
  | 'network'
  | 'messaging'
  | 'security'
  | 'monitoring'
  | 'billing';

export type ServiceName =
  | 'ec2'
  | 's3'
  | 'rds'
  | 'lambda'
  | 'elb'
  | 'vpc'
  | 'iam'
  | 'ecs'
  | 'eks'
  | 'dynamodb'
  | 'cloudfront'
  | 'sns'
  | 'sqs'
  | 'route53'
  | 'metrics'
  | 'billing';

export type ViewName = 'dashboard' | 'credential' | 'upload' | ServiceName;

export interface NavigationState {
  currentView: ViewName;
  previousView: ViewName | null;
}

// ===== 面板视图状态 =====

export type PanelLoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PanelViewState {
  loadingState: PanelLoadingState;
  selectedResourceId: string | null;
  errorMessage: string | null;
}

// ===== 服务分组定义 =====

export interface ServiceGroupItem {
  name: ServiceName;
  displayName: string;
  icon: string;
  isGlobal: boolean;
}

export interface ServiceGroup {
  category: ServiceCategory;
  categoryDisplayName: string;
  services: ServiceGroupItem[];
}

// ===== 时间范围 =====

export type TimeRange = '1h' | '6h' | '24h' | '7d';

// ===== 健康状态颜色映射 =====

export const HEALTH_STATUS_COLOR: Record<HealthStatus, string> = {
  healthy: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
};
