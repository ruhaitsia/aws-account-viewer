import { useEffect, useState } from 'react';
import { Tabs, Select, Button, Input, Spin, Result, Alert, Space, Typography } from 'antd';
import { useCredentialStore } from '../../stores/credentialStore';

const { Title } = Typography;

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

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px' }}>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
        AWS 凭证配置
      </Title>
      <Tabs items={tabItems} centered />
      <ValidationStatus />
    </div>
  );
}
