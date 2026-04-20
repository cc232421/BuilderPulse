#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'data', 'raw-data.json');
const TODAY = new Date().toISOString().split('T')[0];

function extractKeywords(data) {
  const keywords = new Set();
  const allTexts = [
    ...data.hackerNews?.map(s => s.title) || [],
    ...data.githubTrending?.map(r => r.fullName) || []
  ];
  
  const aiKeywords = ['agent', 'claude', 'llm', 'ai', 'gpt', 'cursor', 'windsurf', 'anthropic', 'openai', 'hermes'];
  
  allTexts.forEach(text => {
    if (!text) return;
    aiKeywords.forEach(kw => {
      if (text.toLowerCase().includes(kw)) {
        keywords.add(kw);
      }
    });
  });
  
  return [...keywords].slice(0, 6);
}

function analyzeActionItems(data) {
  const items = [];
  
  // 基于 GitHub 趋势 - AI Agent 相关
  const hotRepos = data.githubTrending?.slice(0, 3) || [];
  const aiRepos = hotRepos.filter(r => 
    r.fullName?.toLowerCase().includes('agent') ||
    r.fullName?.toLowerCase().includes('claude') ||
    r.fullName?.toLowerCase().includes('karpathy')
  );
  
  if (aiRepos.length > 0) {
    items.push({
      type: '2-hour',
      title: `基于 ${aiRepos[0].fullName} 的配套工具`,
      reason: `该项目本周获得 ${aiRepos[0].stars} stars，正处于爆发期`
    });
  }
  
  // 基于 HN 安全事件
  const securityHN = data.hackerNews?.find(s => 
    s.title?.toLowerCase().includes('security') || 
    s.title?.toLowerCase().includes('breach') ||
    s.title?.toLowerCase().includes('vulnerability')
  );
  if (securityHN) {
    items.push({
      type: 'weekend',
      title: `解决 "${securityHN.title.substring(0, 30)}..." 中的安全问题`,
      reason: `获得 ${securityHN.score} points 关注，说明安全需求大`
    });
  }
  
  // 基于 Reddit 讨论
  const hotReddit = data.reddit?.slice(0, 2) || [];
  if (hotReddit.length > 0) {
    items.push({
      type: 'weekend',
      title: `构建 ${hotReddit[0].subreddit} 中讨论的解决方案`,
      reason: `在 r/${hotReddit[0].subreddit} 获得 ${hotReddit[0].score} upvotes`
    });
  }
  
  return items;
}

function generateTakeaway(data) {
  const takeaways = [];
  
  // AI Agent 热度分析
  const agentRepos = data.githubTrending?.filter(r => 
    r.fullName?.toLowerCase().includes('agent')
  ) || [];
  if (agentRepos.length > 0) {
    takeaways.push(`AI Agent 框架持续爆发：${agentRepos[0].fullName} 已达 ${agentRepos[0].stars} stars，成为本周第一热点`);
  }
  
  // Claude 生态
  const claudeRepos = data.githubTrending?.filter(r => 
    r.fullName?.toLowerCase().includes('claude')
  ) || [];
  if (claudeRepos.length > 0) {
    takeaways.push(`Claude 生态工具快速增长：${claudeRepos.map(r => r.fullName.split('/')[1]).join(', ')} 都是本周明星项目`);
  }
  
  // 安全事件
  const security = data.hackerNews?.find(s => 
    s.title?.toLowerCase().includes('security') || 
    s.title?.toLowerCase().includes('breach')
  );
  if (security) {
    takeaways.push(`安全事件引发关注：${security.title} (${security.score} points) 说明开发者对安全的高度重视`);
  }
  
  // Reddit 热点
  const redditDiscussions = data.reddit?.slice(0, 3) || [];
  if (redditDiscussions.length > 0) {
    takeaways.push(`Reddit 热门讨论：r/${redditDiscussions[0].subreddit} 上的 "${redditDiscussions[0].title?.substring(0, 30)}..."`);
  }
  
  return takeaways;
}

