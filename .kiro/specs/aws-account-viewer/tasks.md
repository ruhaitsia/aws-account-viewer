# Implementation Plan: AWS Account Viewer

## Overview

基于 Electron + React + TypeScript 构建跨平台桌面应用，通过 AWS SDK v3 获取并展示 AWS 账户资源概览。采用增量实现策略：先搭建项目骨架和核心基础设施（凭证管理、IPC 通信），再逐步实现各服务面板，最后完成数据导出/上传和集成联调。

## Tasks

- [x] 1. 项目初始化与核心基础设施
  - [x] 1.1 初始化 Electron + React + TypeScript 项目结构
    - 使用 Vite 创建 React + TypeScript 项目
    - 配置 Electron 主进程入口 `src/main/index.ts`
    - 配置 preload 脚本 `src/preload/index.ts`
    - 配置 `vite.config.ts` 和 `tsconfig.json`
    - 安装核心依赖：electron, react, react-dom, typescript, vite, antd, zustand, recharts
    - 创建 `electron-builder.yml` 跨平台打包配置
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 定义共享类型和 IPC 通道常量
    - 创建 `src/shared/types.ts`，定义所有数据模型接口（EC2Instance, S3Bucket, RDSInstance 等）
    - 创建 `src/shared/ipcChannels.ts`，定义所有 IPC 通道常量
    - 创建 `src/renderer/types/index.ts`，定义 UI 层专用类型
    - _Requirements: 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2, 10.2, 11.2, 12.2, 13.2, 14.2, 15.2_

  - [x] 1.3 实现 Preload 脚本和 IPC 桥接
    - 实现 `src/preload/index.ts`，通过 contextBridge 暴露安全 API（ElectronAPI 接口）
    - 在主进程 `src/main/ipc/handlers.ts` 中注册所有 IPC handler
    - _Requirements: 2.1, 2.3_

- [x] 2. 凭证管理模块
  - [x] 2.1 实现 CredentialManager 核心逻辑
    - 创建 `src/main/credentials/credentialManager.ts`
    - 实现 `loadProfiles()`：解析 `~/.aws/credentials` 和 `~/.aws/config` 文件，提取所有 profile
    - 实现 `validateCredential()`：调用 STS GetCallerIdentity 验证凭证，5 秒超时
    - 实现 `setManualCredential()`：接受手动输入的 AK/SK/Region
    - 实现 `getActiveCredential()` 和 `getClientConfig()`
    - 实现错误映射函数：将 AWS 错误码映射为包含 type/message/suggestion 的结构化结果
    - 凭证仅保存在内存中，不持久化到磁盘
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 编写属性测试：AWS 配置文件解析完整性
    - **Property 1: AWS 配置文件解析完整性**
    - **Validates: Requirements 2.1**

  - [ ]* 2.3 编写属性测试：错误映射完整性
    - **Property 2: 错误映射完整性**
    - **Validates: Requirements 2.5**

  - [x] 2.4 实现凭证管理 UI
    - 创建 `src/renderer/stores/credentialStore.ts`（Zustand store）
    - 创建 `src/renderer/components/credential/CredentialForm.tsx`
    - 实现 Profile 下拉选择列表
    - 实现手动输入表单（Access Key ID、Secret Access Key、Region）
    - 实现验证状态展示和错误信息显示
    - _Requirements: 2.2, 2.3, 2.5_

