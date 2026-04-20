import { useEffect, useState } from 'react';
import { Tabs, Select, Button, Input, Spin, Result, Alert, Space, Typography, Divider } from 'antd';
import {
  CloudServerOutlined,
  DashboardOutlined,
  DollarOutlined,
  ExportOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useCredentialStore } from '../../stores/credentialStore';

const { Title, Text, Paragraph } = Typography;

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
  'me-south-1',
  'af-south-1',
];

function ProfileTab() {
  const { profiles, loadProfiles, selectProfile, credentialStatus } = useCredentialStore();
  const [selectedProfileName, setSelectedProfileName] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleValidate = () => {
    const profile = profiles.find((p) => p.name === selectedProfileName);
    if (profile) {
      selectProfile(profile);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Select
        placeholder="选择 AWS Profile"
        style={{ width: '100%' }}
        value={selectedProfileName}
        onChange={setSelectedProfileName}
        options={profiles.map((p) => ({ label: p.name, value: p.name }))}
      />
      <Button
        type="primary"
        onClick={handleValidate}
        disabled={!selectedProfileName}
        loading={credentialStatus === 'validating'}
      >
        验证
      </Button>
    </Space>
  );
}

function ManualTab() {
  const { setManualCredential, credentialStatus } = useCredentialStore();
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState<string | undefined>(undefined);

  const handleValidate = () => {
    if (accessKeyId && secretAccessKey && region) {
      setManualCredential({ accessKeyId, secretAccessKey, region });
    }
  };

  const isFormComplete = accessKeyId && secretAccessKey && region;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Input
        placeholder="Access Key ID"
        value={accessKeyId}
        onChange={(e) => setAccessKeyId(e.target.value)}
      />
      <Input.Password
        placeholder="Secret Access Key"
        value={secretAccessKey}
        onChange={(e) => setSecretAccessKey(e.target.value)}
      />
      <Select
        placeholder="选择 Region"
        style={{ width: '100%' }}
        value={region}
        onChange={setRegion}
        options={AWS_REGIONS.map((r) => ({ label: r, value: r }))}
        showSearch
      />
      <Button
        type="primary"
        onClick={handleValidate}
        disabled={!isFormComplete}
        loading={credentialStatus === 'validating'}
      >
        验证
      </Button>
    </Space>
  );
}

function ValidationStatus() {
  const { credentialStatus, accountId, accountAlias, validationError } = useCredentialStore();

  if (credentialStatus === 'validating') {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <Spin size="large" tip="正在验证凭证..." />
      </div>
    );
  }

  if (credentialStatus === 'valid') {
    return (
      <Result
        status="success"
        title="凭证验证成功"
        subTitle={
          <>
            <div>账户 ID: {accountId}</div>
            {accountAlias && <div>账户别名: {accountAlias}</div>}
          </>
        }
      />
    );
  }

  if (credentialStatus === 'invalid' && validationError) {
    return (
      <Alert
        type="error"
        showIcon
        message={`${validationError.type}: ${validationError.message}`}
        description={validationError.suggestion}
        style={{ marginTop: 16 }}
      />
    );
  }

  return null;
}

export default function CredentialForm() {
  const tabItems = [
    {
      key: 'profile',
      label: 'AWS Profile',
      children: <ProfileTab />,
    },
    {
      key: 'manual',
      label: '手动输入',
      children: <ManualTab />,
    },
  ];

  const features = [
    { icon: <DashboardOutlined />, text: 'Dashboard 总览所有 AWS 资源与健康状态' },
    { icon: <DollarOutlined />, text: '费用分析、趋势图表与月度对比' },
    { icon: <CloudServerOutlined />, text: '支持 EC2、S3、RDS、Lambda 等 15+ 服务' },
    { icon: <ExportOutlined />, text: '数据导出为 JSON/CSV，支持上传至自定义 API' },
    { icon: <SafetyOutlined />, text: '凭证本地验证，数据上传自动脱敏' },
  ];

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 24px' }}>
      {/* App intro */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <CloudServerOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 12 }} />
        <Title level={3} style={{ marginBottom: 4 }}>AWS Account Viewer</Title>
        <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 16 }}>
          跨平台桌面应用，集中查看和管理 AWS 账户资源与费用
        </Paragraph>
      </div>

      <div style={{ marginBottom: 24 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: '#1890ff', fontSize: 16 }}>{f.icon}</span>
            <Text style={{ fontSize: 13 }}>{f.text}</Text>
          </div>
        ))}
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Credential form */}
      <Title level={5} style={{ textAlign: 'center', marginBottom: 16 }}>
        配置 AWS 凭证以开始使用
      </Title>
      <Tabs items={tabItems} centered />
      <ValidationStatus />
    </div>
  );
}
