import assert from 'node:assert/strict';
import test from 'node:test';
import { accentForeground, DEFAULT_PREFERENCES, isPreferences } from './preferences.ts';

test('valid presets and user-defined colors can be restored from an archive', () => {
  assert.ok(isPreferences(DEFAULT_PREFERENCES));
  assert.ok(isPreferences({ ...DEFAULT_PREFERENCES, theme: 'dark', accent: '#AABBCC',
    textSize: 'extra', journalFont: 'book', editorHeight: 420, archiveName: 'Мой уголок', focusMode: true }));
});

test('preferences reject invalid CSS, field types, sizes and unsupported options', () => {
  for (const change of [{ accent: 'red; background: url(test)' }, { theme: 'unexpected' },
    { accent: '#fff' }, { textSize: 'giant' }, { editorHeight: 421 }, { editorHeight: NaN },
    { focusMode: 'true' }, { archiveName: 'X'.repeat(49) }, { showPortrait: null }]) {
    assert.equal(isPreferences({ ...DEFAULT_PREFERENCES, ...change }), false);
  }
  assert.equal(isPreferences(null), false);
});

test('accent button text stays readable for bright, dark and midtone custom colors', () => {
  assert.equal(accentForeground('#ffffff'), '#000000');
  assert.equal(accentForeground('#ffff00'), '#000000');
  assert.equal(accentForeground('#000000'), '#ffffff');
  assert.equal(accentForeground('#355542'), '#ffffff');
  for (const hex of ['#777777', '#888888', '#ff0000', '#00ff00', '#0000ff']) {
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const l = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
    assert.ok((accentForeground(hex) === '#000000' ? (l + .05) / .05 : 1.05 / (l + .05)) >= 4.5);
  }
});
