import { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Progress, Typography, Space, Alert, Statistic, Row, Col } from 'antd';
import { CloudUploadOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { UploadProgress, UploadConfig } from '../../../shared/types';

const { Title, Text } = Typography;

interface UploadResultInfo {
  success: boolean;
  dataSize: number;
  duration: number;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} 秒`;
}

export default function UploadPanel() {
  const [form] = Form.useForm();
  const [configSaved, setConfigSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResultInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing config on mount
  useEffect(() => {
    window.electronAPI.upload.getConfig().then((config) => {
      if (config) {
        form.setFieldsValue(config);
        setConfigSaved(true);
      }
    });
  }, [form]);

  // Listen for upload progress events
  useEffect(() => {
    window.electronAPI.upload.onProgress((p: UploadProgress) => {
      setProgress(p);
    });
  }, []);

  const handleSaveConfig = useCallback(async (values: UploadConfig) => {
    try {
      await window.electronAPI.upload.configure(values);
      setConfigSaved(true);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存配置失败');
    }
  }, []);

  const handleUpload = useCallback(async () => {
    setUploading(true);
    setProgress(null);
    setResult(null);
    setError(null);
    try {
      const uploadResult = await window.electronAPI.upload.uploadData();
      setResult(uploadResult);
      if (!uploadResult.success && uploadResult.error) {
        setError(uploadResult.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>数据上传</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        将收集的 AWS 账户数据上传到云端 API 进行分析。上传前会自动脱敏处理，移除 AWS 凭证信息。
      </Text>

      {/* Configuration Section */}
      <Card
        title={<><SettingOutlined /> 上传配置</>}
        style={{ marginBottom: 16 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
        >
          <Form.Item
            name="apiEndpoint"
            label="API 端点 URL"
            rules={[
              { required: true, message: '请输入 API 端点 URL' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input placeholder="https://api.example.com/upload" />
          </Form.Item>
          <Form.Item
            name="authToken"
            label="认证令牌"
            rules={[{ required: true, message: '请输入认证令牌' }]}
          >
            <Input.Password placeholder="Bearer token" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
              {configSaved && (
                <Text type="success">
                  <CheckCircleOutlined /> 配置已保存
                </Text>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Upload Action Section */}
      <Card
        title={<><CloudUploadOutlined /> 上传数据</>}
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleUpload}
            loading={uploading}
            disabled={!configSaved}
            size="large"
          >
            {uploading ? '上传中...' : '开始上传'}
          </Button>

          {!configSaved && (
            <Text type="warning">请先保存上传配置</Text>
          )}

          {/* Progress Indicator */}
          {uploading && progress && (
            <div style={{ marginTop: 16 }}>
              <Progress
                percent={progress.percentage}
                status="active"
                format={(pct) => `${pct}%`}
              />
              <Text type="secondary">
                {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.totalBytes)}
              </Text>
            </div>
          )}

          {/* Upload Result */}
          {result && result.success && (
            <Alert
              type="success"
              showIcon
              message="上传成功"
              description={
                <Row gutter={24}>
                  <Col>
                    <Statistic title="数据大小" value={formatBytes(result.dataSize)} />
                  </Col>
                  <Col>
                    <Statistic title="上传耗时" value={formatDuration(result.duration)} />
                  </Col>
                </Row>
              }
              style={{ marginTop: 16 }}
            />
          )}

          {/* Error Display */}
          {error && (
            <Alert
              type="error"
              showIcon
              message="上传失败"
              description={error}
              style={{ marginTop: 16 }}
            />
          )}
        </Space>
      </Card>
    </div>
  );
}
