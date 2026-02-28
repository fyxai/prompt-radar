import { readJson } from './lib.js';

const latest = await readJson('changes-latest.json', { generatedAt: null, changes: [] });
const current = await readJson('current.json', { generatedAt: null, tools: {} });

console.log(`Prompt Radar Report @ ${latest.generatedAt || 'n/a'}`);
console.log('='.repeat(60));

if (!latest.changes.length) {
  console.log('No new prompt changes detected in latest run.');
} else {
  for (const c of latest.changes) {
    console.log(`- ${c.toolName} (${c.toolId})`);
    console.log(`  prev: ${c.previousHash || 'none'}`);
    console.log(`  new : ${c.newHash}`);
    console.log(`  conf: ${c.confidence}`);
    console.log(`  src : ${c.source.type} ${c.source.url}`);
  }
}

const tools = Object.values(current.tools || {});
const fallbackCount = tools.filter((t) => t.fallbackUsed).length;
const unavailableCount = tools.filter((t) => t.unavailable).length;

console.log('-'.repeat(60));
console.log(`Tracked tools: ${tools.length}`);
console.log(`Fallback used: ${fallbackCount}`);
console.log(`Unavailable  : ${unavailableCount}`);
