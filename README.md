# Prompt Radar

Track prompt/system-instruction evolution across major AI tools with **multi-source evidence**, **version hashes**, and **change timelines**.

> Goal: make prompt tracking production-usable, not just a static text dump.

---

## What this project does

Prompt Radar continuously watches prompt-related sources for multiple tools (Claude Code, Kiro, Codex, Antigravity, Gemini CLI, Kimi, GLM, Doubao), then:

1. collects candidate prompt texts from multiple sources,
2. normalizes + deduplicates content,
3. computes stable content hashes,
4. scores candidates by source confidence,
5. selects the best current candidate per tool,
6. records historical changes over time.

---

## Why Prompt Radar exists

Most prompt repos are snapshots. They are useful, but often have one or more issues:
- single-source dependency,
- unclear update provenance,
- no deterministic change history,
- no confidence ranking when sources disagree.

Prompt Radar is built to solve those gaps with a repeatable pipeline.

---

## Tracked tools

Configured in `config/sources.json`:

- Claude Code
- Kiro
- Codex
- Antigravity
- Gemini CLI
- Kimi
- GLM
- Doubao

You can add new tools by adding source definitions in the same config.

---

## How it works (pipeline)

### 1) Source collection
Collects from heterogeneous public sources (e.g., GitHub raw files, repos, gists, docs links).

### 2) Normalization
Converts text into a stable normalized form to reduce noise from formatting-only changes.

### 3) Deduplication
Uses SHA-256 hash to remove semantically identical candidates.

### 4) Confidence scoring
Each candidate gets a deterministic confidence score based on:
- source type reliability,
- source weight from config,
- basic quality signal (content completeness/length).

### 5) Selection
Highest-confidence candidate is selected as the current snapshot for that tool.

### 6) Change detection
If selected hash differs from last run, a change event is emitted and history is appended.

### 7) Fallback safety
If all sources fail in one run, previous snapshot is retained and failure diagnostics are written.

---

## Data outputs

- `data/current.json`  
  Latest selected candidate + metadata per tool.

- `data/history.json`  
  Append-only timeline of detected prompt changes.

- `data/changes-latest.json`  
  Delta report for the most recent run.

---

## Quick start

```bash
npm ci
npm run update
npm run report
```

### Commands

- `npm run update` → run collector + selector + change detector
- `npm run report` → print human-readable summary of latest changes

---

## Automation

Workflow: `.github/workflows/update.yml`

- cron: every 4 hours
- steps: `npm ci` → `npm run update` → `npm run report`
- if `data/*.json` changes: auto-commit to `main`

---

## Repository structure

```text
config/
  sources.json          # tool/source registry and weights
src/
  ...                   # collectors, normalizers, scoring, diff logic
scripts/
  ...                   # runner/report scripts
data/
  current.json
  history.json
  changes-latest.json
```

---

## Limitations

- Public-source only (no private endpoints).
- Some providers do not publish canonical prompts consistently.
- Confidence score is heuristic (deterministic), not ground-truth certainty.

---

## Roadmap

- [ ] per-tool source health dashboard
- [ ] semantic diff (not only hash diff)
- [ ] web status badge (`last update`, `changed tools count`)
- [ ] signed release snapshots for auditability
- [ ] optional webhook notifications on high-confidence changes

---

## Contributing

If you know stronger sources for any tracked tool, open a PR to `config/sources.json` with:
- source URL,
- source type,
- rationale for confidence weight.

High-quality source curation is the core leverage of this project.