- [x] 3. Checkpoint - 凭证管理模块验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 应用布局与导航框架
  - [x] 4.1 实现应用主布局
    - 创建 `src/renderer/App.tsx` 主应用组件
    - 创建 `src/renderer/main.tsx` 渲染进程入口
    - 创建 `src/renderer/components/layout/AppLayout.tsx`，实现左侧导航 + 顶部栏 + 主内容区三栏布局
    - _Requirements: 1.2, 22.1_

  - [x] 4.2 实现 TopBar 组件
    - 创建 `src/renderer/components/layout/TopBar.tsx`
    - 展示当前 AWS 账户 ID、账户别名和当前 Region
    - 实现 Region 选择器下拉列表，列出所有可用 AWS Region，标注默认 Region
    - 实现全局刷新按钮和最后更新时间戳显示
    - _Requirements: 3.5, 20.1, 20.3, 21.1, 21.3_

  - [x] 4.3 实现 ServiceNavigator 组件
    - 创建 `src/renderer/components/layout/ServiceNavigator.tsx`
    - 按类别分组展示服务：计算（EC2、Lambda、ECS/EKS）、存储（S3、DynamoDB）、数据库（RDS）、网络（VPC、ELB、CloudFront、Route 53）、消息（SNS/SQS）、安全（IAM）、监控（CloudWatch）、费用（账单）
    - 每个服务名称旁显示资源数量徽标
    - 无资源的服务显示为灰色并标注"无资源"
    - 点击服务切换主内容区域到对应面板
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ]* 4.4 编写属性测试：服务分组正确性
    - **Property 15: 服务分组正确性**
    - **Validates: Requirements 22.2**

  - [x] 4.5 实现通用 UI 组件
    - 创建 `src/renderer/components/common/ErrorDisplay.tsx`：统一错误展示 + 重试按钮
    - 创建 `src/renderer/components/common/LoadingSpinner.tsx`：加载状态指示器
    - 创建 `src/renderer/components/common/StatusBadge.tsx`：健康状态颜色编码徽标
    - 创建 `src/renderer/components/charts/MetricChart.tsx`：基于 Recharts 的折线图组件
    - _Requirements: 3.3, 4.5, 16.3_

- [x] 5. Dashboard 仪表盘
  - [x] 5.1 实现 Dashboard 数据获取
    - 在主进程中实现 Dashboard 数据聚合逻辑：并行调用各服务 Fetcher 获取资源计数
    - 创建 `src/renderer/stores/dashboardStore.ts`
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 实现 Dashboard UI
    - 创建 `src/renderer/components/dashboard/Dashboard.tsx`
    - 创建 `src/renderer/components/dashboard/ServiceSummaryCard.tsx`
    - 以卡片形式展示 13 个服务的资源计数（EC2、S3、RDS、Lambda、ELB、VPC、ECS、EKS、DynamoDB、CloudFront、SNS、SQS、Route 53）
    - 卡片颜色编码标注健康状态（绿/黄/红）
    - 点击卡片导航到对应服务详细面板
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.3 编写属性测试：健康状态判定有效性
    - **Property 3: 健康状态判定有效性**
    - **Validates: Requirements 3.3**

- [x] 6. EC2、S3、RDS 服务面板
  - [x] 6.1 实现 EC2 Fetcher 和面板
    - 创建 `src/main/services/ec2Fetcher.ts`：调用 DescribeInstances，转换为 EC2Instance 列表
    - 实现实例 CloudWatch 指标获取（CPU 利用率、网络流量，最近 1 小时）
    - 创建 `src/renderer/components/panels/EC2Panel.tsx`：实例列表、状态汇总统计、选中实例指标图表、错误处理 + 重试
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.2 实现 S3 Fetcher 和面板
    - 创建 `src/main/services/s3Fetcher.ts`：调用 ListBuckets，获取各桶详情（对象数、大小、存储类别分布）
    - 实现桶详情获取（访问策略、版本控制、加密、生命周期规则）
    - 创建 `src/renderer/components/panels/S3Panel.tsx`：桶列表、汇总统计、选中桶详情、错误处理 + 重试
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.3 实现 RDS Fetcher 和面板
    - 创建 `src/main/services/rdsFetcher.ts`：调用 DescribeDBInstances，转换为 RDSInstance 列表
    - 实现实例 CloudWatch 指标获取（CPU、连接数、可用存储，最近 1 小时）
    - 创建 `src/renderer/components/panels/RDSPanel.tsx`：实例列表、引擎类型汇总、选中实例指标图表、错误处理 + 重试
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.4 编写属性测试：AWS 响应数据转换完整性（EC2/S3/RDS）
    - **Property 4: AWS 响应数据转换完整性（EC2、S3、RDS 部分）**
    - **Validates: Requirements 4.2, 5.2, 6.2**

  - [ ]* 6.5 编写属性测试：汇总计数一致性（EC2/S3/RDS）
    - **Property 5: 汇总计数一致性（EC2 状态汇总、S3 桶汇总、RDS 引擎类型汇总）**
    - **Validates: Requirements 4.3, 5.3, 6.3**

