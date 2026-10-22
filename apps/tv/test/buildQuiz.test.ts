import {buildQuiz} from '../src/quiz/buildQuiz';
import type {Cue, LexEntry, SavedWord} from '../src/app/types';

const POS = ['noun', 'noun', 'noun', 'noun', 'verb', 'verb', 'adj', 'adj'];
const cues: Cue[] = POS.map((pos, i) => ({
  id: `c${i}`, start: i, end: i + 1, text: `Say word${i} now.`,
  spans: [{id: `c${i}-s1`, start: 4, end: 9 + String(i).length - 1, surface: `word${i}`, lemma: `w${i}`, pos, level: 'B2', kind: 'word'}],
}));
const lexicon: Record<string, LexEntry> = Object.fromEntries(
  cues.map((c, i) => [c.spans[0].id, {spanId: c.spans[0].id, meaning: `meaning ${i}`, example: 'e', tr: {}, confidence: 1, audio: `a${i}`}]),
);
const saved = (i: number): SavedWord => ({
  spanId: `c${i}-s1`, filmId: 'f', surface: `word${i}`, lemma: `w${i}`, meaning: `meaning ${i}`, tr: {}, cueText: cues[i].text, savedAt: 1, box: 1,
});

describe('buildQuiz', () => {
  const run = (sv: SavedWord[], viewed: string[], seed = 1, canListen?: (e: LexEntry) => boolean) =>
    buildQuiz(sv, viewed, cues, lexicon, seed, 5, canListen);

  it('is deterministic for a seed and differs across seeds', () => {
    const s = [saved(0), saved(1), saved(2), saved(3), saved(4)];
    expect(run(s, [], 3)).toEqual(run(s, [], 3));
    expect(run(s, [], 3)).not.toEqual(run(s, [], 4));
  });

  it('asks 5 questions with 4 unique options that contain the answer once', () => {
    const qs = run([saved(0), saved(1), saved(2), saved(3), saved(4)], []);
    expect(qs).toHaveLength(5);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      const right = q.type === 'meaning' ? q.meaning : q.surface;
      expect(q.options[q.answer]).toBe(right);
      expect(q.options.filter(o => o === right)).toHaveLength(1);
    }
  });

  it('prefers distractors with the same POS, then any POS', () => {
    for (const seed of [1, 2, 3, 4]) {
      for (const q of run([saved(4), saved(5), saved(0)], [], seed).filter(x => x.type !== 'meaning' && x.spanId !== 'c0-s1')) {
        const other = q.spanId === 'c4-s1' ? 'word5' : 'word4'; // the only other verb
        expect(q.options).toContain(other);
        expect(q.options).toHaveLength(4); // the rest come from other POS
      }
      for (const q of run([saved(0), saved(1), saved(2)], [], seed).filter(x => x.type !== 'meaning')) {
        expect(q.options.every(o => /^word[0-3]$/.test(o))).toBe(true); // 3 other nouns exist
      }
    }
  });

  it('blanks the surface in cloze and keeps the cue text for meaning', () => {
    const qs = run([saved(0), saved(1), saved(2)], []);
    const cloze = qs.find(q => q.type === 'cloze')!;
    expect(cloze.context).toContain('_____');
    expect(cloze.context).not.toContain(cloze.surface);
    expect(qs.find(q => q.type === 'meaning')!.context).toContain(qs.find(q => q.type === 'meaning')!.surface);
  });

  it('asks listen questions only when audio is available', () => {
    const s = [saved(0), saved(1), saved(2)];
    expect(run(s, []).some(q => q.type === 'listen')).toBe(false);
    expect(run(s, [], 1, () => true).some(q => q.type === 'listen')).toBe(true);
    expect(run(s, [], 1, e => e.spanId === 'c0-s1').filter(q => q.type === 'listen').every(q => q.spanId === 'c0-s1')).toBe(true);
  });

  it('pads with viewed words, then the lexicon, when fewer than 3 are saved', () => {
    const fromViewed = run([saved(0)], ['c5-s1', 'c6-s1']);
    expect(new Set(fromViewed.map(q => q.spanId))).toEqual(new Set(['c0-s1', 'c5-s1', 'c6-s1']));
    expect(new Set(run([saved(0)], ['c5-s1']).map(q => q.spanId)).size).toBe(3);
    expect(new Set(run([], []).map(q => q.spanId)).size).toBe(3);
    expect(run([], [])).toHaveLength(5);
  });

  it('does not pad when 3 or more are saved', () => {
    const ids = new Set(run([saved(0), saved(1), saved(2)], ['c5-s1']).map(q => q.spanId));
    expect(ids).toEqual(new Set(['c0-s1', 'c1-s1', 'c2-s1']));
  });

  it('asks a repeated word a different way', () => {
    const qs = run([saved(0), saved(1), saved(2)], []);
    expect(qs[3].spanId).toBe(qs[0].spanId);
    expect(qs[3].type).not.toBe(qs[0].type);
  });
});
