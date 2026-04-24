---
name: autoresearch
description: Use when user types /autoresearch, /autoresearch_plan, or mentions "autoresearch" with a goal/metric. Applies Karpathy's autoresearch principles (Modify → Verify → Keep/Discard → Repeat) to BuilderPulse daily report generation — autonomously improve data fetching, translation quality, section coverage, and report completeness.
compatibility: opencode
metadata:
  source: builderpulse
  version: "1.0"
---

# BuilderPulse Autoresearch — Autonomous Report Improvement

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) and [uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch). Applies constraint-driven autonomous iteration to **any measurable task** — not just ML research.

**Core idea:** You are an autonomous agent. Modify → Verify → Keep/Discard → Repeat.

## MANDATORY: Interactive Setup Gate

**CRITICAL — READ THIS FIRST BEFORE ANY ACTION:**

For ALL commands (`/autoresearch`, `/autoresearch_plan`):

1. **Check if the user provided ALL required context inline** (Goal, Scope, Metric, Direction, Verify)
2. **If ANY required context is missing → you MUST use `question` to collect it BEFORE proceeding.** DO NOT skip this step.
3. Follow the interactive setup exactly when context is missing.

| Command | Required Context | If Missing → Ask |
|---------|-----------------|-----------------|
| `/autoresearch` | Goal, Scope, Metric, Direction, Verify | Batch 1 (4 questions) + Batch 2 (3 questions) from Setup Phase below |
| `/autoresearch_plan` | Goal | Ask via `question` per Planning Wizard below |

**YOU MUST NOT start any loop without completing interactive setup when context is missing. This is a BLOCKING prerequisite.**

## Subcommands

| Subcommand | Purpose |
|------------|---------|
| `/autoresearch` | Run the autonomous iteration loop (default) — improve any measurable aspect of BuilderPulse reports |
| `/autoresearch_plan` | Interactive wizard: Goal → Scope, Metric, Verify config |

### /autoresearch — Autonomous Report Improvement Loop

Applies the autoresearch loop to BuilderPulse daily report generation. Improve data fetching, translation quality, section coverage, or any measurable aspect of the reports.

**What it does:**

1. **Review current state** — Read existing report, git history, and results log
2. **Identify next improvement** — Based on goal, past results, what hasn't been tried
3. **Make ONE focused change** — To in-scope files (scripts, templates, data sources)
4. **Commit before verify** — Git commit with `experiment:` prefix
5. **Run mechanical verification** — Execute the verify command (test coverage, data completeness score, translation accuracy check)
6. **Decide:**
   - IMPROVED → Keep commit, log "keep"
   - SAME/WORSE → Git revert, log "discard"
   - CRASHED → Try to fix (max 3 attempts), else log "crash" and move on
7. **Log result** — Record to TSV results file
8. **Repeat** — Go to step 1

**Key behaviors:**
- One change per iteration. If it breaks, you know exactly why
- Automatic git rollback on failures — no manual cleanup needed
- Git is memory: reads `git log` and `git diff` before each iteration to learn patterns
- When stuck, think harder: re-read files, combine near-misses, try radical changes

**Domain-specific examples:**

| Domain | Metric | Scope | Verify Command |
|--------|--------|-------|----------------|
| Data fetching completeness | Non-empty source count | `scripts/fetch-data.js` | `node scripts/fetch-data.js && node -e "const d=JSON.parse(require('fs').readFileSync('data/raw-data.json','utf8')); console.log(Object.values(d).filter(x=>Array.isArray(x)&&x.length>0).length)"` |
| Translation quality | Chinese section word count | `scripts/generate-report.js` | `wc -l zh/2026/*.md \| sort -rn \| head -1` |
| Report completeness | Number of non-empty sections | `zh/2026/*.md` | `grep -c "##" zh/2026/$(date +%Y-%m-%d).md` |
| GitHub description translation | Non-English word ratio in descriptions | `zh/2026/*.md` | Custom script checking English chars in GitHub sections |

