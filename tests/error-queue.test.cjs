const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScript(relativePath, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (name) => imports[name] ?? require(name), module, module.exports,
  );
  return module.exports;
}

const { createErrorQueue, describeError } = loadTypeScript('src/lib/error-queue.ts');

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}

const err = (message, extra = {}) => ({ message, screen: '/pos', kind: 'uncaught', fatal: false, ...extra });

test('a duplicate is kept once, also after it was sent', async () => {
  const store = memoryStorage();
  const queue = createErrorQueue(() => store);
  assert.equal(queue.add(err('x is undefined')), true);
  assert.equal(queue.add(err('x is undefined')), false);
  const sent = [];
  await queue.flush(async (batch) => { sent.push(batch); return true; });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].length, 1);
  assert.equal(sent[0][0].sig, undefined);
  assert.equal(queue.add(err('x is undefined')), false);
  assert.equal(queue.pendingCount(), 0);
});

test('20 per request; a failure keeps them and stops until the next page load', async () => {
  const store = memoryStorage();
  const queue = createErrorQueue(() => store);
  for (let i = 0; i < 45; i++) queue.add(err('boom ' + i));
  const sizes = [];
  await queue.flush(async (batch) => { sizes.push(batch.length); return sizes.length < 2; });
  assert.deepEqual(sizes, [20, 20]);
  assert.equal(queue.pendingCount(), 25);
  await queue.flush(async () => { sizes.push('again'); return true; });
  assert.deepEqual(sizes, [20, 20]);
  // A new page load (new queue on the same storage) sends what is left.
  const next = createErrorQueue(() => store);
  await next.flush(async () => true);
  assert.equal(next.pendingCount(), 0);
});

test('blocked storage never throws', async () => {
  const queue = createErrorQueue(() => ({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } }));
  assert.equal(queue.add(err('a')), true);
  await queue.flush(async () => true);
});

test('noise and ERP answers are not reported', () => {
  assert.equal(describeError(new Error('ResizeObserver loop limit exceeded'), 'uncaught', '/'), null);
  assert.equal(describeError({ isAxiosError: true, message: 'Request failed with status code 422' }, 'unhandled_rejection', '/'), null);
  assert.equal(describeError(Object.assign(new Error('x'), { response: { status: 'FAILED' } }), 'crash', '/'), null);
  assert.equal(describeError({ status: 'FAILED', message: 'Not allowed' }, 'unhandled_rejection', '/'), null);
  assert.equal(describeError(new TypeError('Failed to fetch'), 'unhandled_rejection', '/'), null);
  assert.equal(describeError(new Error('Authentication required'), 'crash', '/'), null);
  assert.equal(describeError('Script error.', 'uncaught', '/'), null);
});

test('a crash is fatal and carries the digest; a chunk load error is not fatal', () => {
  const crash = describeError(new Error('Cannot read properties of undefined'), 'crash', '/pos', { digest: '123' });
  assert.equal(crash.fatal, true);
  assert.equal(crash.kind, 'crash (digest 123)');
  assert.equal(crash.screen, '/pos');
  assert.ok(crash.stack);
  const chunk = describeError(Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' }), 'crash', '/pos');
  assert.equal(chunk.fatal, false);
  assert.equal(chunk.kind, 'chunk_load');
  const rejection = describeError('plain reason', 'unhandled_rejection', '/x');
  assert.equal(rejection.fatal, false);
  assert.equal(rejection.message, 'plain reason');
});
