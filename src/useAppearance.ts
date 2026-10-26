import { useLayoutEffect } from 'react';
import { accentForeground } from './preferences';
import type { Preferences } from './preferences';

export function readLocalSetting<T>(key: string, validate: (value: unknown) => value is T, fallback: T, label: string): { value: T; error: string } {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { value: fallback, error: '' };
    const value: unknown = JSON.parse(raw);
    if (validate(value)) return { value, error: '' };
    return { value: fallback, error: `Не удалось прочитать ${label}. Исходные данные на устройстве не изменены.` };
  } catch { return { value: fallback, error: `Не удалось прочитать ${label}. Проверьте доступ к хранилищу браузера.` }; }
}

export default function useAppearance(p: Preferences) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const dark = p.theme === 'dark' || (p.theme === 'system' && media.matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      root.style.colorScheme = dark ? 'dark' : 'light';
      root.style.setProperty('--accent-ink', dark ? `color-mix(in srgb, ${p.accent} 30%, #e8efdc 70%)`
        : accentForeground(p.accent) === '#000000' ? `color-mix(in srgb, ${p.accent} 35%, #17271b 65%)` : p.accent);
    };
    applyTheme();
    root.dataset.density = p.density;
    root.dataset.width = p.width;
    root.dataset.focus = String(p.focusMode);
    root.dataset.motion = p.reduceMotion ? 'reduce' : 'full';
    root.style.setProperty('--accent', p.accent);
    root.style.setProperty('--on-accent', accentForeground(p.accent));
    root.style.setProperty('--text-scale', String({ normal: 1, large: 1.12, extra: 1.24 }[p.textSize]));
    root.style.setProperty('--editor-height', `${p.editorHeight}px`);
    root.style.setProperty('--journal-font', p.journalFont === 'book' ? "Georgia, 'Times New Roman', serif" : 'Arial, Helvetica, sans-serif');
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [p]);
}
