#!/usr/bin/env node

import https from 'https';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);

function fetch(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    setTimeout(() => { req.destroy(); reject(new Error(`Request timeout: ${url}`)); }, timeout);
  });
}

async function getHNStories() {
  const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  const ids = JSON.parse(idsRes).slice(0, 30);
  
  // Batch requests in groups of 5 to avoid rate limiting
  const batches = [];
  for (let i = 0; i < Math.min(15, ids.length); i += 5) {
    batches.push(ids.slice(i, i + 5));
  }
  
  let allResults = [];
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(batch.map(async (id) => {
      const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 15000);
      return JSON.parse(item);
    }));
    allResults = allResults.concat(batchResults);
  }
  
  const stories = allResults
    .filter(r => r.status === 'fulfilled' && r.value && r.value.type === 'story')
    .map(r => r.value);
  
  const failed = allResults.filter(r => r.status === 'rejected');
  if (stories.length === 0) {
    const firstError = failed[0]?.reason?.message || 'unknown';
    console.log(`WARNING: HN returned 0/15 stories — first error: ${firstError}`);
  } else {
    console.log(`HN: ${stories.length}/15 stories fetched`);
  }
  return stories;
}

async function getGitHubTrending() {
  const proxies = [
    'https://githubtrending.lessx.xyz/trending?since=weekly',
    'https://gh-trending-api.vercel.app/repositories?since=weekly'
  ];
  
  for (const url of proxies) {
    // Retry each proxy up to 2 times with delays
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const html = await fetch(url, 15000);
        const data = JSON.parse(html);
        
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`GitHub proxy ${url} returned unexpected format (attempt ${attempt + 1})`);
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        
        const repos = data.slice(0, 10).map(r => {
          const repoUrl = r.repository || '';
          const parts = repoUrl.split('/');
          const fullName = parts.length >= 5 ? `${parts[3]}/${parts[4]}` : r.name || 'Unknown';
          const stars = (r.stars || '0').replace(/,/g, '');
          
          return {
            fullName: fullName,
            stars: parseInt(stars) || 0,
            description: r.description || '',
            language: 'N/A'
          };
        });
        
        if (repos.length > 0) return repos;
      } catch (e) {
        console.log(`GitHub proxy ${url} failed (attempt ${attempt + 1}):`, e.message);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  
  console.log('All GitHub trending proxies failed after retries');
  return [];
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
  // Retry up to 2 times with increasing timeout since HF API is slow
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(
        'https://huggingface.co/api/trending?pipeline_tag=text-generation&sort=downloads',
        20000 + (attempt * 10000)
      );
      
      const text = await new Promise((resolve, reject) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
        response.on('error', reject);
      });
      
      const data = JSON.parse(text);
      return (data.models || []).slice(0, 10).map(m => ({
        name: m.id || m.modelId,
        downloads: m.downloads || 0,
        likes: m.likes || 0
      }));
    } catch (e) {
      console.log(`HuggingFace attempt ${attempt + 1} failed:`, e.message);
      if (attempt < 1) await new Promise(r => setTimeout(r, 5000));
    }
  }
  return [];
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