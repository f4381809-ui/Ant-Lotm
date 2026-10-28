import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight,
  CircleHelp, Compass, Feather, FlaskConical, FolderOpen, History, ImagePlus,
  Dices, MapPin, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Search, Settings2, Shield, Sparkles, Trash2, Upload, Users, X,
} from 'lucide-react';
import { advanceCharacter, editEntryText, isCharacter, STORAGE_KEY } from './model';
import type { Character, Entry } from './model';
import CharacterForm from './CharacterForm';
import EntryComposer from './EntryComposer';
import PortraitInput from './PortraitInput';
import PreferencesPanel from './PreferencesPanel';
import DicePanel from './DicePanel';
import { DEFAULT_PREFERENCES, isPreferences, PREFERENCES_KEY } from './preferences';
import type { Preferences } from './preferences';
import { DEFAULT_DICE, DICE_KEY, isDiceState } from './dice';
import type { DiceState } from './dice';
import { parseArchive } from './archive';
import useAppearance, { readLocalSetting } from './useAppearance';
import DigestionRulesForm from './DigestionRulesForm';
import { AssessmentDetails } from './DigestionControls';
import { getDigestionRules } from './model';

type View = 'characters' | 'journal' | 'guide';
type Modal = 'create' | 'edit' | 'portrait' | 'edit-entry' | 'advance' | 'delete' | 'preferences' | 'dice' | 'digestion-rules' | null;
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

function Dialog({ title, subtitle, children, onClose }: {
  title: string; subtitle: string; children: ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="dialog" onCancel={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }} aria-labelledby="dialog-title">
    <div className="dialog-header"><div><div className="eyebrow">АРХИВ ПОТУСТОРОННИХ</div><h2 id="dialog-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={21} /></button></div>
    {children}
  </dialog>;
}

function PortraitForm({ character, onSave, onClose }: {
  character: Character; onSave: (c: Character) => void; onClose: () => void;
}) {
  const [portrait, setPortrait] = useState(character.portrait ?? '');
  const [busy, setBusy] = useState(false);
  return <form onSubmit={e => { e.preventDefault(); if (!busy) onSave({ ...character, portrait }); }}>
    <PortraitInput value={portrait} onChange={setPortrait} onBusyChange={setBusy} />
    <p className="form-hint">Портрет сохраняется вместе с анкетой и входит в JSON-архив. Интернет для его просмотра не нужен.</p>
    <div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit" disabled={busy}><Check size={17} />Сохранить портрет</button></div>
  </form>;
}

function EditEntryForm({ character, entry, onSave, onClose }: {
  character: Character; entry: Entry; onSave: (c: Character) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [note, setNote] = useState(entry.note);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() || note.trim()) onSave(editEntryText(character, entry.id, title, note));
  }
  return <form onSubmit={submit}>
    <div className="form-grid">
      <label className="span-2">Название записи<input autoFocus name="title" value={title} maxLength={120} required={!note.trim()} onChange={e => setTitle(e.target.value)} /></label>
      <label className="span-2">Текст записи<textarea name="note" rows={9} value={note} maxLength={10000} required={!title.trim()} onChange={e => setNote(e.target.value)} /></label>
    </div>
    <p className="form-hint">Здесь можно исправить текст. Дата, прибавка к усвоению и история продвижения сохранятся.</p>
    <div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button type="submit" className="button primary"><Check size={17} />Сохранить изменения</button></div>
  </form>;
}

