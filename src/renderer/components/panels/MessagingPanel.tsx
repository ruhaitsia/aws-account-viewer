import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Row, Col, Card, Statistic, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SNSTopic, SQSQueue, SQSQueueDetail } from '../../../shared/types';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

interface MessagingData {
  topics: SNSTopic[];
  queues: SQSQueue[];
}

const QUEUE_TYPE_COLORS: Record<string, string> = {
  standard: 'blue',
  fifo: 'purple',
};

const MessagingPanel: React.FC = () => {
  const [data, setData] = useState<MessagingData>({ topics: [], queues: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQueueUrl, setSelectedQueueUrl] = useState<string | null>(null);
  const [queueDetail, setQueueDetail] = useState<SQSQueueDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.service.fetchData('sns');
      if (result.error) {
        setError(result.error.message);
      } else {
        const raw = result.data as any;
        setData({
          topics: raw?.topics ?? [],
          queues: raw?.queues ?? [],
        });
      }
    } catch (err: any) {
      setError(err.message ?? '加载消息服务数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadQueueDetail = useCallback(async (queueUrl: string) => {
    setDetailLoading(true);
    setQueueDetail(null);
    try {
      const result = await window.electronAPI.service.fetchDetail('sns', queueUrl);
      if (!result.error) {
        setQueueDetail(result.data as SQSQueueDetail);
      }
    } catch {
      // detail is best-effort
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleQueueRowClick = useCallback(
    (record: SQSQueue) => {
      setSelectedQueueUrl(record.queueUrl);
      loadQueueDetail(record.queueUrl);
    },
    [loadQueueDetail],
  );

  if (loading) return <LoadingSpinner tip="加载消息服务数据..." />;
  if (error) return <ErrorDisplay message="加载消息服务数据失败" description={error} onRetry={loadData} />;

  const snsColumns: ColumnsType<SNSTopic> = [
    { title: '主题名称', dataIndex: 'topicName', key: 'topicName' },
    { title: 'ARN', dataIndex: 'topicArn', key: 'topicArn', ellipsis: true },
    { title: '订阅数量', dataIndex: 'subscriptionCount', key: 'subscriptionCount', width: 100 },
    { title: '显示名称', dataIndex: 'displayName', key: 'displayName', render: (v: string) => v || '-' },
  ];

  const sqsColumns: ColumnsType<SQSQueue> = [
    { title: '队列名称', dataIndex: 'queueName', key: 'queueName' },
    {
      title: '类型',
      dataIndex: 'queueType',
      key: 'queueType',
      width: 100,
      render: (type: string) => (
        <Tag color={QUEUE_TYPE_COLORS[type] ?? 'default'}>
          {type === 'fifo' ? 'FIFO' : 'Standard'}
        </Tag>
      ),
    },
    { title: '可见消息数', dataIndex: 'visibleMessages', key: 'visibleMessages', width: 110 },
    { title: '不可见消息数', dataIndex: 'invisibleMessages', key: 'invisibleMessages', width: 120 },
    { title: '延迟消息数', dataIndex: 'delayedMessages', key: 'delayedMessages', width: 110 },
  ];

  const formatSeconds = (seconds: number): string => {
    if (seconds < 60) return `${seconds} 秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时`;
    return `${Math.floor(seconds / 86400)} 天`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic title="SNS 主题数" value={data.topics.length} />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic title="SQS 队列数" value={data.queues.length} />
          </Card>
        </Col>
      </Row>

      {/* SNS Topics */}
      <h4>SNS 主题</h4>
      <Table<SNSTopic>
        dataSource={data.topics}
        columns={snsColumns}
        rowKey="topicArn"
        size="small"
        pagination={{ pageSize: 20 }}
      />

      {/* SQS Queues */}
      <h4 style={{ marginTop: 16 }}>SQS 队列</h4>
      <Table<SQSQueue>
        dataSource={data.queues}
        columns={sqsColumns}
        rowKey="queueUrl"
        size="small"
        pagination={{ pageSize: 20 }}
        onRow={(record) => ({
          onClick: () => handleQueueRowClick(record),
          style: {
            cursor: 'pointer',
            background: record.queueUrl === selectedQueueUrl ? '#e6f7ff' : undefined,
          },
        })}
      />

      {/* Queue Detail */}
      {selectedQueueUrl && (
        <div style={{ marginTop: 16 }}>
          <h4>队列详情</h4>
          {detailLoading ? (
            <LoadingSpinner tip="加载队列详情..." />
          ) : queueDetail ? (
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="可见性超时">
                {formatSeconds(queueDetail.visibilityTimeout)}
              </Descriptions.Item>
              <Descriptions.Item label="消息保留期">
                {formatSeconds(queueDetail.messageRetentionPeriod)}
              </Descriptions.Item>
              <Descriptions.Item label="最大消息大小">
                {formatBytes(queueDetail.maxMessageSize)}
              </Descriptions.Item>
              <Descriptions.Item label="死信队列">
                {queueDetail.deadLetterQueue ?? '未配置'}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MessagingPanel;
