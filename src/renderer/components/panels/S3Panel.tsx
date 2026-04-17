import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic, Descriptions, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { S3Bucket, S3BucketDetail } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

const S3Panel: React.FC = () => {
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [detail, setDetail] = useState<S3BucketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('s3');
      if (result.error) {
        setError(result.error.message);
      } else {
        setBuckets((result.data as S3Bucket[]) ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? '加载 S3 存储桶失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  const loadDetail = useCallback(async (bucketName: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const result = await window.electronAPI.service.fetchDetail('s3', bucketName);
      if (!result.error) {
        setDetail(result.data as S3BucketDetail);
      }
    } catch {
      // detail is best-effort
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(
    (record: S3Bucket) => {
      setSelectedBucket(record.name);
      loadDetail(record.name);
    },
    [loadDetail],
  );

  if (loading) return <LoadingSpinner tip="加载 S3 存储桶..." />;
  if (error) return <ErrorDisplay message="加载 S3 数据失败" description={error} onRetry={loadBuckets} />;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const columns: ColumnsType<S3Bucket> = [
    { title: '存储桶名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '创建日期',
      dataIndex: 'creationDate',
      key: 'creationDate',
      width: 180,
      render: (v: string) => (v ? new Date(v).toLocaleDateString() : '-'),
    },
    { title: 'Region', dataIndex: 'region', key: 'region', width: 140 },
    {
      title: '对象数量',
      dataIndex: 'objectCount',
      key: 'objectCount',
      width: 120,
      render: (v: number) => (v > 0 ? v.toLocaleString() : '-'),
    },
    {
      title: '总大小',
      dataIndex: 'totalSize',
      key: 'totalSize',
      width: 120,
      render: (v: number) => formatSize(v),
    },
    {
      title: '存储类别',
      dataIndex: 'storageClassDistribution',
      key: 'storageClass',
      width: 200,
      render: (dist: Record<string, number>) => {
        const keys = Object.keys(dist);
        if (keys.length === 0) return '-';
        return keys.map((cls) => (
          <Tag key={cls} style={{ marginBottom: 2 }}>
            {cls}: {dist[cls]}
          </Tag>
        ));
      },
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Header note: S3 is global */}
      <div style={{ marginBottom: 12, color: '#888', fontSize: 13 }}>
        S3 为全局服务，不受 Region 限制
      </div>

      {/* Summary stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="存储桶总数" value={buckets.length} />
          </Card>
        </Col>
      </Row>

      {/* Bucket table */}
      <Table<S3Bucket>
        dataSource={buckets}
        columns={columns}
        rowKey="name"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.name === selectedBucket ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* Bucket detail */}
      {selectedBucket && (
        <div style={{ marginTop: 16 }}>
          <h4>存储桶详情：{selectedBucket}</h4>
          {detailLoading ? (
            <LoadingSpinner tip="加载桶详情..." />
          ) : detail ? (
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="访问策略">
                <Tag color={detail.accessPolicy === 'public' ? 'red' : 'green'}>
                  {detail.accessPolicy === 'public' ? '公开' : '私有'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="版本控制">
                <Tag color={detail.versioningEnabled ? 'blue' : 'default'}>
                  {detail.versioningEnabled ? '已启用' : '未启用'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="加密配置">{detail.encryptionConfig}</Descriptions.Item>
              <Descriptions.Item label="生命周期规则">
                {detail.lifecycleRules.length > 0
                  ? detail.lifecycleRules.map((rule, i) => (
                      <Tag key={i} style={{ marginBottom: 2 }}>
                        {rule}
                      </Tag>
                    ))
                  : '无'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="无法加载桶详情" />
          )}
        </div>
      )}
    </div>
  );
};

export default S3Panel;