function generateChineseReport(data) {
  const { hackerNews, githubTrending, productHunt, huggingFace, googleTrends, reddit } = data;
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const keywords = extractKeywords(data);
  const actionItems = analyzeActionItems(data);
  const takeaways = generateTakeaway(data);

  let report = `# BuilderPulse Daily — ${TODAY}\n\n`;
  report += `> **今日 Top 3：**\n`;
  
  const topHN = hackerNews.slice(0, 3);
  topHN.forEach((story, i) => {
    const title = story.title || 'Untitled';
    const score = story.score || 0;
    report += `> ${i + 1}. ${title.substring(0, 60)} (${score} points)\n`;
  });
  
  report += `\n交叉参考 Hacker News、GitHub、Product Hunt、HuggingFace、Google 趋势及 Reddit。\n`;
  report += `更新于 ${timeStr}（上海时间）。\n\n`;
  report += `---\n\n`;

  // 发现机会
  report += `## 发现机会\n\n`;
  report += `### 本周有哪些独立开发者产品发布？\n\n`;
  
  const showHNStories = hackerNews.filter(s => (s.descendants || 0) > 30).slice(0, 5);
  
  if (showHNStories.length > 0) {
    showHNStories.forEach(story => {
      const title = story.title?.replace('Show HN: ', '').replace('Show HN', '') || 'Untitled';
      const score = story.score || 0;
      const comments = story.descendants || 0;
      const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      
      report += `**${title}**\n\n`;
      report += `- ${score} points, ${comments} comments\n`;
      report += `- [原文](${url})\n\n`;
    });
  } else {
    report += `暂无高票独立产品发布。\n\n`;
  }

  // GitHub 趋势
  report += `### GitHub 上哪些快速增长的开源项目？\n\n`;
  
  if (githubTrending.length > 0) {
    githubTrending.slice(0, 8).forEach(repo => {
      const name = repo.fullName || 'Unknown';
      const stars = repo.stars || 0;
      const desc = repo.description || '';
      const lang = repo.language || '';
      
      report += `**[${name}](https://github.com/${name})**\n`;
      report += `- ${stars} stars`;
      if (lang) report += ` · ${lang}`;
      report += '\n';
      if (desc) report += `- ${desc}\n`;
      report += '\n';
    });
  }

  // 技术选型
  report += `## 技术选型\n\n`;
  report += `### 有没有大公司关停或降级产品？\n\n`;
  
  const productStories = hackerNews.filter(s => 
    (s.title?.toLowerCase().includes('shut') || 
     s.title?.toLowerCase().includes('close') ||
     s.title?.toLowerCase().includes('deprecate') ||
     s.title?.toLowerCase().includes(' Sunsets')) && 
    (s.score || 0) > 50
  );
  
  if (productStories.length > 0) {
    productStories.forEach(story => {
      report += `- ${story.title} (${story.score} points)\n`;
    });
    report += '\n';
  } else {
    report += `本周暂无重大产品调整消息。\n\n`;
  }

  report += `### 本周增长最快的开发者工具是什么？\n\n`;
  
  const aiRepos = githubTrending.filter(r => 
    r.fullName?.toLowerCase().includes('agent') ||
    r.fullName?.toLowerCase().includes('claude') ||
    r.fullName?.toLowerCase().includes('llm') ||
    r.fullName?.toLowerCase().includes('copilot')
  );
  
  if (aiRepos.length > 0) {
    aiRepos.slice(0, 5).forEach(repo => {
      report += `- [${repo.fullName}](https://github.com/${repo.fullName}) — ${repo.stars} stars\n`;
    });
    report += '\n';
  }

  // HuggingFace
  report += `### HuggingFace 上最热的模型是什么？能支撑哪些消费级产品？\n\n`;
  
  if (huggingFace && huggingFace.length > 0) {
    huggingFace.slice(0, 8).forEach(model => {
      report += `- ${model.name} (${model.downloads?.toLocaleString()} downloads)\n`;
    });
  } else {
    report += `暂无数据\n`;
  }
  report += '\n';
  
  // Google Trends
  report += `### Google 搜索趋势正在飙升的关键词\n\n`;
  
  if (googleTrends && googleTrends.length > 0) {
    const software = googleTrends.filter(kw => kw.category === 'Software').slice(0, 5);
    software.forEach(kw => {
      report += `- ${kw.keyword}\n`;
    });
  } else {
    report += `暂无数据\n`;
  }
  report += '\n';

  // Reddit
  report += `## 竞争情报\n\n`;
  report += `### Reddit 热门讨论\n\n`;
  
  if (reddit && reddit.length > 0) {
    reddit.slice(0, 5).forEach(post => {
      report += `**r/${post.subreddit}**: ${post.title?.substring(0, 50)}...\n`;
      report += `- ${post.score} upvotes · ${post.numComments} comments\n`;
      report += `- [链接](${post.url})\n\n`;
    });
  } else {
    report += `暂无数据\n\n`;
  }

  // 趋势判断
  report += `## 趋势判断\n\n`;
  report += `### 本周最高频的技术关键词\n\n`;
  
  if (keywords && keywords.length > 0) {
    keywords.forEach(kw => {
      report += `- **${kw}**\n`;
    });
    report += '\n';
  }

  report += `### VC 和 YC 正在关注什么？\n\n`;
  report += `- AI Agent 基础设施\n`;
  report += `- Claude 生态工具\n`;
  report += `- 开源模型本地运行\n\n`;

  // Takeaway
  if (takeaways.length > 0) {
    report += `### 核心洞察（Takeaway）\n\n`;
    takeaways.forEach(t => {
      report += `> ${t}\n\n`;
    });
  }

  // 行动建议
  report += `## 行动建议\n\n`;
  report += `### 用今天的 2 小时，应该做什么？\n\n`;
  
  if (actionItems.length > 0) {
    const byType = actionItems.filter(i => i.type === '2-hour');
    if (byType.length > 0) {
      report += `**最佳 2 小时构建**：${byType[0].title}\n\n`;
      report += `**为什么值得做**：${byType[0].reason}\n\n`;
    }
  } else {
    report += `**最佳 2 小时构建**：构建一个开发者工具聚合简报。\n\n`;
    report += `**为什么值得做**：AI 开发者工具热度高，缺乏高质量信息聚合\n\n`;
  }

  report += `**周末扩展**：\n`;
  report += `- 增加更多数据源（HuggingFace, Google Trends）\n`;
  report += `- 添加 AI 摘要功能\n`;
  report += `- 开发邮件/Telegram 推送\n\n`;

  report += `---\n`;
  report += `*— BuilderPulse Daily*\n\n`;
  report += `*通过多数据源自动生成*\n`;

  return report;
}

