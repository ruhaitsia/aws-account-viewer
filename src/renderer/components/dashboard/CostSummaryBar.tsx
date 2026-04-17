import React from 'react';
import { Card, Skeleton, Button, Typography, Space } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { DailyCostData } from '../../../shared/types';
import { formatCurrency, getRecentDays } from '../../utils/billingUtils';
import { useAppStore } from '../../stores/appStore';

const { Text, Title } = Typography;

export interface CostSummaryBarProps {
  totalCost: number;
  currency: string;
  previousMonthTotal: number;
  changePercentage: number;
  dailyCosts: DailyCostData[];
  isLoading: boolean;
  error: string | null;
  costExplorerDisabled: boolean;
  onRetry: () => void;
}

const CostSummaryBar: React.FC<CostSummaryBarProps> = ({
  totalCost,
  currency,
  previousMonthTotal,
  changePercentage,
  dailyCosts,
  isLoading,
  error,
  costExplorerDisabled,
  onRetry,
}) => {
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  if (isLoading) {
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Skeleton active paragraph={{ rows: 1 }} />
      </Card>
    );
  }

  if (costExplorerDisabled) {
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <InfoCircleOutlined style={{ color: '#faad14' }} />
          <Text>Cost Explorer 未启用</Text>
          <Button type="link" size="small" onClick={() => setCurrentView('billing')}>
            前往 Billing 查看详情
          </Button>
        </Space>
      </Card>
    );
  }

  if (error) {
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Text type="secondary">费用数据不可用</Text>
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            onClick={onRetry}
          >
            重试
          </Button>
        </Space>
      </Card>
    );
  }

  const isIncrease = changePercentage > 0;
  const isDecrease = changePercentage < 0;
  const recentDays = getRecentDays(dailyCosts, 7);

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        {/* Current month total */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            当月总费用
          </Text>
          <Title level={4} style={{ margin: 0 }}>
            {formatCurrency(totalCost, currency === 'USD' ? '$' : currency)}
          </Title>
        </div>

        {/* Previous month comparison */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            上月对比
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14 }}>
              {formatCurrency(previousMonthTotal, currency === 'USD' ? '$' : currency)}
            </Text>
            <span
              style={{
                color: isIncrease ? '#f5222d' : isDecrease ? '#52c41a' : '#999',
                fontSize: 14,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {isIncrease && <ArrowUpOutlined />}
              {isDecrease && <ArrowDownOutlined />}
              {Math.abs(changePercentage).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Mini trend chart - last 7 days */}
        {recentDays.length > 1 && (
          <div style={{ flex: 1, minWidth: 120, maxWidth: 240 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              最近 7 天趋势
            </Text>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={recentDays}>
                <XAxis dataKey="date" hide />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '费用']}
                  labelFormatter={(label: string) => label}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#1890ff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CostSummaryBar;
