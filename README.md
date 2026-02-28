# prompt-radar

Track prompt updates across multiple AI tools using **multi-source evidence**, normalization, deduplication, and confidence scoring.

## Why this is better than static prompt dumps

Single-source trackers break when one source disappears, changes format, or goes stale.

`prompt-radar` improves reliability by:

- collecting from **multiple source types** (docs, GitHub content/search hints, gists)
- normalizing noisy text before comparing versions
- deduplicating equivalent content with stable SHA-256 hashes
- scoring confidence per source and selecting the best candidate
- preserving a per-tool timeline for historical change tracking
- using fallback behavior when sources fail (no data-loss on transient outages)

## Tracked tools

- Claude Code
- Kiro
- Codex
- Antigravity
- Gemini CLI
- Kimi
- GLM
- Doubao

Configured in `config/sources.json`.

## Data outputs

- `data/current.json` – latest selected candidate/evidence per tool
- `data/history.json` – append-only timeline of detected changes per tool
- `data/changes-latest.json` – changes detected in the latest run

## Methodology

1. Fetch all configured sources for each tool.
2. Convert to normalized plain text and remove unstable noise.
3. Compute `contentHash = sha256(normalizedContent)`.
4. Deduplicate by hash.
5. Score each candidate with a weighted confidence model:
   - source-type reliability
   - source weight from config
   - minimum quality signal from content length
6. Select top-confidence candidate.
7. Compare top candidate hash with previous snapshot to detect changes.
8. If all sources fail, keep prior candidate as fallback and record failures.

## CLI

```bash
npm run update
npm run report
```

## Local validation

```bash
npm ci
npm run update
npm run report
```

## GitHub Action automation

Workflow: `.github/workflows/update.yml`

- Runs every 4 hours via cron
- Runs `npm ci` + `npm run update` + `npm run report`
- Auto-commits updated `data/*.json` if changed

## Notes

- No secrets are required.
- Source endpoints can evolve; update `config/sources.json` as needed.
- The confidence score is heuristic but deterministic and auditable.