function generateEnglishReport(data) {
  const { hackerNews, githubTrending, productHunt, huggingFace, googleTrends, reddit } = data;
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const displayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const keywords = extractKeywords(data);
  const actionItems = analyzeActionItems(data);
  const takeaways = generateTakeaway(data);

  let report = `# BuilderPulse Daily — ${displayDate}\n\n`;
  report += `> **Today's top 3:**\n`;
  
  const topHN = hackerNews.slice(0, 3);
  topHN.forEach((story, i) => {
    const title = story.title || 'Untitled';
    const score = story.score || 0;
    report += `> ${i + 1}. ${title.substring(0, 60)} (${score} points)\n`;
  });
  
  report += `\nCross-referencing Hacker News, GitHub, Product Hunt, HuggingFace, Google search trends, and Reddit.\n`;
  report += `Updated ${timeStr} (Shanghai Time).\n\n`;
  report += `---\n\n`;

  report += `## Discovery\n\n`;
  report += `### What solo-founder products launched today?\n\n`;
  
  const showHNStories = hackerNews.filter(s => (s.descendants || 0) > 30).slice(0, 5);
  
  if (showHNStories.length > 0) {
    showHNStories.forEach(story => {
      const title = story.title?.replace('Show HN: ', '').replace('Show HN', '') || 'Untitled';
      const score = story.score || 0;
      const comments = story.descendants || 0;
      report += `**${title}**\n\n- ${score} points, ${comments} comments\n\n`;
    });
  } else {
    report += `No major solo-founder launches today.\n\n`;
  }

  report += `### What are the trending open-source projects?\n\n`;
  
  if (githubTrending.length > 0) {
    githubTrending.slice(0, 8).forEach(repo => {
      const name = repo.fullName || 'Unknown';
      const stars = repo.stars || 0;
      const desc = repo.description || '';
      const lang = repo.language || '';
      
      report += `**[${name}](https://github.com/${name})**\n`;
      report += `- ${stars} stars`;
      if (lang) report += ` · ${lang}`;
      report += '\n';
      if (desc) report += `- ${desc}\n`;
      report += '\n';
    });
  }

  report += `## Tech Radar\n\n`;
  report += `### Did any major company shut down or downgrade a product?\n\n`;
  
  const productStories = hackerNews.filter(s => 
    (s.title?.toLowerCase().includes('shut') || 
     s.title?.toLowerCase().includes('close') ||
     s.title?.toLowerCase().includes('deprecate')) && 
    (s.score || 0) > 50
  );
  
  if (productStories.length > 0) {
    productStories.forEach(story => {
      report += `- ${story.title} (${story.score} points)\n`;
    });
  } else {
    report += `No major product changes this week.\n`;
  }
  report += '\n';

  report += `### What are the fastest-growing developer tools this week?\n\n`;
  
  const aiRepos = githubTrending.filter(r => 
    r.fullName?.toLowerCase().includes('agent') ||
    r.fullName?.toLowerCase().includes('claude') ||
    r.fullName?.toLowerCase().includes('llm')
  );
  
  if (aiRepos.length > 0) {
    aiRepos.slice(0, 5).forEach(repo => {
      report += `- [${repo.fullName}](https://github.com/${repo.fullName}) — ${repo.stars} stars\n`;
    });
  }
  report += '\n';

  report += `### What are the hottest HuggingFace models? What consumer products can they support?\n\n`;
  
  if (huggingFace && huggingFace.length > 0) {
    huggingFace.slice(0, 8).forEach(model => {
      report += `- ${model.name} (${model.downloads?.toLocaleString()} downloads)\n`;
    });
  } else {
    report += `No data available\n`;
  }
  report += '\n';
  
  // Google Trends
  report += `### What Google search trends are surging?\n\n`;
  
  if (googleTrends && googleTrends.length > 0) {
    const software = googleTrends.filter(kw => kw.category === 'Software').slice(0, 5);
    software.forEach(kw => {
      report += `- ${kw.keyword}\n`;
    });
  } else {
    report += `No data available\n`;
  }
  report += '\n';

  // Competitive Intel - Reddit
  report += `## Competitive Intel\n\n`;
  report += `### Reddit Hot Discussions\n\n`;
  
  if (reddit && reddit.length > 0) {
    reddit.slice(0, 5).forEach(post => {
      report += `**r/${post.subreddit}**: ${post.title?.substring(0, 50)}...\n`;
      report += `- ${post.score} upvotes · ${post.numComments} comments\n`;
      report += `- [Link](${post.url})\n\n`;
    });
  } else {
    report += `No data available\n\n`;
  }

  report += `## Trends\n\n`;
  report += `### What are the most frequent tech keywords?\n\n`;
  
  if (keywords && keywords.length > 0) {
    keywords.forEach(kw => {
      report += `- **${kw}**\n`;
    });
  } else {
    report += `- **AI** - dominates\n`;
    report += `- **Open Source** - trending\n`;
  }
  report += '\n';

  report += `### What are VC and YC focusing on?\n\n`;
  report += `- AI Agent infrastructure\n`;
  report += `- Claude ecosystem tools\n`;
  report += `- Local open-source models\n\n`;

  // Takeaway
  if (takeaways.length > 0) {
    report += `### Key Takeaways\n\n`;
    takeaways.forEach(t => {
      report += `> ${t}\n\n`;
    });
  }

  report += `## Action\n\n`;
  report += `### With 2 hours today, what should I build?\n\n`;
  
  if (actionItems.length > 0) {
    const byType = actionItems.filter(i => i.type === '2-hour');
    if (byType.length > 0) {
      report += `**Best 2-hour build**: ${byType[0].title}\n\n`;
      report += `**Why**: ${byType[0].reason}\n\n`;
    }
  } else {
    report += `**Best 2-hour build**: Build a developer tools newsletter aggregator.\n\n`;
  }

  report += `**Weekend expansion**:\n`;
  report += `- Add more data sources\n`;
  report += `- Add AI summarization\n`;
  report += `- Build subscription delivery\n\n`;

  report += `---\n`;
  report += `*— BuilderPulse Daily*\n\n`;
  report += `*Generated through automated workflow*\n`;

  return report;
}

function main() {
  if (!existsSync(DATA_FILE)) {
    console.error('No data found. Run fetch-data.js first.');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  
  const zhReport = generateChineseReport(data);
  const enReport = generateEnglishReport(data);
  
  const OUTPUT_DIR = join(process.cwd(), 'en', '2026');
  const ZH_OUTPUT_DIR = join(process.cwd(), 'zh', '2026');
  
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!existsSync(ZH_OUTPUT_DIR)) mkdirSync(ZH_OUTPUT_DIR, { recursive: true });
  
  writeFileSync(join(OUTPUT_DIR, `${TODAY}.md`), enReport);
  writeFileSync(join(ZH_OUTPUT_DIR, `${TODAY}.md`), zhReport);
  
  console.log(`Reports generated:`);
  console.log(`  EN: ${OUTPUT_DIR}/${TODAY}.md`);
  console.log(`  ZH: ${ZH_OUTPUT_DIR}/${TODAY}.md`);
}

main();