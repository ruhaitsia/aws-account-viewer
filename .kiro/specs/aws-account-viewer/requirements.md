# Requirements Document

## Introduction

AWS Account Viewer 是一款本地跨平台桌面应用程序，面向架构师在客户拜访场景中使用。该应用允许用户通过 AWS 凭证（AK/SK）全面查看客户 AWS 账户的使用情况，涵盖计算、存储、数据库、网络、容器、无服务器、消息队列、CDN、DNS、身份管理等主要 AWS 服务的资源概览和关键指标。应用支持读取本地 AWS CLI 配置或手动输入凭证，并提供数据导出和上传能力，便于与本地 CLI 工具及云端大模型集成分析。

## Glossary

- **Application**: AWS Account Viewer 桌面应用程序主体
- **Credential_Manager**: 负责管理 AWS 凭证的加载、验证和存储的模块
- **AWS_Profile**: 本地 AWS CLI 配置文件（~/.aws/credentials 和 ~/.aws/config）中定义的命名配置集
- **Dashboard**: 应用主界面，用于展示 AWS 账户使用情况的汇总视图
- **Service_Navigator**: 左侧导航栏，用于在不同 AWS 服务面板之间切换
- **EC2_Panel**: 展示 EC2 实例状态和相关指标的界面面板
- **S3_Panel**: 展示 S3 存储桶信息和使用情况的界面面板
- **RDS_Panel**: 展示 RDS 数据库实例信息和状态的界面面板
- **Lambda_Panel**: 展示 Lambda 函数信息和调用指标的界面面板
- **ELB_Panel**: 展示 ELB/ALB/NLB 负载均衡器信息的界面面板
- **VPC_Panel**: 展示 VPC 网络资源信息的界面面板
- **IAM_Panel**: 展示 IAM 用户、角色和策略概览的界面面板
- **Container_Panel**: 展示 ECS 集群和 EKS 集群信息的界面面板
- **DynamoDB_Panel**: 展示 DynamoDB 表信息和容量指标的界面面板
- **CloudFront_Panel**: 展示 CloudFront 分发信息的界面面板
- **Messaging_Panel**: 展示 SNS 主题和 SQS 队列信息的界面面板
- **Route53_Panel**: 展示 Route 53 托管区域和 DNS 记录信息的界面面板
- **Billing_Panel**: 展示当月账单和费用明细的界面面板
- **Metrics_Panel**: 展示 CloudWatch 指标数据的界面面板
- **Data_Exporter**: 负责将数据导出为本地文件供 CLI 工具分析的模块
- **Data_Uploader**: 负责将数据上传到云端供大模型分析的模块
- **Export_Format**: 导出数据的文件格式，包括 JSON 和 CSV
- **Service_Summary**: Dashboard 上展示的各服务资源数量汇总卡片

## Requirements

### Requirement 1: 跨平台桌面应用

**User Story:** 作为架构师，我希望在 Windows、macOS 和 Linux 上都能运行该应用，以便在不同客户环境中使用。

#### Acceptance Criteria

1. THE Application SHALL 以原生桌面窗口形式运行于 Windows 10+、macOS 12+ 和 Linux（Ubuntu 20.04+）操作系统上
2. THE Application SHALL 提供统一的用户界面和交互体验，在所有支持的操作系统上保持一致的功能和布局
3. THE Application SHALL 以单一可执行文件或安装包的形式分发，用户无需额外安装运行时依赖

### Requirement 2: AWS 凭证配置

**User Story:** 作为架构师，我希望能快速加载客户的 AWS 凭证，以便立即开始查看账户信息。

#### Acceptance Criteria

