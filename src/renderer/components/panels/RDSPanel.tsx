import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RDSInstance, MetricDataPoint } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import MetricChart from '../charts/MetricChart';

const STATUS_COLORS: Record<string, string> = {
  available: 'green',
  stopped: 'red',
  creating: 'orange',
  deleting: 'volcano',
  'modifying': 'gold',
  'backing-up': 'blue',
  'rebooting': 'orange',
  'starting': 'cyan',
  'stopping': 'gold',
  'storage-optimization': 'geekblue',
  failed: 'red',
};

interface RDSMetrics {
  cpuUtilization: MetricDataPoint[];
  connections: MetricDataPoint[];
  freeStorage: MetricDataPoint[];
}

const formatStorage = (gb: number): string => {
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  return `${gb} GB`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const RDSPanel: React.FC = () => {
  const [instances, setInstances] = useState<RDSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<RDSMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('rds');
      if (result.error) {
        setError(result.error.message);
      } else {
        setInstances((result.data as RDSInstance[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 RDS 实例失败');
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
      const result = await window.electronAPI.service.fetchMetrics('rds', instanceId, '1h');
      if (!result.error) {
        setMetrics(result.data as RDSMetrics);
      }
    } catch {
      // metrics are best-effort
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: RDSInstance) => {
      setSelectedInstanceId(record.instanceId);
      loadMetrics(record.instanceId);
    },
    [loadMetrics],
  );

  if (loading) return <LoadingSpinner tip="加载 RDS 实例..." />;
  if (error) return <ErrorDisplay message="加载 RDS 数据失败" description={error} onRetry={loadInstances} />;

  // Engine type summary counts
  const engineCounts: Record<string, number> = {};
  for (const inst of instances) {
    const key = inst.engine || 'unknown';
    engineCounts[key] = (engineCounts[key] ?? 0) + 1;
  }

  const columns: ColumnsType<RDSInstance> = [
    { title: '实例标识符', dataIndex: 'instanceId', key: 'instanceId', width: 200 },
    { title: '引擎', dataIndex: 'engine', key: 'engine', width: 120 },
    { title: '版本', dataIndex: 'engineVersion', key: 'engineVersion', width: 100 },
    { title: '实例类型', dataIndex: 'instanceClass', key: 'instanceClass', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: '存储',
      dataIndex: 'storageSize',
      key: 'storageSize',
      width: 100,
      render: (v: number) => formatStorage(v),
    },
    {
      title: '多可用区',
      dataIndex: 'multiAZ',
      key: 'multiAZ',
      width: 100,
      render: (v: boolean) => (
        <Tag color={v ? 'blue' : 'default'}>{v ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Engine type summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="总计" value={instances.length} />
          </Card>
        </Col>
        {Object.entries(engineCounts).map(([engine, count]) => (
          <Col key={engine}>
            <Card size="small">
              <Statistic title={engine} value={count} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Instance table */}
      <Table<RDSInstance>
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
                <MetricChart data={metrics.connections} title="数据库连接数" unit="个" color="#52c41a" />
              </Col>
              <Col span={8}>
                <MetricChart
                  data={metrics.freeStorage}
                  title="可用存储空间"
                  unit="Bytes"
                  color="#faad14"
                />
              </Col>
            </Row>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default RDSPanel;
