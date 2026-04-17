import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MetricDataPoint } from '../../../shared/types';

export interface MetricChartProps {
  data: MetricDataPoint[];
  title: string;
  unit?: string;
  color?: string;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const MetricChart: React.FC<MetricChartProps> = ({
  data,
  title,
  unit,
  color = '#1890ff',
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>{title}</div>
        <span>无数据</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>{title}</div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={unit ? { value: unit, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip
            labelFormatter={formatTime}
            formatter={(value: number) =>
              unit ? [`${value} ${unit}`, title] : [value, title]
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricChart;
