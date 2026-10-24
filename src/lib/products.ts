import data from '../../content/products.json';
import type { Lang, Localized } from './i18n';
import { pick } from './i18n';

export type Spec = { label: Localized; value: Localized };
export type Product = (typeof data.items)[number] & { specs: Spec[] };
export type Category = 'basin' | 'shower' | 'kitchen' | 'accessories';

export const categories = data.categories as Category[];
export const products = data.items as Product[];
export const featured = products.filter((p) => p.featured);

const MIXERS = new Set(['basin', 'shower', 'kitchen']);

/** Product specs, with the shared mixer specs appended for mixer categories. */
export function specsFor(p: Product, lang: Lang) {
  const all: Spec[] = [...p.specs, ...(MIXERS.has(p.category) ? (data.defaults.mixerSpecs as Spec[]) : [])];
  return all.map((s) => ({ label: pick(s.label, lang)!, value: pick(s.value, lang)! }));
}

export const bySlug = (slug: string) => products.find((p) => p.slug === slug);
