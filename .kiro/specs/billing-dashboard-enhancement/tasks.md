# 实现计划：账单 Dashboard 增强

## 概述

在现有 AWS Account Viewer 桌面应用基础上增强账单功能。实现分为 6 个阶段：先扩展数据类型和后端数据获取，再创建纯计算工具函数（含属性测试），然后新增状态管理和 IPC 通道，接着实现 UI 组件（CostSummaryBar、ServiceSummaryCard 增强、BillingPanel 增强），最后集成联调。

## 任务

- [x] 1. 新增共享类型定义和 billingFetcher 后端扩展
  - [x] 1.1 在 `src/shared/types.ts` 中新增 `DailyCostData`、`BillingDashboardData`、`ServiceGrowth` 类型定义
    - 新增 `DailyCostData` 接口（date: string, amount: number）
    - 新增 `BillingDashboardData` 接口（包含 currentMonthServiceCosts、totalCost、currency、previousMonthTotal、changePercentage、dailyCosts、previousMonthServiceCosts）
    - 新增 `ServiceGrowth` 接口（serviceName、currentCost、previousCost、growthPercentage、growthLabel）
    - _需求: 3.1, 3.2, 6.1_

  - [x] 1.2 在 `src/main/services/billingFetcher.ts` 中新增 `fetchBillingDashboardData` 函数和 `parseDailyResponse` 函数
    - 新增 `parseDailyResponse` 函数：解析 Cost Explorer DAILY 响应为 DailyCostData 数组，按日期升序排列
    - 新增 `fetchBillingDashboardData` 函数：并行发起 4 个 Cost Explorer API 调用（当月按服务、上月总计、当月按日、上月按服务），返回 `BillingDashboardData`
    - 复用现有 Cost Explorer 客户端配置（region 固定 us-east-1）
    - 错误处理：API 失败时返回空数据 + error 字段，与现有 `fetchBillingData` 模式一致
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 6.2_

  - [x]* 1.3 为 `parseDailyResponse` 编写属性测试
    - **Property 3: 按日费用数据解析与排序**
    - 验证：输出按日期升序排列，每条记录包含有效 YYYY-MM-DD 日期和数值金额
    - **验证需求: 3.2, 3.3**

  - [x]* 1.4 为 `calculateChangePercentage` 编写属性测试
    - **Property 8: 费用变化百分比计算正确性**
    - 验证：previous > 0 时返回 `(current - previous) / previous * 100`；previous 为 0 时返回 null
    - **验证需求: 2.2**

