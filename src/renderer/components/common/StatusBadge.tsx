import React from 'react';
import type { HealthStatus } from '../../../shared/types';
import { HEALTH_STATUS_COLOR } from '../../types';

export interface StatusBadgeProps {
  status: HealthStatus;
  text?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  const color = HEALTH_STATUS_COLOR[status];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {text && <span>{text}</span>}
    </span>
  );
};

export default StatusBadge;
