import React, { useEffect } from 'react';
import { Row, Col } from 'antd';
import { useAppStore } from '../../stores/appStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useBillingStore } from '../../stores/billingStore';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import ServiceSummaryCard from './ServiceSummaryCard';
import CostSummaryBar from './CostSummaryBar';
import type { ViewName } from '../../types';

const Dashboard: React.FC = () => {
  const { isLoading, error, loadDashboard } = useDashboardStore();
  const serviceSummaries = useAppStore((s) => s.serviceSummaries);
  const currentRegion = useAppStore((s) => s.currentRegion);
  const isRefreshing = useAppStore((s) => s.isRefreshing);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const billingStore = useBillingStore();

  useEffect(() => {
    loadDashboard();
    billingStore.loadBillingForDashboard();
  }, [loadDashboard, currentRegion]);

  // Re-fetch billing data after a global refresh completes
  useEffect(() => {
    if (!isRefreshing) {
      billingStore.loadBillingForDashboard();
    }
  }, [isRefreshing]);

  if (isLoading || isRefreshing) {
    return <LoadingSpinner tip="加载 Dashboard 数据..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        message="加载 Dashboard 失败"
        description={error}
        onRetry={loadDashboard}
      />
    );
  }

  const handleCardClick = (serviceName: string) => {
    setCurrentView(serviceName as ViewName);
  };

  return (
    <div style={{ padding: '16px' }}>
      <CostSummaryBar
        totalCost={billingStore.totalCost}
        currency={billingStore.currency}
        previousMonthTotal={billingStore.previousMonthTotal}
        changePercentage={billingStore.changePercentage}
        dailyCosts={billingStore.dailyCosts}
        isLoading={billingStore.isLoading}
        error={billingStore.error}
        costExplorerDisabled={billingStore.costExplorerDisabled}
        onRetry={() => billingStore.loadBillingForDashboard()}
      />
      <Row gutter={[16, 16]}>
        {serviceSummaries.map((summary) => (
          <Col key={summary.serviceName} xs={12} sm={12} md={8} lg={6}>
            <ServiceSummaryCard
              summary={summary}
              cost={
                billingStore.isLoading
                  ? undefined
                  : billingStore.error
                    ? null
                    : billingStore.serviceCostMap[summary.serviceName] ?? 0
              }
              onClick={() => handleCardClick(summary.serviceName)}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Dashboard;
