import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, Feather, FlaskConical, Save } from 'lucide-react';
import { addEntry, journalTitle } from './model';
import type { Character, Entry } from './model';

type Kind = Exclude<Entry['kind'], 'advance'>;
type Draft = { title: string; note: string; kind: Kind; delta: string };
const emptyDraft = (): Draft => ({ title: '', note: '', kind: 'acting', delta: '5' });
const kinds: [Kind, string][] = [['acting', 'Отыгрыш'], ['study', 'Исследование'], ['ritual', 'Ритуал'], ['other', 'Заметка']];

function loadDraft(key: string): Draft {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      if (d && typeof d.title === 'string' && typeof d.note === 'string' && typeof d.delta === 'string'
        && kinds.some(([kind]) => d.kind === kind) && Number.isFinite(Number(d.delta))) return d;
    }
  } catch { /* The editor remains usable if browser storage is unavailable. */ }
  return emptyDraft();
}

export default function EntryComposer({ character, onSave, insertNote, onNoteConsumed }: {
  character: Character; onSave: (c: Character) => boolean;
  insertNote: { id: string; text: string } | null; onNoteConsumed: () => void;
}) {
  const key = `ant-lotm.draft.v1.${character.id}`;
  const [draft, setDraft] = useState(() => loadDraft(key));
  const [draftSaved, setDraftSaved] = useState(true);
  const [insertError, setInsertError] = useState('');
  const lastInsert = useRef('');
  const dirty = !!(draft.title.trim() || draft.note.trim());
  const count = character.entries.length;
  const countLabel = count % 10 === 1 && count % 100 !== 11 ? 'запись'
    : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100) ? 'записи' : 'записей';
  const next = Math.round(Math.min(100, Math.max(0, character.digestion + (Number(draft.delta) || 0))) * 10) / 10;
  const patch = (change: Partial<Draft>) => setDraft(d => ({ ...d, ...change }));

  useEffect(() => {
    try {
      if (draft.title.trim() || draft.note.trim()) localStorage.setItem(key, JSON.stringify(draft));
      else localStorage.removeItem(key);
      setDraftSaved(true);
    } catch { setDraftSaved(false); }
  }, [draft, key]);

  useEffect(() => {
    if (!insertNote || lastInsert.current === insertNote.id) return;
    lastInsert.current = insertNote.id;
    const note = [draft.note.trimEnd(), insertNote.text].filter(Boolean).join('\n\n');
    if (note.length > 10000) {
      setInsertError('В записи уже слишком много текста. Сначала сохраните её, затем вставьте бросок ещё раз.');
    } else {
      setDraft({ ...draft, note, ...(!draft.note.trim() && !draft.title.trim() ? { kind: 'other' as const, delta: '0' } : {}) });
      setInsertError('');
      window.requestAnimationFrame(() => {
        document.getElementById('journal-note')?.focus({ preventScroll: true });
        document.getElementById('journal-note')?.scrollIntoView({ block: 'center' });
      });
    }
    onNoteConsumed();
  }, [insertNote, draft, onNoteConsumed]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = journalTitle(draft.title, draft.note);
    if (!title || !Number.isFinite(Number(draft.delta))) return;
    if (onSave(addEntry(character, { title, note: draft.note.trim(), kind: draft.kind, delta: Number(draft.delta) }))) {
      setDraft(emptyDraft());
    }
  }

  return <section className="card composer-card" aria-labelledby="composer-heading">
    <div className="section-heading"><div><div className="eyebrow">ВАША ИСТОРИЯ ПРОДОЛЖАЕТСЯ</div><h2 id="composer-heading"><Feather size={21} />Новая запись</h2></div><span className="composer-counter"><BookOpen size={15} />{count} {countLabel}</span></div>
    <form onSubmit={submit} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
      <div className="kind-picker" role="group" aria-label="Тип записи">{kinds.map(([kind, label]) => <button key={kind} type="button" aria-pressed={draft.kind === kind} className={draft.kind === kind ? 'chosen' : ''} onClick={() => patch({ kind, ...(kind === 'other' ? { delta: '0' } : {}) })}>{label}</button>)}</div>
      <label className="note-label" htmlFor="journal-note">Что произошло?</label>
      <textarea id="journal-note" name="note" className="journal-textarea" rows={6} value={draft.note} maxLength={10000} required={!draft.title.trim()} placeholder={'Запишите сцену, мысль или маленькое открытие…\nКак это помогло вашему персонажу понять свою роль?'} onChange={e => patch({ note: e.target.value })} />
      {insertError && <p className="field-error" role="alert">{insertError}</p>}
      <details className="optional-title" open={!!draft.title}><summary>Свой заголовок <span>необязательно</span></summary><label>Название записи<input name="title" value={draft.title} maxLength={120} placeholder="Иначе возьмём первую строку текста" onChange={e => patch({ title: e.target.value })} /></label></details>
      <div className="digestion-control"><div className="digestion-control-heading"><span><FlaskConical size={17} />Прибавка к усвоению</span><span>{character.digestion}%<ArrowRight size={14} /><strong>{next}%</strong></span></div><div className="digestion-inputs"><div className="delta-presets">{[0, 1, 5, 10].map(n => <button type="button" key={n} aria-pressed={Number(draft.delta) === n} className={Number(draft.delta) === n ? 'chosen' : ''} onClick={() => patch({ delta: String(n) })}>{n > 0 ? '+' : ''}{n}%</button>)}</div><label className="custom-delta"><span>Своё значение</span><input type="number" aria-label="Изменение усвоения, %" min={-100} max={100} step="0.1" required value={draft.delta} onChange={e => patch({ delta: e.target.value })} /><span>%</span></label></div></div>
      <div className="composer-footer"><div className="draft-state" role="status">{dirty ? <>{draftSaved ? <Check size={14} /> : <Save size={14} />}{draftSaved ? 'Черновик сохранён' : 'Черновик только в памяти'}</> : <><span className="keyboard-hint">Ctrl ↵</span>для быстрой записи</>}</div><button type="submit" className="button primary"><Feather size={16} />Сохранить запись</button></div>
    </form>
  </section>;
}
