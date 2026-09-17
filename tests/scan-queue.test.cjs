const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Use the existing TypeScript dependency; no additional test runtime is needed.
function loadTypeScript(relativePath, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (name) => imports[name] ?? require(name), module, module.exports,
  );
  return module.exports;
}

const { createScanQueue } = loadTypeScript('src/lib/scan-queue.ts');

test('rapid repeated scans each add once, after the preceding stock check', async () => {
  const events = [];
  const counts = [];
  let finishFirst;
  const response = new Promise((resolve) => { finishFirst = resolve; });
  const queue = createScanQueue((count) => counts.push(count));
  queue.enqueue(async () => {
    events.push('lookup-1');
    await response;
    events.push('add-1');
  });
  queue.enqueue(async () => {
    events.push('lookup-2', 'add-2');
  });
  await Promise.resolve();
  assert.deepEqual(events, ['lookup-1']);
  assert.equal(queue.pending, 2);
  finishFirst();
  await queue.drain();
  assert.deepEqual(events, ['lookup-1', 'add-1', 'lookup-2', 'add-2']);
  assert.deepEqual(counts, [1, 2, 1, 0]);
});

test('a failed lookup does not block the next barcode', async () => {
  const queue = createScanQueue(() => {});
  let added = false;
  queue.enqueue(async () => { throw new Error('Simulated stock timeout'); });
  queue.enqueue(async () => { added = true; });
  await queue.drain();
  assert.equal(added, true);
  assert.equal(queue.pending, 0);
});

test('unmount discards waiting scans and stops pending-state notifications', async () => {
  const counts = [];
  const queue = createScanQueue((count) => counts.push(count));
  let called = false;
  queue.enqueue(async () => { called = true; });
  queue.dispose();
  queue.enqueue(async () => { called = true; });
  await queue.drain();
  assert.equal(called, false);
  assert.deepEqual(counts, [1]);
});

function stockAction(postForm) {
  return loadTypeScript('src/lib/actions/inventory.actions.ts', {
    axios: { default: { postForm } },
  }).fetch_item_details;
}

test('full barcode stock is checked freshly on every scan with a bounded request', async () => {
  const requests = [];
  const fetchStock = stockAction(async (url, form, config) => {
    requests.push({ url, data: Object.fromEntries(form), config });
    return { data: requests.length === 1 ? '50|3|1' : '50|2|1' };
  });
  const args = ['https://example.test/dev/', '0_', '214', 'AC0005-G2-003H3', '0', undefined];
  assert.equal((await fetchStock(...args)).quantity_available, 3);
  assert.equal((await fetchStock(...args)).quantity_available, 2);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], {
    url: 'https://example.test/dev/process.php',
    data: { tp: 'getItemPriceQtyTaxWithId', it: 'AC0005-G2-003H3', cp: '0_', kit: '0', id: '214' },
    config: { timeout: 20000 },
  });
});

test('confirmed zero stock remains distinct from an unavailable response', async () => {
  const zero = stockAction(async () => ({ data: '0|0|0' }));
  assert.equal((await zero('', '', '', '', '', undefined)).quantity_available, 0);
  const missing = stockAction(async () => ({ data: '' }));
  assert.equal(await missing('', '', '', '', '', undefined), null);
});

test('malformed stock and network failures never become zero-stock answers', async () => {
  for (const data of ['50||1', '50|invalid|1', '50|3|1|unexpected']) {
    const fetchStock = stockAction(async () => ({ data }));
    await assert.rejects(fetchStock('', '', '', '', '', undefined));
  }
  const fetchStock = stockAction(async () => { throw new Error('Network failure'); });
  await assert.rejects(fetchStock('', '', '', '', '', undefined), /Network failure/);
});

