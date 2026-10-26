import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArchive } from './archive.ts';
import { createCharacter } from './model.ts';
import { DEFAULT_PREFERENCES } from './preferences.ts';
import { DEFAULT_DICE, rollDice } from './dice.ts';

const characters = [{ ...createCharacter(), name: 'Персонаж из старой версии' }];

test('legacy archives and raw character arrays remain importable without changing personal settings', () => {
  for (const legacy of [characters, { version: 1, characters }, { characters }]) {
    const result = parseArchive(legacy);
    assert.deepEqual(result.characters, characters);
    assert.equal(result.preferences, undefined);
    assert.equal(result.dice, undefined);
  }
});

test('version 2 preserves appearance and dice data together with characters', () => {
  const preferences = { ...DEFAULT_PREFERENCES, theme: 'dark' as const, accent: '#67508b' };
  const dice = { ...DEFAULT_DICE, history: [rollDice(DEFAULT_DICE.recipe, () => 7)] };
  assert.deepEqual(parseArchive({ version: 2, characters, preferences, dice }), { characters, preferences, dice });
  assert.deepEqual(parseArchive({ version: 2, characters: [], preferences }).characters, []);
});

test('invalid extra data rejects the whole import and leaves the source data intact', () => {
  const before = JSON.stringify(characters);
  assert.throws(() => parseArchive({ version: 2, characters, preferences: { ...DEFAULT_PREFERENCES, accent: 'url(test)' } }));
  assert.throws(() => parseArchive({ version: 2, characters, dice: { ...DEFAULT_DICE, history: [null] } }));
  assert.throws(() => parseArchive({ version: 999, characters }));
  assert.throws(() => parseArchive({ characters: [characters[0], characters[0]] }));
  assert.throws(() => parseArchive([]));
  assert.equal(JSON.stringify(characters), before);
});