- [x] 2. 创建 billingUtils 纯计算工具函数
  - [x] 2.1 创建 `src/renderer/utils/billingUtils.ts`，实现所有纯计算函数
    - 实现 `formatCurrency(amount, currency?)`: 格式化为 "$X,XXX.XX" 带千位分隔符
    - 实现 `getRecentDays(dailyCosts, days)`: 提取最近 N 天数据，按日期升序
    - 实现 `calculateDailyAverage(dailyCosts)`: 计算日均费用
    - 实现 `calculateForecast(dailyCosts, totalDaysInMonth)`: 线性外推月末预测，< 3 天返回 null
    - 实现 `generateForecastLine(dailyCosts, totalDaysInMonth)`: 生成预测线数据点
    - 实现 `buildServiceCostMap(serviceCosts)`: 转换为 serviceName → cost 映射
    - 实现 `matchServiceCosts(serviceCosts, serviceSummaries)`: 匹配服务费用，未匹配返回 0
    - 实现 `getTopGrowthServices(currentServiceCosts, previousServiceCosts, topN?)`: 计算 Top N 增长服务
    - _需求: 1.1, 1.2, 2.1, 2.2, 2.3, 4.5, 5.1, 5.4, 5.5, 5.6, 6.1, 6.3, 6.4, 6.5, 6.6_

  - [x]* 2.2 为 `formatCurrency` 编写属性测试
    - **Property 1: 费用格式化正确性**
    - 验证：输出以 "$" 开头，包含恰好两位小数，amount ≥ 1000 时包含千位分隔符
    - **验证需求: 2.1**

  - [x]* 2.3 为 `matchServiceCosts` 编写属性测试
    - **Property 2: 服务费用匹配完整性**
    - 验证：存在的服务映射值等于费用金额，不存在的服务映射值为 0
    - **验证需求: 1.1, 1.2**

  - [x]* 2.4 为 `calculateForecast` 编写属性测试
    - **Property 4: 费用预测线性外推正确性**
    - 验证：forecast = (总费用 / 数据天数) * totalDaysInMonth；< 3 天返回 null
    - **验证需求: 5.1, 5.4, 5.5**

  - [x]* 2.5 为 `calculateDailyAverage` 编写属性测试
    - **Property 5: 日均费用计算正确性**
    - 验证：返回值等于 sum(amounts) / length；空数组返回 0
    - **验证需求: 4.5**

  - [x]* 2.6 为 `getTopGrowthServices` 编写属性测试
    - **Property 6: Top N 费用增长服务排序与过滤**
    - 验证：不含当月费用为零的服务；上月为零当月 > 0 标记 "新增"；按增长率降序；长度 ≤ topN
    - **验证需求: 6.1, 6.3, 6.4, 6.5, 6.6**

  - [x]* 2.7 为 `getRecentDays` 编写属性测试
    - **Property 7: 最近 N 天数据提取正确性**
    - 验证：长度为 min(N, 输入长度)，包含日期最大的 N 条记录，按日期升序
    - **验证需求: 2.3**

- [x] 3. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 4. 新增 IPC 通道、Preload API 和 billingStore
  - [x] 4.1 在 `src/shared/ipcChannels.ts` 中新增 `FETCH_BILLING_DASHBOARD` 通道
    - 新增 `FETCH_BILLING_DASHBOARD: 'billing:fetch-dashboard'`
    - _需求: 3.1_

  - [x] 4.2 在 `src/main/ipc/handlers.ts` 中注册 `billing:fetch-dashboard` IPC 处理器
    - 导入 `fetchBillingDashboardData`
    - 注册 handler：获取 clientConfig 后调用 `fetchBillingDashboardData`
    - _需求: 3.1, 3.5_

  - [x] 4.3 在 `src/preload/index.ts` 中新增 `billing.fetchDashboard` API
    - 在 `electronAPI` 中新增 `billing` 命名空间
    - 暴露 `fetchDashboard` 方法：调用 `ipcRenderer.invoke('billing:fetch-dashboard')`
    - _需求: 3.1_

  - [x] 4.4 创建 `src/renderer/stores/billingStore.ts` Zustand store
    - 定义 state：totalCost、currency、previousMonthTotal、changePercentage、dailyCosts、serviceCostMap、topGrowthServices、forecast、isLoading、error、costExplorerDisabled
    - 实现 `loadBillingForDashboard` action：调用 `window.electronAPI.billing.fetchDashboard()`，使用 billingUtils 计算 serviceCostMap、topGrowthServices、forecast
    - 实现 `reset` action
    - _需求: 1.4, 2.4, 2.5, 2.6_

