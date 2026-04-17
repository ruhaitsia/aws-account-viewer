import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { HostedZone, DNSRecord } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

const TYPE_COLORS: Record<string, string> = {
  public: 'blue',
  private: 'purple',
};

const Route53Panel: React.FC = () => {
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('route53');
      if (result.error) {
        setError(result.error.message);
      } else {
        setZones((result.data as HostedZone[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 Route 53 托管区域失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const loadDNSRecords = useCallback(async (zoneId: string) => {
    setRecordsLoading(true);
    setDnsRecords([]);
    try {
      const result = await window.electronAPI.service.fetchDetail('route53', zoneId);
      if (!result.error) {
        setDnsRecords((result.data as DNSRecord[]) ?? []);
      }
    } catch {
      // DNS records are best-effort
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: HostedZone) => {
      setSelectedZoneId(record.hostedZoneId);
      loadDNSRecords(record.hostedZoneId);
    },
    [loadDNSRecords],
  );

  if (loading) return <LoadingSpinner tip="加载 Route 53 托管区域..." />;
  if (error) return <ErrorDisplay message="加载 Route 53 数据失败" description={error} onRetry={loadZones} />;

  const publicCount = zones.filter((z) => z.type === 'public').length;
  const privateCount = zones.filter((z) => z.type === 'private').length;

  const zoneColumns: ColumnsType<HostedZone> = [
    { title: '域名', dataIndex: 'domainName', key: 'domainName', ellipsis: true },
    { title: '区域 ID', dataIndex: 'hostedZoneId', key: 'hostedZoneId', width: 160 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type] ?? 'default'}>
          {type === 'public' ? '公有' : '私有'}
        </Tag>
      ),
    },
    { title: '记录数', dataIndex: 'recordSetCount', key: 'recordSetCount', width: 100 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  ];

  const recordColumns: ColumnsType<DNSRecord> = [
    { title: '记录名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
    { title: 'TTL', dataIndex: 'ttl', key: 'ttl', width: 80 },
    { title: '值', dataIndex: 'value', key: 'value', ellipsis: true },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Alert
        message="Route 53 是全局服务，数据不受 Region 切换影响"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small"><Statistic title="总计" value={zones.length} /></Card>
        </Col>
        <Col>
          <Card size="small"><Statistic title="公有区域" value={publicCount} /></Card>
        </Col>
        <Col>
          <Card size="small"><Statistic title="私有区域" value={privateCount} /></Card>
        </Col>
      </Row>

      <Table<HostedZone>
        dataSource={zones}
        columns={zoneColumns}
        rowKey="hostedZoneId"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.hostedZoneId === selectedZoneId ? '#e6f7ff' : undefined,
          },
        })}
      />

      {selectedZoneId && (
        <div style={{ marginTop: 16 }}>
          <h4>区域 {selectedZoneId} 的 DNS 记录</h4>
          {recordsLoading ? (
            <LoadingSpinner tip="加载 DNS 记录..." />
          ) : (
            <Table<DNSRecord>
              dataSource={dnsRecords}
              columns={recordColumns}
              rowKey={(r) => `${r.name}-${r.type}`}
              size="small"
              pagination={{ pageSize: 20 }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Route53Panel;