test('barcode input ignores base-code prefixes, survives pending lookups, and consumes each terminator once', async () => {
  // Exercise the actual component's event handlers with a small hook host.
  // UI/payment imports are stubs; the scan queue and handler are production code.
  const slots = [];
  const effects = [];
  let cursor = 0;
  let mounting = true;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useRef(value) {
      const index = cursor++;
      return slots[index] ??= { current: value };
    },
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], (next) => { slots[index] = next; }];
    },
    useEffect(effect) { if (mounting) effects.push(effect); },
  };
  const requests = [];
  const added = [];
  const errors = [];
  let finishLookup;
  const stockResponse = new Promise((resolve) => { finishLookup = resolve; });
  let queue;
  let onCartChange;
  const auth = { site_url: 'https://example.test/', site_company: { company_prefix: '0_' }, account: { id: '214' } };
  const cartStore = Object.assign(() => ({ currentCart: null, addItemToCart: (item) => added.push(item) }), {
    subscribe: (listener) => { onCartChange = listener; return () => {}; },
  });
  const imports = {
    react: { ...react, default: react },
    '~/hooks/useInventory': { useInventory: () => ({ inventory: [{ stock_id: 'AC0005', kit: '0' }, { stock_id: 'AC0005-G2-003H3', kit: '0' }] }) },
    '~/lib/actions/inventory.actions': { fetch_item_details: async (...args) => { requests.push(args); return stockResponse; } },
    '~/lib/scan-queue': { createScanQueue: (notify) => (queue = createScanQueue(notify)) },
    '~/store/cart-store': { useCartStore: cartStore },
    '~/store/auth-store': { useAuthStore: { getState: () => auth, subscribe: () => () => {} } },
    '~/store/pay-store': { usePayStore: () => ({ paymentCarts: [] }) },
    '~/hooks/use-payments': { useManualPayments: () => ({ manualPayments: [] }), useMpesaPayments: () => ({ mpesaPayments: [] }) },
    '../hooks/use-cart': { useUpdateCart: () => ({ mutate: () => {} }) },
    'next/navigation': { useRouter: () => ({ replace: () => {} }) },
    '~/hawk-tuah/hooks/useEnhancedInventory': { useEnhancedInventory: () => ({ getItemWithDiscounts: async () => null }) },
    '~/hawk-tuah/components/enhancedAmountInput': { useEnhancedPaymentCalculations: () => ({ finalTotal: 0 }) },
    '~/lib/utils': { tallyTotalAmountPaid: () => 0 },
    sonner: { toast: { error: (message) => errors.push(message) } },
  };
  const uiStub = new Proxy({}, { get: (_, name) => String(name) });
  const allImports = new Proxy(imports, { get: (target, name) => target[name] ?? uiStub });
  const Component = loadTypeScript('src/components/item-searchbox.tsx', allImports).default;
  const render = () => { cursor = 0; return Component(); };
  const findInput = (node) => {
    if (node?.props?.name === 'item-search') return node;
    for (const child of node?.children?.flat(Infinity) ?? []) {
      const found = findInput(child);
      if (found) return found;
    }
  };
  const previousWindow = global.window;
  global.window = { addEventListener() {}, removeEventListener() {} };
  const cleanups = [];
  try {
    let input = findInput(render());
    cleanups.push(...effects.map((effect) => effect()));
    mounting = false;
    const barcode = 'AC0005-G2-003H3';
    for (let index = 1; index <= barcode.length; index++) {
      input.props.onChange({ target: { value: barcode.slice(0, index) } });
      input = findInput(render());
      assert.ok(input, 'scan input remains rendered for every character');
      assert.equal(requests.length, 0, 'no request for a partial barcode');
    }
    const enter = { key: 'Enter', nativeEvent: { isComposing: false }, preventDefault() {} };
    input.props.onKeyDown(enter);
    input.props.onKeyDown(enter);
    await Promise.resolve();
    assert.equal(requests.length, 1);
    assert.equal(requests[0][3], barcode);
    input = findInput(render());
    assert.ok(input, 'input remains rendered during the stock request');
    input.props.onChange({ target: { value: 'NEXT-BARCODE' } });
    finishLookup({ price: 50, quantity_available: 3, tax_mode: 1 });
    await queue.drain();
    assert.equal(added.length, 1);
    assert.equal(added[0].item.stock_id, barcode);
    assert.equal(findInput(render()).props.value, 'NEXT-BARCODE', 'late response cannot erase the next scan');
    input = findInput(render());
    input.props.onKeyDown({ ...enter, key: 'Tab' });
    await Promise.resolve();
    assert.equal(requests.length, 2, 'Tab also completes a scan');
    onCartChange({ currentCart: { cart_id: 'different-cart' } }, { currentCart: null });
    await queue.drain();
    assert.equal(added.length, 1, 'late stock response cannot add to a different cart');
    assert.deepEqual(errors, []);
  } finally {
    for (const cleanup of cleanups) if (typeof cleanup === 'function') cleanup();
    global.window = previousWindow;
  }
});
