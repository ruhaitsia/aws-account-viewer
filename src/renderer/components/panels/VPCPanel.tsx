import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { VPC, SecurityGroup, VPCDetail, Subnet } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

interface VPCData {
  vpcs: VPC[];
  securityGroups: SecurityGroup[];
}

const VPCPanel: React.FC = () => {
  const [vpcs, setVpcs] = useState<VPC[]>([]);
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVpcId, setSelectedVpcId] = useState<string | null>(null);
  const [vpcDetail, setVpcDetail] = useState<VPCDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('vpc');
      if (result.error) {
        setError(result.error.message);
      } else {
        const data = result.data as VPCData;
        setVpcs(data?.vpcs ?? []);
        setSecurityGroups(data?.securityGroups ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 VPC 数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadDetail = useCallback(async (vpcId: string) => {
    setDetailLoading(true);
    setVpcDetail(null);
    try {
      const result = await window.electronAPI.service.fetchDetail('vpc', vpcId);
      if (!result.error) {
        setVpcDetail(result.data as VPCDetail);
      }
    } catch {
      // detail is best-effort
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: VPC) => {
      setSelectedVpcId(record.vpcId);
      loadDetail(record.vpcId);
    },
    [loadDetail],
  );

  if (loading) return <LoadingSpinner tip="加载 VPC 数据..." />;
  if (error) return <ErrorDisplay message="加载 VPC 数据失败" description={error} onRetry={loadData} />;

  const vpcColumns: ColumnsType<VPC> = [
    { title: 'VPC ID', dataIndex: 'vpcId', key: 'vpcId', width: 180 },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true, render: (v: string) => v || '-' },
    { title: 'CIDR', dataIndex: 'cidrBlock', key: 'cidrBlock', width: 150 },
    { title: '子网数量', dataIndex: 'subnetCount', key: 'subnetCount', width: 100 },
    {
      title: '默认 VPC',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 100,
      render: (v: boolean) => (v ? <Tag color="blue">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: (state: string) => (
        <Tag color={state === 'available' ? 'green' : 'default'}>{state}</Tag>
      ),
    },
  ];

  const sgColumns: ColumnsType<SecurityGroup> = [
    { title: 'Group ID', dataIndex: 'groupId', key: 'groupId', width: 180 },
    { title: '名称', dataIndex: 'groupName', key: 'groupName', ellipsis: true },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'VPC', dataIndex: 'vpcId', key: 'vpcId', width: 180 },
  ];

  const subnetColumns: ColumnsType<Subnet> = [
    { title: 'Subnet ID', dataIndex: 'subnetId', key: 'subnetId', width: 200 },
    { title: 'CIDR', dataIndex: 'cidrBlock', key: 'cidrBlock', width: 150 },
    { title: '可用区', dataIndex: 'availabilityZone', key: 'az', width: 140 },
    { title: '可用 IP 数', dataIndex: 'availableIpCount', key: 'ipCount', width: 120 },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="VPC 总数" value={vpcs.length} />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic title="安全组总数" value={securityGroups.length} />
          </Card>
        </Col>
      </Row>

      {/* VPC table */}
      <h4>VPC 列表</h4>
      <Table<VPC>
        dataSource={vpcs}
        columns={vpcColumns}
        rowKey="vpcId"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.vpcId === selectedVpcId ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* VPC Detail */}
      {selectedVpcId && (
        <div style={{ marginTop: 16 }}>
          <h4>VPC {selectedVpcId} 详情</h4>
          {detailLoading ? (
            <LoadingSpinner tip="加载 VPC 详情..." />
          ) : vpcDetail ? (
            <>
              <h5>子网</h5>
              <Table<Subnet>
                dataSource={vpcDetail.subnets}
                columns={subnetColumns}
                rowKey="subnetId"
                size="small"
                pagination={false}
              />
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={8}>
                  <Card size="small" title="路由表">
                    {vpcDetail.routeTables.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {vpcDetail.routeTables.map((rt) => (
                          <li key={rt.id}>{rt.id}{rt.name ? ` (${rt.name})` : ''}</li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: '#999' }}>无路由表</span>
                    )}
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="互联网网关">
                    {vpcDetail.internetGateways.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {vpcDetail.internetGateways.map((igw) => (
                          <li key={igw.id}>{igw.id}{igw.name ? ` (${igw.name})` : ''}</li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: '#999' }}>无互联网网关</span>
                    )}
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="NAT 网关">
                    {vpcDetail.natGateways.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {vpcDetail.natGateways.map((nat) => (
                          <li key={nat.id}>
                            {nat.id}{nat.name ? ` (${nat.name})` : ''}{' '}
                            <Tag color={nat.state === 'available' ? 'green' : 'default'}>{nat.state}</Tag>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: '#999' }}>无 NAT 网关</span>
                    )}
                  </Card>
                </Col>
              </Row>
            </>
          ) : null}
        </div>
      )}

      {/* Security Groups table */}
      <div style={{ marginTop: 24 }}>
        <h4>安全组列表</h4>
        <Table<SecurityGroup>
          dataSource={securityGroups}
          columns={sgColumns}
          rowKey="groupId"
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </div>
    </div>
  );
};

export default VPCPanel;
