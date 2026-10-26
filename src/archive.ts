import { isCharacter } from './model.ts';
import type { Character } from './model.ts';
import { isPreferences } from './preferences.ts';
import type { Preferences } from './preferences.ts';
import { isDiceState } from './dice.ts';
import type { DiceState } from './dice.ts';

export type Archive = { characters: Character[]; preferences?: Preferences; dice?: DiceState };

/** Validate the entire payload before the UI changes any stored data. */
export function parseArchive(value: unknown): Archive {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (data?.version !== undefined && data.version !== 1 && data.version !== 2) throw new Error('Версия архива пока не поддерживается.');
  const characters = data ? data.characters : value;
  if (!Array.isArray(characters) || !characters.every(isCharacter)
    || new Set(characters.map(c => c.id)).size !== characters.length) throw new Error('В файле нет корректного архива персонажей.');
  if (data?.preferences !== undefined && !isPreferences(data.preferences)) throw new Error('В архиве повреждены настройки оформления. Данные не изменены.');
  if (data?.dice !== undefined && !isDiceState(data.dice)) throw new Error('В архиве повреждена история кубиков. Данные не изменены.');
  if (!characters.length && !data?.preferences && !data?.dice) throw new Error('В этом архиве нет персонажей или настроек.');
  return { characters, preferences: data?.preferences as Preferences | undefined, dice: data?.dice as DiceState | undefined };
}
