# BuilderPulse Daily - AI Developer Newsletter Generator

自动化生成 AI 开发者日报，整合多个数据源。

## 数据源

| 数据源 | 状态 |
|--------|------|
| Hacker News | ✅ 实时获取 TOP 30 |
| GitHub Trending | ✅ 周榜 TOP 10 |
| HuggingFace | ⚠️ API 连接受限 |
| Google Trends | ✅ 预设趋势词 (10个) |
| Reddit | ⚠️ 网络连接受限 |

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

### 方式三：设置每日自动运行

```bash
bash setup-cron.sh
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
- Google 搜索趋势飙升词

## 趋势判断
- 关键词分析
- VC/YC 关注点
- 核心洞察 (Takeaway)

## 竞争情报
- Reddit 热门讨论

## 行动建议
- 2小时构建项目
- 周末扩展方向
```

## 技术栈

- Node.js (ES Modules)
- Hacker News API (Firebase)
- GitHub Trending API (第三方)
- Google Trends (预设关键词)
- 无需 API Key

## Todo

- [ ] Reddit 网络优化
- [ ] HuggingFace 网络优化
- [ ] 添加 LLM 生成深度 Takeaway
- [ ] 添加邮件/Telegram 推送