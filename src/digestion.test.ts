import assert from 'node:assert/strict';
import test from 'node:test';
import { addAutomaticEntry, addEntry, advanceCharacter, applyDigestionRules, createCharacter,
  currentExactDigestion, editEntryText, getDigestionRules, isCharacter, previewAutomaticEntry } from './model.ts';
import { DEFAULT_DIGESTION_RULES, EMPTY_EVIDENCE, isAutoAssessment, isDigestionRules } from './digestion.ts';
import { parseArchive } from './archive.ts';

const character = () => ({ ...createCharacter(), name: 'Провидец', principles: 'Наблюдать перед действием.\nПомнить, что ты играешь роль.' });
const scene = (note = 'Сцена гадания', evidence = { ...EMPTY_EVIDENCE, principleTexts: [] as string[] }) => ({ title: 'Событие', note, kind: 'acting' as const, evidence });

test('automatic scoring combines explicit evidence, caps one scene and freezes an auditable snapshot', () => {
  const c = applyDigestionRules(character(), { ...DEFAULT_DIGESTION_RULES, cap: 20 });
  const input = scene('Законченное гадание', { principleTexts: ['Наблюдать перед действием.', 'Помнить, что ты играешь роль.'], insight: true, challenge: true, distinctScene: false });
  const preview = previewAutomaticEntry(c, input);
  const saved = addAutomaticEntry(c, input);
  assert.equal(preview.assessment.points, 8);
  assert.equal(preview.digestion, 8);
  assert.equal(saved.digestion, preview.digestion);
  assert.equal(saved.entries[0].delta, 8);
  assert.equal(saved.entries[0].assessment?.sourceNote, input.note);
  assert.notEqual(saved.entries[0].assessment?.rules, getDigestionRules(c));
  assert.notEqual(saved.entries[0].assessment?.principleTexts, input.evidence.principleTexts);
  assert.equal(c.digestion, 0);
  assert.ok(isCharacter(saved));
  const capped = applyDigestionRules(c, { ...DEFAULT_DIGESTION_RULES, cap: 3 });
  assert.equal(addAutomaticEntry(capped, input).digestion, 3);
});

test('notes, empty descriptions, dice notes and fully digested potions never gain automatic points', () => {
  const c = character();
  const evidence = { principleTexts: ['Роль'], insight: true, challenge: true, distinctScene: false };
  const note = addAutomaticEntry(c, { ...scene('Бросок 1d20 = 20', evidence), kind: 'other' });
  assert.equal(note.digestion, 0);
  assert.equal(note.entries[0].assessment?.reason, 'note');
  assert.equal(addAutomaticEntry(c, scene('   ', evidence)).digestion, 0);
  const full = addAutomaticEntry({ ...c, digestion: 100 }, scene('Новая сцена', evidence));
  assert.equal(full.digestion, 100);
  assert.equal(full.entries[0].assessment?.reason, 'full');
});

test('duplicate descriptions cannot accidentally score twice, but an explicitly new scene can', () => {
  const first = addAutomaticEntry(character(), scene('  Сцена\nгадания  '));
  const repeated = addAutomaticEntry(first, scene('СЦЕНА   гадания'));
  assert.equal(first.digestion, 2);
  assert.equal(repeated.digestion, 2);
  assert.equal(repeated.entries[0].assessment?.reason, 'duplicate');
  const corrected = editEntryText(first, first.entries[0].id, 'Исправлено', 'Отредактированное описание');
  assert.equal(addAutomaticEntry(corrected, scene('Сцена гадания')).digestion, 2);
  const distinct = addAutomaticEntry(first, scene('Сцена гадания', { ...EMPTY_EVIDENCE, principleTexts: [], distinctScene: true }));
  assert.equal(distinct.digestion, 4);
  assert.ok(isCharacter(distinct));
});

test('old percentage progress is the baseline and custom pace affects only future scenes', () => {
  const c = { ...character(), digestion: 37.5 };
  const saved = addAutomaticEntry(c, scene('Новая сцена'));
  assert.equal(saved.digestion, 39.5);
  const changed = applyDigestionRules(saved, { ...getDigestionRules(saved), target: 200, acting: 4 });
  assert.equal(changed.digestion, 39.5);
  assert.deepEqual(changed.entries, saved.entries);
  assert.equal(changed.entries[0].assessment?.rules.target, 100);
  assert.equal(addAutomaticEntry(changed, scene('Другая сцена')).digestion, 41.5);
});