function Entries({ entries, limit, onEdit }: { entries: Entry[]; limit?: number; onEdit: (entry: Entry) => void }) {
  if (!entries.length) return <div className="empty-entries"><Feather size={30} strokeWidth={1.2} /><p>Всё начинается с первой записи</p><span>Расскажите о событии в поле выше.<br />Даже маленькое открытие заслуживает строки.</span></div>;
  return <div className="entries">{entries.slice(0, limit).map(entry => {
    const body = entry.note === entry.title ? '' : entry.note.startsWith(`${entry.title}\n`)
      ? entry.note.slice(entry.title.length + 1).trimStart() : entry.note;
    return <article className="entry" key={entry.id}>
    <div className={`entry-icon ${entry.kind === 'advance' ? 'gold' : ''}`}>{entry.kind === 'advance' ? <Sparkles size={18} /> : entry.kind === 'study' ? <BookOpen size={18} /> : <Feather size={18} />}</div>
    <div className="entry-content">
      <div className="entry-title"><h3>{entry.title}</h3><span className={`entry-delta ${entry.delta < 0 ? 'negative' : ''}`}>{entry.kind === 'advance' ? 'Новый этап' : entry.delta > 0 ? `+${entry.delta}%` : `${entry.delta}%`}</span></div>
      {body && <p>{body}</p>}
      {entry.assessment && <details className="entry-assessment"><summary><Sparkles size={13} />Авторасчёт: {entry.assessment.points} баллов</summary><AssessmentDetails value={entry.assessment} /><p className="assessment-credited">Зачтено: +{entry.delta}%. Расчёт сохранён по правилам на момент записи.</p>{entry.note !== entry.assessment.sourceNote && <details className="assessment-details"><summary>Описание при начислении</summary><p>{entry.assessment.sourceNote}</p></details>}</details>}
      <div className="entry-bottom"><div className="entry-meta"><span>{kindLabels[entry.kind]}</span><span>·</span><time dateTime={entry.date}>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(entry.date))}</time></div><button className="entry-edit" aria-label={`Редактировать запись: ${entry.title}`} onClick={() => onEdit(entry)}><Pencil size={13} /><span>Исправить</span></button></div>
    </div>
  </article>; })}</div>;
}

function PotionCard({ character: c, onAdvance, onConfigure }: { character: Character; onAdvance: () => void; onConfigure: () => void }) {
  return <section className="card potion-card">
    <div className="section-heading"><span className="section-label"><FlaskConical size={18} />ВАШЕ ЗЕЛЬЕ</span><span className={`status-tag ${c.digestion === 100 ? 'complete' : ''}`}>{c.digestion === 100 ? 'Усвоено' : 'В процессе'}</span></div>
    <div className="potion-body"><div className="potion-detail"><span className="eyebrow">ПОСЛЕДОВАТЕЛЬНОСТЬ {c.sequence}</span><h2>{c.potion}</h2><span className="potion-pathway">Путь «{c.pathway}»</span></div><div className="progress-circle" role="progressbar" aria-label="Усвоение зелья" aria-valuenow={c.digestion} aria-valuemin={0} aria-valuemax={100}><svg viewBox="0 0 140 140" aria-hidden="true"><circle className="circle-track" cx="70" cy="70" r="61" /><circle className="circle-value" cx="70" cy="70" r="61" strokeDasharray={`${2 * Math.PI * 61}`} strokeDashoffset={2 * Math.PI * 61 * (1 - c.digestion / 100)} /></svg><div><strong>{c.digestion}<small>%</small></strong><span>усвоено</span></div></div></div>
    <div className="progress-track"><span style={{ width: `${c.digestion}%` }} /></div>
    <p className="potion-message">{c.digestion === 100 ? 'Зелье усвоено. Можно готовиться к следующему шагу.' : 'Каждая прожитая сцена помогает лучше понять свою роль.'}</p>
    <div className="potion-footer"><span>{c.sequence === 0 ? 'Высшая последовательность' : `Далее — последовательность ${c.sequence - 1}`}</span><button className="text-button" disabled={c.digestion < 100 || c.sequence === 0} onClick={onAdvance}>{c.sequence === 0 ? 'Вершина пути' : 'Продвинуться'}<ArrowRight size={16} /></button></div>
    <button className="potion-rules-link text-button" onClick={onConfigure}><Settings2 size={14} />{getDigestionRules(c).mode === 'automatic' ? 'Авторасчёт усвоения' : 'Ручной расчёт'}<span>Настроить</span></button>
  </section>;
}

