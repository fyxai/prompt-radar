import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const DATA_DIR = path.resolve('data');

export const SOURCE_TYPE_BASE_SCORE = {
  github_file: 0.95,
  doc: 0.85,
  github_search_hint: 0.55,
  gist: 0.5
};

export function nowIso() {
  return new Date().toISOString();
}

export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function normalizeContent(raw = '') {
  const unified = raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \u00A0]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // remove common crawl artifacts and unstable footer lines
  return unified
    .split('\n')
    .filter((line) => !/^Last updated:?/i.test(line.trim()))
    .join('\n')
    .trim();
}

export function shortTextPreview(text, max = 180) {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson(file, fallback) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

export async function writeJson(file, obj) {
  await ensureDataDir();
  await fs.writeFile(path.join(DATA_DIR, file), `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

export async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'prompt-radar/1.0'
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function collectFromSource(source) {
  const fetchedAt = nowIso();
  try {
    const raw = await fetchText(source.url);
    const text = source.type === 'doc' || source.type === 'github_search_hint' || source.type === 'gist'
      ? stripHtml(raw)
      : raw;
    const normalized = normalizeContent(text);

    if (!normalized || normalized.length < 40) {
      return {
        ok: false,
        error: 'Content too short after normalization',
        fetchedAt,
        source
      };
    }

    const contentHash = sha256(normalized);
    const qualityScore = Math.min(1, Math.log10(normalized.length + 10) / 5);
    const base = SOURCE_TYPE_BASE_SCORE[source.type] ?? 0.4;
    const sourceWeight = source.weight ?? 0.5;
    const confidence = Number((base * 0.6 + sourceWeight * 0.25 + qualityScore * 0.15).toFixed(3));

    return {
      ok: true,
      source,
      fetchedAt,
      content: normalized,
      contentHash,
      confidence,
      preview: shortTextPreview(normalized)
    };
  } catch (err) {
    return {
      ok: false,
      source,
      fetchedAt,
      error: err?.message || String(err)
    };
  }
}

export function dedupeCandidates(candidates) {
  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    if (!c.ok) continue;
    if (seen.has(c.contentHash)) continue;
    seen.add(c.contentHash);
    out.push(c);
  }
  return out;
}

export function pickTopCandidate(candidates) {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
}
