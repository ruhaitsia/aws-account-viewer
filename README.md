# AWS Account Viewer

一款基于 Electron 构建的跨平台桌面应用，帮助用户集中查看和管理 AWS 账户资源。

![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

### Dashboard 总览
- 一站式查看所有 AWS 服务资源数量与健康状态
- 当月费用汇总、环比变化、每日费用趋势图
- 各服务费用分摊一目了然

### 支持的 AWS 服务

| 分类 | 服务 |
|------|------|
| 计算 | EC2、Lambda、ECS/EKS |
| 存储 | S3、DynamoDB |
| 数据库 | RDS |
| 网络 | VPC、ELB、CloudFront、Route 53 |
| 消息 | SNS、SQS |
| 安全 | IAM |
| 监控 | CloudWatch |
| 费用 | AWS Billing (Cost Explorer) |

### 凭证管理
- 支持从本地 AWS Profile 文件自动加载
- 支持手动输入 Access Key / Secret Key
- 凭证验证后显示账户 ID 和别名

### 数据导出与上传
- 支持导出为 JSON / CSV 格式
- 可选择导出全部或指定服务的数据
- 支持将数据上传至自定义 API 端点（自动脱敏 AWS 凭证）

### 多 Region 支持
- 支持切换 AWS Region 查看不同区域的资源
- 全局服务（S3、IAM、CloudFront、Route 53）自动识别

## 技术栈

- **框架**: Electron 28 + React 18
- **语言**: TypeScript 5
- **UI 组件**: Ant Design 5
- **状态管理**: Zustand
- **图表**: Recharts
- **AWS SDK**: AWS SDK v3
- **构建工具**: Vite 5
- **测试**: Vitest + fast-check (属性测试)
- **打包**: electron-builder

## 项目结构

```
src/
├── main/                  # Electron 主进程
│   ├── index.ts           # 主进程入口
│   ├── credentials/       # AWS 凭证管理
│   ├── services/          # AWS 服务数据获取 (Fetcher)
│   ├── export/            # 数据导出 (JSON/CSV)
│   ├── upload/            # 数据上传
│   └── ipc/               # IPC 通信处理
├── preload/               # Electron preload 脚本
├── renderer/              # 渲染进程 (React)
│   ├── components/
│   │   ├── charts/        # 图表组件
│   │   ├── common/        # 通用组件
│   │   ├── credential/    # 凭证配置
│   │   ├── dashboard/     # Dashboard 总览
│   │   ├── layout/        # 布局与导航
│   │   └── panels/        # 各服务面板
│   ├── stores/            # Zustand 状态管理
│   └── utils/             # 工具函数
└── shared/                # 主进程与渲染进程共享类型
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- AWS 凭证（Profile 文件或 Access Key）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器 + TypeScript 编译 + Electron
npm run electron:dev
```

### 构建

```bash
# 编译所有代码（主进程 + preload + 渲染进程）
npm run build:all
```

### 打包

```bash
# 打包当前平台安装包
npm run dist

# 指定平台打包
npx electron-builder --mac
npx electron-builder --win --x64
npx electron-builder --linux
```

打包产物输出到 `release/` 目录。

### 运行测试

```bash
npm test
```

## 使用说明

1. 启动应用后，首先配置 AWS 凭证（选择本地 Profile 或手动输入）
2. 凭证验证通过后进入 Dashboard 总览页面
3. 通过左侧导航栏切换不同 AWS 服务面板
4. 使用顶部 Region 选择器切换区域
5. 支持将资源数据导出为 JSON/CSV 文件

## 支持平台

| 平台 | 架构 | 格式 |
|------|------|------|
| macOS | x64 / arm64 | .dmg |
| Windows | x64 | .exe (NSIS) |
| Linux | x64 | .AppImage / .deb |