function App() {
  const [initial] = useState(loadArchive);
  const [initialPreferences] = useState(() => readLocalSetting(PREFERENCES_KEY, isPreferences, DEFAULT_PREFERENCES, 'настройки оформления'));
  const [initialDice] = useState(() => readLocalSetting(DICE_KEY, isDiceState, DEFAULT_DICE, 'историю кубиков'));
  const [preferences, setPreferences] = useState(initialPreferences.value);
  const [dice, setDice] = useState(initialDice.value);
  const [preferencesError, setPreferencesError] = useState(initialPreferences.error);
  const [diceError, setDiceError] = useState(initialDice.error);
  const [insertNote, setInsertNote] = useState<{ id: string; text: string } | null>(null);
  useAppearance(preferences);
  const [characters, setCharacters] = useState(initial.characters);
  const [storageError, setStorageError] = useState(initial.error);
  const [activeId, setActiveId] = useState(initial.characters[0]?.id ?? '');
  const [view, setView] = useState<View>('characters');
  const [modal, setModal] = useState<Modal>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [query, setQuery] = useState('');
  const [journalQuery, setJournalQuery] = useState('');
  const [notice, setNotice] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const active = characters.find(c => c.id === activeId) ?? characters[0];
  const filtered = characters.filter(c => `${c.name} ${c.pathway}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
  const journalEntries = active?.entries.filter(e => `${e.title} ${e.note}`.toLocaleLowerCase('ru').includes(journalQuery.toLocaleLowerCase('ru'))) ?? [];
  const errors = [storageError, preferencesError, diceError].filter(Boolean).join(' ');

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function persist(next: Character[], keepInMemory = true) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setCharacters(next); setStorageError(''); return true; }
    catch {
      if (keepInMemory) setCharacters(next);
      setStorageError(keepInMemory ? 'Браузер не смог сохранить изменения. Они доступны до закрытия страницы. Скачайте резервную копию архива.'
        : 'Браузер не смог сохранить запись. Текст остался в редакторе. Скачайте архив существующих анкет перед освобождением места в браузере.');
      return false;
    }
  }
  function saveCharacter(character: Character, message = 'Анкета сохранена') {
    const saved = persist(characters.some(c => c.id === character.id) ? characters.map(c => c.id === character.id ? character : c) : [...characters, character]);
    setActiveId(character.id); setModal(null);
    setNotice(saved ? message : 'Изменения пока только в памяти — скачайте архив');
  }
  function saveJournalEntry(character: Character) {
    const saved = persist(characters.map(c => c.id === character.id ? character : c), false);
    setNotice(saved ? 'Запись добавлена в дневник' : 'Запись не сохранена — текст остался в редакторе');
    return saved;
  }
  function updatePreferences(next: Preferences) {
    if (!isPreferences(next)) return false;
    setPreferences(next);
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); setPreferencesError(''); return true; }
    catch { setPreferencesError('Оформление изменено только до закрытия страницы. Скачайте архив, чтобы сохранить настройки.'); return false; }
  }
  function updateDice(next: DiceState) {
    if (!isDiceState(next)) return false;
    setDice(next);
    try { localStorage.setItem(DICE_KEY, JSON.stringify(next)); setDiceError(''); return true; }
    catch { setDiceError('Браузер не смог сохранить броски. Они доступны до закрытия страницы и входят в скачиваемый архив.'); return false; }
  }
  function insertRoll(text: string) {
    if (!active) return;
    setView('characters'); setModal(null); setInsertNote({ id: crypto.randomUUID(), text });
  }
  function focusComposer() {
    window.requestAnimationFrame(() => {
      const field = document.getElementById('journal-note');
      field?.focus({ preventScroll: true });
      field?.scrollIntoView({ behavior: preferences.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    });
  }
  function selectCharacter(id: string) { setActiveId(id); setView('characters'); setQuery(''); setJournalQuery(''); }
  function editEntry(entry: Entry) { setEditingEntry(entry); setModal('edit-entry'); }
  function exportArchive() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, characters, preferences, dice }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ant-lotm-archive.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Архив с анкетами, настройками и бросками подготовлен');
  }
  async function importArchive(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Файл слишком большой. Максимум — 20 МБ.');
      const archive = parseArchive(JSON.parse(await file.text()));
      const incoming = archive.characters;
      const overlaps = incoming.filter(c => characters.some(existing => existing.id === c.id));
      if ((overlaps.length || archive.preferences || archive.dice) && !window.confirm(`Восстановить архив? ${overlaps.length ? `Совпадающих анкет для замены: ${overlaps.length}. ` : ''}${archive.preferences ? 'Оформление будет восстановлено из файла. ' : ''}${archive.dice ? 'История кубиков будет заменена. ' : ''}Остальные анкеты сохранятся.`)) return;
      const merged = new Map(characters.map(c => [c.id, c]));
      incoming.forEach(c => merged.set(c.id, c));
      let saved = persist([...merged.values()]);
      if (archive.preferences) saved = updatePreferences(archive.preferences) && saved;
      if (archive.dice) saved = updateDice(archive.dice) && saved;
      setActiveId(incoming[0]?.id ?? active?.id ?? ''); setView('characters');
      setNotice(saved ? 'Архив импортирован' : 'Архив открыт в памяти — браузер не смог сохранить все данные');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось импортировать архив.'); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setView('characters'); }}><div className="brand-mark"><Seal /></div><div>ANT<span>LOTM ARCHIVE</span></div></a>
      <div className="sidebar-rule" /><div className="nav-label">ВАШ ТИХИЙ УГОЛОК</div>
      <nav className="main-nav" aria-label="Основная навигация">
        <button className={view === 'characters' ? 'selected' : ''} onClick={() => setView('characters')}><Users size={19} />Мои персонажи<span className="nav-count">{characters.length}</span></button>
        <button className={view === 'journal' ? 'selected' : ''} onClick={() => setView('journal')}><BookOpen size={19} />Дневник отыгрыша</button>
        <button onClick={() => setModal('dice')}><Dices size={19} />Кубики</button>
        <button onClick={() => setModal('preferences')}><Settings2 size={19} />Настроить под себя</button>
        <button className={view === 'guide' ? 'selected' : ''} onClick={() => setView('guide')}><Compass size={19} />О системе</button>
      </nav>
      <div className="character-nav-title"><span>ПЕРСОНАЖИ</span><button aria-label="Создать персонажа" onClick={() => setModal('create')}><Plus size={18} /></button></div>
      <div className="character-nav">{characters.map(c => <button key={c.id} className={active?.id === c.id ? 'active-character' : ''} onClick={() => selectCharacter(c.id)}><span className="mini-avatar">{c.portrait ? <img src={c.portrait} alt="" /> : c.name[0]}</span><span className="character-nav-name">{c.name}<small>{c.potion} · {c.sequence}</small></span>{active?.id === c.id && <span className="tiny-dot" />}</button>)}{!characters.length && <p className="sidebar-empty">Здесь появятся герои<br />вашей истории.</p>}</div>
      <div className="sidebar-bottom"><Seal className="sidebar-seal" /><p>Понять роль.<br />Прожить её.<br /><em>Остаться собой.</em></p><div className="local-status"><span />Хранится на устройстве<Shield size={14} /></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><FolderOpen size={17} /><button className="archive-home" title={preferences.archiveName || 'Личный архив'} onClick={() => setView('characters')}>{preferences.archiveName || 'Личный архив'}</button><ChevronRight size={14} /><strong>{view === 'journal' ? 'Дневник' : view === 'guide' ? 'О системе' : 'Персонажи'}</strong></div><div className="topbar-right">
        <button className="topbar-tool" aria-label="Открыть кубики" title="Кубики" onClick={() => setModal('dice')}><Dices size={19} /><span>Кубики</span></button>
        <button className="topbar-tool focus-toggle" aria-label={preferences.focusMode ? 'Выйти из режима письма' : 'Режим письма'} title={preferences.focusMode ? 'Выйти из режима письма' : 'Режим письма'} aria-pressed={preferences.focusMode} onClick={() => updatePreferences({ ...preferences, focusMode: !preferences.focusMode })}>{preferences.focusMode ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}<span>{preferences.focusMode ? 'Вернуть панели' : 'Режим письма'}</span></button>
        <button className="topbar-tool" aria-label="Настроить оформление" title="Настроить оформление" onClick={() => setModal('preferences')}><Settings2 size={19} /><span>Оформление</span></button>
        <button className="icon-button help-tool" aria-label="Помощь" onClick={() => setView('guide')}><CircleHelp size={20} /></button>
      </div></header>
      <main>
        {errors && <div className="storage-error" role="alert"><Shield size={21} /><span>{errors}</span><button className="text-button" onClick={exportArchive}>Скачать архив</button></div>}
        {view === 'guide' ? <>
          <div className="page-heading"><div><div className="eyebrow">НЕБОЛЬШОЙ ПУТЕВОДИТЕЛЬ</div><h1>Здесь живут ваши истории</h1><p>Всё, что нужно для уютного личного архива.</p></div><Compass className="heading-icon" size={38} strokeWidth={1} /></div>
          <section className="guide-grid">{[
            ['01', 'Придайте истории лицо', 'Создайте персонажа, выберите путь и зелье. Загрузите портрет в рамку на анкете или при её создании. Подойдут JPG, PNG и WebP до 12 МБ: изображение будет уменьшено и сохранено вместе с персонажем.'],
            ['02', 'Просто начните писать', 'Большое поле в анкете всегда под рукой. Опишите событие, выберите тип и отметьте результаты отыгрыша, нажмите «Сохранить запись» или Ctrl+Enter. Заголовок можно не придумывать: возьмём первую строку. Черновик сохраняется отдельно для каждого персонажа на этом устройстве.'],
            ['03', 'Сайт сам считает усвоение', 'В новых записях включён автоматический расчёт: тип события даёт базовые баллы, отметки о принципах, понимании роли и сложной ситуации добавляют бонусы. В «Почему столько?» видно объяснение. Кнопка «Правила» меняет темп и веса для этого персонажа. Это правила вашей игры, а не оценка смысла текста или каноническая формула.'],
            ['04', 'Продвигайтесь в своём темпе', 'При 100% усвоения доступна следующая последовательность. Новое зелье начинается с нуля, дневник остаётся с вами. Кнопка «Исправить» меняет только текст записи, сохраняя усвоение и дату. Правила и условия ритуала определяете вы и ведущий.'],
            ['05', 'Подстройте всё под себя', 'В кнопке «Оформление» сверху — светлая, ночная и системная темы, любой акцентный цвет, крупный текст, книжный шрифт и высота поля записи. Можно скрыть отдельные карточки или включить режим письма. Кнопка возврата панелей всегда остаётся сверху.'],
            ['06', 'Бросайте кубики', 'Кнопка «Кубики» доступна с любой страницы. Выбирайте d4–d100 или своё число граней, до 20 кубиков и модификатор. В истории остаются 30 бросков. Результат можно вставить в черновик дневника; сам бросок не изменяет усвоение.'],
            ['07', 'Берегите написанное', 'Анкеты и портреты хранятся в этом браузере. Скачивайте JSON-архив перед обновлением HTML-файла, перемещением, сменой браузера или очисткой его данных. В резервную копию входят портреты, сохранённые записи и расчёты усвоения, правила, оформление и история кубиков; незавершённые черновики остаются только на устройстве. Старые архивы без картинок тоже поддерживаются.'],
          ].map(([n, title, text]) => <article className="card guide-card" key={n}><span className="guide-number">{n}</span><h2>{title}</h2><p>{text}</p></article>)}</section>
          <div className="archive-tools"><button className="button secondary" onClick={exportArchive}><ArrowDownToLine size={17} />Скачать архив</button><button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={17} />Импортировать архив</button></div>
        </> : <>
          <div className="page-heading"><div><div className="eyebrow">ВАШИ ИСТОРИИ ПО ТУ СТОРОНУ ТУМАНА</div><h1>{view === 'journal' ? 'Дневник отыгрыша' : 'Мои персонажи'}<span className="heading-dot">.</span></h1><p>{view === 'journal' ? 'Место для сцен, открытий и мыслей между приключениями.' : 'Немного магии. Много характера. Вся история — здесь.'}</p></div><button className="button primary" onClick={() => active && view === 'journal' ? focusComposer() : setModal('create')}><Plus size={18} />{active && view === 'journal' ? 'Добавить запись' : 'Новый персонаж'}</button></div>
          {!active ? <>
            <section className="empty-state card"><Seal className="empty-seal" /><div className="eyebrow">ЧИСТАЯ СТРАНИЦА. ВАША ИСТОРИЯ.</div><h2>У каждой тайны есть лицо.<br />Подарите своей имя.</h2><p>Создайте персонажа, добавьте любимый портрет<br />и начните записывать его путь.</p><button className="button primary" onClick={() => setModal('create')}><Plus size={18} />Создать персонажа</button><button className="text-button import-empty" onClick={() => importRef.current?.click()}><Upload size={16} />У меня уже есть архив</button></section>
            <div className="feature-grid"><div><ImagePlus size={25} strokeWidth={1.4} /><h3>У истории есть лицо</h3><p>Портрет и характер<br />в одной анкете.</p></div><div><FlaskConical size={25} strokeWidth={1.4} /><h3>Шаг за шагом</h3><p>Наглядное усвоение зелья<br />и новые последовательности.</p></div><div><Feather size={25} strokeWidth={1.4} /><h3>Пространство для мыслей</h3><p>Удобный дневник,<br />который всегда под рукой.</p></div></div>
          </> : <>
            <div className="archive-toolbar"><div className="character-tabs" aria-label="Выбор персонажа">{filtered.map(c => <button key={c.id} onClick={() => { setActiveId(c.id); setJournalQuery(''); }} className={active.id === c.id ? 'current' : ''}>{c.name}<span>{c.sequence}</span></button>)}{!filtered.length && <span className="no-results">Персонажи не найдены</span>}</div><label className="search"><Search size={17} /><input aria-label="Найти персонажа" placeholder="Найти персонажа…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
            {view === 'journal' ? <div className="journal-layout"><EntryComposer key={`journal-${active.id}`} character={active} onSave={saveJournalEntry} onConfigureRules={() => setModal('digestion-rules')} insertNote={insertNote} onNoteConsumed={() => setInsertNote(null)} /><section className="card journal-card"><div className="section-heading"><div><div className="eyebrow">ЛИЧНАЯ ХРОНИКА</div><h2>{active.name}</h2></div><span className="muted">Записей: {active.entries.length}</span></div><label className="journal-search"><Search size={18} /><input aria-label="Поиск записей" placeholder="Найти событие или мысль…" value={journalQuery} onChange={e => setJournalQuery(e.target.value)} /></label>{journalQuery && !journalEntries.length ? <p className="no-results search-empty">По этому запросу записей нет.</p> : <Entries entries={journalEntries} onEdit={editEntry} />}</section></div> : <>
              <section className="character-hero">
                <div className="hero-background"><Seal /></div>
                {preferences.showPortrait && <button className={`character-portrait ${active.portrait ? 'has-portrait' : ''}`} onClick={() => setModal('portrait')} aria-label={active.portrait ? 'Изменить портрет персонажа' : 'Добавить портрет персонажа'}>{active.portrait ? <img src={active.portrait} alt={`Портрет ${active.name}`} /> : <div className="portrait-placeholder"><ImagePlus size={35} strokeWidth={1.2} /><span>Место для<br />вашего персонажа</span></div>}<span className="portrait-caption"><ImagePlus size={14} />{active.portrait ? 'Сменить портрет' : 'Добавить портрет'}</span></button>}
                <div className="hero-content"><div className="hero-label"><span />ДОСЬЕ ПОТУСТОРОННЕГО</div><h2>{active.name}</h2><p>{active.epithet || 'У каждой истории есть свои тайны'}</p><div className="hero-tags"><span><Compass size={15} />Путь «{active.pathway}»</span><span>Последовательность {active.sequence}</span>{active.origin && <span><MapPin size={15} />{active.origin}</span>}</div><button className="button hero-write" onClick={focusComposer}><Feather size={17} />Записать событие</button></div>
                <button className="button hero-edit" onClick={() => setModal('edit')}><Pencil size={16} /><span>Редактировать</span></button>
              </section>
              <div className="dashboard-grid"><div className="main-column">
                <EntryComposer key={active.id} character={active} onSave={saveJournalEntry} onConfigureRules={() => setModal('digestion-rules')} insertNote={insertNote} onNoteConsumed={() => setInsertNote(null)} />
                <section className="card activity-card"><div className="section-heading"><h2><History size={21} />Последние события</h2><button className="text-button" onClick={() => setView('journal')}>Весь дневник<ArrowRight size={16} /></button></div><Entries entries={active.entries} limit={3} onEdit={editEntry} /></section>
              </div><div className="right-column">
                <PotionCard character={active} onAdvance={() => setModal('advance')} onConfigure={() => setModal('digestion-rules')} />
                {preferences.showBiography && <section className="card profile-card"><div className="section-heading"><h2>Ближе к персонажу</h2><button className="icon-button" aria-label="Редактировать сведения о персонаже" onClick={() => setModal('edit')}><Pencil size={17} /></button></div><dl><div><dt>Возраст</dt><dd>{active.age || 'Пока тайна'}</dd></div><div><dt>Род занятий</dt><dd>{active.occupation || 'Пока тайна'}</dd></div><div><dt>Родом из</dt><dd>{active.origin || 'Пока тайна'}</dd></div></dl>{active.bio ? <div className="bio">{active.bio}</div> : <button className="profile-add" onClick={() => setModal('edit')}><Plus size={15} />Рассказать историю персонажа</button>}</section>}
                {preferences.showPrinciples && <section className="principles-card"><div className="section-heading"><h2><Sparkles size={19} />Принципы отыгрыша</h2></div>{active.principles.trim() ? <ul>{active.principles.split('\n').map(p => p.trim()).filter(Boolean).map((p, index) => <li key={index}>{p}</li>)}</ul> : <><p>Не просто используйте способности — поймите того, кем стали.</p><button className="text-button" onClick={() => setModal('edit')}>Добавить свои принципы<Plus size={15} /></button></>}<div className="principle-reminder">Помните: вы лишь играете роль.</div></section>}
              </div></div>
              <div className="archive-actions"><button className="text-button" onClick={exportArchive}><ArrowDownToLine size={16} />Скачать архив</button><button className="text-button" onClick={() => importRef.current?.click()}><Upload size={16} />Импортировать</button><button className="text-button danger" onClick={() => setModal('delete')}><Trash2 size={16} />Удалить персонажа</button></div>
            </>}
          </>}
        </>}
        <footer className="page-footer"><span>ANT · LOTM</span><span>Маленький архив больших историй</span><span>✧</span></footer>
      </main>
    </div>
    <input ref={importRef} type="file" accept="application/json,.json" hidden aria-label="Импорт архива" onChange={e => { void importArchive(e.target.files?.[0]); e.target.value = ''; }} />
    {notice && <div className="toast" role="status"><Check size={18} /><span>{notice}</span><button aria-label="Закрыть уведомление" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {modal === 'preferences' && <Dialog title="Настроить под себя" subtitle="Ваш архив, ваши цвета, ваш темп." onClose={() => setModal(null)}>{preferencesError && <p className="field-error" role="alert">{preferencesError}</p>}<PreferencesPanel value={preferences} onChange={updatePreferences} onClose={() => setModal(null)} /></Dialog>}
    {modal === 'digestion-rules' && active && <Dialog title="Как усваивается зелье" subtitle={`Правила для ${active.name} · ${active.potion}`} onClose={() => setModal(null)}><DigestionRulesForm character={active} onSave={c => saveCharacter(c, 'Правила усвоения сохранены')} onClose={() => setModal(null)} /></Dialog>}
    {modal === 'dice' && <Dialog title="Доверьтесь случаю" subtitle="Кубики для ваших сцен и приключений." onClose={() => setModal(null)}>{diceError && <p className="field-error" role="alert">{diceError}</p>}<DicePanel value={dice} onChange={updateDice} onInsert={insertRoll} characterName={active?.name} /></Dialog>}
    {(modal === 'create' || modal === 'edit') && <Dialog title={modal === 'create' ? 'Новая история' : 'Анкета персонажа'} subtitle={modal === 'create' ? 'Начните с имени. Остальное можно дописать позже.' : 'Детали, из которых складывается ваша история.'} onClose={() => setModal(null)}><CharacterForm initial={modal === 'edit' ? active : undefined} onSave={c => saveCharacter(c)} onClose={() => setModal(null)} /></Dialog>}
    {modal === 'portrait' && active && <Dialog title="Лицо вашей истории" subtitle={`Портрет персонажа · ${active.name}`} onClose={() => setModal(null)}><PortraitForm character={active} onSave={c => saveCharacter(c, 'Портрет сохранён')} onClose={() => setModal(null)} /></Dialog>}
    {modal === 'edit-entry' && active && editingEntry && <Dialog title="Исправить запись" subtitle={`Дневник · ${active.name}`} onClose={() => setModal(null)}><EditEntryForm character={active} entry={editingEntry} onSave={c => saveCharacter(c, 'Запись обновлена')} onClose={() => setModal(null)} /></Dialog>}
    {modal === 'advance' && active && <Dialog title="Следующая ступень" subtitle={`Последовательность ${active.sequence} → ${active.sequence - 1}`} onClose={() => setModal(null)}><form onSubmit={e => { e.preventDefault(); const potion = String(new FormData(e.currentTarget).get('potion') ?? '').trim(); if (potion) saveCharacter(advanceCharacter(active, potion), 'Начался новый этап вашего пути'); }}><p className="advance-copy">Зелье «{active.potion}» полностью усвоено. Убедитесь, что ваш персонаж выполнил необходимые условия и ритуал продвижения.</p><label>Следующее зелье<input autoFocus name="potion" placeholder="Название нового зелья" maxLength={80} required pattern=".*\S.*" /></label><p className="form-hint">Усвоение нового зелья начнётся с 0%. Все записи останутся в дневнике.</p><div className="form-footer"><button type="button" className="button secondary" onClick={() => setModal(null)}><ArrowLeft size={16} />Назад</button><button className="button primary" type="submit">Продвинуться<ArrowRight size={16} /></button></div></form></Dialog>}
    {modal === 'delete' && active && <Dialog title="Закрыть эту историю?" subtitle="Удаление персонажа" onClose={() => setModal(null)}><p className="advance-copy">Анкета «{active.name}», её портрет и записи будут удалены из этого браузера. Перед удалением можно скачать архив.</p><button className="text-button" onClick={exportArchive}><ArrowDownToLine size={17} />Сначала скачать архив</button><div className="form-footer"><button className="button secondary" onClick={() => setModal(null)}>Оставить персонажа</button><button className="button danger-button" onClick={() => { const remaining = characters.filter(c => c.id !== active.id); persist(remaining); try { localStorage.removeItem(`ant-lotm.draft.v1.${active.id}`); } catch { /* Archive warning is shown by persist. */ } setActiveId(remaining[0]?.id ?? ''); setModal(null); setNotice('Персонаж удалён'); }}><Trash2 size={16} />Удалить</button></div></Dialog>}
  </div>;
}

export default App;
