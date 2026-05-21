# AGENTS.md — BuilderPulse

## Quick Start

---

## 开发基本原则 (强制要求)

**所有代码修复和新功能开发必须遵循以下原则：**

### 1. 设计原则
- **KISS 原则**: 保持代码简洁、干净
- **高内聚、低耦合**: 用精简的设计模式
- **单一职责**: 每个模块只做一件事

### 2. 测试要求
- **覆盖率**: 所有新功能代码必须测试，保证 **100% 测试率**
- **TDD 方法**: 先写测试，再写实现代码
- **回归测试**: 修复后必须验证不影响其他功能

### 3. 变更原则
- **隔离性**: 修改不能影响无关功能
- **最小化**: 只改必要的代码，不做大规模重构

### 4. 提案流程
- **新功能**: 使用 **openspec** 生成功能提案并实现
- **Bug 修复**: 使用 **openspec** 生成修复提案
- **任何代码变更**: 都必须包含此提示词要求

---

## 代码质量检查清单

完成任务前检查：
- [ ] 代码可读性好，命名清晰
- [ ] 函数精简 (< 50 行)
- [ ] 文件集中 (< 800 行)
- [ ] 无深层嵌套 (> 4 层)
- [ ] 错误处理完善
- [ ] 无 console.log 语句
- [ ] 无硬编码值
- [ ] 使用不可变模式

---

```bash
cd /Users/jie/code/BuilderPulse && bash generate-daily-report.sh
```

This runs 3 steps: fetch data → generate bilingual reports → git commit & push.

## Architecture

Shell-script-based pipeline, no Node packages, no `package.json`. Pure ES Modules (`import` syntax).

```
generate-daily-report.sh          # Orchestrator (fetch → generate → git)
scripts/fetch-data.js             # 6 data sources, saves to data/raw-data.json
scripts/generate-report.js        # Reads raw-data.json → en/ + zh/ Markdown reports
```

**Output:** `en/2026/YYYY-MM-DD.md` (English) + `zh/2026/YYYY-MM-DD.md` (Chinese). Reports are date-stamped, weekends skipped.

## Data Sources — Reliability & Gotchas

| Source | Status | Notes |
|--------|--------|-------|
| Hacker News (Firebase) | ✅ Reliable | Uses `Promise.allSettled` — individual failures don't kill the batch. 15s timeout per item. |
| GitHub Trending (proxy) | ✅ Reliable | Two fallback proxies: `lessx.xyz` → `gh-trending-api.vercel.app`. Data format has `repository` field (not `name`). |
| Google Trends | ✅ Always works | Hardcoded 10 AI keywords. No real API call. |
| Product Hunt | ⚠️ Fails | HTML scraping via regex — returns empty. No fix attempted. |
| HuggingFace | ⚠️ Fails | API times out (10s default). Returns empty. |
| Reddit | ⚠️ Fails | JSON API returns errors. Returns empty. |

**Key:** 4/6 sources work reliably (HN, GitHub, Google Trends + fallbacks). Reports still generate meaningful content with just these 3.

## Commands

### Full pipeline (recommended)
```bash
bash generate-daily-report.sh
```

### Manual step-by-step
```bash
node scripts/fetch-data.js          # Step 1: fetch → data/raw-data.json
node scripts/generate-report.js     # Step 2: generate en/ + zh/ reports
```

### Cron (optional)
```bash
bash setup-cron.sh                  # Installs daily 3 AM Beijing Time cron job
crontab -l                          # Verify installed
```

### Git (manual)
Reports are date-stamped: `en/2026/YYYY-MM-DD.md` and `zh/2026/YYYY-MM-DD.md`.

```bash
TODAY=$(date +%Y-%m-%d)
git add "en/2026/${TODAY}.md" "zh/2026/${TODAY}.md" data/raw-data.json
git commit -m "Daily: ${TODAY} - multi-source data"
```

## Git Push Gotcha

If `git push` fails with `SSL_ERROR_SYSCALL`, retry after setting HTTP version:
```bash
git config --global http.version http/1.1   # Only needed once per session
git push origin main
```

## Report Structure (both languages)

- **Discovery**: Solo-founder products (HN stories with >30 comments), trending GitHub repos
- **Tech Radar**: Company shutdowns (HN score >50), fastest-growing dev tools, HuggingFace models, Google trends
- **Competitive Intel**: Reddit hot discussions (top 5) — currently empty due to API failure
- **Trends**: Tech keywords, VC/YC focus areas (hardcoded), Key Takeaways
- **Action**: 2-hour build recommendation, weekend expansion ideas

## Constraints & Conventions

- **No API keys needed** — all sources are free or use hardcoded fallbacks
- **Hardcoded data:** 10 Google Trends keywords, VC/YC focus areas (AI Agent infra, Claude tools, local open-source models)
- **Reports are generated in Chinese** by `generateChineseReport()` — the English report calls this function too, so Takeaway sections contain Chinese text in both reports (known issue)
- **No lint/test/format tools** — this is a simple pipeline, not a library

## TODO (from GENERATOR.md)

- [ ] Reddit network optimization
- [ ] HuggingFace network optimization  
- [ ] Add LLM-generated deep Takeaway (currently template-based only)
- [ ] Add email/Telegram push delivery

## Development Principles (Mandatory for All Changes)

**All code fixes and new features must follow these principles:**

### 1. Design Principles
- **KISS**: Keep code simple and clean
- **High cohesion, low coupling**: Use minimal design patterns
- **Single responsibility**: Each module does one thing

### 2. Testing Requirements
- **Coverage**: All new code must be tested, target **100% test rate**
- **TDD**: Write tests before implementation code
- **Regression testing**: Verify fixes don't break other features

### 3. Change Principles
- **Isolation**: Changes must not affect unrelated functionality
- **Minimization**: Only change necessary code, no large-scale refactoring

### 4. Proposal Process (openspec)

**`openspec` is installed globally** (v1.3+). Before any code change:

```bash
openspec init --tools opencode    # One-time setup (already done)
/opsx:propose "your idea"         # Generate feature proposal
/opsx:explore                     # Explore the change scope
/opsx:apply                       # Apply the proposal
/opsx:archive                     # Archive completed change
```

- **New features:** `/opsx:propose "feature name"` → generates proposal spec
- **Bug fixes:** `/opsx:propose "fix description"` → generates fix proposal
- **Any code change:** Must go through openspec workflow first

---

## Code Quality Checklist (before completing tasks)

- [ ] Good readability, clear naming
- [ ] Functions are concise (< 50 lines)
- [ ] Files are focused (< 800 lines)
- [ ] No deep nesting (> 4 levels)
- [ ] Error handling is complete
- [ ] No `console.log` statements in production code
- [ ] No hardcoded values (use config/constants)
- [ ] Use immutable patterns

---

## Project-Specific Notes on Above Principles

This project is a **simple pipeline, not a library** — some principles are adapted to reality:

- **No lint/test/format tools exist yet.** The TODO list includes adding them. Until then, manual verification is the standard.
- **Hardcoded data is intentional** (10 Google Trends keywords, VC/YC focus areas). Do not flag these as violations — they are by design. Only new hardcoded values should be avoided.
- **`console.log` is used for status output** in `fetch-data.js`. Do not remove existing logs; avoid adding new ones unless debugging.
