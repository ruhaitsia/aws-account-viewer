import React from 'react';
import { Card, Tag, Typography } from 'antd';
import type { ServiceSummary } from '../../../shared/types';
import { HEALTH_STATUS_COLOR } from '../../types';
import StatusBadge from '../common/StatusBadge';

const { Text } = Typography;

export interface ServiceSummaryCardProps {
  summary: ServiceSummary;
  cost?: number | null;
  onClick: () => void;
}

const ServiceSummaryCard: React.FC<ServiceSummaryCardProps> = ({ summary, cost, onClick }) => {
  const borderColor = HEALTH_STATUS_COLOR[summary.healthStatus];

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderTop: `3px solid ${borderColor}`,
        height: '100%',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 14 }}>
          {summary.displayName}
        </Text>
        {summary.isGlobal && (
          <Tag color="blue" style={{ marginRight: 0 }}>全局</Tag>
        )}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
        {summary.resourceCount}
      </div>
      {cost !== undefined && (
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {cost === null ? '—' : `$${cost.toFixed(2)}`}
          </Text>
        </div>
      )}
      <StatusBadge
        status={summary.healthStatus}
        text={summary.healthStatus === 'healthy' ? '正常' : summary.healthStatus === 'warning' ? '警告' : '异常'}
      />
    </Card>
  );
};

export default ServiceSummaryCard;
