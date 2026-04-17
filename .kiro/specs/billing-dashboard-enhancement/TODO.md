# 待修复问题

以下问题在 2026-04-15 测试中发现，与本次账单增强无关，属于应用原有逻辑缺陷。

## Bug 1: DocumentDB 被错误归类到 RDS

- **现象**: DocumentDB 实例出现在 RDS 面板中
- **区域**: us-east-1（弗吉尼亚）
- **可能原因**: `rdsFetcher` 使用 RDS API 拉取数据时未过滤 DocumentDB 引擎类型，或 `dashboardAggregator` 未将 DocumentDB 作为独立服务处理
- **排查方向**: 检查 `src/main/services/rdsFetcher.ts` 中的 DescribeDBInstances 调用是否包含了 DocumentDB 实例；考虑新增独立的 DocumentDB 服务卡片和 fetcher

## Bug 2: DocumentDB 费用未显示

- **现象**: AWS Console 中 DocumentDB 有费用产生，但应用中未显示
- **区域**: us-east-1（弗吉尼亚）
- **可能原因**: Cost Explorer 返回的服务名为 `Amazon DocumentDB` ，但 Dashboard 的 ServiceSummaryCard 按 `serviceName`（如 `rds`、`ec2`）匹配费用，应用中没有 `documentdb` 服务卡片，导致费用无处映射
- **排查方向**: 检查 `billingUtils.matchServiceCosts` 的匹配逻辑；考虑在 `dashboardAggregator` 中新增 DocumentDB 服务定义