test('integer point accumulation reaches exactly 100 without rounding loss or early advancement', () => {
  let c = applyDigestionRules(character(), { ...DEFAULT_DIGESTION_RULES, target: 300, acting: 1 });
  for (let i = 1; i <= 300; i++) {
    c = addAutomaticEntry(c, scene(`Сцена ${i}`));
    if (i < 300) assert.ok(c.digestion < 100);
  }
  assert.equal(c.digestion, 100);
  assert.ok(isCharacter(c));
  const tiny = addAutomaticEntry(applyDigestionRules(character(), { ...DEFAULT_DIGESTION_RULES, target: 10000, acting: 1 }), scene('Маленькая доля'));
  assert.equal(tiny.entries[0].delta, 0);
  const repeatedTiny = addAutomaticEntry(tiny, scene('Маленькая доля'));
  assert.equal(repeatedTiny.digestionLedger?.points, 1);
  assert.equal(repeatedTiny.entries[0].assessment?.reason, 'duplicate');
  const nearFull = applyDigestionRules({ ...character(), digestion: 99.9 }, { ...DEFAULT_DIGESTION_RULES, target: 10000, acting: 5 });
  const oneMore = addAutomaticEntry(nearFull, scene('Чуть ближе'));
  assert.equal(oneMore.digestion, 99.9);
  assert.throws(() => advanceCharacter(oneMore, 'Клоун'));
  assert.ok(currentExactDigestion(oneMore) > currentExactDigestion(nearFull));
});

test('manual corrections and rule changes preserve fractional points already earned', () => {
  const c = addAutomaticEntry(applyDigestionRules(character(), { ...DEFAULT_DIGESTION_RULES, target: 300, acting: 1 }), scene());
  const changed = applyDigestionRules(c, { ...getDigestionRules(c), target: 100 });
  assert.equal(currentExactDigestion(changed), currentExactDigestion(c));
  assert.equal(changed.digestion, .3);
  const manual = addEntry(changed, { title: 'Поправка ведущего', note: '', kind: 'other', delta: .2 });
  assert.ok(Math.abs(currentExactDigestion(manual) - (1 / 3 + .2)) < 1e-9);
  assert.equal(manual.digestion, .5);
  assert.ok(isCharacter(manual));
});

test('advancement resets the current ledger and duplicate scope while keeping all old assessments', () => {
  const full = addAutomaticEntry({ ...character(), digestion: 98 }, scene('Повторяемый отыгрыш'));
  const next = advanceCharacter(full, 'Клоун');
  assert.equal(next.digestion, 0);
  assert.equal(next.digestionLedger?.points, 0);
  assert.equal(next.entries[1].assessment?.points, 2);
  assert.equal(addAutomaticEntry(next, scene('Повторяемый отыгрыш')).digestion, 2);
  assert.ok(isCharacter(next));
});

test('rule and assessment validation rejects corrupted imports before touching existing data', () => {
  const saved = addAutomaticEntry(character(), scene());
  assert.ok(isAutoAssessment(saved.entries[0].assessment));
  assert.ok(isCharacter(saved));
  for (const change of [{ target: 0 }, { target: 10001 }, { cap: 0 }, { acting: -1 }, { acting: 1.5 }, { mode: 'AI' }]) {
    assert.equal(isDigestionRules({ ...DEFAULT_DIGESTION_RULES, ...change }), false);
  }
  assert.equal(isAutoAssessment({ ...saved.entries[0].assessment, points: 999 }), false);
  assert.equal(isCharacter({ ...saved, digestionLedger: { base: 0, points: 999, target: 100 } }), false);
  assert.throws(() => parseArchive({ version: 2, characters: [{ ...saved, entries: [{ ...saved.entries[0], assessment: { ...saved.entries[0].assessment, points: 999 } }] }] }));
  const { digestionRules: _rules, digestionLedger: _ledger, ...legacy } = character();
  assert.ok(isCharacter(legacy));
  assert.deepEqual(parseArchive({ version: 1, characters: [legacy] }).characters, [legacy]);
});
