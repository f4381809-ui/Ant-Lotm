import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_DICE, diceFormula, diceNote, isDiceRecipe, isDiceState, rollDice, rollDie } from './dice.ts';

test('die endpoints and sums include modifiers exactly once', () => {
  assert.equal(rollDie(20, () => 0), 1);
  assert.equal(rollDie(20, () => 19), 20);
  const samples = [0, 5];
  const roll = rollDice({ count: 2, sides: 6, modifier: -3 }, () => samples.shift()!);
  assert.deepEqual(roll.values, [1, 6]);
  assert.equal(roll.total, 4);
  assert.equal(diceFormula(roll), '2d6 − 3');
  assert.equal(diceNote(roll), 'Бросок 2d6 − 3 = 4\nНа кубиках: 1, 6.');
});

test('rejection sampling discards incomplete buckets instead of biasing low faces', () => {
  const samples = [2 ** 32 - 1, 5];
  assert.equal(rollDie(6, () => samples.shift()!), 6);
  assert.equal(samples.length, 0);
  assert.throws(() => rollDie(6, () => -1));
  assert.throws(() => rollDie(6, () => NaN));
  assert.throws(() => rollDie(6, () => 2 ** 32 - 1));
});

test('custom recipes enforce integer limits and support d100 and unusual dice', () => {
  assert.ok(isDiceRecipe({ sides: 1000, count: 20, modifier: 999 }));
  assert.equal(rollDice({ sides: 37, count: 1, modifier: 0 }, () => 36).total, 37);
  assert.equal(rollDice({ sides: 100, count: 1, modifier: 0 }, () => 99).total, 100);
  for (const recipe of [{ sides: 1, count: 1, modifier: 0 }, { sides: 6, count: 21, modifier: 0 },
    { sides: 1001, count: 1, modifier: 0 }, { sides: 6, count: 1.5, modifier: 0 },
    { sides: 6, count: 1, modifier: Infinity }, { sides: 6, count: 1, modifier: -1000 }]) {
    assert.equal(isDiceRecipe(recipe), false);
    assert.throws(() => rollDice(recipe));
  }
});

test('tampered or malformed history is rejected before import', () => {
  const r = rollDice({ sides: 6, count: 2, modifier: 2 }, () => 2);
  assert.ok(isDiceState(DEFAULT_DICE));
  assert.ok(isDiceState({ recipe: DEFAULT_DICE.recipe, history: [r] }));
  for (const change of [{ total: 999 }, { values: [0, 3] }, { values: [3] }, { date: 'invalid' }]) {
    assert.equal(isDiceState({ recipe: DEFAULT_DICE.recipe, history: [{ ...r, ...change }] }), false);
  }
  assert.equal(isDiceState({ recipe: DEFAULT_DICE.recipe, history: Array(31).fill(r) }), false);
  assert.equal(isDiceState({ recipe: DEFAULT_DICE.recipe, history: [null] }), false);
});
