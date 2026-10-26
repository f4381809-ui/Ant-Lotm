import { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { MAX_PORTRAIT_LENGTH } from './model';

async function preparePortrait(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Выберите изображение JPG, PNG или WebP.');
  }
  if (file.size > 12 * 1024 * 1024) throw new Error('Изображение слишком большое. Максимум — 12 МБ.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error('Не удалось прочитать картинку. Выберите другой JPG, PNG или WebP.'); }
    const scale = Math.min(1, 600 / image.naturalWidth, 800 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Браузер не смог подготовить изображение.');
    ctx.fillStyle = '#f3ede4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.72, 0.55]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= MAX_PORTRAIT_LENGTH) return result;
    }
    throw new Error('Не удалось уменьшить портрет. Попробуйте другое изображение.');
  } finally { URL.revokeObjectURL(url); }
}

export default function PortraitInput({ value, onChange, onBusyChange }: {
  value: string; onChange: (value: string) => void; onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { request.current += 1; }, []);

  async function select(file?: File) {
    if (!file) return;
    const current = ++request.current;
    setBusy(true); onBusyChange(true); setError('');
    try {
      const portrait = await preparePortrait(file);
      if (request.current === current) onChange(portrait);
    } catch (cause) {
      if (request.current === current) setError(cause instanceof Error ? cause.message : 'Не удалось открыть изображение.');
    } finally {
      if (request.current === current) { setBusy(false); onBusyChange(false); }
    }
  }

  return <div className="portrait-editor">
    <button type="button" className="portrait-preview" disabled={busy} onClick={() => inputRef.current?.click()} aria-label="Выбрать портрет персонажа">
      {value ? <img src={value} alt="Предпросмотр портрета" /> : <><ImagePlus size={28} strokeWidth={1.4} /><span>Ваш персонаж</span></>}
    </button>
    <div className="portrait-controls"><strong>Портрет персонажа</strong><p>Добавьте рисунок или фотографию.<br />Картинка останется в вашей анкете.</p>
      <div className="portrait-buttons"><button type="button" className="button secondary" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />}{busy ? 'Подготовка…' : value ? 'Заменить картинку' : 'Загрузить картинку'}</button>
        {value && <button type="button" className="icon-button danger" disabled={busy} aria-label="Удалить портрет" onClick={() => { onChange(''); setError(''); }}><Trash2 size={18} /></button>}</div>
      <small>JPG, PNG или WebP · до 12 МБ</small>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
    <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label="Файл портрета" onChange={e => { void select(e.target.files?.[0]); e.target.value = ''; }} />
  </div>;
}
