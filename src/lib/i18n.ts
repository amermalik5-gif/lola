import ar from '../../content/ar.json';
import en from '../../content/en.json';

export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export type Dict = typeof ar;
export type Localized<T = string> = T | { ar: T; en: T };

const dicts: Record<Lang, Dict> = { ar, en: en as Dict };

export const t = (lang: Lang): Dict => dicts[lang];
export const dir = (lang: Lang) => (lang === 'ar' ? 'rtl' : 'ltr');
export const other = (lang: Lang): Lang => (lang === 'ar' ? 'en' : 'ar');

/** Arabic is the default at `/`, English lives under `/en/`. */
export function url(lang: Lang, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const base = lang === 'ar' ? '/' : '/en/';
  return clean ? `${base}${clean}/` : base;
}

/** Pick the right language from a value that is either plain or `{ ar, en }`. */
export function pick<T>(value: Localized<T> | null | undefined, lang: Lang): T | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object' && 'ar' in (value as object) && 'en' in (value as object)) {
    return (value as { ar: T; en: T })[lang];
  }
  return value as T;
}

/** getStaticPaths helper for the optional `[...locale]` segment. */
export const localeParams = () =>
  LANGS.map((lang) => ({ params: { locale: lang === 'ar' ? undefined : lang }, props: { lang } }));
