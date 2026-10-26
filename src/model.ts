export const STORAGE_KEY = 'ant-lotm.characters.v1';

export const PATHWAYS = [
  'Дурак', 'Ошибка', 'Дверь', 'Мечтатель', 'Солнце', 'Тиран',
  'Белая башня', 'Повешенный', 'Тьма', 'Смерть', 'Сумеречный гигант',
  'Красный жрец', 'Демоница', 'Отшельник', 'Образец', 'Колесо фортуны',
  'Мать', 'Луна', 'Бездна', 'Скованный', 'Чёрный император', 'Юстициар',
] as const;

export type Entry = {
  id: string;
  title: string;
  note: string;
  kind: 'acting' | 'study' | 'ritual' | 'other' | 'advance';
  delta: number;
  date: string;
};

export type Character = {
  id: string;
  name: string;
  epithet: string;
  pathway: string;
  sequence: number;
  potion: string;
  digestion: number;
  age: string;
  occupation: string;
  origin: string;
  bio: string;
  principles: string;
  entries: Entry[];
};

export function createCharacter(): Character {
  return {
    id: crypto.randomUUID(), name: '', epithet: '', pathway: 'Дурак',
    sequence: 9, potion: 'Провидец', digestion: 0, age: '', occupation: '',
    origin: '', bio: '', principles: '', entries: [],
  };
}

export function addEntry(character: Character, input: Omit<Entry, 'id' | 'date'>): Character {
  if (!input.title.trim()) throw new Error('Добавьте название записи.');
  if (!Number.isFinite(input.delta)) throw new Error('Укажите корректное изменение усвоения.');
  const digestion = Math.round(Math.min(100, Math.max(0, character.digestion + input.delta)) * 10) / 10;
  const delta = Math.round((digestion - character.digestion) * 10) / 10;
  return {
    ...character, digestion,
    entries: [{ ...input, title: input.title.trim(), delta, id: crypto.randomUUID(), date: new Date().toISOString() }, ...character.entries],
  };
}

export function advanceCharacter(character: Character, potion: string): Character {
  if (character.digestion < 100 || character.sequence === 0) {
    throw new Error('Для продвижения нужно полностью усвоить текущее зелье.');
  }
  if (!potion.trim()) throw new Error('Укажите следующее зелье.');
  return {
    ...character, sequence: character.sequence - 1, potion: potion.trim(), digestion: 0,
    entries: [{
      id: crypto.randomUUID(), title: `Последовательность ${character.sequence - 1} · ${potion.trim()}`,
      note: `Зелье «${character.potion}» полностью усвоено. Начат следующий этап.`,
      kind: 'advance', delta: 0, date: new Date().toISOString(),
    }, ...character.entries],
  };
}

export function isCharacter(value: unknown): value is Character {
  if (!value || typeof value !== 'object') return false;
  const c = value as Character;
  return ['id', 'name', 'epithet', 'pathway', 'potion', 'age', 'occupation', 'origin', 'bio', 'principles']
    .every(key => typeof (c as unknown as Record<string, unknown>)[key] === 'string')
    && c.name.trim().length > 0 && Number.isInteger(c.sequence) && c.sequence >= 0 && c.sequence <= 9
    && Number.isFinite(c.digestion) && c.digestion >= 0 && c.digestion <= 100
    && Array.isArray(c.entries) && c.entries.every(e => e && typeof e.id === 'string'
      && typeof e.title === 'string' && typeof e.note === 'string' && typeof e.date === 'string'
      && Number.isFinite(new Date(e.date).getTime()) && Number.isFinite(e.delta)
      && ['acting', 'study', 'ritual', 'other', 'advance'].includes(e.kind));
}