1. WHEN 应用启动时, THE Credential_Manager SHALL 自动检测并读取本地 AWS CLI 配置文件（~/.aws/credentials 和 ~/.aws/config）中的所有 AWS_Profile
2. WHEN 检测到多个 AWS_Profile 时, THE Application SHALL 在界面上以下拉列表形式展示所有可用的 AWS_Profile 供用户选择
3. WHEN 用户选择手动配置时, THE Credential_Manager SHALL 提供输入表单，允许用户输入 Access Key ID、Secret Access Key 和 Region
4. WHEN 用户提交凭证信息后, THE Credential_Manager SHALL 在 5 秒内通过调用 AWS STS GetCallerIdentity 接口验证凭证的有效性
5. IF 凭证验证失败, THEN THE Application SHALL 显示具体的错误信息，包括错误类型和建议的修复操作
6. THE Credential_Manager SHALL 在应用运行期间将凭证保存在内存中，不将手动输入的凭证持久化到磁盘

### Requirement 3: 账户总览仪表盘

**User Story:** 作为架构师，我希望在登录后看到客户 AWS 账户的全局资源概览，以便快速了解整体使用规模。

#### Acceptance Criteria

1. WHEN 凭证验证成功后, THE Dashboard SHALL 加载并展示当前 Region 下所有主要 AWS 服务的资源数量汇总
2. THE Dashboard SHALL 以 Service_Summary 卡片形式展示以下服务的资源计数：EC2 实例数、S3 存储桶数、RDS 实例数、Lambda 函数数、负载均衡器数、VPC 数量、ECS 集群数、EKS 集群数、DynamoDB 表数、CloudFront 分发数、SNS 主题数、SQS 队列数、Route 53 托管区域数
3. THE Dashboard SHALL 在每个 Service_Summary 卡片上用颜色编码标注资源的健康状态（绿色表示正常、黄色表示警告、红色表示异常）
4. WHEN 用户点击某个 Service_Summary 卡片时, THE Application SHALL 导航到对应服务的详细面板
5. THE Dashboard SHALL 在顶部展示当前 AWS 账户 ID、账户别名（如有）和当前选择的 Region

### Requirement 4: EC2 实例概览

**User Story:** 作为架构师，我希望快速了解客户 EC2 实例的整体使用情况，以便评估计算资源利用率。

#### Acceptance Criteria

1. WHEN 用户进入 EC2_Panel 时, THE EC2_Panel SHALL 加载并展示当前 Region 下所有 EC2 实例的列表
2. THE EC2_Panel SHALL 为每个实例展示以下信息：实例 ID、实例名称（Name 标签）、实例类型、状态（running/stopped/terminated 等）、可用区、公网 IP 和私网 IP
3. THE EC2_Panel SHALL 在顶部展示实例状态汇总统计，包括各状态的实例数量
4. WHEN 用户选择某个实例时, THE EC2_Panel SHALL 展示该实例最近 1 小时的 CPU 利用率和网络流量 CloudWatch 指标图表
5. IF 加载 EC2 数据时发生 API 错误, THEN THE EC2_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 5: S3 存储桶概览

**User Story:** 作为架构师，我希望查看客户 S3 存储桶的使用情况，以便评估存储资源和成本。

#### Acceptance Criteria

1. WHEN 用户进入 S3_Panel 时, THE S3_Panel SHALL 加载并展示当前账户下所有 S3 存储桶的列表（S3 为全局服务，不受 Region 限制）
2. THE S3_Panel SHALL 为每个存储桶展示以下信息：存储桶名称、创建日期、所在 Region、存储类别分布、对象数量和总存储大小
3. THE S3_Panel SHALL 在顶部展示存储桶总数和总存储容量的汇总统计
4. WHEN 用户选择某个存储桶时, THE S3_Panel SHALL 展示该存储桶的访问策略类型（公开/私有）、版本控制状态、加密配置和生命周期规则概要
5. IF 加载 S3 数据时发生 API 错误, THEN THE S3_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 6: RDS 数据库实例概览

**User Story:** 作为架构师，我希望查看客户 RDS 数据库实例的使用情况，以便评估数据库资源配置。

#### Acceptance Criteria

