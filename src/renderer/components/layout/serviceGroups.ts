import type { ServiceGroup } from '../../types';

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    category: 'compute',
    categoryDisplayName: '计算',
    services: [
      { name: 'ec2', displayName: 'Amazon EC2', icon: 'CloudServerOutlined', isGlobal: false },
      { name: 'lambda', displayName: 'AWS Lambda', icon: 'ThunderboltOutlined', isGlobal: false },
      { name: 'ecs', displayName: 'Amazon ECS/EKS', icon: 'ClusterOutlined', isGlobal: false },
    ],
  },
  {
    category: 'storage',
    categoryDisplayName: '存储',
    services: [
      { name: 's3', displayName: 'Amazon S3', icon: 'DatabaseOutlined', isGlobal: true },
      { name: 'dynamodb', displayName: 'Amazon DynamoDB', icon: 'TableOutlined', isGlobal: false },
    ],
  },
  {
    category: 'database',
    categoryDisplayName: '数据库',
    services: [
      { name: 'rds', displayName: 'Amazon RDS', icon: 'HddOutlined', isGlobal: false },
    ],
  },
  {
    category: 'network',
    categoryDisplayName: '网络',
    services: [
      { name: 'vpc', displayName: 'Amazon VPC', icon: 'ApartmentOutlined', isGlobal: false },
      { name: 'elb', displayName: 'Elastic Load Balancing', icon: 'SwapOutlined', isGlobal: false },
      { name: 'cloudfront', displayName: 'Amazon CloudFront', icon: 'GlobalOutlined', isGlobal: true },
      { name: 'route53', displayName: 'Amazon Route 53', icon: 'LinkOutlined', isGlobal: true },
    ],
  },
  {
    category: 'messaging',
    categoryDisplayName: '消息',
    services: [
      { name: 'sns', displayName: 'Amazon SNS/SQS', icon: 'MessageOutlined', isGlobal: false },
    ],
  },
  {
    category: 'security',
    categoryDisplayName: '安全',
    services: [
      { name: 'iam', displayName: 'AWS IAM', icon: 'SafetyOutlined', isGlobal: true },
    ],
  },
  {
    category: 'monitoring',
    categoryDisplayName: '监控',
    services: [
      { name: 'metrics', displayName: 'Amazon CloudWatch', icon: 'LineChartOutlined', isGlobal: false },
    ],
  },
  {
    category: 'billing',
    categoryDisplayName: '费用',
    services: [
      { name: 'billing', displayName: 'AWS Billing', icon: 'DollarOutlined', isGlobal: false },
    ],
  },
];
