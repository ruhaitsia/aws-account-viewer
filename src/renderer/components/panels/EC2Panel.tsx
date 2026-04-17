import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { EC2Instance, MetricDataPoint } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import MetricChart from '../charts/MetricChart';

const STATE_COLORS: Record<string, string> = {
  running: 'green',
  stopped: 'red',
  terminated: 'default',
  pending: 'orange',
  'shutting-down': 'volcano',
  stopping: 'gold',
};

interface EC2Metrics {
  cpuUtilization: MetricDataPoint[];
  networkIn: MetricDataPoint[];
  networkOut: MetricDataPoint[];
}

const EC2Panel: React.FC = () => {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EC2Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('ec2');
      if (result.error) {
        setError(result.error.message);
      } else {
        setInstances((result.data as EC2Instance[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 EC2 实例失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const loadMetrics = useCallback(async (instanceId: string) => {
    setMetricsLoading(true);
    setMetrics(null);
    try {
      const result = await window.electronAPI.service.fetchMetrics('ec2', instanceId, '1h');
      if (!result.error) {
        setMetrics(result.data as EC2Metrics);
      }
    } catch {
      // metrics are best-effort
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: EC2Instance) => {
      setSelectedInstanceId(record.instanceId);
      loadMetrics(record.instanceId);
    },
    [loadMetrics],
  );

  if (loading) return <LoadingSpinner tip="加载 EC2 实例..." />;
  if (error) return <ErrorDisplay message="加载 EC2 数据失败" description={error} onRetry={loadInstances} />;

  // Status summary counts
  const statusCounts: Record<string, number> = {};
  for (const inst of instances) {
    statusCounts[inst.state] = (statusCounts[inst.state] ?? 0) + 1;
  }

  const columns: ColumnsType<EC2Instance> = [
    { title: 'Instance ID', dataIndex: 'instanceId', key: 'instanceId', width: 180 },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'instanceType', key: 'instanceType', width: 120 },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 120,
      render: (state: string) => (
        <Tag color={STATE_COLORS[state] ?? 'default'}>{state}</Tag>
      ),
    },
    { title: '可用区', dataIndex: 'availabilityZone', key: 'az', width: 140 },
    { title: '公网 IP', dataIndex: 'publicIp', key: 'publicIp', width: 140, render: (v: string) => v || '-' },
    { title: '私网 IP', dataIndex: 'privateIp', key: 'privateIp', width: 140 },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Status summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="总计" value={instances.length} />
          </Card>
        </Col>
        {Object.entries(statusCounts).map(([state, count]) => (
          <Col key={state}>
            <Card size="small">
              <Statistic
                title={state}
                value={count}
                valueStyle={{ color: state === 'running' ? '#52c41a' : state === 'stopped' ? '#f5222d' : undefined }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Instance table */}
      <Table<EC2Instance>
        dataSource={instances}
        columns={columns}
        rowKey="instanceId"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.instanceId === selectedInstanceId ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* Metrics charts */}
      {selectedInstanceId && (
        <div style={{ marginTop: 16 }}>
          <h4>实例 {selectedInstanceId} 指标（最近 1 小时）</h4>
          {metricsLoading ? (
            <LoadingSpinner tip="加载指标..." />
          ) : metrics ? (
            <Row gutter={16}>
              <Col span={8}>
                <MetricChart data={metrics.cpuUtilization} title="CPU 利用率" unit="%" color="#1890ff" />
              </Col>
              <Col span={8}>
                <MetricChart data={metrics.networkIn} title="网络流入" unit="Bytes" color="#52c41a" />
              </Col>
              <Col span={8}>
                <MetricChart data={metrics.networkOut} title="网络流出" unit="Bytes" color="#faad14" />
              </Col>
            </Row>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default EC2Panel;
