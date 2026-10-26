import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDownToLine, Dice5, Dices, History, RotateCcw, Trash2 } from 'lucide-react';
import { DIE_SIDES, HISTORY_LIMIT, diceFormula, diceNote, isDiceRecipe, rollDice } from './dice';
import type { DiceRoll, DiceState } from './dice';

export default function DicePanel({ value, onChange, onInsert, characterName }: {
  value: DiceState; onChange: (state: DiceState) => void; onInsert: (text: string) => void; characterName?: string;
}) {
  const [sides, setSides] = useState(String(value.recipe.sides));
  const [count, setCount] = useState(String(value.recipe.count));
  const [modifier, setModifier] = useState(String(value.recipe.modifier));
  const [error, setError] = useState('');
  const [animation, setAnimation] = useState(0);
  const recipe = { sides: Number(sides), count: Number(count), modifier: Number(modifier) };
  const latest = value.history[0];
  const formula = isDiceRecipe(recipe) ? diceFormula(recipe) : 'Настройте бросок';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!sides.trim() || !count.trim() || !modifier.trim()) throw new Error('Заполните параметры броска.');
      const result = rollDice(recipe);
      onChange({ recipe, history: [result, ...value.history].slice(0, HISTORY_LIMIT) });
      setError(''); setAnimation(n => n + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось бросить кубики.'); }
  }
  const insert = (roll: DiceRoll) => onInsert(diceNote(roll));

  return <div className="dice-panel">
    <form onSubmit={submit}>
      <div className="die-picker" role="group" aria-label="Выбрать кубик">{DIE_SIDES.map(n => <button type="button" key={n} className={Number(sides) === n ? 'selected' : ''} aria-pressed={Number(sides) === n} onClick={() => setSides(String(n))}><Dices size={18} /><span>d{n}</span></button>)}</div>
      <div className="dice-fields"><label>Кубиков<input aria-label="Количество кубиков" type="number" min={1} max={20} step={1} required value={count} onChange={e => setCount(e.target.value)} /></label><label>Граней<input aria-label="Количество граней" type="number" min={2} max={1000} step={1} required value={sides} onChange={e => setSides(e.target.value)} /></label><label>Модификатор<input aria-label="Модификатор" type="number" min={-999} max={999} step={1} required value={modifier} onChange={e => setModifier(e.target.value)} /></label></div>
      <div className="dice-result" aria-live="polite" aria-atomic="true"><div className="dice-symbol" key={animation}><Dice5 size={43} strokeWidth={1.2} /></div><span className="eyebrow">{latest ? diceFormula(latest) : 'СУДЬБА ЖДЁТ ВАШЕГО БРОСКА'}</span><strong className="dice-total">{latest?.total ?? '—'}</strong>{latest ? <><div className="dice-values">{latest.values.map((n, i) => <span key={i}>{n}</span>)}{latest.modifier !== 0 && <em>{latest.modifier > 0 ? '+' : '−'} {Math.abs(latest.modifier)}</em>}</div><span className="dice-result-label">Сумма граней{latest.modifier ? ' с модификатором' : ''}</span></> : <p>Выберите кубик и доверьтесь случаю.</p>}</div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="button primary roll-button"><Dices size={20} />Бросить {formula}</button>
    </form>
    {latest && characterName && <button type="button" className="button secondary insert-roll" onClick={() => insert(latest)}><ArrowDownToLine size={17} />Вставить результат в дневник</button>}
    <p className="dice-hint">{characterName ? `Результат можно добавить в черновик ${characterName}. Усвоение само не меняется.` : 'Создайте персонажа, чтобы переносить результаты в его дневник.'}</p>
    <section className="dice-history"><div className="section-heading"><h3><History size={17} />Последние броски <span>{value.history.length}/30</span></h3>{value.history.length > 0 && <button type="button" className="icon-button danger" aria-label="Очистить историю бросков" onClick={() => { if (window.confirm('Удалить историю бросков? Анкеты и дневник сохранятся.')) onChange({ ...value, history: [] }); }}><Trash2 size={16} /></button>}</div>
      {!value.history.length && <p className="dice-history-empty">Здесь останутся ваши последние 30 бросков.</p>}
      {value.history.map(r => <article className="dice-history-row" key={r.id}><span className="past-total">{r.total}</span><div><strong>{diceFormula(r)}</strong><small>{r.values.join(' + ')}{r.modifier ? ` ${r.modifier > 0 ? '+' : '−'} ${Math.abs(r.modifier)}` : ''}<span> · </span><time dateTime={r.date}>{new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(r.date))}</time></small></div>{characterName && <button type="button" className="icon-button" aria-label={`Вставить бросок ${diceFormula(r)} = ${r.total} в дневник`} onClick={() => insert(r)}><ArrowDownToLine size={16} /></button>}</article>)}
    </section>
    <div className="dice-footnote"><RotateCcw size={13} />Броски сохраняются на устройстве и входят в архив.</div>
  </div>;
}
