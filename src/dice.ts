export const DICE_KEY = 'ant-lotm.dice.v1';
export const HISTORY_LIMIT = 30;
export const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100];
export type DiceRecipe = { sides: number; count: number; modifier: number };
export type DiceRoll = DiceRecipe & { id: string; values: number[]; total: number; date: string };
export type DiceState = { recipe: DiceRecipe; history: DiceRoll[] };
export const DEFAULT_DICE: DiceState = { recipe: { sides: 20, count: 1, modifier: 0 }, history: [] };

export function isDiceRecipe(value: unknown): value is DiceRecipe {
  if (!value || typeof value !== 'object') return false;
  const r = value as DiceRecipe;
  return Number.isInteger(r.sides) && r.sides >= 2 && r.sides <= 1000
    && Number.isInteger(r.count) && r.count >= 1 && r.count <= 20
    && Number.isInteger(r.modifier) && r.modifier >= -999 && r.modifier <= 999;
}

export function isDiceState(value: unknown): value is DiceState {
  if (!value || typeof value !== 'object') return false;
  const s = value as DiceState;
  return isDiceRecipe(s.recipe) && Array.isArray(s.history) && s.history.length <= HISTORY_LIMIT
    && s.history.every(r => isDiceRecipe(r) && typeof r.id === 'string'
      && typeof r.date === 'string' && Number.isFinite(new Date(r.date).getTime())
      && Array.isArray(r.values) && r.values.length === r.count
      && r.values.every(v => Number.isInteger(v) && v >= 1 && v <= r.sides)
      && r.total === r.values.reduce((sum, n) => sum + n, 0) + r.modifier);
}

const nextUint32 = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** Reject the incomplete last bucket so every face has exactly the same probability. */
export function rollDie(sides: number, random: () => number = nextUint32): number {
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000) throw new Error('Укажите от 2 до 1000 граней.');
  const limit = Math.floor(2 ** 32 / sides) * sides;
  for (let attempt = 0; attempt < 128; attempt++) {
    const value = random();
    if (!Number.isInteger(value) || value < 0 || value >= 2 ** 32) throw new Error('Генератор вернул некорректное значение.');
    if (value < limit) return value % sides + 1;
  }
  throw new Error('Не удалось получить случайное число. Повторите бросок.');
}

export function rollDice(recipe: DiceRecipe, random?: () => number): DiceRoll {
  if (!isDiceRecipe(recipe)) throw new Error('Проверьте количество, грани и модификатор.');
  const values = Array.from({ length: recipe.count }, () => rollDie(recipe.sides, random));
  return { ...recipe, id: crypto.randomUUID(), date: new Date().toISOString(), values,
    total: values.reduce((sum, n) => sum + n, 0) + recipe.modifier };
}

export function diceFormula(r: DiceRecipe): string {
  return `${r.count}d${r.sides}${r.modifier > 0 ? ` + ${r.modifier}` : r.modifier < 0 ? ` − ${-r.modifier}` : ''}`;
}

export function diceNote(r: DiceRoll): string {
  return `Бросок ${diceFormula(r)} = ${r.total}\nНа кубиках: ${r.values.join(', ')}.`;
}