1. WHEN 用户进入 RDS_Panel 时, THE RDS_Panel SHALL 加载并展示当前 Region 下所有 RDS 数据库实例的列表
2. THE RDS_Panel SHALL 为每个实例展示以下信息：实例标识符、数据库引擎及版本、实例类型、状态（available/stopped/creating 等）、存储大小、多可用区部署状态和端点地址
3. THE RDS_Panel SHALL 在顶部展示各引擎类型（MySQL、PostgreSQL、Aurora 等）的实例数量汇总
4. WHEN 用户选择某个 RDS 实例时, THE RDS_Panel SHALL 展示该实例最近 1 小时的 CPU 利用率、数据库连接数和可用存储空间 CloudWatch 指标图表
5. IF 加载 RDS 数据时发生 API 错误, THEN THE RDS_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 7: Lambda 函数概览

**User Story:** 作为架构师，我希望查看客户 Lambda 函数的使用情况，以便评估无服务器架构的规模和运行状况。

#### Acceptance Criteria

1. WHEN 用户进入 Lambda_Panel 时, THE Lambda_Panel SHALL 加载并展示当前 Region 下所有 Lambda 函数的列表
2. THE Lambda_Panel SHALL 为每个函数展示以下信息：函数名称、运行时环境、内存配置、超时时间、代码大小、最后修改时间和描述
3. THE Lambda_Panel SHALL 在顶部展示函数总数和各运行时环境（Python、Node.js、Java 等）的函数数量汇总
4. WHEN 用户选择某个 Lambda 函数时, THE Lambda_Panel SHALL 展示该函数最近 24 小时的调用次数、错误次数、平均执行时间和节流次数 CloudWatch 指标图表
5. IF 加载 Lambda 数据时发生 API 错误, THEN THE Lambda_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 8: 负载均衡器概览

**User Story:** 作为架构师，我希望查看客户负载均衡器的使用情况，以便评估流量分发架构。

#### Acceptance Criteria

1. WHEN 用户进入 ELB_Panel 时, THE ELB_Panel SHALL 加载并展示当前 Region 下所有负载均衡器（ALB、NLB、CLB）的列表
2. THE ELB_Panel SHALL 为每个负载均衡器展示以下信息：名称、类型（Application/Network/Classic）、状态、DNS 名称、所在 VPC、可用区分布和监听器配置概要
3. THE ELB_Panel SHALL 在顶部展示各类型负载均衡器的数量汇总
4. WHEN 用户选择某个负载均衡器时, THE ELB_Panel SHALL 展示该负载均衡器的目标组信息，包括健康目标数和不健康目标数
5. IF 加载 ELB 数据时发生 API 错误, THEN THE ELB_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 9: VPC 网络资源概览

**User Story:** 作为架构师，我希望查看客户 VPC 网络资源的使用情况，以便评估网络架构设计。

#### Acceptance Criteria

1. WHEN 用户进入 VPC_Panel 时, THE VPC_Panel SHALL 加载并展示当前 Region 下所有 VPC 的列表
2. THE VPC_Panel SHALL 为每个 VPC 展示以下信息：VPC ID、名称标签、CIDR 块、子网数量、是否为默认 VPC 和状态
3. WHEN 用户选择某个 VPC 时, THE VPC_Panel SHALL 展示该 VPC 下的子网列表（包括子网 ID、CIDR、可用区、可用 IP 数量）、路由表、互联网网关和 NAT 网关信息
4. THE VPC_Panel SHALL 展示当前 Region 下安全组的总数和各安全组的基本信息（名称、描述、关联的 VPC）
5. IF 加载 VPC 数据时发生 API 错误, THEN THE VPC_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 10: IAM 身份管理概览

**User Story:** 作为架构师，我希望查看客户 IAM 用户和角色的概览，以便评估身份和访问管理的配置情况。

#### Acceptance Criteria

