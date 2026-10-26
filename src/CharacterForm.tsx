import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check } from 'lucide-react';
import { createCharacter, PATHWAYS } from './model';
import type { Character } from './model';
import PortraitInput from './PortraitInput';

export default function CharacterForm({ initial, onSave, onClose }: {
  initial?: Character; onSave: (character: Character) => void; onClose: () => void;
}) {
  const [c] = useState(() => initial ?? createCharacter());
  const [portrait, setPortrait] = useState(c.portrait ?? '');
  const [busy, setBusy] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const string = (key: string) => String(data.get(key) ?? '').trim();
    if (!string('name') || !string('potion')) return;
    onSave({ ...c, portrait, name: string('name'), epithet: string('epithet'), pathway: string('pathway'),
      sequence: initial ? initial.sequence : Number(data.get('sequence')), potion: string('potion'), age: string('age'),
      occupation: string('occupation'), origin: string('origin'), bio: string('bio'), principles: string('principles') });
  }

  return <form onSubmit={submit}>
    <PortraitInput value={portrait} onChange={setPortrait} onBusyChange={setBusy} />
    <div className="form-section-title">Знакомство с персонажем</div>
    <div className="form-grid">
      <label className="span-2">Имя персонажа<input autoFocus name="name" defaultValue={c.name} maxLength={80} placeholder="Как вас знают в этом мире?" required pattern=".*\S.*" /></label>
      <label className="span-2">Титул или прозвище<input name="epithet" defaultValue={c.epithet} maxLength={100} placeholder="Например, Странник за серым туманом" /></label>
      <label>Путь<select name="pathway" defaultValue={c.pathway}>{PATHWAYS.map(p => <option key={p}>{p}</option>)}</select></label>
      <label>Последовательность<select name="sequence" defaultValue={c.sequence} disabled={!!initial}>{Array.from({ length: 10 }, (_, i) => 9 - i).map(n => <option key={n} value={n}>{n}{n === 9 ? ' · Начало пути' : n === 0 ? ' · Божество' : ''}</option>)}</select>{initial && <small>Меняется через продвижение.</small>}</label>
      <label className="span-2">Текущее зелье<input name="potion" defaultValue={c.potion} maxLength={80} required pattern=".*\S.*" /></label>
      <label>Возраст<input name="age" defaultValue={c.age} placeholder="Например, 24 года" maxLength={40} /></label>
      <label>Род занятий<input name="occupation" defaultValue={c.occupation} placeholder="Детектив, учёный…" maxLength={80} /></label>
      <label className="span-2">Место происхождения<input name="origin" defaultValue={c.origin} placeholder="Город, страна" maxLength={100} /></label>
      <label className="span-2">История персонажа<textarea name="bio" defaultValue={c.bio} rows={5} maxLength={10000} placeholder="Прошлое, характер, цели и то, что лучше оставить в тайне…" /></label>
      <label className="span-2">Принципы отыгрыша<textarea name="principles" defaultValue={c.principles} rows={4} maxLength={5000} placeholder="Каждый принцип — с новой строки" /></label>
    </div>
    <div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit" disabled={busy}><Check size={17} />{initial ? 'Сохранить анкету' : 'Создать персонажа'}</button></div>
  </form>;
}
