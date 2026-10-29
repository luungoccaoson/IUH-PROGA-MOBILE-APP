const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load(file, requireMock) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: requireMock, console });
  return exports;
}
async function run() {
  let saved = 'zh';
  let fail = false;
  let finishRead;
  let pendingRead = false;
  const storage = {
    getItem: async () => pendingRead ? new Promise(resolve => { finishRead = resolve; }) : saved,
    setItem: async (key, value) => {
      assert.equal(key, '@proga_language');
      if (fail) throw new Error('storage unavailable');
      await new Promise(resolve => setTimeout(resolve, 2));
      saved = value;
    },
  };
  function newStore() {
    return load('stores/useLanguageStore.ts', name => name === 'zustand' ? require('zustand') : storage).useLanguageStore;
  }
  const store = newStore();
  assert.equal(store.getState().language, 'vi');
  await store.getState().initLanguage();
  assert.equal(store.getState().language, 'zh');
  assert.equal(store.getState().ready, true);
  await Promise.all(['en', 'zh', 'vi'].map(language => store.getState().setLanguage(language)));
  assert.equal(saved, 'vi');
  assert.equal(store.getState().language, 'vi');
  saved = 'unsupported';
  const invalid = newStore();
  await invalid.getState().initLanguage();
  assert.equal(invalid.getState().language, 'vi');
  pendingRead = true;
  const racing = newStore();
  const hydration = racing.getState().initLanguage();
  await racing.getState().setLanguage('en');
  finishRead('zh');
  await hydration;
  assert.equal(racing.getState().language, 'en');
  fail = true;
  await store.getState().setLanguage('zh');
  assert.equal(store.getState().language, 'zh');
  fail = false;
  await store.getState().setLanguage('en');
  assert.equal(saved, 'en');
  const { translations } = load('i18n/translations.ts', require);
  for (const [key, value] of Object.entries(translations)) {
    assert.ok(value.en.trim(), `Missing English: ${key}`);
    assert.ok(value.zh.trim(), `Missing Chinese: ${key}`);
  }
  console.log('Language tests passed: hydration, persistence, rapid switching, invalid values, hydration race, storage failure recovery, dictionary completeness.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
