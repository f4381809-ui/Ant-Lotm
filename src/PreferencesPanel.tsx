import { Check, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { ACCENTS, DEFAULT_PREFERENCES } from './preferences';
import type { Preferences } from './preferences';

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="setting-toggle"><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span className="toggle-track" aria-hidden="true" /></label>;
}

export default function PreferencesPanel({ value: p, onChange, onClose }: {
  value: Preferences; onChange: (p: Preferences) => void; onClose: () => void;
}) {
  const patch = (part: Partial<Preferences>) => onChange({ ...p, ...part });
  return <div className="preferences-panel">
    <section className="settings-section"><h3>Цвет и настроение</h3>
      <div className="theme-picker" role="group" aria-label="Тема оформления">{[
        ['light', 'Светлая', <Sun size={21} />], ['dark', 'Ночная', <Moon size={21} />], ['system', 'Как в системе', <Monitor size={21} />],
      ].map(([key, label, icon]) => <button type="button" key={String(key)} aria-pressed={p.theme === key} className={p.theme === key ? 'selected' : ''} onClick={() => patch({ theme: key as Preferences['theme'] })}>{icon}<span>{label}</span>{p.theme === key && <Check size={14} className="option-check" />}</button>)}</div>
      <div className="accent-setting"><span>Акцентный цвет</span><div className="accent-picker">{ACCENTS.map(a => <button key={a.color} type="button" aria-label={`Цвет: ${a.name}`} aria-pressed={p.accent.toLowerCase() === a.color} style={{ backgroundColor: a.color }} onClick={() => patch({ accent: a.color })}>{p.accent.toLowerCase() === a.color && <Check size={17} />}</button>)}<label className="custom-color"><input type="color" aria-label="Свой акцентный цвет" value={p.accent} onChange={e => patch({ accent: e.target.value })} /><span>Свой</span></label></div></div>
    </section>
    <section className="settings-section"><h3>Чтобы было удобно читать и писать</h3><div className="form-grid">
      <label>Размер текста<select aria-label="Размер текста" value={p.textSize} onChange={e => patch({ textSize: e.target.value as Preferences['textSize'] })}><option value="normal">Обычный</option><option value="large">Крупнее</option><option value="extra">Самый крупный</option></select></label>
      <label>Шрифт записей<select aria-label="Шрифт записей" value={p.journalFont} onChange={e => patch({ journalFont: e.target.value as Preferences['journalFont'] })}><option value="sans">Простой и чёткий</option><option value="book">Как в книге</option></select></label>
      <label>Плотность<select aria-label="Плотность интерфейса" value={p.density} onChange={e => patch({ density: e.target.value as Preferences['density'] })}><option value="comfortable">Больше воздуха</option><option value="compact">Компактнее</option></select></label>
      <label>Ширина страницы<select aria-label="Ширина страницы" value={p.width} onChange={e => patch({ width: e.target.value as Preferences['width'] })}><option value="standard">Обычная</option><option value="wide">На весь экран</option></select></label>
      <label className="span-2">Высота поля для записи <strong>{p.editorHeight} px</strong><input type="range" aria-label="Высота поля для записи" min={180} max={420} step={20} value={p.editorHeight} onChange={e => patch({ editorHeight: Number(e.target.value) })} /></label>
    </div></section>
    <section className="settings-section"><h3>Ваше пространство</h3><label>Название архива<input aria-label="Название архива" value={p.archiveName} maxLength={48} onChange={e => patch({ archiveName: e.target.value })} placeholder="Личный архив" /></label>
      <Toggle label="Режим письма" hint="Скрыть боковое меню и карточки; оставить дневник. Кнопка выхода всегда сверху." checked={p.focusMode} onChange={focusMode => patch({ focusMode })} />
      <Toggle label="Показывать портрет" checked={p.showPortrait} onChange={showPortrait => patch({ showPortrait })} />
      <Toggle label="Показывать биографию" checked={p.showBiography} onChange={showBiography => patch({ showBiography })} />
      <Toggle label="Показывать принципы отыгрыша" checked={p.showPrinciples} onChange={showPrinciples => patch({ showPrinciples })} />
      <Toggle label="Меньше анимации" hint="Без вращения кубика и плавных переходов." checked={p.reduceMotion} onChange={reduceMotion => patch({ reduceMotion })} />
    </section>
    <p className="form-hint">Изменения видны сразу. Настройки сохраняются на устройстве и входят в общий JSON-архив.</p>
    <div className="form-footer settings-footer"><button type="button" className="text-button" onClick={() => onChange({ ...DEFAULT_PREFERENCES })}><RotateCcw size={16} />Сбросить оформление</button><button type="button" className="button primary" onClick={onClose}><Check size={17} />Готово</button></div>
  </div>;
}
