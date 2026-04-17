import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DynamoDBTable, DynamoDBTableDetail, MetricDataPoint } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import MetricChart from '../charts/MetricChart';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green',
  CREATING: 'orange',
  DELETING: 'red',
  UPDATING: 'blue',
  ARCHIVING: 'gold',
  ARCHIVED: 'default',
};

const BILLING_COLORS: Record<string, string> = {
  ON_DEMAND: 'blue',
  PROVISIONED: 'green',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface DynamoDBMetrics {
  readCapacity: MetricDataPoint[];
  writeCapacity: MetricDataPoint[];
}

const DynamoDBPanel: React.FC = () => {
  const [tables, setTables] = useState<DynamoDBTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [detail, setDetail] = useState<DynamoDBTableDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [metrics, setMetrics] = useState<DynamoDBMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('dynamodb');
      if (result.error) {
        setError(result.error.message);
      } else {
        setTables((result.data as DynamoDBTable[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 DynamoDB 表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const loadDetail = useCallback(async (tableName: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const result = await window.electronAPI.service.fetchDetail('dynamodb', tableName);
      if (!result.error) {
        setDetail(result.data as DynamoDBTableDetail);
      }
    } catch {
      // detail is best-effort
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async (tableName: string) => {
    setMetricsLoading(true);
    setMetrics(null);
    try {
      const result = await window.electronAPI.service.fetchMetrics('dynamodb', tableName, '1h');
      if (!result.error) {
        setMetrics(result.data as DynamoDBMetrics);
      }
    } catch {
      // metrics are best-effort
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: DynamoDBTable) => {
      setSelectedTable(record.tableName);
      loadDetail(record.tableName);
      loadMetrics(record.tableName);
    },
    [loadDetail, loadMetrics],
  );

  if (loading) return <LoadingSpinner tip="加载 DynamoDB 表..." />;
  if (error) return <ErrorDisplay message="加载 DynamoDB 数据失败" description={error} onRetry={loadTables} />;

  // Billing mode summary
  const billingCounts: Record<string, number> = { ON_DEMAND: 0, PROVISIONED: 0 };
  for (const t of tables) {
    billingCounts[t.billingMode] = (billingCounts[t.billingMode] ?? 0) + 1;
  }

  const columns: ColumnsType<DynamoDBTable> = [
    { title: '表名称', dataIndex: 'tableName', key: 'tableName', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] ?? 'default'}>{status}</Tag>
      ),
    },
    { title: '分区键', dataIndex: 'partitionKey', key: 'partitionKey', width: 140 },
    {
      title: '排序键',
      dataIndex: 'sortKey',
      key: 'sortKey',
      width: 140,
      render: (v?: string) => v || '-',
    },
    {
      title: '计费模式',
      dataIndex: 'billingMode',
      key: 'billingMode',
      width: 120,
      render: (mode: string) => (
        <Tag color={BILLING_COLORS[mode] ?? 'default'}>
          {mode === 'ON_DEMAND' ? '按需' : '预置'}
        </Tag>
      ),
    },
    {
      title: '项目数量',
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 110,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '表大小',
      dataIndex: 'tableSize',
      key: 'tableSize',
      width: 110,
      render: (v: number) => formatBytes(v),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="总计" value={tables.length} />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic title="按需 (ON_DEMAND)" value={billingCounts.ON_DEMAND} />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic title="预置 (PROVISIONED)" value={billingCounts.PROVISIONED} />
          </Card>
        </Col>
      </Row>

      {/* Table list */}
      <Table<DynamoDBTable>
        dataSource={tables}
        columns={columns}
        rowKey="tableName"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.tableName === selectedTable ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* Detail + Metrics */}
      {selectedTable && (
        <div style={{ marginTop: 16 }}>
          <h4>表 {selectedTable} 详情</h4>

          {detailLoading ? (
            <LoadingSpinner tip="加载表详情..." />
          ) : detail ? (
            <div style={{ marginBottom: 16 }}>
              {detail.provisionedCapacity && (
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="读容量单位">
                    {detail.provisionedCapacity.readCapacityUnits}
                  </Descriptions.Item>
                  <Descriptions.Item label="写容量单位">
                    {detail.provisionedCapacity.writeCapacityUnits}
                  </Descriptions.Item>
                </Descriptions>
              )}

              {detail.globalSecondaryIndexes.length > 0 && (
                <>
                  <h5>全局二级索引 (GSI)</h5>
                  <Table
                    dataSource={detail.globalSecondaryIndexes}
                    rowKey="indexName"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: '索引名称', dataIndex: 'indexName', key: 'indexName' },
                      { title: '键模式', dataIndex: 'keySchema', key: 'keySchema' },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        key: 'status',
                        render: (v: string) => (
                          <Tag color={STATUS_COLORS[v] ?? 'default'}>{v}</Tag>
                        ),
                      },
                    ]}
                  />
                </>
              )}
            </div>
          ) : null}

          <h4>指标（最近 1 小时）</h4>
          {metricsLoading ? (
            <LoadingSpinner tip="加载指标..." />
          ) : metrics ? (
            <Row gutter={16}>
              <Col span={12}>
                <MetricChart
                  data={metrics.readCapacity}
                  title="读容量消耗"
                  unit="单位"
                  color="#1890ff"
                />
              </Col>
              <Col span={12}>
                <MetricChart
                  data={metrics.writeCapacity}
                  title="写容量消耗"
                  unit="单位"
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

export default DynamoDBPanel;
