const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
let language = 'vi';
const store = Object.assign(selector => selector({ language }), { getState: () => ({ language }) });
const cache = new Map();
const host = tag => props => React.createElement(tag, { 'data-label': props.accessibilityLabel }, props.children);
const native = new Proxy({
  StyleSheet: { create: value => value, hairlineWidth: 1 },
  Platform: { OS: 'android' },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Animated: { ValueXY: class { getLayout() { return {}; } setValue() {} }, View: host('div') },
  PanResponder: { create: () => ({ panHandlers: {} }) },
}, { get: (target, key) => target[key] ?? host(key === 'TextInput' ? 'input' : 'div') });
const icons = new Proxy({}, { get: () => () => null });
function load(file) {
  const full = path.join(root, file);
  if (cache.has(full)) return cache.get(full);
  const exports = {};
  cache.set(full, exports);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const localRequire = name => {
    if (name === 'react') return React;
    if (name === 'react-native') return native;
    if (name === 'lucide-react-native') return icons;
    if (name === 'react-native-svg') return { __esModule: true, default: host('svg'), Circle: host('circle'), G: host('g') };
    if (name.endsWith('useLanguageStore')) return { useLanguageStore: store };
    if (name.endsWith('useThemeStore')) return { useThemeStore: () => ({ colors: {}, isDark: false }) };
    if (name.startsWith('.')) {
      let target = path.resolve(path.dirname(full), name);
      target = fs.existsSync(target + '.ts') ? target + '.ts' : fs.existsSync(target + '.tsx') ? target + '.tsx' : path.join(target, 'index.ts');
      return load(path.relative(root, target));
    }
    return require(name);
  };
  vm.runInNewContext(code, { exports, require: localRequire, console });
  return exports;
}
const { translate, systemLabel } = load('i18n/index.ts');
const dictionaries = { ...load('i18n/translations.ts').translations, ...load('i18n/systemTranslations.ts').systemTranslations };
for (const [key, value] of Object.entries(dictionaries)) {
  assert.ok(value.en?.trim(), `Missing English: ${key}`);
  assert.ok(value.zh?.trim(), `Missing Chinese: ${key}`);
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  assert.equal(placeholders(value.en), placeholders(key), `English placeholders: ${key}`);
  assert.equal(placeholders(value.zh), placeholders(key), `Chinese placeholders: ${key}`);
}

// Guard against leaving newly added static UI text outside the dictionary.
for (const dir of ['app', 'components']) {
  for (const entry of fs.readdirSync(path.join(root, dir), { recursive: true }).filter(f => f.endsWith('.tsx'))) {
    const file = path.join(root, dir, entry);
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function check(node) {
      if (ts.isJsxText(node)) assert.ok(!/[À-ỹĐđ]/.test(node.text), `Untranslated UI: ${file}: ${node.text.trim()}`);
      if (ts.isCallExpression(node) && ['t', 'tr'].includes(node.expression.getText(ast)) && ts.isStringLiteral(node.arguments[0])) {
        assert.ok(dictionaries[node.arguments[0].text], `Missing dictionary key in ${file}: ${node.arguments[0].text}`);
      }
      ts.forEachChild(node, check);
    }
    check(ast);
  }
}
const { TaskItemCard } = load('components/TaskItemCard.tsx');
const { WorkspaceCard } = load('components/WorkspaceCard.tsx');
const { CreateTaskModal } = load('components/CreateTaskModal.tsx');
const { DonutChart } = load('components/DonutChart.tsx');
const { KanbanBoard } = load('components/KanbanBoard.tsx');
const task = { id: 12, title: 'Cần làm', description: 'Nội dung do người dùng nhập', priority: 'URGENT', status: 'REVIEW', dueDate: '2026-10-21' };
const workspace = { name: 'Đang làm', createdAt: '2026-10-21' };
const expected = { vi: ['Khẩn cấp', 'Đang duyệt (Review)', 'TỔNG CỘNG'], en: ['Urgent', 'In review', 'TOTAL'], zh: ['紧急', '审核中', '总计'] };
for (language of ['vi', 'en', 'zh', 'en']) {
  const card = renderToStaticMarkup(React.createElement(TaskItemCard, { task }));
  const ws = renderToStaticMarkup(React.createElement(WorkspaceCard, { workspace }));
  const modal = renderToStaticMarkup(React.createElement(CreateTaskModal, { visible: true, onClose() {}, onSubmit() {} }));
  const chart = renderToStaticMarkup(React.createElement(DonutChart, { todo: 1, inProgress: 2, review: 3, done: 4 }));
  const board = renderToStaticMarkup(React.createElement(KanbanBoard, { tasks: [{ ...task, status: 'TODO' }], onUpdateStatus() {} }));
  assert.ok(card.includes(expected[language][0]));
  assert.ok(card.includes(expected[language][1]));
  assert.ok(chart.includes(expected[language][2]));
  assert.ok(modal.includes(systemLabel('LOW')));
  assert.ok(board.includes(translate('CẦN LÀM')) && board.includes(expected[language][0]), 'Kanban headings and task badges must update');
  assert.ok(card.includes('Cần làm') && card.includes(task.description), 'User task content must remain unchanged');
  assert.ok(ws.includes('Đang làm'), 'User workspace name must remain unchanged');
  const output = translate('Đang xử lý nhiệm vụ "{title}" tại {space}', { title: '{space}', space: '$& Workspace' });
  assert.ok(output.includes('{space}') && output.includes('$& Workspace'), 'Interpolation must preserve user input');
}
assert.equal(task.status, 'REVIEW');
assert.equal(task.priority, 'URGENT');
assert.equal(translate('Unknown user text'), 'Unknown user text');
console.log(`System language tests passed: ${Object.keys(dictionaries).length} dictionary entries, placeholders, UI coverage, cards/forms/charts in three languages, preserved user content and API values.`);