1. WHEN 用户进入 IAM_Panel 时, THE IAM_Panel SHALL 加载并展示当前账户下的 IAM 资源概览（IAM 为全局服务，不受 Region 限制）
2. THE IAM_Panel SHALL 展示以下汇总信息：用户总数、角色总数、策略总数、用户组总数
3. THE IAM_Panel SHALL 展示 IAM 用户列表，包括用户名、创建日期、最后活动时间、MFA 启用状态和访问密钥数量
4. THE IAM_Panel SHALL 展示 IAM 角色列表，包括角色名称、创建日期、描述和信任实体类型
5. IF 加载 IAM 数据时发生 API 错误, THEN THE IAM_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 11: ECS/EKS 容器服务概览

**User Story:** 作为架构师，我希望查看客户容器服务的使用情况，以便评估容器化部署的规模和状态。

#### Acceptance Criteria

1. WHEN 用户进入 Container_Panel 时, THE Container_Panel SHALL 加载并展示当前 Region 下所有 ECS 集群和 EKS 集群的列表
2. THE Container_Panel SHALL 为每个 ECS 集群展示以下信息：集群名称、状态、运行中的服务数、运行中的任务数、已注册的容器实例数
3. THE Container_Panel SHALL 为每个 EKS 集群展示以下信息：集群名称、Kubernetes 版本、状态、端点和平台版本
4. WHEN 用户选择某个 ECS 集群时, THE Container_Panel SHALL 展示该集群下的服务列表，包括服务名称、期望任务数、运行任务数和部署状态
5. IF 加载容器服务数据时发生 API 错误, THEN THE Container_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 12: DynamoDB 表概览

**User Story:** 作为架构师，我希望查看客户 DynamoDB 表的使用情况，以便评估 NoSQL 数据库资源配置。

#### Acceptance Criteria

1. WHEN 用户进入 DynamoDB_Panel 时, THE DynamoDB_Panel SHALL 加载并展示当前 Region 下所有 DynamoDB 表的列表
2. THE DynamoDB_Panel SHALL 为每个表展示以下信息：表名称、状态、分区键、排序键（如有）、计费模式（按需/预置）、项目数量和表大小
3. THE DynamoDB_Panel SHALL 在顶部展示表总数和各计费模式的表数量汇总
4. WHEN 用户选择某个 DynamoDB 表时, THE DynamoDB_Panel SHALL 展示该表的全局二级索引列表、预置容量配置（如适用）和最近 1 小时的读写容量消耗 CloudWatch 指标图表
5. IF 加载 DynamoDB 数据时发生 API 错误, THEN THE DynamoDB_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 13: CloudFront 分发概览

**User Story:** 作为架构师，我希望查看客户 CloudFront 分发的使用情况，以便评估 CDN 配置和内容分发策略。

#### Acceptance Criteria

1. WHEN 用户进入 CloudFront_Panel 时, THE CloudFront_Panel SHALL 加载并展示当前账户下所有 CloudFront 分发的列表（CloudFront 为全局服务）
2. THE CloudFront_Panel SHALL 为每个分发展示以下信息：分发 ID、域名、状态（Deployed/InProgress）、备用域名（CNAME）、源站配置概要和价格等级
3. THE CloudFront_Panel SHALL 在顶部展示分发总数和各状态的分发数量汇总
4. WHEN 用户选择某个分发时, THE CloudFront_Panel SHALL 展示该分发的缓存行为配置、源站详情和最近 24 小时的请求数和数据传输量指标
5. IF 加载 CloudFront 数据时发生 API 错误, THEN THE CloudFront_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 14: SNS/SQS 消息服务概览

**User Story:** 作为架构师，我希望查看客户消息服务的使用情况，以便评估异步通信和事件驱动架构的规模。

#### Acceptance Criteria

1. WHEN 用户进入 Messaging_Panel 时, THE Messaging_Panel SHALL 加载并展示当前 Region 下所有 SNS 主题和 SQS 队列的列表
2. THE Messaging_Panel SHALL 为每个 SNS 主题展示以下信息：主题名称、主题 ARN、订阅数量和显示名称
3. THE Messaging_Panel SHALL 为每个 SQS 队列展示以下信息：队列名称、队列类型（标准/FIFO）、可见消息数、不可见消息数和延迟消息数
4. WHEN 用户选择某个 SQS 队列时, THE Messaging_Panel SHALL 展示该队列的详细配置，包括可见性超时、消息保留期、最大消息大小和死信队列配置
5. IF 加载消息服务数据时发生 API 错误, THEN THE Messaging_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 15: Route 53 DNS 概览