- [x] 7. Lambda、ELB、VPC 服务面板
  - [x] 7.1 实现 Lambda Fetcher 和面板
    - 创建 `src/main/services/lambdaFetcher.ts`：调用 ListFunctions，转换为 LambdaFunction 列表
    - 实现函数 CloudWatch 指标获取（调用次数、错误次数、平均执行时间、节流次数，最近 24 小时）
    - 创建 `src/renderer/components/panels/LambdaPanel.tsx`：函数列表、运行时汇总、选中函数指标图表、错误处理 + 重试
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.2 实现 ELB Fetcher 和面板
    - 创建 `src/main/services/elbFetcher.ts`：调用 DescribeLoadBalancers（v2 + classic），转换为 LoadBalancer 列表
    - 实现目标组健康状态获取
    - 创建 `src/renderer/components/panels/ELBPanel.tsx`：负载均衡器列表、类型汇总、选中 ELB 目标组详情、错误处理 + 重试
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.3 实现 VPC Fetcher 和面板
    - 创建 `src/main/services/vpcFetcher.ts`：调用 DescribeVpcs、DescribeSubnets、DescribeSecurityGroups 等
    - 实现 VPC 详情获取（子网、路由表、IGW、NAT GW）
    - 创建 `src/renderer/components/panels/VPCPanel.tsx`：VPC 列表、选中 VPC 详情（子网/路由表/网关）、安全组列表、错误处理 + 重试
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 7.4 编写属性测试：AWS 响应数据转换完整性（Lambda/ELB/VPC）
    - **Property 4: AWS 响应数据转换完整性（Lambda、ELB、VPC 部分）**
    - **Validates: Requirements 7.2, 8.2, 9.2, 9.4**

  - [ ]* 7.5 编写属性测试：汇总计数一致性（Lambda/ELB）
    - **Property 5: 汇总计数一致性（Lambda 运行时汇总、ELB 类型汇总）**
    - **Validates: Requirements 7.3, 8.3**

- [x] 8. Checkpoint - 核心服务面板验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. IAM、Container、DynamoDB 服务面板
  - [x] 9.1 实现 IAM Fetcher 和面板
    - 创建 `src/main/services/iamFetcher.ts`：调用 ListUsers、ListRoles、GetAccountSummary 等
    - 创建 `src/renderer/components/panels/IAMPanel.tsx`：资源汇总（用户/角色/策略/组总数）、用户列表（含 MFA 状态、访问密钥数）、角色列表、错误处理 + 重试
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 9.2 实现 Container Fetcher 和面板
    - 创建 `src/main/services/containerFetcher.ts`：调用 ECS ListClusters/DescribeClusters、EKS ListClusters/DescribeCluster
    - 实现 ECS 集群服务列表获取
    - 创建 `src/renderer/components/panels/ContainerPanel.tsx`：ECS/EKS 集群列表、选中 ECS 集群服务详情、错误处理 + 重试
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 9.3 实现 DynamoDB Fetcher 和面板
    - 创建 `src/main/services/dynamodbFetcher.ts`：调用 ListTables/DescribeTable
    - 实现表详情获取（GSI、预置容量）和 CloudWatch 指标（读写容量消耗，最近 1 小时）
    - 创建 `src/renderer/components/panels/DynamoDBPanel.tsx`：表列表、计费模式汇总、选中表详情 + 指标图表、错误处理 + 重试
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 9.4 编写属性测试：AWS 响应数据转换完整性（IAM/Container/DynamoDB）
    - **Property 4: AWS 响应数据转换完整性（IAM、ECS/EKS、DynamoDB 部分）**
    - **Validates: Requirements 10.3, 10.4, 11.2, 11.3, 12.2**

  - [ ]* 9.5 编写属性测试：汇总计数一致性（IAM/DynamoDB）
    - **Property 5: 汇总计数一致性（IAM 资源汇总、DynamoDB 计费模式汇总）**
    - **Validates: Requirements 10.2, 12.3**

