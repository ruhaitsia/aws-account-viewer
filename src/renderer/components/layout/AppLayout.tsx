import { useState, type ReactNode } from 'react';
import { Layout, Typography } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import TopBar from './TopBar';
import ServiceNavigator from './ServiceNavigator';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        style={{ background: '#001529' }}
      >
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
          <CloudServerOutlined style={{ fontSize: 24, color: '#fff', marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && <Text strong style={{ color: '#fff', fontSize: 14 }}>AWS Viewer</Text>}
        </div>
        <ServiceNavigator />
      </Sider>
      <Layout>
        <TopBar />
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
