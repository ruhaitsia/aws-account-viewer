import React, { useEffect, useState, useCallback } from 'react';
import { Radio, Row, Col, Card } from 'antd';
import type { RadioChangeEvent } from 'antd';
import type { MetricDataPoint } from '../../../shared/types';
import type { TimeRange } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import MetricChart from '../charts/MetricChart';

type OverviewMetrics = Record<string, MetricDataPoint[]>;

/** Metric definitions matching the backend METRIC_DEFINITIONS. */
const METRIC_DEFS = [
  { id: 'ec2Cpu', label: 'EC2 平均 CPU 利用率', unit: '%', color: '#1890ff' },
  { id: 'rdsCpu', label: 'RDS CPU 利用率', unit: '%', color: '#13c2c2' },
  { id: 'rdsConnections', label: 'RDS 连接数', unit: 'Count', color: '#722ed1' },
  { id: 'lambdaInvocations', label: 'Lambda 调用次数', unit: 'Count', color: '#52c41a' },
  { id: 'lambdaErrors', label: 'Lambda 错误次数', unit: 'Count', color: '#f5222d' },
  { id: 'elbRequests', label: 'ELB 请求数', unit: 'Count', color: '#fa8c16' },
  { id: 'elbLatency', label: 'ELB 延迟', unit: 'Seconds', color: '#eb2f96' },
  { id: 'dynamodbRead', label: 'DynamoDB 读容量', unit: 'Count', color: '#2f54eb' },
  { id: 'dynamodbWrite', label: 'DynamoDB 写容量', unit: 'Count', color: '#faad14' },
  { id: 'sqsDepth', label: 'SQS 队列深度', unit: 'Count', color: '#a0d911' },
];

const MetricsPanel: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (range: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchMetrics('metrics', '', range);
      if (result.error) {
        setError(result.error.message);
      } else {
        setMetrics(result.data as OverviewMetrics);
      }
    } catch (err: any) {
      setError(err.message ?? '加载指标数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics(timeRange);
  }, [loadMetrics, timeRange]);

  const handleTimeRangeChange = (e: RadioChangeEvent) => {
    const newRange = e.target.value as TimeRange;
    setTimeRange(newRange);
  };

  if (loading) return <LoadingSpinner tip="加载 CloudWatch 指标..." />;
  if (error) return <ErrorDisplay message="加载指标数据失败" description={error} onRetry={() => loadMetrics(timeRange)} />;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>CloudWatch 指标概览</h3>
        <Radio.Group value={timeRange} onChange={handleTimeRangeChange} optionType="button" buttonStyle="solid">
          <Radio.Button value="1h">1 小时</Radio.Button>
          <Radio.Button value="6h">6 小时</Radio.Button>
          <Radio.Button value="24h">24 小时</Radio.Button>
          <Radio.Button value="7d">7 天</Radio.Button>
        </Radio.Group>
      </div>

      <Row gutter={[16, 16]}>
        {METRIC_DEFS.map((def) => {
          const data = metrics?.[def.id] ?? [];
          return (
            <Col xs={24} md={12} key={def.id}>
              <Card size="small">
                <MetricChart
                  data={data}
                  title={def.label}
                  unit={def.unit}
                  color={def.color}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default MetricsPanel;