- [x] 10. CloudFront、Messaging、Route53 服务面板
  - [x] 10.1 实现 CloudFront Fetcher 和面板
    - 创建 `src/main/services/cloudfrontFetcher.ts`：调用 ListDistributions
    - 实现分发详情获取（缓存行为、源站详情、请求数/数据传输量指标）
    - 创建 `src/renderer/components/panels/CloudFrontPanel.tsx`：分发列表、状态汇总、选中分发详情 + 指标、错误处理 + 重试
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 10.2 实现 Messaging Fetcher 和面板
    - 创建 `src/main/services/messagingFetcher.ts`：调用 SNS ListTopics/GetTopicAttributes、SQS ListQueues/GetQueueAttributes
    - 实现 SQS 队列详情获取（可见性超时、保留期、最大消息大小、死信队列）
    - 创建 `src/renderer/components/panels/MessagingPanel.tsx`：SNS 主题列表、SQS 队列列表、选中队列详情、错误处理 + 重试
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 10.3 实现 Route53 Fetcher 和面板
    - 创建 `src/main/services/route53Fetcher.ts`：调用 ListHostedZones、ListResourceRecordSets
    - 创建 `src/renderer/components/panels/Route53Panel.tsx`：托管区域列表、公有/私有汇总、选中区域 DNS 记录列表、错误处理 + 重试
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 10.4 编写属性测试：AWS 响应数据转换完整性（CloudFront/Messaging/Route53）
    - **Property 4: AWS 响应数据转换完整性（CloudFront、SNS/SQS、Route 53 部分）**
    - **Validates: Requirements 13.2, 14.2, 14.3, 15.2**

  - [ ]* 10.5 编写属性测试：汇总计数一致性（CloudFront/Route53）
    - **Property 5: 汇总计数一致性（CloudFront 状态汇总、Route 53 区域类型汇总）**
    - **Validates: Requirements 13.3, 15.4**

- [x] 11. CloudWatch 指标面板和账单面板
  - [x] 11.1 实现 Metrics Fetcher 和面板
    - 创建 `src/main/services/metricsFetcher.ts`：调用 CloudWatch GetMetricData，获取默认指标（EC2 CPU、RDS 连接数/CPU、Lambda 调用/错误率、ELB 请求/延迟、DynamoDB 读写容量、SQS 队列深度）
    - 创建 `src/renderer/components/panels/MetricsPanel.tsx`：指标概览、折线图展示、时间范围选择器（1h/6h/24h/7d）、无数据提示
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ]* 11.2 编写属性测试：时间范围转换正确性
    - **Property 6: 时间范围转换正确性**
    - **Validates: Requirements 16.4**

  - [x] 11.3 实现 Billing Fetcher 和面板
    - 创建 `src/main/services/billingFetcher.ts`：调用 Cost Explorer GetCostAndUsage
    - 创建 `src/renderer/components/panels/BillingPanel.tsx`：当月累计费用、按服务分类柱状图/饼图、上月对比（增减百分比）、选中服务每日趋势图、Cost Explorer 未启用提示
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ]* 11.4 编写属性测试：费用对比百分比计算正确性
    - **Property 7: 费用对比百分比计算正确性**
    - **Validates: Requirements 17.3**

