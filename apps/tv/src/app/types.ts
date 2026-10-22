// Hand-written mirror of shared/schemas/*.schema.json (no generator is installed; Rules.md allows no new dependency).
export type Level = 'B1' | 'B2' | 'C1' | 'C2';
export type SpanKind = 'word' | 'phrasal' | 'idiom';

export interface Span {
  id: string;
  start: number; // character offsets into Cue.text, end exclusive
  end: number;
  surface: string;
  lemma: string;
  pos: string;
  level: Level;
  kind: SpanKind;
}

export interface Cue {
  id: string;
  start: number; // seconds
  end: number;
  text: string;
  spans: Span[];
}

export interface Film {
  id: string;
  title: string;
  year: number;
  license: string;
  attribution: string;
  videoUrl: string;
  posterAsset: string;
  cuesAsset: string;
  lexiconAsset: string;
  durationSec: number;
}

export type Screen = 'home' | 'player' | 'review' | 'credits';
export type Mode = 'watch' | 'learn';

export type Lang = 'hi' | 'es';
export type LookupMode = 'define' | 'explain_more';

export interface LexEntry {
  spanId: string;
  meaning: string;
  example: string;
  tr: Partial<Record<Lang, string>>;
  audio?: string;
  confidence: number;
}

export interface SavedWord {
  spanId: string;
  filmId: string;
  surface: string;
  lemma: string;
  meaning: string;
  tr: Partial<Record<Lang, string>>;
  cueText: string;
  savedAt: number; // epoch ms
  box: 1 | 2 | 3;
}
