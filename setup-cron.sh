#!/bin/bash

# BuilderPulse Daily - 设置定时任务
# 运行: bash setup-cron.sh

CRON_LINE="0 3 * * * /Users/jie/code/BuilderPulse/generate-daily-report.sh >> /tmp/builderpulse.log 2>&1"

echo "当前 crontab:"
crontab -l 2>/dev/null || echo "(empty)"

echo ""
echo "添加每日北京时间凌晨3点自动生成任务..."
echo "$CRON_LINE" | crontab -

echo ""
echo "验证 crontab:"
crontab -l

echo ""
echo "✅ 设置完成！"
echo "每天北京时间凌晨3点会自动生成日报"