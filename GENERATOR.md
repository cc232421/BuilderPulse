# BuilderPulse Daily - AI Developer Newsletter Generator

自动化生成 AI 开发者日报，整合多个数据源。

## 数据源

| 数据源 | 状态 |
|--------|------|
| Hacker News | ✅ 实时获取 TOP 30 |
| GitHub Trending | ✅ 周榜 TOP 10 |
| HuggingFace | ⚠️ 部分获取 |
| Product Hunt | ⚠️ 部分获取 |
| Google Trends | 🏗️ 开发中 |

## 使用方法

### 方式一：一键生成

```bash
./generate-daily-report.sh
```

### 方式二：手动运行

```bash
# 1. 获取数据
node scripts/fetch-data.js

# 2. 生成报告
node scripts/generate-report.js
```

## 输出

- 英文：`en/2026/YYYY-MM-DD.md`
- 中文：`zh/2026/YYYY-MM-DD.md`

## 报告结构

```
## 发现机会
- 独立开发者产品发布
- GitHub 趋势项目

## 技术选型
- 大公司产品变动
- 最快增长开发者工具
- HuggingFace 热门模型

## 趋势判断
- 关键词分析
- VC/YC 关注点

## 竞争情报
- 营收/定价讨论

## 行动建议
- 2小时构建项目
- 周末扩展方向
```

## 文件结构

```
BuilderPulse/
├── scripts/
│   ├── fetch-data.js      # 数据抓取
│   └── generate-report.js # 报告生成
├── data/
│   └── raw-data.json     # 原始数据
├── en/2026/             # 英文日报
├── zh/2026/             # 中文日报
└── generate-daily-report.sh  # 一键脚本
```

## 技术栈

- Node.js (ES Modules)
- Hacker News API
- GitHub Trending API (第三方)
- 无需 API Key

## Todo

- [ ] 添加 Reddit 数据
- [ ] 添加 Google Trends 趋势词
- [ ] 添加 LLM 生成深度 Takeaway
- [ ] 添加邮件推送
- [ ] 设置定时任务 (crontab)