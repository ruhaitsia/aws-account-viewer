import { Typography } from 'antd';
import { useCredentialStore } from './stores/credentialStore';
import { useAppStore } from './stores/appStore';
import CredentialForm from './components/credential/CredentialForm';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import EC2Panel from './components/panels/EC2Panel';
import S3Panel from './components/panels/S3Panel';
import RDSPanel from './components/panels/RDSPanel';
import LambdaPanel from './components/panels/LambdaPanel';
import ELBPanel from './components/panels/ELBPanel';
import VPCPanel from './components/panels/VPCPanel';
import IAMPanel from './components/panels/IAMPanel';
import ContainerPanel from './components/panels/ContainerPanel';
import DynamoDBPanel from './components/panels/DynamoDBPanel';
import CloudFrontPanel from './components/panels/CloudFrontPanel';
import MessagingPanel from './components/panels/MessagingPanel';
import Route53Panel from './components/panels/Route53Panel';
import MetricsPanel from './components/panels/MetricsPanel';
import BillingPanel from './components/panels/BillingPanel';
import UploadPanel from './components/panels/UploadPanel';
import type { ViewName } from './types';

const { Title, Text } = Typography;

const VIEW_LABELS: Record<Exclude<ViewName, 'dashboard' | 'credential'>, string> = {
  ec2: 'EC2 实例',
  s3: 'S3 存储桶',
  rds: 'RDS 数据库',
  lambda: 'Lambda 函数',
  elb: '负载均衡器',
  vpc: 'VPC 网络',
  iam: 'IAM 身份管理',
  ecs: 'ECS/EKS 容器',
  eks: 'EKS 集群',
  dynamodb: 'DynamoDB 表',
  cloudfront: 'CloudFront 分发',
  sns: 'SNS/SQS 消息',
  sqs: 'SQS 队列',
  route53: 'Route 53 DNS',
  metrics: 'CloudWatch 指标',
  billing: '账单',
};

function MainContent() {
  const currentView = useAppStore((s) => s.currentView);

  if (currentView === 'dashboard') {
    return <Dashboard />;
  }

  if (currentView === 'ec2') {
    return <EC2Panel />;
  }

  if (currentView === 's3') {
    return <S3Panel />;
  }

  if (currentView === 'rds') {
    return <RDSPanel />;
  }

  if (currentView === 'lambda') {
    return <LambdaPanel />;
  }

  if (currentView === 'elb') {
    return <ELBPanel />;
  }

  if (currentView === 'vpc') {
    return <VPCPanel />;
  }

  if (currentView === 'iam') {
    return <IAMPanel />;
  }

  if (currentView === 'ecs') {
    return <ContainerPanel />;
  }

  if (currentView === 'dynamodb') {
    return <DynamoDBPanel />;
  }

  if (currentView === 'cloudfront') {
    return <CloudFrontPanel />;
  }

  if (currentView === 'sns') {
    return <MessagingPanel />;
  }

  if (currentView === 'route53') {
    return <Route53Panel />;
  }

  if (currentView === 'metrics') {
    return <MetricsPanel />;
  }

  if (currentView === 'billing') {
    return <BillingPanel />;
  }

  if (currentView === 'upload') {
    return <UploadPanel />;
  }

  const label = VIEW_LABELS[currentView as keyof typeof VIEW_LABELS] ?? currentView;
  return (
    <div style={{ textAlign: 'center', paddingTop: 64 }}>
      <Title level={3}>{label}</Title>
      <Text type="secondary">{label} 面板将在后续任务中实现</Text>
    </div>
  );
}

function App() {
  const credentialStatus = useCredentialStore((s) => s.credentialStatus);

  if (credentialStatus !== 'valid') {
    return <CredentialForm />;
  }

  return (
    <AppLayout>
      <MainContent />
    </AppLayout>
  );
}

export default App;
