const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/catalogue-cache.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(moduleUnderTest.exports);
const { createCatalogueCache } = moduleUnderTest.exports;

test('concurrent consumers and forced refresh reuse the same in-flight load', async () => {
  const load = createCatalogueCache(10000);
  let calls = 0;
  let finish;
  const fetch = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const first = load('branch-a', fetch);
  const second = load('branch-a', fetch, true);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish(['item']);
  assert.deepEqual(await first, ['item']);
  assert.equal(await second, await first);
  await load('branch-a', fetch);
  assert.equal(calls, 1);
});

test('explicit refresh reloads and branch caches remain separate', async () => {
  const load = createCatalogueCache(10000);
  assert.equal(await load('a', async () => 1), 1);
  assert.equal(await load('b', async () => 2), 2);
  assert.equal(await load('a', async () => 3, true), 3);
  assert.equal(await load('b', async () => 4), 2);
});

test('failed loads can retry and expired entries reload', async () => {
  const load = createCatalogueCache(0);
  await assert.rejects(load('a', async () => { throw new Error('offline'); }));
  assert.equal(await load('a', async () => 1), 1);
  assert.equal(await load('a', async () => 2), 2);
});
