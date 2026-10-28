export type SceneKind = 'acting' | 'study' | 'ritual' | 'other';
export type DigestionRules = {
  mode: 'automatic' | 'manual';
  target: number;
  acting: number;
  study: number;
  ritual: number;
  principle: number;
  insight: number;
  challenge: number;
  cap: number;
};
export const DEFAULT_DIGESTION_RULES: DigestionRules = {
  mode: 'automatic', target: 100, acting: 2, study: 1, ritual: 1,
  principle: 2, insight: 3, challenge: 1, cap: 8,
};
export type SceneEvidence = {
  principleTexts: string[];
  insight: boolean;
  challenge: boolean;
  distinctScene: boolean;
};
export const EMPTY_EVIDENCE: SceneEvidence = { principleTexts: [], insight: false, challenge: false, distinctScene: false };
export type AutoAssessment = SceneEvidence & {
  method: 'rules-v1';
  rules: DigestionRules;
  kind: SceneKind;
  sourceNote: string;
  reason: 'scored' | 'note' | 'empty' | 'duplicate' | 'full';
  points: number;
};
export type DigestionLedger = { base: number; points: number; target: number };

export function isDigestionRules(value: unknown): value is DigestionRules {
  if (!value || typeof value !== 'object') return false;
  const r = value as DigestionRules;
  return ['automatic', 'manual'].includes(r.mode)
    && Number.isInteger(r.target) && r.target >= 10 && r.target <= 10000
    && ['acting', 'study', 'ritual', 'principle', 'insight', 'challenge']
      .every(key => { const n = (r as unknown as Record<string, unknown>)[key]; return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 20; })
    && Number.isInteger(r.cap) && r.cap >= 1 && r.cap <= Math.min(100, r.target);
}

export function isEvidence(value: unknown): value is SceneEvidence {
  if (!value || typeof value !== 'object') return false;
  const e = value as SceneEvidence;
  return Array.isArray(e.principleTexts) && e.principleTexts.length <= 50
    && e.principleTexts.every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 5000)
    && new Set(e.principleTexts).size === e.principleTexts.length
    && ['insight', 'challenge', 'distinctScene'].every(key => typeof (e as unknown as Record<string, unknown>)[key] === 'boolean');
}

export function normalizeScene(note: string): string {
  return note.normalize('NFC').toLocaleLowerCase('ru').replace(/\s+/gu, ' ').trim();
}

export function scenePoints(rules: DigestionRules, kind: SceneKind, evidence: SceneEvidence): number {
  if (kind === 'other') return 0;
  return Math.min(rules.cap, rules[kind] + (evidence.principleTexts.length ? rules.principle : 0)
    + (evidence.insight ? rules.insight : 0) + (evidence.challenge ? rules.challenge : 0));
}

export function isAutoAssessment(value: unknown): value is AutoAssessment {
  if (!value || typeof value !== 'object') return false;
  const a = value as AutoAssessment;
  return a.method === 'rules-v1' && isDigestionRules(a.rules) && isEvidence(a)
    && ['acting', 'study', 'ritual', 'other'].includes(a.kind)
    && typeof a.sourceNote === 'string' && a.sourceNote.length <= 10000
    && ['scored', 'note', 'empty', 'duplicate', 'full'].includes(a.reason)
    && Number.isInteger(a.points) && a.points >= 0
    && (a.reason === 'scored'
      ? a.kind !== 'other' && !!a.sourceNote.trim() && a.points === scenePoints(a.rules, a.kind, a)
      : a.points === 0)
    && (a.reason !== 'note' || a.kind === 'other')
    && (a.reason !== 'empty' || !a.sourceNote.trim())
    && (a.reason !== 'duplicate' || !a.distinctScene);
}

export function exactDigestion(ledger: DigestionLedger): number {
  return Math.max(0, Math.min(100, ledger.base + ledger.points * 100 / ledger.target));
}

export function displayedDigestion(exact: number): number {
  // Never show 100% early; integer points prevent accumulated per-entry rounding loss.
  return exact >= 100 - 1e-9 ? 100 : Math.min(99.9, Math.round((Math.max(0, exact) + 1e-9) * 10) / 10);
}

export function isDigestionLedger(value: unknown, target: number, digestion: number): value is DigestionLedger {
  if (!value || typeof value !== 'object') return false;
  const l = value as DigestionLedger;
  return Number.isFinite(l.base) && l.base >= 0 && l.base <= 100 && l.target === target
    && Number.isInteger(l.points) && l.points >= 0 && l.points <= target + 100
    && displayedDigestion(exactDigestion(l)) === digestion;
}

export const assessmentReasons: Record<AutoAssessment['reason'], string> = {
  scored: 'Баллы по правилам отыгрыша', note: 'Обычная заметка — без усвоения',
  empty: 'Добавьте описание сцены для расчёта', duplicate: 'Такое описание уже было зачтено для этого зелья',
  full: 'Текущее зелье уже полностью усвоено',
};
