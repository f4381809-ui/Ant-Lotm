import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { Character } from './model';
import { applyDigestionRules, getDigestionRules } from './model';
import { DEFAULT_DIGESTION_RULES, isDigestionRules } from './digestion';
import type { DigestionRules } from './digestion';

export default function DigestionRulesForm({ character, onSave, onClose }: {
  character: Character; onSave: (c: Character) => void; onClose: () => void;
}) {
  const [rules, setRules] = useState(() => ({ ...getDigestionRules(character) }));
  const patch = (p: Partial<DigestionRules>) => setRules(r => ({ ...r, ...p }));
  return <form onSubmit={e => { e.preventDefault(); if (isDigestionRules(rules)) onSave(applyDigestionRules(character, rules)); }}>
    <p className="rules-intro">Это настраиваемые правила вашей игры. Оценку результатов сцены отмечаете вы; сайт считает баллы и проценты. Формула не оценивает смысл текста.</p>
    <div className="form-grid">
      <label className="span-2">Режим для новых записей<select aria-label="Режим усвоения по умолчанию" value={rules.mode} onChange={e => patch({ mode: e.target.value as DigestionRules['mode'] })}><option value="automatic">Автоматический расчёт</option><option value="manual">Ручная прибавка</option></select></label>
      <label className="span-2">Баллов для полного усвоения<input type="number" aria-label="Баллов для полного усвоения" min={10} max={10000} step={1} required value={rules.target} onChange={e => { const target = Number(e.target.value); patch({ target, cap: Math.min(rules.cap, Math.max(1, target)) }); }} /><small>100 баллов → 1 балл = 1%. Можно выбрать свой темп.</small></label>
      {(['acting', 'study', 'ritual', 'principle', 'insight', 'challenge'] as const).map((key, i) => <label key={key}>{['Отыгрыш роли', 'Исследование', 'Ритуал', 'Применён принцип', 'Новое понимание роли', 'Сложная сцена'][i]}<input type="number" aria-label={`Баллы: ${['Отыгрыш роли', 'Исследование', 'Ритуал', 'Применён принцип', 'Новое понимание роли', 'Сложная сцена'][i]}`} min={0} max={20} step={1} required value={rules[key]} onChange={e => patch({ [key]: Number(e.target.value) })} /></label>)}
      <label className="span-2">Предел баллов за одну сцену<input type="number" aria-label="Предел баллов за одну сцену" min={1} max={Math.min(100, rules.target)} step={1} required value={rules.cap} onChange={e => patch({ cap: Number(e.target.value) })} /><small>Бонус за принципы начисляется один раз за сцену, даже если отмечено несколько.</small></label>
    </div>
    <p className="form-hint">Текущие {character.digestion}% и уже сохранённые расчёты останутся. Новые параметры применятся к следующим сценам. Заметки и результаты кубиков сами по себе дают 0 баллов.</p>
    <div className="form-footer rules-footer"><button type="button" className="text-button" onClick={() => setRules({ ...DEFAULT_DIGESTION_RULES })}><RotateCcw size={15} />Стандартные значения</button><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button type="submit" className="button primary"><Check size={16} />Сохранить правила</button></div>
  </form>;
}
