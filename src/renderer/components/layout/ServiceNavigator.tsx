import { Menu } from 'antd';
import {
  DashboardOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  TableOutlined,
  HddOutlined,
  ApartmentOutlined,
  SwapOutlined,
  GlobalOutlined,
  LinkOutlined,
  MessageOutlined,
  SafetyOutlined,
  LineChartOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { MenuProps } from 'antd';
import type { ServiceName } from '../../types';
import { useAppStore } from '../../stores/appStore';
import { SERVICE_GROUPS } from './serviceGroups';

const ICON_MAP: Record<string, ReactNode> = {
  CloudServerOutlined: <CloudServerOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  TableOutlined: <TableOutlined />,
  HddOutlined: <HddOutlined />,
  ApartmentOutlined: <ApartmentOutlined />,
  SwapOutlined: <SwapOutlined />,
  GlobalOutlined: <GlobalOutlined />,
  LinkOutlined: <LinkOutlined />,
  MessageOutlined: <MessageOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  LineChartOutlined: <LineChartOutlined />,
  DollarOutlined: <DollarOutlined />,
};

function getResourceCount(serviceName: ServiceName, summaries: { serviceName: string; resourceCount: number }[]): number {
  const summary = summaries.find((s) => s.serviceName === serviceName);
  return summary?.resourceCount ?? 0;
}

/**
 * Short display names for the sidebar to avoid text truncation.
 * Maps the full displayName to a concise Chinese label.
 */
const SHORT_NAMES: Record<string, string> = {
  'Amazon EC2': 'EC2 实例',
  'AWS Lambda': 'Lambda',
  'Amazon ECS/EKS': 'ECS/EKS',
  'Amazon S3': 'S3 存储桶',
  'Amazon DynamoDB': 'DynamoDB',
  'Amazon RDS': 'RDS 数据库',
  'Amazon VPC': 'VPC 网络',
  'Elastic Load Balancing': '负载均衡',
  'Amazon CloudFront': 'CloudFront',
  'Amazon Route 53': 'Route 53',
  'Amazon SNS/SQS': 'SNS/SQS',
  'AWS IAM': 'IAM 身份',
  'Amazon CloudWatch': 'CloudWatch',
  'AWS Billing': '账单费用',
};

function serviceLabel(displayName: string, count: number, isGlobal: boolean): ReactNode {
  const shortName = SHORT_NAMES[displayName] ?? displayName;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        overflow: 'hidden',
        color: count === 0 ? 'rgba(255,255,255,0.35)' : undefined,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {shortName}
        {isGlobal && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#1890ff',
              marginLeft: 4,
              verticalAlign: 'middle',
            }}
          />
        )}
      </span>
      <span
        style={{
          fontSize: 12,
          color: count === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
          marginLeft: 4,
          flexShrink: 0,
        }}
      >
        {count}
      </span>
    </span>
  );
}

export default function ServiceNavigator() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const serviceSummaries = useAppStore((s) => s.serviceSummaries);

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    ...SERVICE_GROUPS.map((group) => ({
      key: group.category,
      label: group.categoryDisplayName,
      type: 'group' as const,
      children: group.services.map((svc) => {
        const count = getResourceCount(svc.name, serviceSummaries);
        return {
          key: svc.name,
          icon: ICON_MAP[svc.icon],
          label: serviceLabel(svc.displayName, count, svc.isGlobal),
          disabled: false,
        };
      }),
    })),
  ];

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[currentView]}
      items={menuItems}
      onClick={({ key }) => setCurrentView(key as ServiceName | 'dashboard')}
    />
  );
}
