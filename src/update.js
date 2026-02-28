import fs from 'node:fs/promises';
import path from 'node:path';
import {
  collectFromSource,
  dedupeCandidates,
  nowIso,
  pickTopCandidate,
  readJson,
  sha256,
  writeJson
} from './lib.js';

const cfgPath = path.resolve('config/sources.json');
const cfg = JSON.parse(await fs.readFile(cfgPath, 'utf8'));

const previousCurrent = await readJson('current.json', { generatedAt: null, tools: {} });
const history = await readJson('history.json', { generatedAt: null, tools: {} });

const generatedAt = nowIso();
const nextCurrent = {
  generatedAt,
  tools: {}
};

const changesLatest = {
  generatedAt,
  changes: []
};

for (const tool of cfg.tools) {
  const collected = await Promise.all(tool.sources.map((source) => collectFromSource(source)));
  const deduped = dedupeCandidates(collected);
  const top = pickTopCandidate(deduped);
  const failures = collected.filter((c) => !c.ok).map((c) => ({
    type: c.source.type,
    url: c.source.url,
    error: c.error,
    fetchedAt: c.fetchedAt
  }));

  const previous = previousCurrent.tools?.[tool.id] || null;

  if (!top && previous) {
    // robust fallback: keep previous snapshot if all sources failed/unusable
    nextCurrent.tools[tool.id] = {
      ...previous,
      lastCheckedAt: generatedAt,
      fallbackUsed: true,
      failures
    };
    continue;
  }

  if (!top) {
    nextCurrent.tools[tool.id] = {
      id: tool.id,
      name: tool.name,
      aliases: tool.aliases,
      lastCheckedAt: generatedAt,
      unavailable: true,
      failures
    };
    continue;
  }

  const candidateHashes = deduped.map((c) => c.contentHash).sort();
  const combinedEvidenceHash = sha256(candidateHashes.join('|'));

  const entry = {
    id: tool.id,
    name: tool.name,
    aliases: tool.aliases,
    lastCheckedAt: generatedAt,
    topCandidate: {
      hash: top.contentHash,
      confidence: top.confidence,
      source: top.source,
      preview: top.preview
    },
    evidence: deduped.map((c) => ({
      hash: c.contentHash,
      confidence: c.confidence,
      source: c.source,
      preview: c.preview
    })),
    evidenceHash: combinedEvidenceHash,
    failures,
    fallbackUsed: false
  };

  nextCurrent.tools[tool.id] = entry;

  const changed = !previous?.topCandidate || previous.topCandidate.hash !== top.contentHash;
  if (changed) {
    const item = {
      detectedAt: generatedAt,
      toolId: tool.id,
      toolName: tool.name,
      previousHash: previous?.topCandidate?.hash || null,
      newHash: top.contentHash,
      confidence: top.confidence,
      source: top.source,
      preview: top.preview
    };
    changesLatest.changes.push(item);
    history.tools[tool.id] ||= [];
    history.tools[tool.id].push(item);
  }
}

history.generatedAt = generatedAt;
await writeJson('current.json', nextCurrent);
await writeJson('history.json', history);
await writeJson('changes-latest.json', changesLatest);

console.log(`Updated prompt radar at ${generatedAt}`);
console.log(`Detected ${changesLatest.changes.length} change(s).`);
