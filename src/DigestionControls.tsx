import { ArrowRight, FlaskConical, Settings2, Sparkles } from 'lucide-react';
import { currentExactDigestion, previewAutomaticEntry } from './model';
import type { Character } from './model';
import { assessmentReasons, displayedDigestion } from './digestion';
import type { AutoAssessment, DigestionRules, SceneEvidence, SceneKind } from './digestion';

export function principleOptions(text: string): string[] {
  return [...new Set(text.split('\n').map(s => s.trim()).filter(s => s && s.length <= 5000))].slice(0, 50);
}

export function AssessmentDetails({ value: a }: { value: AutoAssessment }) {
  return <div className="assessment-details">
    <p>{assessmentReasons[a.reason]}</p>
    {a.reason === 'scored' && <><dl>
      <div><dt>{a.kind === 'acting' ? 'Отыгрыш роли' : a.kind === 'study' ? 'Исследование' : 'Ритуал'}</dt><dd>+{a.rules[a.kind === 'other' ? 'acting' : a.kind]}</dd></div>
      {!!a.principleTexts.length && <div><dt>Применён принцип</dt><dd>+{a.rules.principle}</dd></div>}
      {a.insight && <div><dt>Новое понимание роли</dt><dd>+{a.rules.insight}</dd></div>}
      {a.challenge && <div><dt>Сложная сцена</dt><dd>+{a.rules.challenge}</dd></div>}
    </dl><span className="assessment-formula">Итого: {a.points} баллов · предел сцены {a.rules.cap}<br />{a.points} / {a.rules.target} × 100 = {Number((a.points * 100 / a.rules.target).toFixed(4))}% до ограничения прогресса</span></>}
    {!!a.principleTexts.length && <ul>{a.principleTexts.map(p => <li key={p}>{p}</li>)}</ul>}
  </div>;
}

export default function DigestionControls({ character, kind, note, mode, evidence, delta,
  onMode, onEvidence, onDelta, onConfigure }: {
  character: Character; kind: SceneKind; note: string; mode: DigestionRules['mode']; evidence: SceneEvidence; delta: string;
  onMode: (mode: DigestionRules['mode']) => void; onEvidence: (e: SceneEvidence) => void;
  onDelta: (value: string) => void; onConfigure: () => void;
}) {
  const automatic = mode === 'automatic';
  const result = previewAutomaticEntry(character, { title: '', note, kind, evidence });
  const next = automatic ? result.digestion : displayedDigestion(Math.min(100, Math.max(0, currentExactDigestion(character) + (Number(delta) || 0))));
  const change = Math.round((next - character.digestion) * 10) / 10;
  const principles = principleOptions(character.principles);
  const patch = (p: Partial<SceneEvidence>) => onEvidence({ ...evidence, ...p });

  return <div className="digestion-control">
    <div className="digestion-control-heading"><span><FlaskConical size={17} />Усвоение зелья</span><button type="button" className="text-button configure-digestion" onClick={onConfigure}><Settings2 size={14} />Правила</button></div>
    <div className="digestion-mode" role="group" aria-label="Расчёт усвоения"><button type="button" aria-pressed={automatic} className={automatic ? 'chosen' : ''} onClick={() => onMode('automatic')}><Sparkles size={15} />Автоматически</button><button type="button" aria-pressed={!automatic} className={!automatic ? 'chosen' : ''} onClick={() => onMode('manual')}>Вручную</button></div>
    {automatic ? <>
      <p className="automatic-hint">Баллы начисляются по типу события и отмеченным результатам сцены. Процент сайт рассчитывает сам.</p>
      {kind !== 'other' && <div className="scene-evidence">
        {!!principles.length && <fieldset><legend>Какие принципы удалось применить?</legend>{principles.map(p => <label key={p}><input type="checkbox" checked={evidence.principleTexts.includes(p)} onChange={e => patch({ principleTexts: e.target.checked ? [...evidence.principleTexts, p] : evidence.principleTexts.filter(s => s !== p) })} /><span>{p}</span></label>)}</fieldset>}
        {!principles.length && <p className="principles-help">Свои принципы отыгрыша можно добавить в анкету — здесь появятся отметки для них.</p>}
        <label><input type="checkbox" checked={evidence.insight} onChange={e => patch({ insight: e.target.checked })} /><span>Персонаж по-новому понял свою роль</span></label>
        <label><input type="checkbox" checked={evidence.challenge} onChange={e => patch({ challenge: e.target.checked })} /><span>Отыгрыш прошёл в сложной ситуации</span></label>
      </div>}
      {result.duplicateDetected && kind !== 'other' && <div className="repeat-scene"><p>Такое описание уже зачтено для текущего зелья.</p><label><input type="checkbox" checked={evidence.distinctScene} onChange={e => patch({ distinctScene: e.target.checked })} /><span>Это другая сцена — засчитать отдельно</span></label></div>}
      <div className="automatic-result" aria-live="polite"><div><span>{result.assessment.points} баллов</span><strong>{change > 0 ? '+' : ''}{change}%</strong></div><p>{character.digestion}% <ArrowRight size={14} /> {next}%</p></div>
      <details className="calculation-preview"><summary>Почему столько?</summary><AssessmentDetails value={result.assessment} /></details>
      {result.assessment.points > 0 && change === 0 && <p className="automatic-hint">Баллы сохранятся. Маленькие доли процента накапливаются без потери при округлении.</p>}
    </> : <div className="digestion-inputs"><div className="delta-presets">{[0, 1, 5, 10].map(n => <button type="button" key={n} aria-pressed={Number(delta) === n} className={Number(delta) === n ? 'chosen' : ''} onClick={() => onDelta(String(n))}>{n > 0 ? '+' : ''}{n}%</button>)}</div><label className="custom-delta"><span>Своё значение</span><input type="number" aria-label="Изменение усвоения, %" min={-100} max={100} step="0.1" required value={delta} onChange={e => onDelta(e.target.value)} /><span>%</span></label><span className="manual-progress">{character.digestion}% → {next}%</span></div>}
  </div>;
}
