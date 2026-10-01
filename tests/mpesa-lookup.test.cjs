const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadActions(get) {
  const source = fs.readFileSync('src/lib/actions/pay.actions.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  const axios = { get, isAxiosError: (error) => error.isAxiosError === true };
  new Function('require', 'module', 'exports', outputText)(
    (name) => name === 'axios' ? { default: axios } : {}, module, module.exports,
  );
  return module.exports;
}

const payload = {
  success: false,
  payment_status: 'error',
  payment_success: false,
  payment_failed: true,
  message: 'Transaction not found for mpesa_code: UJ1PV850DP',
};

for (const status of [200, 400, 404, 500]) {
  test(`preserves the actual lookup message for HTTP ${status}`, async () => {
    const actions = loadActions(async (_url, config) => {
      assert.equal(config.params.mpesa_code, 'UJ1PV850DP');
      assert.equal(config.params.branch, 'store');
      assert.equal(config.params.cp, 'BW');
      if (status === 200) return { data: payload };
      throw { isAxiosError: true, response: { status, data: payload } };
    });
    assert.deepEqual(await actions.find_mpesa_by_code('https://example.test/', ' uj1pv850dp ', 'store', 'BW'), payload);
  });
}

test('network failures and responses without a message still reject', async () => {
  for (const error of [new Error('offline'), { isAxiosError: true, response: { status: 502, data: '<html>Bad gateway</html>' } }]) {
    const actions = loadActions(async () => { throw error; });
    await assert.rejects(actions.lookup_mpesa_by_code('https://example.test/', 'CODE'), (actual) => actual === error);
  }
});

test('successful transactions pass through unchanged', async () => {
  const result = { success: true, payment_success: true, payment_status: 'completed', data: { transaction: { id: 123 } } };
  const actions = loadActions(async () => ({ data: result }));
  assert.equal(await actions.lookup_mpesa_by_code('https://example.test/', 'CODE'), result);
});