**User Story:** 作为架构师，我希望查看客户 Route 53 的 DNS 配置，以便评估域名管理和 DNS 架构。

#### Acceptance Criteria

1. WHEN 用户进入 Route53_Panel 时, THE Route53_Panel SHALL 加载并展示当前账户下所有 Route 53 托管区域的列表（Route 53 为全局服务）
2. THE Route53_Panel SHALL 为每个托管区域展示以下信息：域名、托管区域 ID、类型（公有/私有）、记录集数量和描述
3. WHEN 用户选择某个托管区域时, THE Route53_Panel SHALL 展示该区域下的 DNS 记录列表，包括记录名称、类型（A、CNAME、MX 等）、TTL 和值
4. THE Route53_Panel SHALL 在顶部展示托管区域总数和公有/私有区域的数量汇总
5. IF 加载 Route 53 数据时发生 API 错误, THEN THE Route53_Panel SHALL 显示错误信息并提供重试按钮

### Requirement 16: CloudWatch 指标展示

**User Story:** 作为架构师，我希望查看关键的 CloudWatch 指标，以便了解客户系统的运行健康状况。

#### Acceptance Criteria

1. WHEN 用户进入 Metrics_Panel 时, THE Metrics_Panel SHALL 展示当前 Region 下的关键服务指标概览
2. THE Metrics_Panel SHALL 展示以下默认指标：EC2 平均 CPU 利用率、RDS 实例连接数和 CPU 利用率、Lambda 函数调用次数和错误率、ELB 请求数和延迟、DynamoDB 读写容量消耗、SQS 队列深度
3. WHEN 用户选择某个指标时, THE Metrics_Panel SHALL 以折线图形式展示该指标最近 24 小时的数据趋势
4. THE Metrics_Panel SHALL 支持用户选择时间范围（1 小时、6 小时、24 小时、7 天）来调整指标展示的时间跨度
5. IF 某个服务在当前 Region 下无可用数据, THEN THE Metrics_Panel SHALL 在对应区域显示"无数据"提示而非空白

### Requirement 17: 当月账单展示

**User Story:** 作为架构师，我希望查看客户当月的 AWS 费用情况，以便进行成本分析和优化建议。

#### Acceptance Criteria

1. WHEN 用户进入 Billing_Panel 时, THE Billing_Panel SHALL 通过 AWS Cost Explorer API 加载并展示当月累计费用总额（美元）
2. THE Billing_Panel SHALL 以柱状图或饼图形式展示按服务分类的费用明细
3. THE Billing_Panel SHALL 展示与上月同期的费用对比，包括增减百分比
4. WHEN 用户选择某个服务分类时, THE Billing_Panel SHALL 展示该服务的每日费用趋势图
5. IF 当前 AWS 账户未启用 Cost Explorer, THEN THE Billing_Panel SHALL 显示提示信息，说明需要在 AWS 控制台中启用 Cost Explorer 才能查看账单数据

### Requirement 18: 数据导出

**User Story:** 作为架构师，我希望将收集到的数据导出为文件，以便使用 kiro-cli、claude code 等本地 CLI 工具进行深入分析。

#### Acceptance Criteria

