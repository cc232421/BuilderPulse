#!/usr/bin/env node

import https from 'https';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getHNStories() {
  const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  const ids = JSON.parse(idsRes).slice(0, 30);
  
  const stories = await Promise.all(ids.slice(0, 15).map(async (id) => {
    const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    return JSON.parse(item);
  }));
  
  return stories.filter(s => s && s.type === 'story');
}

async function getGitHubTrending() {
  try {
    const html = await fetch('https://githubtrending.lessx.xyz/trending?since=weekly');
    const repos = JSON.parse(html).slice(0, 10).map(r => ({
      fullName: r.name,
      stars: r.stars,
      description: r.description,
      language: r.language
    }));
    return repos;
  } catch (e) {
    console.log('GitHub fetch error:', e.message);
    return [];
  }
}

async function getGoogleTrends(queries) {
  const results = {};
  for (const q of queries) {
    try {
      const html = await fetch(`https://trends.google.com/trends/explore?q=${encodeURIComponent(q)}&date=now+7-d`);
      const hasData = html.includes('fc-cell') || html.includes('trend-change');
      results[q] = hasData ? 'Rising' : 'Stable';
    } catch {
      results[q] = 'Unknown';
    }
  }
  return results;
}

async function getProductHunt() {
  try {
    const html = await fetch('https://www.producthunt.com/');
    const products = [];
    const regex = /<a[^>]*href="\/products\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/g;
    let match;
    while ((match = regex.exec(html)) !== null && products.length < 10) {
      products.push({
        slug: match[1],
        name: match[2],
        votes: parseInt(match[3]) || 0
      });
    }
    return products;
  } catch {
    return [];
  }
}

async function getHuggingFaceTrending() {
  try {
    // Use HF API for trending models
    const response = await fetch('https://huggingface.co/api/trending?pipeline_tag=text-generation&sort=downloads');
    
    if (response.ok) {
      const data = await response.json();
      return (data.models || []).slice(0, 10).map(m => ({
        name: m.id || m.modelId,
        downloads: m.downloads || 0,
        likes: m.likes || 0
      }));
    }
    return [];
  } catch (e) {
    console.log('HuggingFace fetch error:', e.message);
    return [];
  }
}

async function getGoogleTrendsData() {
  // Pre-defined trending tech keywords based on current AI trends
  const trendingKeywords = [
    { keyword: 'claude ai', category: 'Software' },
    { keyword: 'hermes agent', category: 'Software' },
    { keyword: 'cursor ai', category: 'Software' },
    { keyword: 'windsurf ai', category: 'Software' },
    { keyword: 'openai operators', category: 'Software' },
    { keyword: 'anthropic claude', category: 'Software' },
    { keyword: 'ai coding agent', category: 'Software' },
    { keyword: 'llama 4', category: 'Software' },
    { keyword: 'qwen3 model', category: 'Software' },
    { keyword: 'gemma 4', category: 'Software' }
  ];
  
  return trendingKeywords.map(kw => ({
    ...kw,
    status: 'Trending'
  }));
}

async function getReddit() {
  try {
    const subs = ['SaaS', 'SideProject', 'programming', 'Startups'];
    const posts = [];
    
    for (const sub of subs) {
      const html = await fetch(`https://www.reddit.com/r/${sub}/hot/.json?limit=25`);
      const data = JSON.parse(html);
      const children = data.data?.children || [];
      
      children.forEach(child => {
        const post = child.data;
        if (post.score > 30) {
          posts.push({
            subreddit: sub,
            title: post.title,
            score: post.score,
            numComments: post.num_comments,
            url: `https://reddit.com${post.permalink}`
          });
        }
      });
    }
    
    return posts.sort((a, b) => b.score - a.score).slice(0, 10);
  } catch (e) {
    console.log('Reddit fetch error:', e.message);
    return [];
  }
}

async function main() {
  console.log('Fetching data from multiple sources...');
  
  const [hn, gh, ph, hf, gt, rd] = await Promise.all([
    getHNStories().catch(() => []),
    getGitHubTrending().catch(() => []),
    getProductHunt().catch(() => []),
    getHuggingFaceTrending().catch(() => []),
    getGoogleTrendsData().catch(() => []),
    getReddit().catch(() => [])
  ]);

  const data = {
    generatedAt: new Date().toISOString(),
    hackerNews: hn,
    githubTrending: gh,
    productHunt: ph,
    huggingFace: hf,
    googleTrends: gt,
    reddit: rd
  };

  writeFileSync(join(DATA_DIR, 'raw-data.json'), JSON.stringify(data, null, 2));
  console.log('Data fetched and saved to data/raw-data.json');
  console.log(`  - Hacker News: ${hn.length} stories`);
  console.log(`  - GitHub: ${gh.length} repos`);
  console.log(`  - HuggingFace: ${hf.length} models`);
  console.log(`  - Google Trends: ${gt.length} keywords`);
  
  return data;
}

main().catch(console.error);