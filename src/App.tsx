import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight,
  CircleHelp, Compass, Feather, FlaskConical, FolderOpen, History, MapPin,
  MoreHorizontal, Plus, Search, Shield, Sparkles, Trash2, Upload, Users, X,
} from 'lucide-react';
import { addEntry, advanceCharacter, createCharacter, isCharacter, PATHWAYS, STORAGE_KEY } from './model';
import type { Character, Entry } from './model';

type View = 'characters' | 'journal' | 'guide';
type Modal = 'create' | 'edit' | 'entry' | 'advance' | 'delete' | null;
const kindLabels: Record<Entry['kind'], string> = {
  acting: 'Отыгрыш', study: 'Исследование', ritual: 'Ритуал', other: 'Заметка', advance: 'Продвижение',
};

function loadArchive(): { characters: Character[]; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { characters: [], error: '' };
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(isCharacter)) throw new Error();
    return { characters: data, error: '' };
  } catch {
    return { characters: [], error: 'Не удалось прочитать локальный архив. Исходные данные не изменены. Проверьте доступ к хранилищу браузера или импортируйте резервную копию.' };
  }
}

function Seal({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 220 220" fill="none" aria-hidden="true">
    <circle cx="110" cy="110" r="89" stroke="currentColor" strokeWidth=".7" />
    <circle cx="110" cy="110" r="73" stroke="currentColor" strokeWidth=".6" strokeDasharray="2 6" />
    <path d="M110 15 192 157H28L110 15Zm0 190L28 63h164l-82 142Z" stroke="currentColor" strokeWidth=".7" />
    <circle cx="110" cy="110" r="47" stroke="currentColor" strokeWidth=".7" />
    <path d="M72 110s16-23 38-23 38 23 38 23-16 23-38 23-38-23-38-23Z" stroke="currentColor" />
    <circle cx="110" cy="110" r="12" stroke="currentColor" />
    <circle cx="110" cy="110" r="4" fill="currentColor" />
    <path d="M110 0v9m0 202v9M0 110h9m202 0h9" stroke="currentColor" />
  </svg>;
}

function Dialog({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="dialog-title">
    <div className="dialog-header"><div><div className="eyebrow">АРХИВ ПОТУСТОРОННИХ</div><h2 id="dialog-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>;
}

function CharacterForm({ initial, onSave, onClose }: { initial?: Character; onSave: (character: Character) => void; onClose: () => void }) {
  const c = initial ?? createCharacter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const string = (key: string) => String(data.get(key) ?? '').trim();
    if (!string('name') || !string('potion')) return;
    onSave({ ...c, name: string('name'), epithet: string('epithet'), pathway: string('pathway'),
      sequence: initial ? initial.sequence : Number(data.get('sequence')), potion: string('potion'), age: string('age'),
      occupation: string('occupation'), origin: string('origin'), bio: string('bio'), principles: string('principles') });
  }
  return <form onSubmit={submit}>
    <div className="form-grid">
      <label className="span-2">Имя персонажа <span>*</span><input autoFocus name="name" defaultValue={c.name} maxLength={80} placeholder="Как вас знают в этом мире?" required pattern=".*\S.*" /></label>
      <label className="span-2">Титул или прозвище<input name="epithet" defaultValue={c.epithet} maxLength={100} placeholder="Например, Странник за серым туманом" /></label>
      <label>Путь<select name="pathway" defaultValue={c.pathway}>{PATHWAYS.map(p => <option key={p}>{p}</option>)}</select></label>
      <label>Последовательность<select name="sequence" defaultValue={c.sequence} disabled={!!initial}>{Array.from({ length: 10 }, (_, i) => 9 - i).map(n => <option key={n} value={n}>{n}{n === 9 ? ' · Начало пути' : n === 0 ? ' · Божество' : ''}</option>)}</select>{initial && <small>Меняется через продвижение.</small>}</label>
      <label className="span-2">Текущее зелье <span>*</span><input name="potion" defaultValue={c.potion} maxLength={80} required pattern=".*\S.*" /></label>
      <label>Возраст<input name="age" defaultValue={c.age} placeholder="Например, 24 года" maxLength={40} /></label>
      <label>Род занятий<input name="occupation" defaultValue={c.occupation} placeholder="Детектив, учёный…" maxLength={80} /></label>
      <label className="span-2">Место происхождения<input name="origin" defaultValue={c.origin} placeholder="Город, страна" maxLength={100} /></label>
      <label className="span-2">История персонажа<textarea name="bio" defaultValue={c.bio} rows={3} maxLength={10000} placeholder="Прошлое, характер, цели и то, что лучше оставить в тайне…" /></label>
      <label className="span-2">Принципы отыгрыша<textarea name="principles" defaultValue={c.principles} rows={3} maxLength={5000} placeholder="Каждый принцип — с новой строки" /></label>
    </div>
    <div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit"><Check size={16} />{initial ? 'Сохранить анкету' : 'Создать персонажа'}</button></div>
  </form>;
}

function EntryForm({ character, onSave, onClose }: { character: Character; onSave: (c: Character) => void; onClose: () => void }) {
  const [delta, setDelta] = useState('5');
  const next = Math.round(Math.max(0, Math.min(100, character.digestion + (Number(delta) || 0))) * 10) / 10;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') ?? '').trim();
    if (!title) return;
    onSave(addEntry(character, { title, note: String(data.get('note') ?? '').trim(), kind: data.get('kind') as Entry['kind'], delta: Number(delta) }));
  }
  return <form onSubmit={submit}>
    <div className="form-grid">
      <label className="span-2">Что произошло? <span>*</span><input autoFocus name="title" placeholder="Например, первое успешное гадание" maxLength={120} required pattern=".*\S.*" /></label>
      <label>Тип записи<select name="kind"><option value="acting">Отыгрыш</option><option value="study">Исследование</option><option value="ritual">Ритуал</option><option value="other">Заметка</option></select></label>
      <label>Изменение усвоения, %<input aria-label="Изменение усвоения, %" type="number" value={delta} min={-100} max={100} step="0.1" required onChange={e => setDelta(e.target.value)} /></label>
      <label className="span-2">Подробности<textarea name="note" rows={4} maxLength={10000} placeholder="Как это помогло понять роль и усвоить зелье?" /></label>
    </div>
    <div className="progress-preview"><FlaskConical size={18} /><span>Усвоение зелья</span><strong>{character.digestion}% <ArrowRight size={14} /> {next}%</strong></div>
    <p className="form-hint">Прибавку определяете вы или ведущий. Прогресс ограничен диапазоном 0–100%; в истории сохранится фактическое изменение.</p>
    <div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button type="submit" className="button primary"><Feather size={16} />Добавить запись</button></div>
  </form>;
}