1. THE Data_Exporter SHALL 支持将当前查看的所有服务数据导出为 JSON 格式文件
2. THE Data_Exporter SHALL 支持将当前查看的所有服务数据导出为 CSV 格式文件
3. WHEN 用户触发导出操作时, THE Data_Exporter SHALL 弹出系统原生文件保存对话框，允许用户选择保存路径和文件名
4. THE Data_Exporter SHALL 在导出的 JSON 文件中包含结构化的元数据，包括：导出时间戳、AWS 账户 ID、Region、数据类型和涵盖的服务列表
5. THE Data_Exporter SHALL 生成符合 kiro-cli 和 claude code 可直接读取的标准 JSON 结构
6. THE Data_Exporter SHALL 支持按单个服务或全部服务进行选择性导出
7. IF 导出过程中发生文件写入错误, THEN THE Data_Exporter SHALL 显示错误信息并提示用户检查目标路径的写入权限

### Requirement 19: 数据上传到云端

**User Story:** 作为架构师，我希望将数据上传到云端，以便利用大模型进行更深入的分析和洞察。

#### Acceptance Criteria

1. WHEN 用户触发上传操作时, THE Data_Uploader SHALL 将当前数据以 JSON 格式通过 HTTPS 协议上传到指定的云端 API 端点
2. THE Application SHALL 提供设置界面，允许用户配置云端 API 端点 URL 和认证令牌
3. WHILE 数据上传进行中, THE Data_Uploader SHALL 在界面上显示上传进度指示器
4. WHEN 上传完成后, THE Data_Uploader SHALL 显示上传成功的确认信息，包括数据大小和上传耗时
5. IF 上传过程中发生网络错误, THEN THE Data_Uploader SHALL 自动重试最多 3 次，每次间隔 5 秒，并在所有重试失败后显示错误信息
6. THE Data_Uploader SHALL 在上传前对数据进行脱敏处理，移除 AWS 凭证相关的敏感信息（Access Key、Secret Key）

### Requirement 20: 数据刷新

**User Story:** 作为架构师，我希望能随时刷新数据，以便获取最新的账户使用情况。

#### Acceptance Criteria

1. THE Dashboard SHALL 在界面顶部提供全局刷新按钮，用于一键刷新所有面板的数据
2. WHEN 用户触发刷新操作时, THE Application SHALL 并行请求所有 AWS API 以更新数据，并在界面上显示加载状态指示器
3. THE Dashboard SHALL 在界面上显示数据的最后更新时间戳
4. IF 刷新过程中部分 API 请求失败, THEN THE Application SHALL 更新成功获取的数据，并对失败的部分显示错误提示和单独的重试按钮

### Requirement 21: Region 切换

**User Story:** 作为架构师，我希望能切换不同的 AWS Region，以便查看客户在不同区域的资源使用情况。

#### Acceptance Criteria

1. THE Application SHALL 在界面顶部提供 Region 选择器，列出所有可用的 AWS Region
2. WHEN 用户切换 Region 时, THE Application SHALL 自动重新加载当前所有面板的数据以反映新 Region 的资源情况
3. THE Application SHALL 在 Region 选择器中标注当前 AWS_Profile 配置的默认 Region
4. THE Application SHALL 对全局服务（S3、IAM、CloudFront、Route 53）在 Region 切换时保持数据不变，并在界面上标注这些服务为全局服务

### Requirement 22: 服务导航

**User Story:** 作为架构师，我希望能方便地在不同 AWS 服务之间切换查看，以便高效浏览客户的完整资源使用情况。

#### Acceptance Criteria

1. THE Service_Navigator SHALL 在应用左侧提供固定的导航栏，列出所有可查看的 AWS 服务分类
2. THE Service_Navigator SHALL 将服务按类别分组展示：计算（EC2、Lambda、ECS/EKS）、存储（S3、DynamoDB）、数据库（RDS）、网络（VPC、ELB、CloudFront、Route 53）、消息（SNS/SQS）、安全（IAM）、监控（CloudWatch）、费用（账单）
3. WHEN 用户点击导航栏中的某个服务时, THE Application SHALL 切换主内容区域到对应服务的详细面板
4. THE Service_Navigator SHALL 在每个服务名称旁显示该服务的资源数量徽标
5. IF 某个服务在当前 Region 下无任何资源, THEN THE Service_Navigator SHALL 将该服务项显示为灰色并标注"无资源"