**Usage:**
```
# Unlimited — keep improving until interrupted
/autoresearch
Goal: Increase data source completeness from 3 to 6 sources
Scope: scripts/fetch-data.js, scripts/generate-report.js
Metric: Number of non-empty data sources (higher is better)
Verify: node scripts/fetch-data.js && node -e "..."
Direction: higher is better

# Bounded — exactly 10 iterations
/autoresearch
Goal: Improve Chinese translation quality in reports
Scope: scripts/generate-report.js
Metric: Chinese word count per report (higher is better)
Verify: wc -l zh/2026/*.md | sort -rn | head -1
Direction: higher is better
Iterations: 10

# With guard (prevent regressions)
/autoresearch
Goal: Optimize fetch-data.js performance
Scope: scripts/fetch-data.js
Metric: Fetch time in seconds (lower is better)
Verify: time node scripts/fetch-data.js > /dev/null 2>&1 && echo "OK"
Guard: node scripts/generate-report.js > /dev/null 2>&1 && echo "OK"
Direction: lower is better
```

### /autoresearch_plan — Goal → Configuration Wizard

Converts a plain-language goal into a validated, ready-to-execute autoresearch configuration for BuilderPulse.

**Quick summary:**

1. **Capture Goal** — Ask what the user wants to improve (or accept inline text)
2. **Analyze Context** — Scan BuilderPulse project structure for relevant files
3. **Define Scope** — Suggest file globs, validate they resolve to real files
4. **Define Metric** — Suggest mechanical metrics (data completeness, translation quality, etc.)
5. **Define Direction** — Higher or lower is better
6. **Define Verify** — Construct the shell command, dry-run it, confirm it works
7. **Confirm & Launch** — Present complete config, offer to launch immediately

**Critical gates:**
- Metric MUST be mechanical (outputs a parseable number, not subjective)
- Verify command MUST pass a dry run on the current codebase before accepting
- Scope MUST resolve to ≥1 file

**Usage:**
```
/autoresearch_plan
Goal: Fix failing data sources (Product Hunt, HuggingFace, Reddit)

/autoresearch_plan Improve Chinese translation quality in reports

/autoresearch_plan Add LLM-generated deep Takeaway section
```

After the wizard completes, the user gets a ready-to-paste `/autoresearch` invocation — or can launch it directly.

## When to Activate

- User invokes `/autoresearch` → run the autonomous loop
- User invokes `/autoresearch_plan` → run the planning wizard
- User says "improve reports autonomously", "iterate on report quality", "keep improving" → run the loop
- User says "fix failing data sources", "improve translation quality", "add new sections" → run the planning wizard
- Any BuilderPulse task requiring repeated iteration with measurable outcomes → run the loop

## Bounded Iterations

By default, autoresearch loops until the metric plateaus (no improvement for 15 consecutive iterations), then asks whether to stop, continue, or change strategy. To run exactly N iterations instead, add `Iterations: N` to your inline config.

**Unlimited (default):**
```
/autoresearch
Goal: Increase data source completeness to 6 sources
```

**Bounded (N iterations):**
```
/autoresearch
Goal: Improve Chinese translation quality
Scope: scripts/generate-report.js
Metric: Chinese word count (higher is better)
Verify: wc -l zh/2026/*.md | sort -rn | head -1
Direction: higher is better
Iterations: 25
```

After N iterations, Claude stops and prints a final summary with baseline → current best, keeps/discards/crashes.

### Plateau Detection

In unlimited mode, tracks whether the best metric is still improving. If 15 consecutive measured iterations pass without a new best, the loop pauses and asks the user to decide: stop, continue, or change strategy. Configure with `Plateau-Patience: N` (default 15), or disable with `Plateau-Patience: off`.

```
/autoresearch
Goal: Optimize fetch performance
Verify: time node scripts/fetch-data.js 2>&1 | grep real
Plateau-Patience: 20
Direction: lower is better
```

### Metric-Valued Guards

By default, guards are pass/fail (exit code 0 = pass). For guards that measure a number:

