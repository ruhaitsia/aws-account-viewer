# Requirements Document

## Introduction

本需求文档描述 AWS Account Viewer 桌面应用的账单增强功能。当前应用已具备基础的 Billing_Panel（当月总费用、按服务分类柱状图/饼图、上月对比）和 Dashboard 的 Service_Summary_Card（仅显示资源数量）。本次增强旨在将费用信息深度融入 Dashboard 和 Billing_Panel，使架构师能在一个界面中快速掌握客户的费用全貌、各服务费用分布、费用趋势和费用预测，从而更高效地进行成本分析和优化建议。

## Glossary

- **Application**: AWS Account Viewer 桌面应用程序主体
- **Dashboard**: 应用主界面，用于展示 AWS 账户使用情况的汇总视图
- **Service_Summary_Card**: Dashboard 上展示各服务资源数量和费用信息的卡片组件
- **Cost_Summary_Bar**: Dashboard 顶部的费用摘要栏组件，展示当月总费用、上月对比和迷你趋势图
- **Billing_Panel**: 展示账单详情的界面面板，包含费用趋势、费用预测和费用增长分析
- **Billing_Fetcher**: 主进程中负责通过 AWS Cost Explorer API 获取费用数据的模块
- **Cost_Explorer_API**: AWS Cost Explorer 服务提供的费用查询接口
- **Daily_Cost_Data**: 按日粒度的费用数据，包含日期和对应金额
- **Cost_Forecast**: 基于历史费用数据通过线性外推计算的月末预测费用
- **Service_Cost**: 单个 AWS 服务在指定时间段内的费用金额
- **Mini_Trend_Chart**: Cost_Summary_Bar 中展示最近 7 天费用走势的小型折线图
- **Top_N_Growth_Services**: 费用增长率最高的前 N 个服务列表

## Requirements

### Requirement 1: Dashboard 服务卡片显示当月费用

**User Story:** 作为架构师，我希望在 Dashboard 的每个服务卡片上看到该服务当月的费用金额，以便在浏览资源概览时同步了解各服务的费用分布。

#### Acceptance Criteria

1. WHEN Dashboard 加载完成后, THE Service_Summary_Card SHALL 在资源数量下方展示该服务当月累计费用金额，格式为 "$X.XX"
2. WHEN 某个服务当月费用为零时, THE Service_Summary_Card SHALL 显示 "$0.00" 而非隐藏费用信息
3. IF 费用数据加载失败, THEN THE Service_Summary_Card SHALL 在费用区域显示 "—" 占位符，不影响资源数量的正常展示
4. THE Billing_Fetcher SHALL 在 Dashboard 加载时获取按服务分类的当月费用数据，并将费用数据与对应的 Service_Summary_Card 进行匹配
5. WHEN 用户触发全局刷新时, THE Service_Summary_Card SHALL 同步更新费用数据

### Requirement 2: Dashboard 顶部费用摘要栏

**User Story:** 作为架构师，我希望在 Dashboard 顶部看到当月费用总览，包括总费用、与上月的对比和近期趋势，以便快速评估客户的整体费用状况。

#### Acceptance Criteria

1. THE Cost_Summary_Bar SHALL 在 Dashboard 顶部展示当月累计总费用，格式为 "$X,XXX.XX"，包含千位分隔符
2. THE Cost_Summary_Bar SHALL 展示与上月同期的费用对比，包括上月总费用金额和增减百分比，增加用红色箭头标识，减少用绿色箭头标识
3. THE Cost_Summary_Bar SHALL 展示一个 Mini_Trend_Chart，以折线图形式显示最近 7 天的每日费用走势
4. WHEN 费用数据尚未加载完成时, THE Cost_Summary_Bar SHALL 显示加载骨架屏（Skeleton），不阻塞 Dashboard 其余内容的渲染
5. IF 费用数据加载失败, THEN THE Cost_Summary_Bar SHALL 显示 "费用数据不可用" 提示信息和重试按钮
6. IF 当前 AWS 账户未启用 Cost Explorer, THEN THE Cost_Summary_Bar SHALL 显示简短提示 "Cost Explorer 未启用"，并提供跳转到 Billing_Panel 查看详情的链接