function Entries({ entries, limit }: { entries: Entry[]; limit?: number }) {
  if (!entries.length) return <div className="empty-entries"><Feather size={25} strokeWidth={1.2} /><p>Первые строки ещё не написаны</p><span>Запишите событие, которое приблизило вас к пониманию зелья.</span></div>;
  return <div className="entries">{entries.slice(0, limit).map(entry => <article className="entry" key={entry.id}>
    <div className={`entry-icon ${entry.kind === 'advance' ? 'gold' : ''}`}>{entry.kind === 'advance' ? <Sparkles size={17} /> : entry.kind === 'study' ? <BookOpen size={17} /> : <Feather size={17} />}</div>
    <div className="entry-content"><div className="entry-title"><h3>{entry.title}</h3><span className={`entry-delta ${entry.delta < 0 ? 'negative' : ''}`}>{entry.kind === 'advance' ? 'Новый этап' : entry.delta > 0 ? `+${entry.delta}%` : `${entry.delta}%`}</span></div>{entry.note && <p>{entry.note}</p>}<div className="entry-meta"><span>{kindLabels[entry.kind]}</span><span>·</span><time dateTime={entry.date}>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(entry.date))}</time></div></div>
  </article>)}</div>;
}

function App() {
  const [initial] = useState(loadArchive);
  const [characters, setCharacters] = useState(initial.characters);
  const [storageError, setStorageError] = useState(initial.error);
  const [activeId, setActiveId] = useState(initial.characters[0]?.id ?? '');
  const [view, setView] = useState<View>('characters');
  const [modal, setModal] = useState<Modal>(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const active = characters.find(c => c.id === activeId) ?? characters[0];
  const filtered = characters.filter(c => `${c.name} ${c.pathway}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function persist(next: Character[]) {
    setCharacters(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageError(''); return true; }
    catch { setStorageError('Браузер не смог сохранить изменения. Они доступны до закрытия страницы. Скачайте резервную копию архива.'); return false; }
  }
  function saveCharacter(character: Character) {
    const saved = persist(characters.some(c => c.id === character.id) ? characters.map(c => c.id === character.id ? character : c) : [...characters, character]);
    setActiveId(character.id);
    setModal(null);
    setNotice(!saved ? 'Изменения пока только в памяти — скачайте архив' : modal === 'entry' ? 'Запись добавлена в дневник' : modal === 'advance' ? 'Начался новый этап вашего пути' : 'Анкета сохранена');
  }
  function exportArchive() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, characters }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ant-lotm-archive.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Резервная копия подготовлена');
  }
  async function importArchive(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Файл слишком большой. Максимум — 5 МБ.');
      const data: unknown = JSON.parse(await file.text());
      const incoming = data && typeof data === 'object' && 'characters' in data ? data.characters : data;
      if (!Array.isArray(incoming) || !incoming.every(isCharacter) || new Set(incoming.map(c => c.id)).size !== incoming.length) throw new Error('В файле нет корректного архива персонажей.');
      if (!incoming.length) throw new Error('В этом архиве нет персонажей.');
      const overlaps = incoming.filter(c => characters.some(existing => existing.id === c.id));
      if (overlaps.length && !window.confirm(`Заменить ${overlaps.length} существующих анкет версиями из файла? Остальные анкеты сохранятся.`)) return;
      const merged = new Map(characters.map(c => [c.id, c]));
      incoming.forEach(c => merged.set(c.id, c));
      const saved = persist([...merged.values()]); setActiveId(incoming[0].id); setView('characters'); setNotice(saved ? 'Архив импортирован' : 'Архив открыт в памяти — браузер не смог его сохранить');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось импортировать архив.'); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setView('characters'); }}><div className="brand-mark"><Seal /></div><div>ANT<span>LOTM ARCHIVE</span></div></a>
      <div className="sidebar-rule" />
      <div className="nav-label">ВАШ АРХИВ</div>
      <nav className="main-nav" aria-label="Основная навигация">
        <button className={view === 'characters' ? 'selected' : ''} onClick={() => setView('characters')}><Users size={18} />Мои персонажи<span className="nav-count">{characters.length.toString().padStart(2, '0')}</span></button>
        <button className={view === 'journal' ? 'selected' : ''} onClick={() => setView('journal')}><BookOpen size={18} />Дневник отыгрыша</button>
        <button className={view === 'guide' ? 'selected' : ''} onClick={() => setView('guide')}><Compass size={18} />О системе</button>
      </nav>
      <div className="character-nav-title"><span>ПЕРСОНАЖИ</span><button aria-label="Создать персонажа" onClick={() => setModal('create')}><Plus size={16} /></button></div>
      <div className="character-nav">{characters.map(c => <button key={c.id} className={active?.id === c.id ? 'active-character' : ''} onClick={() => { setActiveId(c.id); setView('characters'); setQuery(''); }}><span className="mini-avatar">{c.name[0]}</span><span className="character-nav-name">{c.name}<small>{c.potion} · {c.sequence}</small></span>{active?.id === c.id && <span className="tiny-dot" />}</button>)}{!characters.length && <p className="sidebar-empty">Здесь появятся герои<br />вашей истории.</p>}</div>
      <div className="sidebar-bottom"><div className="sidebar-quote">«Мы — стражи. И ещё —<br />кучка несчастных…»</div><span>ПОВЕЛИТЕЛЬ ТАЙН</span><div className="local-status"><span />Локальный архив<Shield size={13} /></div></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><FolderOpen size={16} /><span>Архив</span><ChevronRight size={13} /><strong>{view === 'journal' ? 'Дневник отыгрыша' : view === 'guide' ? 'О системе' : 'Анкеты персонажей'}</strong></div><div className="topbar-right"><span className="edition">ЛИЧНОЕ СОБРАНИЕ</span><button className="icon-button" aria-label="Помощь" onClick={() => setView('guide')}><CircleHelp size={19} /></button><span className="user-avatar">А</span></div></header>

      <main>
        {storageError && <div className="storage-error" role="alert"><Shield size={20} /><span>{storageError}</span><button className="text-button" onClick={exportArchive}>Скачать архив</button></div>}
        {view === 'guide' ? <>
          <div className="page-heading"><div><div className="eyebrow">НЕБОЛЬШОЙ ПУТЕВОДИТЕЛЬ</div><h1>За пределами обычного</h1><p>Как вести анкету и сохранять историю своего пути.</p></div><Compass className="heading-icon" size={35} strokeWidth={1} /></div>
          <section className="guide-grid">{[
            ['01', 'Создайте потустороннего', 'Укажите имя, путь, последовательность и название текущего зелья. Добавьте историю персонажа и собственные принципы отыгрыша. Названия зелий вводятся вручную — так можно использовать перевод и правила вашей игры.'],
            ['02', 'Проживайте свою роль', 'Добавляйте события в дневник: отыгрыш, исследования, ритуалы или обычные заметки. Вы или ведущий задаёте изменение усвоения — положительное, отрицательное или нулевое. Автоматической оценки отыгрыша нет.'],
            ['03', 'Продвигайтесь по пути', 'При 100% усвоения станет доступно продвижение к следующей последовательности. Назовите новое зелье: прогресс начнётся с нуля, а вся история сохранится. Решение о готовности ритуала остаётся за вами и ведущим.'],
            ['04', 'Берегите свой архив', 'Анкеты сохраняются в этом браузере. Другие устройства и браузеры не получают их автоматически. Скачивайте JSON-копию перед очисткой данных браузера; импорт позволяет перенести архив и восстановить анкеты.'],
          ].map(([n, title, text]) => <article className="card guide-card" key={n}><span className="guide-number">{n}</span><h2>{title}</h2><p>{text}</p></article>)}</section>
          <div className="archive-tools"><button className="button secondary" onClick={exportArchive}><ArrowDownToLine size={16} />Скачать архив</button><button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={16} />Импортировать архив</button></div>
        </> : <>
          <div className="page-heading"><div><div className="eyebrow">КАЖДЫЙ ПУТЬ НАЧИНАЕТСЯ С ПЕРВОГО ШАГА</div><h1>{view === 'journal' ? 'Дневник отыгрыша' : 'Мои персонажи'}<span className="heading-dot">.</span></h1><p>{view === 'journal' ? 'События, открытия и маленькие шаги к пониманию зелья.' : 'Ваши истории по ту сторону серого тумана.'}</p></div><button className="button primary" onClick={() => setModal(active && view === 'journal' ? 'entry' : 'create')}><Plus size={17} />{active && view === 'journal' ? 'Добавить запись' : 'Новый персонаж'}</button></div>

          {!active ? <>
            <section className="empty-state card"><span className="corner-mark top-left">✧</span><span className="corner-mark bottom-right">✧</span><Seal className="empty-seal" /><div className="eyebrow">ЧИСТАЯ СТРАНИЦА. БЕСКОНЕЧНЫЕ ВОЗМОЖНОСТИ.</div><h2>У каждой тайны есть имя.<br />Как назовут вашу?</h2><p>Создайте своего первого потустороннего.<br />Сохраните его историю, выберите путь и начните усваивать зелье.</p><button className="button primary" onClick={() => setModal('create')}><Plus size={17} />Создать персонажа</button><button className="text-button import-empty" onClick={() => importRef.current?.click()}><Upload size={14} />У меня уже есть архив</button></section>
            <div className="feature-grid"><div><Users size={21} strokeWidth={1.4} /><h3>Больше, чем имя</h3><p>История, характер и путь —<br />в одной анкете.</p></div><div><FlaskConical size={21} strokeWidth={1.4} /><h3>Каждый процент важен</h3><p>Следите за усвоением зелья<br />от первой капли до продвижения.</p></div><div><Feather size={21} strokeWidth={1.4} /><h3>Ничто не забыто</h3><p>События и открытия складываются<br />в личный дневник.</p></div></div>
          </> : <>
            <div className="archive-toolbar"><div className="character-tabs" aria-label="Выбор персонажа">{filtered.map(c => <button key={c.id} onClick={() => setActiveId(c.id)} className={active.id === c.id ? 'current' : ''}>{c.name}<span>{c.sequence}</span></button>)}{!filtered.length && <span className="no-results">Персонажи не найдены</span>}</div><label className="search"><Search size={15} /><input aria-label="Найти персонажа" placeholder="Найти персонажа…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
            {view === 'journal' ? <section className="card journal-card"><div className="section-heading"><div><div className="eyebrow">ЛИЧНАЯ ХРОНИКА</div><h2>{active.name}</h2></div><span className="muted">Записей: {active.entries.length}</span></div><Entries entries={active.entries} /></section> : <>
              <section className="character-hero"><div className="hero-background"><Seal /></div><div className="character-avatar">{active.name[0]}<span>✧</span></div><div className="hero-content"><div className="hero-label"><span />ДОСЬЕ ПОТУСТОРОННЕГО</div><h2>{active.name}</h2><p>{active.epithet || 'У каждой истории есть свои тайны'}</p><div className="hero-tags"><span><Compass size={13} />Путь «{active.pathway}»</span>{active.origin && <span><MapPin size={13} />{active.origin}</span>}</div></div><button className="button hero-edit" onClick={() => setModal('edit')}><Feather size={14} />Редактировать</button></section>

              <div className="dashboard-grid"><div className="main-column">
                <section className="card potion-card"><div className="section-heading"><div className="section-label"><FlaskConical size={17} /><span>УСВОЕНИЕ ЗЕЛЬЯ</span></div><span className="status-tag">{active.digestion === 100 ? 'Полностью усвоено' : 'В процессе'}</span></div><div className="potion-body"><div className="potion-detail"><span className="eyebrow">ПОСЛЕДОВАТЕЛЬНОСТЬ {active.sequence}</span><h2>{active.potion}</h2><p>{active.digestion === 100 ? 'Зелье усвоено. Впереди — следующая ступень вашего пути.' : 'Понять роль. Прожить её. Остаться собой.'}</p><div className="progress-track"><span style={{ width: `${active.digestion}%` }} /></div><div className="progress-label"><span>Усвоение</span><strong>{active.digestion} <span>/ 100%</span></strong></div></div><div className="progress-circle" role="progressbar" aria-label="Усвоение зелья" aria-valuenow={active.digestion} aria-valuemin={0} aria-valuemax={100}><svg viewBox="0 0 140 140" aria-hidden="true"><circle className="circle-track" cx="70" cy="70" r="61" /><circle className="circle-value" cx="70" cy="70" r="61" strokeDasharray={`${2 * Math.PI * 61}`} strokeDashoffset={2 * Math.PI * 61 * (1 - active.digestion / 100)} /></svg><div><FlaskConical size={23} strokeWidth={1.2} /><strong>{active.digestion}<small>%</small></strong><span>УСВОЕНО</span></div></div></div><div className="potion-footer"><span><span className="tiny-dot" />{active.sequence === 0 ? 'Высшая последовательность' : `Следующая ступень: последовательность ${active.sequence - 1}`}</span><button className="text-button" disabled={active.digestion < 100 || active.sequence === 0} onClick={() => setModal('advance')}>{active.sequence === 0 ? 'Вершина пути' : 'Продвинуться'}<ArrowRight size={15} /></button></div></section>

                <section className="card activity-card"><div className="section-heading"><h2><History size={19} strokeWidth={1.5} />Последние события</h2><button className="text-button" onClick={() => setView('journal')}>Весь дневник<ArrowRight size={14} /></button></div><Entries entries={active.entries} limit={3} /><button className="add-entry" onClick={() => setModal('entry')}><Plus size={16} />Записать событие</button></section>
              </div><div className="right-column">
                <section className="card profile-card"><div className="section-heading"><h2>О персонаже</h2><button className="icon-button" aria-label="Редактировать сведения о персонаже" onClick={() => setModal('edit')}><MoreHorizontal size={18} /></button></div><dl><div><dt>Последовательность</dt><dd className="sequence-badge">{active.sequence.toString().padStart(2, '0')}</dd></div><div><dt>Путь</dt><dd>{active.pathway}</dd></div><div><dt>Возраст</dt><dd>{active.age || 'Не указан'}</dd></div><div><dt>Род занятий</dt><dd>{active.occupation || 'Не указан'}</dd></div></dl>{active.bio ? <p className="bio">{active.bio}</p> : <p className="bio placeholder">За каждым потусторонним скрывается история. Добавьте свою в анкету.</p>}</section>
                <section className="principles-card"><div className="section-heading"><h2><Sparkles size={17} strokeWidth={1.3} />Принципы отыгрыша</h2></div>{active.principles.trim() ? <ul>{active.principles.split('\n').map(p => p.trim()).filter(Boolean).map((p, index) => <li key={index}>{p}</li>)}</ul> : <><p>Не просто используйте способности — поймите того, кем стали.</p><button className="text-button" onClick={() => setModal('edit')}>Добавить свои принципы<Plus size={13} /></button></>}<div className="principle-reminder">Помните: вы лишь играете роль.</div></section>
              </div></div>
              <div className="archive-actions"><button className="text-button" onClick={exportArchive}><ArrowDownToLine size={14} />Скачать архив</button><button className="text-button" onClick={() => importRef.current?.click()}><Upload size={14} />Импортировать</button><button className="text-button danger" onClick={() => setModal('delete')}><Trash2 size={14} />Удалить персонажа</button></div>
            </>}
          </>}
        </>}
        <footer className="page-footer"><span>ANT · LOTM</span><span>Маленький архив больших историй</span><span>✧</span></footer>
      </main>
    </div>
    <input ref={importRef} type="file" accept="application/json,.json" hidden aria-label="Импорт архива" onChange={e => { void importArchive(e.target.files?.[0]); e.target.value = ''; }} />
    {notice && <div className="toast" role="status"><Check size={17} /><span>{notice}</span><button aria-label="Закрыть уведомление" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {(modal === 'create' || modal === 'edit') && <Dialog title={modal === 'create' ? 'Новая история' : 'Анкета персонажа'} subtitle={modal === 'create' ? 'Расскажите, кто скрывается по ту сторону тумана.' : 'Детали, из которых складывается ваша история.'} onClose={() => setModal(null)}><CharacterForm initial={modal === 'edit' ? active : undefined} onSave={saveCharacter} onClose={() => setModal(null)} /></Dialog>}
    {modal === 'entry' && active && <Dialog title="Новая запись" subtitle={`Хроника ${active.name} · ${active.potion}`} onClose={() => setModal(null)}><EntryForm character={active} onSave={saveCharacter} onClose={() => setModal(null)} /></Dialog>}
    {modal === 'advance' && active && <Dialog title="Следующая ступень" subtitle={`Последовательность ${active.sequence} → ${active.sequence - 1}`} onClose={() => setModal(null)}><form onSubmit={e => { e.preventDefault(); const potion = String(new FormData(e.currentTarget).get('potion') ?? '').trim(); if (potion) saveCharacter(advanceCharacter(active, potion)); }}><p className="advance-copy">Зелье «{active.potion}» полностью усвоено. Убедитесь, что ваш персонаж выполнил необходимые условия и ритуал продвижения.</p><label>Следующее зелье <span>*</span><input autoFocus name="potion" placeholder="Название нового зелья" maxLength={80} required pattern=".*\S.*" /></label><p className="form-hint">Усвоение нового зелья начнётся с 0%. Все записи останутся в дневнике.</p><div className="form-footer"><button type="button" className="button secondary" onClick={() => setModal(null)}><ArrowLeft size={15} />Назад</button><button className="button primary" type="submit">Продвинуться<ArrowRight size={15} /></button></div></form></Dialog>}
    {modal === 'delete' && active && <Dialog title="Закрыть эту историю?" subtitle="Удаление персонажа" onClose={() => setModal(null)}><p className="advance-copy">Анкета «{active.name}» и все её записи будут удалены из этого браузера. Перед удалением можно скачать архив.</p><button className="text-button" onClick={exportArchive}><ArrowDownToLine size={15} />Сначала скачать архив</button><div className="form-footer"><button className="button secondary" onClick={() => setModal(null)}>Оставить персонажа</button><button className="button danger-button" onClick={() => { const remaining = characters.filter(c => c.id !== active.id); persist(remaining); setActiveId(remaining[0]?.id ?? ''); setModal(null); setNotice('Персонаж удалён'); }}><Trash2 size={15} />Удалить</button></div></Dialog>}
  </div>;
}

export default App;