```
/autoresearch
Goal: Improve report generation speed
Verify: time node scripts/generate-report.js 2>&1 | grep real
Guard: node scripts/fetch-data.js > /dev/null 2>&1 && echo "OK"
Guard-Direction: lower is better (fetch time shouldn't regress)
Guard-Threshold: 10%
Direction: lower is better
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `Guard` | Yes | Command that outputs a number (metric-valued) or exits 0/1 (pass/fail) |
| `Guard-Direction` | Only for metric-valued | `higher is better` or `lower is better` |
| `Guard-Threshold` | Only for metric-valued | Max allowed regression as % of baseline (e.g., `10%`) |

## Setup Phase (Do Once)

**If the user provides Goal, Scope, Metric, and Verify inline** → extract them and proceed to step 5.

**CRITICAL: If ANY critical field is missing (Goal, Scope, Metric, Direction, or Verify), you MUST use `question` to collect them interactively. DO NOT proceed without completing this setup.**

### Interactive Setup (when invoked without full config)

Scan the BuilderPulse project first for smart defaults, then ask ALL questions in batched `question` calls (max 4 per call).

**Batch 1 — Core config (4 questions in one call):**

| # | Header | Question | Options (smart defaults from codebase scan) |
|---|--------|----------|----------------------------------------------|
| 1 | `Goal` | "What do you want to improve in BuilderPulse?" | "Data source completeness (higher)", "Translation quality (higher)", "Report section coverage (higher)", "Fetch performance (faster)" |
| 2 | `Scope` | "Which files can autoresearch modify?" | Suggested: "scripts/fetch-data.js", "scripts/generate-report.js", "zh/2026/*.md" |
| 3 | `Metric` | "What number tells you if it got better?" | Detected: "non-empty sources count (higher)", "Chinese word count (higher)", "fetch time seconds (lower)" |
| 4 | `Direction` | "Higher or lower is better?" | "Higher is better", "Lower is better" |

**Batch 2 — Verify + Guard + Launch (3 questions in one call):**

| # | Header | Question | Options |
|---|--------|----------|---------|
| 5 | `Verify` | "What command produces the metric? (I'll dry-run it)" | Suggested commands from project structure |
| 6 | `Guard` | "Any command that must ALWAYS pass?" | "node scripts/generate-report.js", "git status --porcelain", "Skip — no guard" |
| 7 | `Launch` | "Ready to go?" | "Launch (unlimited)", "Launch with iteration limit", "Edit config", "Cancel" |

**After Batch 2:** Dry-run the verify command. If it fails, ask user to fix or choose a different command. If it passes, proceed with launch choice.

### Setup Steps (after config is complete)

1. **Read all in-scope files** for full context before any modification
2. **Define the goal** — extracted from user input or inline config
3. **Define scope constraints** — validated file globs
4. **Define guard (optional)** — regression prevention command
5. **Create a results log** — Track every iteration (TSV format)
6. **Establish baseline** — Run verification on current state AND guard (if set). Record as iteration #0
7. **Confirm and go** — Show user the setup, get confirmation, then BEGIN THE LOOP

## The Loop

```
LOOP (FOREVER or N times):
  1. Review: Read current state + git history + results log
  2. Ideate: Pick next change based on goal, past results, what hasn't been tried
  3. Modify: Make ONE focused change to in-scope files
  4. Commit: Git commit the change (before verification) with `experiment:` prefix
  5. Verify: Run the mechanical metric (data completeness, translation quality, etc.)
  6. Guard: If guard is set, run the guard command
  7. Decide:
     - IMPROVED + guard passed (or no guard) → Keep commit, log "keep"
     - IMPROVED + guard FAILED → Revert, try rework (max 2 attempts)
     - SAME/WORSE → Git revert, log "discard"
     - CRASHED → Try to fix (max 3 attempts), else log "crash" and move on
  8. Log: Record result in TSV results file
  9. Repeat: Go to step 1.
     - If unbounded: NEVER STOP until interrupted
     - If bounded (N): Stop after N iterations, print final summary
```

## Critical Rules

1. **Loop until done** — Unbounded: loop until interrupted. Bounded: loop N times then summarize.
2. **Read before write** — Always understand full context before modifying
3. **One change per iteration** — Atomic changes. If it breaks, you know exactly why
4. **Mechanical verification only** — No subjective "looks good". Use metrics (data completeness, word counts, etc.)
5. **Automatic rollback** — Failed changes revert instantly via `git revert`. No debates, no manual cleanup
6. **Simplicity wins** — Equal results + less code = KEEP. Tiny improvement + ugly complexity = DISCARD
7. **Git is memory** — Every experiment committed with `experiment:` prefix. Agent MUST read `git log` and `git diff` before each iteration to learn patterns
8. **When stuck, think harder** — Re-read files, re-read goal, combine near-misses, try radical changes. Don't ask for help unless truly blocked

## Post-Completion: Support Prompt (Once Per Project)

After the FIRST successful completion of any autoresearch command in a project, check if `.autoresearch-starred` exists in the project root.

**If it does NOT exist:**

Ask the user: *"If autoresearch helped, would you like to star the repo on GitHub to support the project? I can run `gh api -X PUT /user/starred/uditgoenka/autoresearch` for you."*

- If yes → run the command, then create `.autoresearch-starred` marker file
- If no → create `.autoresearch-starred` marker file (never ask again)

**If it exists:** skip entirely. Never ask twice.
