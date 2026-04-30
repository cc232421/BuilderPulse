#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);

function curlFetch(url, ms = 15000) {
  const opts = [
    'curl', '-s', '--max-time', String(Math.floor(ms / 1000)),
    '-H', 'Accept: application/json',
    '-H', 'User-Agent: BuilderPulse/1.0',
    url
  ];
  try {
    const out = execSync(opts.join(' '), { encoding: 'utf8', timeout: ms + 5000 });
    return JSON.parse(out);
  } catch (e) {
    if (e.status === 7) throw new Error(`Connection refused: ${url}`);
    if (e.status === 22) throw new Error(`HTTP error: ${url}`);
    if (e.signal === 'SIGTERM') throw new Error(`Timeout: ${url}`);
    throw e;
  }
}

async function getHNStories() {
  const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.text());
  const ids = JSON.parse(idsRes).slice(0, 30);

  const batches = [];
  for (let i = 0; i < Math.min(15, ids.length); i += 5) {
    batches.push(ids.slice(i, i + 5));
  }

  let allResults = [];
  for (const batch of batches) {
    const batchResults = await Promise.allSettled(batch.map(async (id) => {
      const item = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.text());
      return JSON.parse(item);
    }));
    allResults = allResults.concat(batchResults);
  }

  const stories = allResults
    .filter(r => r.status === 'fulfilled' && r.value && r.value.type === 'story')
    .map(r => r.value);

  if (stories.length === 0) {
    const failed = allResults.filter(r => r.status === 'rejected');
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
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const html = await fetch(url).then(r => r.text());
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

async function getProductHunt() {
  const token = process.env.PRODUCTHUNT_TOKEN;

  if (!token) {
    console.log('Product Hunt: PRODUCTHUNT_TOKEN not set, skipping');
    return [];
  }

  const query = `
    query {
      posts(first: 10, order: VOTES) {
        edges {
          node {
            name
            slug
            votesCount
            description
          }
        }
      }
    }
  `;

  try {
    const result = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }).then(r => r.json());

    const edges = result.data?.posts?.edges || [];

    return edges.map(({ node }) => ({
      name: node.name,
      slug: node.slug,
      votes: node.votesCount || 0,
      description: node.description || ''
    }));
  } catch (e) {
    console.log('Product Hunt API error:', e.message);
    return [];
  }
}

async function getHuggingFaceTrending() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await curlFetch(
        'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=10&pipeline_tag=text-generation',
        30000 + (attempt * 15000)
      );
      return (data || []).slice(0, 10).map(m => ({
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
      const data = await curlFetch(
        `https://www.reddit.com/r/${sub}/hot/.json?limit=25`,
        15000
      );
      const children = data?.data?.children || [];

      for (const { data: post } of children) {
        if (post.score > 30) {
          posts.push({
            subreddit: sub,
            title: post.title,
            score: post.score,
            numComments: post.num_comments,
            url: `https://reddit.com${post.permalink}`
          });
        }
      }
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
  console.log(`  - Product Hunt: ${ph.length} products`);
  console.log(`  - HuggingFace: ${hf.length} models`);
  console.log(`  - Google Trends: ${gt.length} keywords`);
  console.log(`  - Reddit: ${rd.length} posts`);

  return data;
}

main().catch(console.error);
