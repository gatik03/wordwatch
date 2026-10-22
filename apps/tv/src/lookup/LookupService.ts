import {FILM, LEXICON} from '../app/config';
import type {Cue, Lang, LookupMode, Span} from '../app/types';
import * as api from './api';

export const NEEDS_NETWORK = 'Needs a network connection';

// What the card shows under the word. `gloss` is the translation in the card's language.
export interface Card {
  meaning: string;
  example: string;
  gloss?: string;
  usage?: string;
}

const cache = new Map<string, Card>(); // in memory, per session
export const clearCache = () => cache.clear();

// Instant, offline: the bundled entry in `lang` (the gloss is missing when the bundle has no such language).
export function bundled(spanId: string, lang: Lang): Card | null {
  const e = LEXICON[spanId];
  return e ? {meaning: e.meaning, example: e.example, gloss: e.tr[lang]} : null;
}

// The live path (Explain more, Spanish). Resolves a Card or rejects with NEEDS_NETWORK; never needed for the base card.
export async function live(cue: Cue, span: Span, mode: LookupMode, lang: Lang, prev?: Cue, next?: Cue): Promise<Card> {
  const key = `${span.id}|${mode}|${lang}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  try {
    const r = await api.lookup({
      surface: span.surface,
      sentence: cue.text.slice(0, 300),
      targetLang: lang,
      mode,
      filmId: FILM.id,
      lemma: span.lemma,
      prevLine: prev?.text.slice(0, 300),
      nextLine: next?.text.slice(0, 300),
    });
    const card = {meaning: r.meaning, example: r.example, gloss: r.tr[lang] ?? bundled(span.id, lang)?.gloss, usage: r.usage};
    cache.set(key, card);
    return card;
  } catch {
    // Spanish define falls back to the bundled gloss when the bundle has one (the fixture does)
    const fallback = mode === 'define' ? bundled(span.id, lang) : null;
    if (fallback?.gloss) {
      return fallback;
    }
    throw new Error(NEEDS_NETWORK);
  }
}
