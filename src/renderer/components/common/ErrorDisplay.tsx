import React from 'react';
import { Alert, Button } from 'antd';

export interface ErrorDisplayProps {
  message: string;
  description?: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, description, onRetry }) => {
  return (
    <div style={{ padding: '16px' }}>
      <Alert
        type="error"
        showIcon
        message={message}
        description={description}
      />
      {onRetry && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Button type="primary" onClick={onRetry}>
            重试
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;
