import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CloudFrontDistribution, MetricDataPoint } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import MetricChart from '../charts/MetricChart';

const STATUS_COLORS: Record<string, string> = {
  Deployed: 'green',
  InProgress: 'orange',
};

interface CloudFrontMetrics {
  requests: MetricDataPoint[];
  bytesDownloaded: MetricDataPoint[];
}

const CloudFrontPanel: React.FC = () => {
  const [distributions, setDistributions] = useState<CloudFrontDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CloudFrontMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadDistributions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('cloudfront');
      if (result.error) {
        setError(result.error.message);
      } else {
        setDistributions((result.data as CloudFrontDistribution[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 CloudFront 分发失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDistributions();
  }, [loadDistributions]);

  const loadMetrics = useCallback(async (distributionId: string) => {
    setMetricsLoading(true);
    setMetrics(null);
    try {
      const result = await window.electronAPI.service.fetchMetrics('cloudfront', distributionId, '24h');
      if (!result.error) {
        setMetrics(result.data as CloudFrontMetrics);
      }
    } catch {
      // metrics are best-effort
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: CloudFrontDistribution) => {
      setSelectedId(record.distributionId);
      loadMetrics(record.distributionId);
    },
    [loadMetrics],
  );

  if (loading) return <LoadingSpinner tip="加载 CloudFront 分发..." />;
  if (error) return <ErrorDisplay message="加载 CloudFront 数据失败" description={error} onRetry={loadDistributions} />;

  // Status summary
  const statusCounts: Record<string, number> = { Deployed: 0, InProgress: 0 };
  for (const d of distributions) {
    statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
  }

  const columns: ColumnsType<CloudFrontDistribution> = [
    { title: '分发 ID', dataIndex: 'distributionId', key: 'distributionId', width: 160 },
    { title: '域名', dataIndex: 'domainName', key: 'domainName', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] ?? 'default'}>{status}</Tag>
      ),
    },
    {
      title: '备用域名 (CNAME)',
      dataIndex: 'aliases',
      key: 'aliases',
      ellipsis: true,
      render: (aliases: string[]) => aliases.length > 0 ? aliases.join(', ') : '-',
    },
    { title: '源站概要', dataIndex: 'originSummary', key: 'originSummary', ellipsis: true },
    { title: '价格等级', dataIndex: 'priceClass', key: 'priceClass', width: 140 },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Global service note */}
      <Alert
        message="CloudFront 是全局服务，数据不受 Region 切换影响"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="总计" value={distributions.length} />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic title="已部署 (Deployed)" value={statusCounts.Deployed} />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic title="部署中 (InProgress)" value={statusCounts.InProgress} />
          </Card>
        </Col>
      </Row>

      {/* Distribution list */}
      <Table<CloudFrontDistribution>
        dataSource={distributions}
        columns={columns}
        rowKey="distributionId"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.distributionId === selectedId ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* Metrics */}
      {selectedId && (
        <div style={{ marginTop: 16 }}>
          <h4>分发 {selectedId} 指标（最近 24 小时）</h4>
          {metricsLoading ? (
            <LoadingSpinner tip="加载指标..." />
          ) : metrics ? (
            <Row gutter={16}>
              <Col span={12}>
                <MetricChart
                  data={metrics.requests}
                  title="请求数"
                  unit="次"
                  color="#1890ff"
                />
              </Col>
              <Col span={12}>
                <MetricChart
                  data={metrics.bytesDownloaded}
                  title="数据传输量"
                  unit="Bytes"
                  color="#52c41a"
                />
              </Col>
            </Row>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CloudFrontPanel;
