import data from '../../content/products.json';
import type { Lang, Localized } from './i18n';
import { pick } from './i18n';

export type Spec = { label: Localized; value: Localized };
export type Category = 'basin' | 'shower' | 'kitchen' | 'accessories';
export type Product = {
  slug: string;
  /** Catalogue code, e.g. "B01-35". Some catalogue items have none yet. */
  code: string | null;
  category: Category;
  status: 'available' | 'soon';
  featured: boolean;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  specs: Spec[];
  finishes: string[];
  images: string[];
  datasheet: { ar: string; en: string };
};

export const categories = data.categories as Category[];
export const products = data.items as Product[];
export const featured = products.filter((p) => p.featured);
export const available = products.filter((p) => p.status === 'available');

const MIXERS = new Set(['basin', 'shower', 'kitchen']);

/** Product specs, with the shared mixer specs appended for mixer categories. */
export function specsFor(p: Product, lang: Lang) {
  const all: Spec[] = [...p.specs, ...(MIXERS.has(p.category) ? (data.defaults.mixerSpecs as Spec[]) : [])];
  return all.map((s) => ({ label: pick(s.label, lang)!, value: pick(s.value, lang)! }));
}

/** "Name (CODE)" or just the name when the item has no code yet. */
export const labelOf = (p: Product, lang: Lang) => (p.code ? `${pick(p.name, lang)} (${p.code})` : pick(p.name, lang)!);

export const bySlug = (slug: string) => products.find((p) => p.slug === slug);
