import assert from 'node:assert/strict';
import test from 'node:test';
import { addEntry, advanceCharacter, createCharacter, isCharacter } from './model.ts';

const character = () => ({ ...createCharacter(), name: 'Тестовый потусторонний' });

test('new characters start at sequence 9 with no digestion or history', () => {
  const c = character();
  assert.equal(c.sequence, 9);
  assert.equal(c.digestion, 0);
  assert.deepEqual(c.entries, []);
  assert.ok(isCharacter(c));
});

test('journal records update digestion without mutating the original character', () => {
  const before = character();
  const after = addEntry(before, { title: '  Первое гадание  ', note: 'Удачный отыгрыш', kind: 'acting', delta: 12.5 });
  assert.equal(before.digestion, 0);
  assert.equal(before.entries.length, 0);
  assert.equal(after.digestion, 12.5);
  assert.equal(after.entries[0].title, 'Первое гадание');
  assert.equal(after.entries[0].delta, 12.5);
  assert.ok(isCharacter(after));
});

test('progress is clamped at both boundaries and history records the actual delta', () => {
  const full = addEntry({ ...character(), digestion: 97 }, { title: 'Финальный шаг', note: '', kind: 'acting', delta: 10 });
  assert.equal(full.digestion, 100);
  assert.equal(full.entries[0].delta, 3);
  const empty = addEntry({ ...character(), digestion: 2 }, { title: 'Откат', note: '', kind: 'other', delta: -10 });
  assert.equal(empty.digestion, 0);
  assert.equal(empty.entries[0].delta, -2);
});

test('notes can leave digestion unchanged and fractional changes do not accumulate float errors', () => {
  const c = { ...character(), digestion: 0.1 };
  const after = addEntry(c, { title: 'Шаг', note: '', kind: 'acting', delta: 0.2 });
  assert.equal(after.digestion, 0.3);
  assert.equal(after.entries[0].delta, 0.2);
  assert.equal(addEntry(after, { title: 'Заметка', note: '', kind: 'other', delta: 0 }).digestion, 0.3);
});

test('advancement requires full digestion and a remaining sequence', () => {
  assert.throws(() => advanceCharacter(character(), 'Клоун'));
  assert.throws(() => advanceCharacter({ ...character(), sequence: 0, digestion: 100 }, 'Следующее'));
  assert.throws(() => advanceCharacter({ ...character(), digestion: 100 }, '   '));
});

test('advancement resets digestion while preserving previous potion history', () => {
  const full = addEntry(character(), { title: 'Полное усвоение', note: 'Готово', kind: 'acting', delta: 100 });
  const advanced = advanceCharacter(full, '  Клоун  ');
  assert.equal(advanced.sequence, 8);
  assert.equal(advanced.potion, 'Клоун');
  assert.equal(advanced.digestion, 0);
  assert.equal(advanced.entries.length, 2);
  assert.equal(advanced.entries[0].kind, 'advance');
  assert.match(advanced.entries[0].note, /Провидец/);
  assert.deepEqual(advanced.entries[1], full.entries[0]);
  assert.ok(isCharacter(advanced));
});

test('invalid entries and malformed imports are rejected', () => {
  assert.throws(() => addEntry(character(), { title: ' ', note: '', kind: 'other', delta: 0 }));
  assert.throws(() => addEntry(character(), { title: 'Ошибка', note: '', kind: 'other', delta: NaN }));
  assert.equal(isCharacter(null), false);
  assert.equal(isCharacter({ ...character(), digestion: 101 }), false);
  assert.equal(isCharacter({ ...character(), sequence: -1 }), false);
  assert.equal(isCharacter({ ...character(), name: ' ' }), false);
  assert.equal(isCharacter({ ...character(), entries: [{ date: 'invalid' }] }), false);
});