- [x] 12. Checkpoint - 所有服务面板验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. 数据导出模块
  - [x] 13.1 实现 DataExporter 核心逻辑
    - 创建 `src/main/export/dataExporter.ts`
    - 实现 JSON 格式导出：包含结构化元数据（exportTimestamp、accountId、region、dataType、services）
    - 实现 CSV 格式导出：使用 json2csv 库，确保表头行 + N 条数据行
    - 实现选择性导出：支持按单个服务或全部服务导出
    - 实现系统原生文件保存对话框（通过 Electron dialog API）
    - 实现文件写入错误处理
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [ ]* 13.2 编写属性测试：JSON 导出 round-trip
    - **Property 8: JSON 导出 round-trip**
    - **Validates: Requirements 18.1**

  - [ ]* 13.3 编写属性测试：CSV 导出结构验证
    - **Property 9: CSV 导出结构验证**
    - **Validates: Requirements 18.2**

  - [ ]* 13.4 编写属性测试：导出元数据完整性
    - **Property 10: 导出元数据完整性**
    - **Validates: Requirements 18.4**

  - [ ]* 13.5 编写属性测试：选择性导出过滤正确性
    - **Property 11: 选择性导出过滤正确性**
    - **Validates: Requirements 18.6**

- [x] 14. 数据上传模块
  - [x] 14.1 实现 DataUploader 核心逻辑
    - 创建 `src/main/upload/dataUploader.ts`
    - 实现 HTTPS 上传逻辑，支持进度回调
    - 实现自动重试机制（最多 3 次，间隔 5 秒）
    - 实现数据脱敏函数：递归扫描并移除 AWS 凭证模式（AKIA... 格式的 Access Key、Secret Key）
    - _Requirements: 19.1, 19.3, 19.5, 19.6_

  - [x] 14.2 实现上传配置和 UI
    - 实现设置界面：配置云端 API 端点 URL 和认证令牌
    - 实现上传进度指示器
    - 实现上传完成确认信息（数据大小、上传耗时）
    - _Requirements: 19.2, 19.3, 19.4_

  - [ ]* 14.3 编写属性测试：数据脱敏安全性
    - **Property 12: 数据脱敏安全性**
    - **Validates: Requirements 19.6**

- [x] 15. Region 切换与数据刷新
  - [x] 15.1 实现 Region 切换逻辑
    - 在主进程中实现 Region 切换处理：重新创建 AWS SDK 客户端配置
    - 全局服务（S3、IAM、CloudFront、Route 53）在 Region 切换时保持数据不变
    - 非全局服务触发数据重新加载
    - 在 UI 上标注全局服务
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [ ]* 15.2 编写属性测试：全局服务 Region 不变性
    - **Property 14: 全局服务 Region 不变性**
    - **Validates: Requirements 21.4**

  - [x] 15.3 实现数据刷新逻辑
    - 实现全局刷新：并行请求所有 AWS API，显示加载状态
    - 实现部分失败处理：成功的数据更新，失败的保留旧数据并显示错误 + 单独重试按钮
    - 更新最后刷新时间戳
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [ ]* 15.4 编写属性测试：部分刷新失败处理
    - **Property 13: 部分刷新失败处理**
    - **Validates: Requirements 20.4**

- [x] 16. 集成联调与最终验证
  - [x] 16.1 端到端流程联调
    - 连通凭证配置 → Dashboard 加载 → 服务面板浏览完整流程
    - 连通数据导出和上传流程
    - 连通 Region 切换和数据刷新流程
    - 验证所有 IPC 通道正常工作
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.4, 18.3, 19.1, 20.2, 21.2_

  - [ ]* 16.2 编写集成测试
    - 凭证验证流程集成测试（使用 AWS SDK Mock）
    - Dashboard 数据加载集成测试
    - Region 切换和数据刷新集成测试
    - 数据导出/上传集成测试
    - _Requirements: 2.4, 3.1, 20.2, 21.2_

- [x] 17. Final checkpoint - 全部验证通过
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 交付
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证设计文档中定义的通用正确性属性
- 单元测试验证具体的示例和边界条件
- 所有 AWS API 调用在主进程中执行，通过 IPC 桥接到渲染进程
