import { Button, Select, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useCredentialStore } from '../../stores/credentialStore';
import { useAppStore } from '../../stores/appStore';

const { Text } = Typography;

const AWS_REGIONS = [
  { value: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
  { value: 'us-east-2', label: 'us-east-2 (Ohio)' },
  { value: 'us-west-1', label: 'us-west-1 (N. California)' },
  { value: 'us-west-2', label: 'us-west-2 (Oregon)' },
  { value: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
  { value: 'eu-west-2', label: 'eu-west-2 (London)' },
  { value: 'eu-west-3', label: 'eu-west-3 (Paris)' },
  { value: 'eu-central-1', label: 'eu-central-1 (Frankfurt)' },
  { value: 'eu-north-1', label: 'eu-north-1 (Stockholm)' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1 (Tokyo)' },
  { value: 'ap-northeast-2', label: 'ap-northeast-2 (Seoul)' },
  { value: 'ap-northeast-3', label: 'ap-northeast-3 (Osaka)' },
  { value: 'ap-southeast-1', label: 'ap-southeast-1 (Singapore)' },
  { value: 'ap-southeast-2', label: 'ap-southeast-2 (Sydney)' },
  { value: 'ap-south-1', label: 'ap-south-1 (Mumbai)' },
  { value: 'sa-east-1', label: 'sa-east-1 (São Paulo)' },
  { value: 'ca-central-1', label: 'ca-central-1 (Canada)' },
  { value: 'me-south-1', label: 'me-south-1 (Bahrain)' },
  { value: 'af-south-1', label: 'af-south-1 (Cape Town)' },
  { value: 'ap-east-1', label: 'ap-east-1 (Hong Kong)' },
];

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

export default function TopBar() {
  const { accountId, accountAlias, activeProfile } = useCredentialStore();
  const { currentRegion, lastRefreshTime, isRefreshing, switchRegion, refreshAll } = useAppStore();

  const defaultRegion = activeProfile?.region;

  const regionOptions = AWS_REGIONS.map((r) => ({
    value: r.value,
    label: r.value === defaultRegion ? `${r.label} ★ 默认` : r.label,
  }));

  const handleRegionChange = async (region: string) => {
    await switchRegion(region);
  };

  return (
    <div
      style={{
        height: 48,
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      {/* Left: account info */}
      <Space size="middle">
        {accountId && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            账户: {accountId}
          </Text>
        )}
        {accountAlias && (
          <Text strong style={{ fontSize: 13 }}>
            {accountAlias}
          </Text>
        )}
      </Space>

      {/* Center: region selector */}
      <Select
        value={currentRegion}
        onChange={handleRegionChange}
        options={regionOptions}
        style={{ width: 280 }}
        showSearch
        optionFilterProp="label"
      />

      {/* Right: refresh + timestamp */}
      <Space size="middle">
        {lastRefreshTime && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            最后更新: {formatTimestamp(lastRefreshTime)}
          </Text>
        )}
        <Button
          icon={<ReloadOutlined spin={isRefreshing} />}
          loading={isRefreshing}
          onClick={refreshAll}
        >
          刷新
        </Button>
      </Space>
    </div>
  );
}
