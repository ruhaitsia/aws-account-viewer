import React from 'react';
import { Spin } from 'antd';

export interface LoadingSpinnerProps {
  tip?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ tip = '加载中...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        minHeight: 200,
      }}
    >
      <Spin size="large" tip={tip}>
        <div style={{ padding: 50 }} />
      </Spin>
    </div>
  );
};

export default LoadingSpinner;
