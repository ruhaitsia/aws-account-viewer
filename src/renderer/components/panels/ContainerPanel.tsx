import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ECSCluster, ECSService, EKSCluster } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

const { Title } = Typography;

interface ContainerData {
  ecsClusters: ECSCluster[];
  eksClusters: EKSCluster[];
}

const ContainerPanel: React.FC = () => {
  const [data, setData] = useState<ContainerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ECS service drill-down state
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [services, setServices] = useState<ECSService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('ecs');
      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data as ContainerData);
      }
    } catch (err: any) {
      setError(err.message ?? '加载容器服务数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClusterClick = useCallback(async (clusterName: string) => {
    setSelectedCluster(clusterName);
    setServicesLoading(true);
    setServicesError(null);
    try {
      const result = await window.electronAPI.service.fetchDetail('ecs', clusterName);
      if (result.error) {
        setServicesError(result.error.message);
      } else {
        setServices(result.data as ECSService[]);
      }
    } catch (err: any) {
      setServicesError(err.message ?? '加载 ECS 服务列表失败');
    } finally {
      setServicesLoading(false);
    }
  }, []);

  if (loading) return <LoadingSpinner tip="加载容器服务数据..." />;
  if (error) return <ErrorDisplay message="加载容器服务数据失败" description={error} onRetry={loadData} />;
  if (!data) return null;

  const { ecsClusters, eksClusters } = data;

  const statusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ACTIVE' || s === 'RUNNING') return 'green';
    if (s === 'INACTIVE' || s === 'FAILED' || s === 'DELETING') return 'red';
    return 'default';
  };

  const ecsColumns: ColumnsType<ECSCluster> = [
    { title: '集群名称', dataIndex: 'clusterName', key: 'clusterName' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 120,
      render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag>,
    },
    { title: '运行服务数', dataIndex: 'runningServicesCount', key: 'runningServicesCount', width: 120 },
    { title: '运行任务数', dataIndex: 'runningTasksCount', key: 'runningTasksCount', width: 120 },
    { title: '容器实例数', dataIndex: 'registeredContainerInstancesCount', key: 'registeredContainerInstancesCount', width: 120 },
  ];

  const eksColumns: ColumnsType<EKSCluster> = [
    { title: '集群名称', dataIndex: 'clusterName', key: 'clusterName' },
    { title: 'K8s 版本', dataIndex: 'kubernetesVersion', key: 'kubernetesVersion', width: 120 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 120,
      render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag>,
    },
    { title: '端点', dataIndex: 'endpoint', key: 'endpoint', ellipsis: true },
    { title: '平台版本', dataIndex: 'platformVersion', key: 'platformVersion', width: 140 },
  ];

  const serviceColumns: ColumnsType<ECSService> = [
    { title: '服务名称', dataIndex: 'serviceName', key: 'serviceName' },
    { title: '期望任务数', dataIndex: 'desiredCount', key: 'desiredCount', width: 120 },
    { title: '运行任务数', dataIndex: 'runningCount', key: 'runningCount', width: 120 },
    {
      title: '部署状态', dataIndex: 'deploymentStatus', key: 'deploymentStatus', width: 140,
      render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag>,
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={5} style={{ marginBottom: 8 }}>ECS 集群</Title>
      <Table<ECSCluster>
        dataSource={ecsClusters}
        columns={ecsColumns}
        rowKey="clusterName"
        size="small"
        pagination={false}
        style={{ marginBottom: 24 }}
        onRow={(record) => ({
          onClick: () => handleClusterClick(record.clusterName),
          style: { cursor: 'pointer' },
        })}
      />

      {selectedCluster && (
        <>
          <Title level={5} style={{ marginBottom: 8 }}>
            集群 "{selectedCluster}" 的服务列表
          </Title>
          {servicesLoading && <LoadingSpinner tip="加载服务列表..." />}
          {servicesError && (
            <ErrorDisplay
              message="加载 ECS 服务列表失败"
              description={servicesError}
              onRetry={() => handleClusterClick(selectedCluster)}
            />
          )}
          {!servicesLoading && !servicesError && (
            <Table<ECSService>
              dataSource={services}
              columns={serviceColumns}
              rowKey="serviceName"
              size="small"
              pagination={false}
              style={{ marginBottom: 24 }}
            />
          )}
        </>
      )}

      <Title level={5} style={{ marginBottom: 8 }}>EKS 集群</Title>
      <Table<EKSCluster>
        dataSource={eksClusters}
        columns={eksColumns}
        rowKey="clusterName"
        size="small"
        pagination={false}
      />
    </div>
  );
};

export default ContainerPanel;
