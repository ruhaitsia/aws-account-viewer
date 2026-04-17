import { Menu, Badge, Tag } from 'antd';
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

function serviceLabel(displayName: string, count: number, isGlobal: boolean): ReactNode {
  const globalTag = isGlobal ? (
    <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', marginLeft: 4 }}>全局</Tag>
  ) : null;

  if (count === 0) {
    return (
      <span style={{ color: 'rgba(255,255,255,0.35)' }}>
        {displayName}{globalTag} <span style={{ fontSize: 12 }}>无资源</span>
      </span>
    );
  }
  return (
    <span>
      {displayName}{globalTag}{' '}
      <Badge count={count} size="small" style={{ marginLeft: 4 }} overflowCount={9999} />
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
          style: count === 0 ? { opacity: 0.5 } : undefined,
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