### Requirement 3: Billing_Fetcher 获取按日费用数据

**User Story:** 作为架构师，我希望系统能获取按日粒度的费用数据，以便支持费用趋势图和费用预测功能。

#### Acceptance Criteria

1. THE Billing_Fetcher SHALL 通过 Cost_Explorer_API 获取当月从月初到当前日期的 Daily_Cost_Data，粒度为 DAILY
2. THE Billing_Fetcher SHALL 在每条 Daily_Cost_Data 中包含日期（YYYY-MM-DD 格式）和对应的费用金额（数值类型）
3. THE Billing_Fetcher SHALL 将 Daily_Cost_Data 按日期升序排列后返回
4. IF Cost_Explorer_API 返回错误, THEN THE Billing_Fetcher SHALL 返回空的 Daily_Cost_Data 数组，并在结果中附带错误信息
5. THE Billing_Fetcher SHALL 复用现有的 Cost Explorer 客户端配置（region 固定为 us-east-1）

### Requirement 4: Billing_Panel 按日费用趋势总览

**User Story:** 作为架构师，我希望在 Billing_Panel 中看到当月每日费用的趋势图，以便识别费用波动和异常消费。

#### Acceptance Criteria

1. THE Billing_Panel SHALL 在现有内容上方展示一个按日费用趋势折线图，X 轴为日期，Y 轴为费用金额（美元）
2. THE Billing_Panel SHALL 在趋势折线图中以不同颜色区分实际费用线和预测费用线
3. WHEN 用户将鼠标悬停在趋势图的某个数据点上时, THE Billing_Panel SHALL 显示该日期的具体费用金额
4. WHEN 当月天数少于 2 天时, THE Billing_Panel SHALL 显示 "数据不足，无法生成趋势图" 的提示信息
5. THE Billing_Panel SHALL 在趋势图下方显示当月日均费用统计值

### Requirement 5: Billing_Panel 费用预测

**User Story:** 作为架构师，我希望看到基于当前消费趋势的月末费用预测，以便提前评估客户的月度费用预算。

#### Acceptance Criteria

1. THE Billing_Panel SHALL 基于当月已有的 Daily_Cost_Data 通过线性外推计算月末预测总费用
2. THE Billing_Panel SHALL 在趋势图中以虚线形式展示从当前日期到月末的预测费用走势
3. THE Billing_Panel SHALL 在趋势图旁展示预测月末总费用数值，格式为 "$X,XXX.XX"
4. WHEN 当月已有数据天数少于 3 天时, THE Billing_Panel SHALL 显示 "数据不足，暂无法预测" 的提示信息，不展示预测线
5. THE Cost_Forecast 计算函数 SHALL 接受 Daily_Cost_Data 数组和当月总天数作为输入，返回预测的月末总费用数值
6. IF 所有已有日期的费用均为零, THEN THE Billing_Panel SHALL 将预测费用显示为 "$0.00"

### Requirement 6: Billing_Panel Top N 费用增长最快服务

**User Story:** 作为架构师，我希望快速识别费用增长最快的服务，以便针对性地进行成本优化分析。

#### Acceptance Criteria

1. THE Billing_Panel SHALL 展示费用增长率最高的前 5 个服务列表（Top_N_Growth_Services），每项包含服务名称、当月费用、上月费用和增长百分比
2. THE Billing_Fetcher SHALL 通过 Cost_Explorer_API 获取上月按服务分类的费用数据，用于计算各服务的费用增长率
3. THE Billing_Panel SHALL 按增长百分比从高到低排序展示 Top_N_Growth_Services
4. WHEN 某个服务上月费用为零且当月费用大于零时, THE Billing_Panel SHALL 将该服务的增长标记为 "新增" 而非显示无穷大百分比
5. WHEN 某个服务当月费用为零时, THE Billing_Panel SHALL 将该服务从 Top_N_Growth_Services 列表中排除
6. IF 可用的服务费用数据少于 5 个, THEN THE Billing_Panel SHALL 展示所有可用的服务，不补齐到 5 个

