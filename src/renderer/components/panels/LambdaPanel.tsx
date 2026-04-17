import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { LambdaFunction, MetricDataPoint } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import MetricChart from '../charts/MetricChart';

const RUNTIME_COLORS: Record<string, string> = {
  'python': 'blue',
  'nodejs': 'green',
  'java': 'orange',
  'dotnet': 'purple',
  'go': 'cyan',
  'ruby': 'red',
  'rust': 'volcano',
  'provided': 'default',
};

function getRuntimeColor(runtime: string): string {
  const key = Object.keys(RUNTIME_COLORS).find((k) => runtime.toLowerCase().includes(k));
  return key ? RUNTIME_COLORS[key] : 'default';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LambdaMetrics {
  invocations: MetricDataPoint[];
  errors: MetricDataPoint[];
  duration: MetricDataPoint[];
  throttles: MetricDataPoint[];
}

const LambdaPanel: React.FC = () => {
  const [functions, setFunctions] = useState<LambdaFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LambdaMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadFunctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('lambda');
      if (result.error) {
        setError(result.error.message);
      } else {
        setFunctions((result.data as LambdaFunction[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 Lambda 函数失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFunctions();
  }, [loadFunctions]);

  const loadMetrics = useCallback(async (functionName: string) => {
    setMetricsLoading(true);
    setMetrics(null);
    try {
      const result = await window.electronAPI.service.fetchMetrics('lambda', functionName, '24h');
      if (!result.error) {
        setMetrics(result.data as LambdaMetrics);
      }
    } catch {
      // metrics are best-effort
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: LambdaFunction) => {
      setSelectedFunction(record.functionName);
      loadMetrics(record.functionName);
    },
    [loadMetrics],
  );

  if (loading) return <LoadingSpinner tip="加载 Lambda 函数..." />;
  if (error) return <ErrorDisplay message="加载 Lambda 数据失败" description={error} onRetry={loadFunctions} />;

  // Runtime summary counts
  const runtimeCounts: Record<string, number> = {};
  for (const fn of functions) {
    const rt = fn.runtime || 'unknown';
    runtimeCounts[rt] = (runtimeCounts[rt] ?? 0) + 1;
  }

  const columns: ColumnsType<LambdaFunction> = [
    { title: '函数名称', dataIndex: 'functionName', key: 'functionName', ellipsis: true },
    {
      title: '运行时',
      dataIndex: 'runtime',
      key: 'runtime',
      width: 140,
      render: (runtime: string) => (
        <Tag color={getRuntimeColor(runtime)}>{runtime}</Tag>
      ),
    },
    { title: '内存 (MB)', dataIndex: 'memorySize', key: 'memorySize', width: 100 },
    { title: '超时 (s)', dataIndex: 'timeout', key: 'timeout', width: 90 },
    {
      title: '代码大小',
      dataIndex: 'codeSize',
      key: 'codeSize',
      width: 110,
      render: (size: number) => formatBytes(size),
    },
    { title: '最后修改', dataIndex: 'lastModified', key: 'lastModified', width: 180, ellipsis: true },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="总计" value={functions.length} />
          </Card>
        </Col>
        {Object.entries(runtimeCounts).map(([runtime, count]) => (
          <Col key={runtime}>
            <Card size="small">
              <Statistic title={runtime} value={count} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Function table */}
      <Table<LambdaFunction>
        dataSource={functions}
        columns={columns}
        rowKey="functionName"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.functionName === selectedFunction ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* Metrics charts */}
      {selectedFunction && (
        <div style={{ marginTop: 16 }}>
          <h4>函数 {selectedFunction} 指标（最近 24 小时）</h4>
          {metricsLoading ? (
            <LoadingSpinner tip="加载指标..." />
          ) : metrics ? (
            <Row gutter={16}>
              <Col span={6}>
                <MetricChart data={metrics.invocations} title="调用次数" unit="次" color="#1890ff" />
              </Col>
              <Col span={6}>
                <MetricChart data={metrics.errors} title="错误次数" unit="次" color="#f5222d" />
              </Col>
              <Col span={6}>
                <MetricChart data={metrics.duration} title="平均执行时间" unit="ms" color="#52c41a" />
              </Col>
              <Col span={6}>
                <MetricChart data={metrics.throttles} title="节流次数" unit="次" color="#faad14" />
              </Col>
            </Row>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LambdaPanel;
