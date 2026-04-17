import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Row, Col, Statistic, Alert, Table, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import type { BillingSummary, MetricDataPoint, ServiceGrowth } from '../../../shared/types';
import { useBillingStore } from '../../stores/billingStore';
import {
  formatCurrency,
  calculateDailyAverage,
  generateForecastLine,
  calculateForecast,
} from '../../utils/billingUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

const { Text } = Typography;

const COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911',
];

interface ServiceCostRow {
  serviceName: string;
  cost: number;
}

/** Merged data point for the trend chart with actual and forecast amounts */
interface TrendChartDataPoint {
  date: string;
  actual?: number;
  forecast?: number;
}

const BillingPanel: React.FC = () => {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costExplorerDisabled, setCostExplorerDisabled] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [dailyTrend, setDailyTrend] = useState<MetricDataPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Data from billingStore for enhanced sections
  const dailyCosts = useBillingStore((s) => s.dailyCosts);
  const topGrowthServices = useBillingStore((s) => s.topGrowthServices);
  const storeForecast = useBillingStore((s) => s.forecast);
  const storeIsLoading = useBillingStore((s) => s.isLoading);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCostExplorerDisabled(false);
    try {
      const result = await window.electronAPI.service.fetchData('billing');
      if (result.error) {
        if (result.error.code === 'CostExplorerNotEnabled') {
          setCostExplorerDisabled(true);
        } else {
          setError(result.error.message);
        }
      } else {
        setBilling(result.data as BillingSummary);
      }
    } catch (err: any) {
      setError(err.message ?? '加载账单数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const handleServiceClick = useCallback(async (serviceName: string) => {
    setSelectedService(serviceName);
    setTrendLoading(true);
    setDailyTrend([]);
    try {
      const result = await window.electronAPI.service.fetchMetrics('billing', serviceName, '30d');
      if (!result.error && result.data) {
        setDailyTrend(result.data as MetricDataPoint[]);
      }
    } catch {
      // daily trend is best-effort
    } finally {
      setTrendLoading(false);
    }
  }, []);

  // Compute trend chart data: merge actual daily costs with forecast line
  const now = useMemo(() => new Date(), []);
  const totalDaysInMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    [now],
  );

  const trendChartData = useMemo((): TrendChartDataPoint[] => {
    if (dailyCosts.length < 2) return [];

    const forecastLine = generateForecastLine(dailyCosts, totalDaysInMonth);

    // Build a map by date
    const dataMap = new Map<string, TrendChartDataPoint>();

    // Add actual data points
    for (const dc of dailyCosts) {
      dataMap.set(dc.date, { date: dc.date, actual: dc.amount });
    }

    // Add forecast data points; bridge the last actual day so the dashed line connects
    if (forecastLine.length > 0) {
      const sorted = [...dailyCosts].sort((a, b) => a.date.localeCompare(b.date));
      const lastActual = sorted[sorted.length - 1];
      const existing = dataMap.get(lastActual.date);
      if (existing) {
        existing.forecast = lastActual.amount;
      }

      for (const fp of forecastLine) {
        const entry = dataMap.get(fp.date);
        if (entry) {
          entry.forecast = fp.amount;
        } else {
          dataMap.set(fp.date, { date: fp.date, forecast: fp.amount });
        }
      }
    }

    // Sort by date ascending
    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyCosts, totalDaysInMonth]);

  const dailyAverage = useMemo(() => calculateDailyAverage(dailyCosts), [dailyCosts]);

  // Forecast value: use store value, or compute locally
  const forecastValue = useMemo(() => {
    if (storeForecast !== null) return storeForecast;
    return calculateForecast(dailyCosts, totalDaysInMonth);
  }, [storeForecast, dailyCosts, totalDaysInMonth]);

  // Top 5 growth services table columns
  const growthColumns: ColumnsType<ServiceGrowth> = useMemo(
    () => [
      {
        title: '服务名',
        dataIndex: 'serviceName',
        key: 'serviceName',
        ellipsis: true,
      },
      {
        title: '当月费用',
        dataIndex: 'currentCost',
        key: 'currentCost',
        width: 140,
        align: 'right' as const,
        render: (v: number) => formatCurrency(v),
      },
      {
        title: '上月费用',
        dataIndex: 'previousCost',
        key: 'previousCost',
        width: 140,
        align: 'right' as const,
        render: (v: number) => formatCurrency(v),
      },
      {
        title: '增长率',
        key: 'growth',
        width: 120,
        align: 'right' as const,
        render: (_: unknown, record: ServiceGrowth) => {
          if (record.growthLabel === 'new') {
            return <span style={{ color: '#fa8c16', fontWeight: 500 }}>新增</span>;
          }
          if (record.growthPercentage === null) return '—';
          const pct = record.growthPercentage;
          const color = pct > 0 ? '#f5222d' : pct < 0 ? '#52c41a' : '#999';
          return <span style={{ color }}>{pct.toFixed(1)}%</span>;
        },
      },
    ],
    [],
  );

  if (loading) return <LoadingSpinner tip="加载账单数据..." />;
  if (error) return <ErrorDisplay message="加载账单数据失败" description={error} onRetry={loadBilling} />;

  if (costExplorerDisabled) {
    return (
      <div style={{ padding: 16 }}>
        <Alert
          type="warning"
          showIcon
          message="Cost Explorer 未启用"
          description="当前 AWS 账户未启用 Cost Explorer。请登录 AWS 控制台，前往 Billing → Cost Explorer，点击「启用 Cost Explorer」。启用后数据可能需要 24 小时才能生效。"
        />
      </div>
    );
  }

  if (!billing) return null;

  const { totalCost, currency, period, serviceCosts, previousMonthComparison } = billing;
  const { previousTotal, changePercentage } = previousMonthComparison;
  const isIncrease = changePercentage > 0;
  const isDecrease = changePercentage < 0;

  const columns: ColumnsType<ServiceCostRow> = [
    { title: '服务', dataIndex: 'serviceName', key: 'serviceName', ellipsis: true },
    {
      title: `费用 (${currency})`,
      dataIndex: 'cost',
      key: 'cost',
      width: 140,
      align: 'right',
      render: (v: number) => `${v.toFixed(2)}`,
      sorter: (a, b) => a.cost - b.cost,
      defaultSortOrder: 'descend',
    },
  ];

  // Top 10 for charts, rest grouped as "其他"
  const top10 = serviceCosts.slice(0, 10);
  const otherCost = serviceCosts.slice(10).reduce((sum, s) => sum + s.cost, 0);
  const chartData = otherCost > 0
    ? [...top10, { serviceName: '其他', cost: otherCost }]
    : [...top10];

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Determine whether we have enough data for trend chart and forecast
  const hasTrendData = dailyCosts.length >= 2;
  const hasForecastData = dailyCosts.length >= 3;

  return (
    <div style={{ padding: 16 }}>
      {/* ===== NEW: Daily Cost Trend Chart ===== */}
      {!storeIsLoading && (
        <Card title="按日费用趋势" size="small" style={{ marginBottom: 16 }}>
          {hasTrendData ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'actual' ? '实际费用' : '预测费用',
                    ]}
                    labelFormatter={(label: string) => `日期: ${label}`}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === 'actual' ? '实际费用' : '预测费用'
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#1890ff"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                    name="actual"
                  />
                  {hasForecastData && (
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#999"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls={false}
                      name="forecast"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  日均费用: <Text strong>{formatCurrency(dailyAverage)}</Text>
                </Text>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              数据不足，无法生成趋势图
            </div>
          )}
        </Card>
      )}

      {/* ===== NEW: Cost Forecast ===== */}
      {!storeIsLoading && (
        <Card title="费用预测" size="small" style={{ marginBottom: 16 }}>
          {hasForecastData ? (
            <Statistic
              title="预测月末总费用"
              value={forecastValue !== null ? forecastValue : 0}
              precision={2}
              prefix="$"
              formatter={(value) =>
                forecastValue !== null ? formatCurrency(Number(value)) : '$0.00'
              }
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              数据不足，暂无法预测
            </div>
          )}
        </Card>
      )}

      {/* ===== NEW: Top 5 Growth Services ===== */}
      {!storeIsLoading && topGrowthServices.length > 0 && (
        <Card title="Top 5 费用增长服务" size="small" style={{ marginBottom: 16 }}>
          <Table<ServiceGrowth>
            dataSource={topGrowthServices}
            columns={growthColumns}
            rowKey="serviceName"
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {/* Total cost and comparison */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Card size="small">
            <Statistic
              title="当月累计费用"
              value={totalCost}
              precision={2}
              prefix="$"
              suffix={currency}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{period}</div>
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic
              title="上月总费用"
              value={previousTotal}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
        <Col>
          <Card size="small">
            <Statistic
              title="环比变化"
              value={Math.abs(changePercentage)}
              precision={1}
              suffix="%"
              valueStyle={{ color: isIncrease ? '#f5222d' : isDecrease ? '#52c41a' : '#999' }}
              prefix={isIncrease ? <ArrowUpOutlined /> : isDecrease ? <ArrowDownOutlined /> : null}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title="按服务分类费用（柱状图）" size="small">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}`} />
                  <YAxis type="category" dataKey="serviceName" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}`, '费用']} />
                  <Bar dataKey="cost" fill="#1890ff">
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        cursor="pointer"
                        onClick={() => handleServiceClick(chartData[i].serviceName)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>无费用数据</div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="按服务分类费用（饼图）" size="small">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="cost"
                    nameKey="serviceName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ serviceName, percent }) =>
                      `${serviceName}: ${(percent * 100).toFixed(1)}%`
                    }
                    labelLine
                  >
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        cursor="pointer"
                        onClick={() => handleServiceClick(chartData[i].serviceName)}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}`, '费用']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>无费用数据</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Daily trend for selected service */}
      {selectedService && (
        <Card title={`${selectedService} 每日费用趋势`} size="small" style={{ marginBottom: 16 }}>
          {trendLoading ? (
            <LoadingSpinner tip="加载趋势数据..." />
          ) : dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyTrend}>
                <XAxis dataKey="timestamp" tickFormatter={formatDate} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}`} />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(v: number) => [`${v.toFixed(2)}`, '费用']}
                />
                <Line type="monotone" dataKey="value" stroke="#1890ff" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>无每日趋势数据</div>
          )}
        </Card>
      )}

      {/* Service cost table */}
      <Card title="服务费用明细" size="small">
        <Table<ServiceCostRow>
          dataSource={serviceCosts}
          columns={columns}
          rowKey="serviceName"
          size="small"
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({
            onClick: () => handleServiceClick(record.serviceName),
            style: {
              cursor: 'pointer',
              background: record.serviceName === selectedService ? '#e6f7ff' : undefined,
            },
          })}
        />
      </Card>
    </div>
  );
};

export default BillingPanel;