- [x] 5. 实现 UI 组件
  - [x] 5.1 创建 `src/renderer/components/dashboard/CostSummaryBar.tsx` 组件
    - 展示当月总费用（formatCurrency 格式化，带千位分隔符）
    - 展示上月对比：上月金额 + 增减百分比 + 颜色箭头（红色增加/绿色减少）
    - 展示最近 7 天迷你趋势折线图（Recharts LineChart，高度约 60px）
    - 加载中显示 Ant Design Skeleton
    - 错误时显示 "费用数据不可用" + 重试按钮
    - Cost Explorer 未启用时显示提示 + 跳转 BillingPanel 链接
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.2 增强 `src/renderer/components/dashboard/ServiceSummaryCard.tsx`
    - 新增 `cost?: number | null` prop
    - cost 为 number 时在资源数量下方显示 "$X.XX"
    - cost 为 0 时显示 "$0.00"
    - cost 为 null 时显示 "—" 占位符
    - cost 为 undefined 时不显示费用区域
    - _需求: 1.1, 1.2, 1.3_

  - [x] 5.3 增强 `src/renderer/components/dashboard/Dashboard.tsx`
    - 导入 CostSummaryBar 和 billingStore
    - 在 Dashboard 顶部渲染 CostSummaryBar
    - 在 ServiceSummaryCard 中传入对应服务的费用数据
    - Dashboard 加载时触发 billingStore.loadBillingForDashboard()
    - 全局刷新时同步更新费用数据
    - _需求: 1.4, 1.5, 2.4_

  - [x] 5.4 增强 `src/renderer/components/panels/BillingPanel.tsx`
    - 在现有内容上方新增按日费用趋势折线图（实际费用蓝色实线 + 预测费用灰色虚线）
    - 趋势图支持鼠标悬停显示具体日期和金额（Recharts Tooltip）
    - 当月天数 < 2 天时显示 "数据不足，无法生成趋势图"
    - 趋势图下方显示日均费用统计值
    - 趋势图旁展示预测月末总费用（formatCurrency 格式化）
    - 数据天数 < 3 天时显示 "数据不足，暂无法预测"
    - 全零费用时预测显示 "$0.00"
    - 预测线以虚线形式从当前日期延伸到月末
    - 新增 Top 5 费用增长服务列表（表格：服务名、当月费用、上月费用、增长率）
    - "新增" 服务标记为 "新增" 而非无穷大百分比
    - 当月费用为零的服务从列表排除
    - 可用服务 < 5 个时展示所有可用服务
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.6, 6.1, 6.3, 6.4, 6.5, 6.6_

  - [x]* 5.5 为 CostSummaryBar 编写单元测试
    - 测试加载状态渲染 Skeleton
    - 测试错误状态渲染提示和重试按钮
    - 测试 Cost Explorer 未启用状态
    - 测试正常数据渲染（总费用、对比、趋势图）
    - _需求: 2.1, 2.2, 2.4, 2.5, 2.6_

  - [x]* 5.6 为增强后的 ServiceSummaryCard 编写单元测试
    - 测试 cost 为正数时显示格式化金额
    - 测试 cost 为 0 时显示 "$0.00"
    - 测试 cost 为 null 时显示 "—"
    - 测试 cost 为 undefined 时不显示费用区域
    - _需求: 1.1, 1.2, 1.3_

- [x] 6. 集成联调和最终检查点
  - [x] 6.1 集成联调：确保 Dashboard 加载时同时获取资源数据和费用数据
    - 验证 Dashboard 加载流程：dashboardStore.loadDashboard() 和 billingStore.loadBillingForDashboard() 并行执行
    - 验证全局刷新时费用数据同步更新
    - 验证 BillingPanel 使用 billingStore 数据渲染新增功能
    - 确保费用数据加载失败不影响资源数量正常展示
    - _需求: 1.3, 1.4, 1.5, 2.4, 2.5_

  - [x]* 6.2 编写集成测试
    - 测试 `fetchBillingDashboardData` 使用 mock Cost Explorer 响应的完整流程
    - 测试 billingStore 加载数据后各计算字段的正确性
    - _需求: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.3 最终检查点 - 确保所有测试通过
    - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 交付
- 每个任务引用了具体的需求编号以确保可追溯性
- 检查点确保增量验证
- 属性测试验证设计文档中定义的 8 个 Correctness Properties
- 单元测试验证具体的边界条件和 UI 渲染
- 设计文档使用 TypeScript，所有代码示例和实现均使用 TypeScript
