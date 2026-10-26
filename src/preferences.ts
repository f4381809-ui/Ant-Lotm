export const PREFERENCES_KEY = 'ant-lotm.preferences.v1';

export type Preferences = {
  theme: 'light' | 'dark' | 'system';
  accent: string;
  textSize: 'normal' | 'large' | 'extra';
  journalFont: 'sans' | 'book';
  density: 'comfortable' | 'compact';
  width: 'standard' | 'wide';
  archiveName: string;
  editorHeight: number;
  focusMode: boolean;
  showPortrait: boolean;
  showBiography: boolean;
  showPrinciples: boolean;
  reduceMotion: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light', accent: '#355542', textSize: 'normal', journalFont: 'sans',
  density: 'comfortable', width: 'standard', archiveName: 'Личный архив', editorHeight: 220,
  focusMode: false, showPortrait: true, showBiography: true, showPrinciples: true, reduceMotion: false,
};

export const ACCENTS = [
  { color: '#355542', name: 'Лес' }, { color: '#67508b', name: 'Аметист' },
  { color: '#3c607e', name: 'Сумерки' }, { color: '#884951', name: 'Бордо' },
  { color: '#87652d', name: 'Латунь' },
];

export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false;
  const p = value as Preferences;
  return ['light', 'dark', 'system'].includes(p.theme)
    && typeof p.accent === 'string' && /^#[0-9a-f]{6}$/i.test(p.accent)
    && ['normal', 'large', 'extra'].includes(p.textSize)
    && ['sans', 'book'].includes(p.journalFont)
    && ['comfortable', 'compact'].includes(p.density)
    && ['standard', 'wide'].includes(p.width)
    && typeof p.archiveName === 'string' && p.archiveName.length <= 48
    && Number.isInteger(p.editorHeight) && p.editorHeight >= 180 && p.editorHeight <= 420
    && ['focusMode', 'showPortrait', 'showBiography', 'showPrinciples', 'reduceMotion']
      .every(key => typeof (p as unknown as Record<string, unknown>)[key] === 'boolean');
}

/** Black or white text, whichever has higher WCAG contrast with the chosen accent. */
export function accentForeground(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
}
