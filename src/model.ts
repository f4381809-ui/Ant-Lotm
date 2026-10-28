import { DEFAULT_DIGESTION_RULES, displayedDigestion, exactDigestion, isAutoAssessment,
  isDigestionLedger, isDigestionRules, isEvidence, normalizeScene, scenePoints } from './digestion.ts';
import type { AutoAssessment, DigestionLedger, DigestionRules, SceneEvidence, SceneKind } from './digestion.ts';

export const STORAGE_KEY = 'ant-lotm.characters.v1';
export const MAX_PORTRAIT_LENGTH = 700_000;

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
  assessment?: AutoAssessment;
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
  portrait?: string;
  digestionRules?: DigestionRules;
  digestionLedger?: DigestionLedger;
  entries: Entry[];
};

export function createCharacter(): Character {
  return {
    id: crypto.randomUUID(), name: '', epithet: '', pathway: 'Дурак',
    sequence: 9, potion: 'Провидец', digestion: 0, age: '', occupation: '',
    origin: '', bio: '', principles: '', entries: [],
    digestionRules: { ...DEFAULT_DIGESTION_RULES },
  };
}

export function addEntry(character: Character, input: Omit<Entry, 'id' | 'date'>): Character {
  if (!input.title.trim()) throw new Error('Добавьте название записи.');
  if (!Number.isFinite(input.delta)) throw new Error('Укажите корректное изменение усвоения.');
  const base = Math.min(100, Math.max(0, currentExactDigestion(character) + input.delta));
  const digestion = displayedDigestion(base);
  const delta = Math.round((digestion - character.digestion) * 10) / 10;
  return {
    ...character, digestion, digestionRules: { ...getDigestionRules(character) },
    digestionLedger: { base, points: 0, target: getDigestionRules(character).target },
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
    digestionRules: { ...getDigestionRules(character) },
    digestionLedger: { base: 0, points: 0, target: getDigestionRules(character).target },
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
    && (c.portrait === undefined || isPortrait(c.portrait))
    && (c.digestionRules === undefined || isDigestionRules(c.digestionRules))
    && (c.digestionLedger === undefined || isDigestionLedger(c.digestionLedger, getDigestionRules(c).target, c.digestion))
    && Array.isArray(c.entries) && c.entries.every(e => e && typeof e.id === 'string'
      && typeof e.title === 'string' && typeof e.note === 'string' && typeof e.date === 'string'
      && Number.isFinite(new Date(e.date).getTime()) && Number.isFinite(e.delta)
      && ['acting', 'study', 'ritual', 'other', 'advance'].includes(e.kind)
      && (e.assessment === undefined || (isAutoAssessment(e.assessment) && e.assessment.kind === e.kind
        && e.delta >= 0 && (e.assessment.reason === 'scored' || e.delta === 0))));
}

export function isPortrait(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || (value.length <= MAX_PORTRAIT_LENGTH
    && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)));
}

export function journalTitle(title: string, note: string): string {
  return title.trim() || note.trim().split('\n')[0].slice(0, 80);
}

export function editEntryText(character: Character, entryId: string, title: string, note: string): Character {
  const resolvedTitle = journalTitle(title, note);
  if (!resolvedTitle) throw new Error('Добавьте текст или название записи.');
  if (!character.entries.some(e => e.id === entryId)) throw new Error('Запись не найдена.');
  return { ...character, entries: character.entries.map(e => e.id === entryId
    ? { ...e, title: resolvedTitle, note: note.trim() } : e) };
}


export function getDigestionRules(character: Character): DigestionRules {
  return character.digestionRules ?? DEFAULT_DIGESTION_RULES;
}

export function currentExactDigestion(character: Character): number {
  return character.digestionLedger ? exactDigestion(character.digestionLedger) : character.digestion;
}

export function applyDigestionRules(character: Character, rules: DigestionRules): Character {
  if (!isDigestionRules(rules)) throw new Error('Проверьте параметры усвоения.');
  return { ...character, digestionRules: { ...rules },
    digestionLedger: { base: currentExactDigestion(character), points: 0, target: rules.target } };
}

export type AutoEntryInput = { title: string; note: string; kind: SceneKind; evidence: SceneEvidence };

export function previewAutomaticEntry(character: Character, input: AutoEntryInput) {
  const rules = getDigestionRules(character);
  if (!isDigestionRules(rules) || !isEvidence(input.evidence)
    || !['acting', 'study', 'ritual', 'other'].includes(input.kind)) throw new Error('Проверьте данные сцены.');
  const sourceNote = input.note.trim();
  if (sourceNote.length > 10000) throw new Error('Описание сцены слишком длинное.');
  const boundary = character.entries.findIndex(e => e.kind === 'advance');
  const stageEntries = boundary < 0 ? character.entries : character.entries.slice(0, boundary);
  const normalized = normalizeScene(sourceNote);
  const duplicateDetected = !!normalized && stageEntries.some(e =>
    (e.delta > 0 || (e.assessment?.reason === 'scored' && e.assessment.points > 0))
    && normalizeScene(e.assessment?.sourceNote ?? e.note) === normalized);
  const reason: AutoAssessment['reason'] = character.digestion >= 100 ? 'full'
    : input.kind === 'other' ? 'note' : !sourceNote ? 'empty'
    : duplicateDetected && !input.evidence.distinctScene ? 'duplicate' : 'scored';
  const points = reason === 'scored' ? scenePoints(rules, input.kind, input.evidence) : 0;
  const previous = character.digestionLedger ?? { base: character.digestion, points: 0, target: rules.target };
  const ledger = { ...previous, points: previous.points + points };
  const digestion = displayedDigestion(exactDigestion(ledger));
  const assessment: AutoAssessment = { ...input.evidence, principleTexts: [...input.evidence.principleTexts],
    method: 'rules-v1', rules: { ...rules }, kind: input.kind, sourceNote, reason, points };
  return { assessment, digestion, ledger, duplicateDetected,
    delta: Math.round((digestion - character.digestion) * 10) / 10 };
}

export function addAutomaticEntry(character: Character, input: AutoEntryInput): Character {
  if (!input.title.trim()) throw new Error('Добавьте текст или название записи.');
  const result = previewAutomaticEntry(character, input);
  return { ...character, digestion: result.digestion, digestionRules: { ...getDigestionRules(character) },
    digestionLedger: result.ledger, entries: [{
      id: crypto.randomUUID(), date: new Date().toISOString(), kind: input.kind, title: input.title.trim(),
      note: input.note.trim(), delta: result.delta, assessment: result.assessment,
    }, ...character.entries] };
}
