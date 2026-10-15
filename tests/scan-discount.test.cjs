const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('src/hawk-tuah/utils/scan-discount.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(moduleUnderTest.exports);
const { pickScannedItem, applyBetterRule } = moduleUnderTest.exports;

const item = (stock_id, extra = {}) => ({
  stock_id, price: '1000', discount_percent: 0, discounted_price: 1000,
  has_discount: false, discount_details: null, category_id: 'C1', ...extra,
});
const rule = (discount_percent, extra = {}) => ({
  id: 'R1', discount_type: 'item', discount_percent, lower_limit: 0, upper_limit: 99999, ...extra,
});

test('only an exact stock_id match is the scanned item', () => {
  const items = [item('ABC12'), item('ABC1'), item('XABC1')];
  assert.equal(pickScannedItem(items, 'ABC1').stock_id, 'ABC1');
  assert.equal(pickScannedItem(items, ' abc1 ').stock_id, 'ABC1');
  assert.equal(pickScannedItem(items, 'ABC'), undefined);
  assert.equal(pickScannedItem(null, 'ABC1'), undefined);
});

test('a rule discounts an undiscounted item', () => {
  const priced = applyBetterRule(item('A'), rule(20));
  assert.equal(priced.has_discount, true);
  assert.equal(priced.discounted_price, 800);
  assert.equal(priced.discount_details.discount_amount, 200);
  assert.equal(priced.discount_details.discount_id, 'R1');
});

test('a smaller rule or no rule leaves the item untouched', () => {
  const discounted = item('A', { discount_percent: 30, discounted_price: 700, has_discount: true });
  assert.equal(applyBetterRule(discounted, rule(20)), discounted);
  assert.equal(applyBetterRule(discounted, null), discounted);
});
