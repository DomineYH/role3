const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function app(saved = {}, response = {}) {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
  const alerts = [];
  const sandbox = {
    document: { addEventListener() {} }, console,
    localStorage: { getItem: key => saved[key] ?? null, setItem: (key, value) => { saved[key] = value; } },
    fetch: async () => ({ ok: true, json: async () => response }),
    alert: message => alerts.push(message),
  };
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, `
    globalThis.api = { state, normalizeStudents, loadFromLocalStorage, executeSheetLoad,
      setElements(value) { elements = value; } };
  })();`), sandbox);
  sandbox.api.setElements({ inputAppsScriptUrl: { value: 'https://example.test/exec' } });
  return { ...sandbox.api, saved, alerts };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('string and object names are trimmed; invalid values are excluded without losing duplicate names', () => {
  const a = app();
  assert.deepEqual(plain(a.normalizeStudents([
    ' 김하늘 ', { id: 1, name: ' 이바다 ' }, { studentName: '박별' },
    { 이름: '최달' }, { 학생이름: '한빛' }, { 학생명: '정솔' }, { student: '김하늘' },
    { name: {}, 이름: '윤꽃' }, null, {}, 12, false, ['이름'], ' ', '[object Object]'
  ])), ['김하늘', '이바다', '박별', '최달', '한빛', '정솔', '김하늘', '윤꽃']);
});

test('sheet loading stores string names and clears obsolete assignments', async () => {
  const a = app({}, { students: [{ id: 1, name: '김하늘' }, { name: '이바다' }] });
  a.state.assignments = [{ student: { name: '옛이름' } }];
  a.state.assignedDate = 'yesterday';
  await a.executeSheetLoad();
  assert.deepEqual(plain(a.state.students), ['김하늘', '이바다']);
  assert.deepEqual(plain(a.state.assignments), []);
  assert.equal(a.state.assignedDate, '');
  assert.deepEqual(JSON.parse(a.saved.naver_role_picker_students), ['김하늘', '이바다']);
  assert.equal(a.alerts.length, 0);
});

test('invalid sheet names preserve the existing roster and assignments', async () => {
  const a = app({}, { students: [{ id: 1 }, null] });
  const previous = JSON.stringify(a.state);
  await a.executeSheetLoad();
  assert.equal(JSON.stringify(a.state), previous);
  assert.equal(a.alerts.length, 1);
});

test('legacy local storage restores object names in roster and assigned cards', () => {
  const a = app({
    naver_role_picker_students: JSON.stringify([{ name: '김하늘' }, '이바다']),
    naver_role_picker_assignments: JSON.stringify([{ student: { name: '김하늘' }, index: 1, role: { name: '도우미' } }]),
  });
  a.loadFromLocalStorage();
  assert.deepEqual(plain(a.state.students), ['김하늘', '이바다']);
  assert.equal(a.state.assignments[0].student, '김하늘');
  assert.equal(a.state.assignments[0].role.name, '도우미');
});

test('unrecoverable cached object text clears assignments for reassignment', () => {
  const a = app({ naver_role_picker_assignments: JSON.stringify([{ student: '[object Object]' }]) });
  a.loadFromLocalStorage();
  assert.deepEqual(plain(a.state.assignments), []);
});
