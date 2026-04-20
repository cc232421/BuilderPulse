# AI 日报生成工作流

自动化生成 AI Builders 日报，使用 follow-builders skill 获取信息来源。

## 工作流说明

```
follow-builders (获取数据) 
    → 工作流脚本 (处理并生成日报)
    → 自动提交到远程仓库
```

## 使用方法

### 手动触发

```bash
/Users/jie/code/BuilderPulse/generate-daily-report.sh
```

### 设置定时任务（可选）

如果你希望每天北京时间凌晨3点自动运行：

```bash
# 编辑 crontab
crontab -e

# 添加以下行：
0 3 * * * /Users/jie/code/BuilderPulse/generate-daily-report.sh >> /tmp/daily-report.log 2>&1
```

## 输出

- 日报文件：`en/2026/YYYY-MM-DD.md`
- 自动提交到 GitHub 远程仓库

## 依赖

- Node.js (v22+)
- follow-builders skill (`~/.claude/skills/follow-builders`)
- Git 已配置远程仓库

## 数据来源

follow-builders skill 提供的内容：
- 25 位 AI builders 的 Twitter/X 动态
- 6 个 AI 播客的最新节目
- 2 个官方 AI 博客（Anthropic Engineering, Claude Blog）