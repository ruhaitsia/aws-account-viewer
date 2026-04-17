import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { LoadBalancer, TargetGroupHealth } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

const TYPE_COLORS: Record<string, string> = {
  application: 'blue',
  network: 'green',
  classic: 'orange',
};

const ELBPanel: React.FC = () => {
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLB, setSelectedLB] = useState<string | null>(null);
  const [targetHealth, setTargetHealth] = useState<TargetGroupHealth[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('elb');
      if (result.error) {
        setError(result.error.message);
      } else {
        setLoadBalancers((result.data as LoadBalancer[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载负载均衡器失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadTargetHealth = useCallback(async (lbName: string) => {
    setDetailLoading(true);
    setTargetHealth([]);
    try {
      const result = await window.electronAPI.service.fetchDetail('elb', lbName);
      if (!result.error) {
        setTargetHealth((result.data as TargetGroupHealth[]) ?? []);
      }
    } catch {
      // detail is best-effort
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: LoadBalancer) => {
      setSelectedLB(record.name);
      loadTargetHealth(record.name);
    },
    [loadTargetHealth],
  );

  if (loading) return <LoadingSpinner tip="加载负载均衡器..." />;
  if (error) return <ErrorDisplay message="加载 ELB 数据失败" description={error} onRetry={loadData} />;

  // Type summary counts
  const typeCounts: Record<string, number> = {};
  for (const lb of loadBalancers) {
    typeCounts[lb.type] = (typeCounts[lb.type] ?? 0) + 1;
  }

  const columns: ColumnsType<LoadBalancer> = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type] ?? 'default'}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 110,
      render: (state: string) => (
        <Tag color={state === 'active' ? 'green' : state === 'provisioning' ? 'orange' : 'default'}>
          {state}
        </Tag>
      ),
    },
    { title: 'DNS 名称', dataIndex: 'dnsName', key: 'dnsName', ellipsis: true },
    { title: 'VPC', dataIndex: 'vpcId', key: 'vpcId', width: 140 },
    {
      title: '可用区',
      dataIndex: 'availabilityZones',
      key: 'azs',
      width: 180,
      render: (azs: string[]) => azs.join(', ') || '-',
    },
    { title: '监听器', dataIndex: 'listenerSummary', key: 'listeners', width: 160, ellipsis: true },
  ];

  const targetColumns: ColumnsType<TargetGroupHealth> = [
    { title: '目标组名称', dataIndex: 'targetGroupName', key: 'targetGroupName' },
    {
      title: '健康目标数',
      dataIndex: 'healthyCount',
      key: 'healthyCount',
      width: 120,
      render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span>,
    },
    {
      title: '不健康目标数',
      dataIndex: 'unhealthyCount',
      key: 'unhealthyCount',
      width: 140,
      render: (v: number) => <span style={{ color: v > 0 ? '#f5222d' : undefined }}>{v}</span>,
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Type summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="总计" value={loadBalancers.length} />
          </Card>
        </Col>
        {Object.entries(typeCounts).map(([type, count]) => (
          <Col key={type}>
            <Card size="small">
              <Statistic title={type.toUpperCase()} value={count} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* LB table */}
      <Table<LoadBalancer>
        dataSource={loadBalancers}
        columns={columns}
        rowKey="name"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.name === selectedLB ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* Target group health */}
      {selectedLB && (
        <div style={{ marginTop: 16 }}>
          <h4>{selectedLB} 目标组健康状态</h4>
          {detailLoading ? (
            <LoadingSpinner tip="加载目标组..." />
          ) : targetHealth.length > 0 ? (
            <Table<TargetGroupHealth>
              dataSource={targetHealth}
              columns={targetColumns}
              rowKey="targetGroupName"
              size="small"
              pagination={false}
            />
          ) : (
            <p style={{ color: '#999' }}>无目标组数据</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ELBPanel;
