import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { IAMSummary, IAMUser, IAMRole } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

interface IAMData {
  summary: IAMSummary;
  users: IAMUser[];
  roles: IAMRole[];
}

const IAMPanel: React.FC = () => {
  const [data, setData] = useState<IAMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('iam');
      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data as IAMData);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 IAM 数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner tip="加载 IAM 数据..." />;
  if (error) return <ErrorDisplay message="加载 IAM 数据失败" description={error} onRetry={loadData} />;
  if (!data) return null;

  const { summary, users, roles } = data;

  const userColumns: ColumnsType<IAMUser> = [
    { title: '用户名', dataIndex: 'userName', key: 'userName' },
    { title: '创建日期', dataIndex: 'createDate', key: 'createDate', width: 180, render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: '最后活动', dataIndex: 'lastActivity', key: 'lastActivity', width: 180, render: (v?: string) => v ? new Date(v).toLocaleDateString() : '-' },
    {
      title: 'MFA 状态',
      dataIndex: 'mfaEnabled',
      key: 'mfaEnabled',
      width: 120,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>{enabled ? '已启用' : '未启用'}</Tag>
      ),
    },
    { title: '访问密钥数', dataIndex: 'accessKeyCount', key: 'accessKeyCount', width: 120 },
  ];

  const roleColumns: ColumnsType<IAMRole> = [
    { title: '角色名称', dataIndex: 'roleName', key: 'roleName' },
    { title: '创建日期', dataIndex: 'createDate', key: 'createDate', width: 180, render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '信任实体类型',
      dataIndex: 'trustedEntityType',
      key: 'trustedEntityType',
      width: 150,
      render: (v: string) => <Tag>{v}</Tag>,
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Alert
        message="IAM 是全局服务，数据不受 Region 切换影响"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small"><Statistic title="用户" value={summary.userCount} /></Card>
        </Col>
        <Col>
          <Card size="small"><Statistic title="角色" value={summary.roleCount} /></Card>
        </Col>
        <Col>
          <Card size="small"><Statistic title="策略" value={summary.policyCount} /></Card>
        </Col>
        <Col>
          <Card size="small"><Statistic title="用户组" value={summary.groupCount} /></Card>
        </Col>
      </Row>

      {/* Users table */}
      <h4 style={{ marginBottom: 8 }}>IAM 用户</h4>
      <Table<IAMUser>
        dataSource={users}
        columns={userColumns}
        rowKey="userName"
        size="small"
        pagination={{ pageSize: 20 }}
        style={{ marginBottom: 24 }}
      />

      {/* Roles table */}
      <h4 style={{ marginBottom: 8 }}>IAM 角色</h4>
      <Table<IAMRole>
        dataSource={roles}
        columns={roleColumns}
        rowKey="roleName"
        size="small"
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
};

export default IAMPanel;
