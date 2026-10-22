import {findActiveCue, learnStartIndex, nextSpanCue} from '../src/player/cueIndex';
import type {Cue} from '../src/app/types';

const c = (id: string, start: number, end: number): Cue => ({id, start, end, text: id, spans: []});
const cues = [c('c001', 1, 2), c('c002', 2, 3), c('c003', 5, 6), c('c004', 10, 12)];

describe('findActiveCue', () => {
  it('returns null for no cues', () => expect(findActiveCue([], 1)).toBeNull());
  it('returns null before the first cue', () => expect(findActiveCue(cues, 0.99)).toBeNull());
  it('start is inclusive', () => expect(findActiveCue(cues, 1)?.id).toBe('c001'));
  it('end is exclusive; adjacent cue takes over', () => expect(findActiveCue(cues, 2)?.id).toBe('c002'));
  it('returns null in a gap', () => {
    expect(findActiveCue(cues, 3)).toBeNull();
    expect(findActiveCue(cues, 4.5)).toBeNull();
  });
  it('finds a middle and the last cue', () => {
    expect(findActiveCue(cues, 5.5)?.id).toBe('c003');
    expect(findActiveCue(cues, 11.9)?.id).toBe('c004');
  });
  it('returns null after the last cue', () => expect(findActiveCue(cues, 12)).toBeNull());
  it('works with a single cue', () => {
    expect(findActiveCue([cues[0]], 1.5)?.id).toBe('c001');
    expect(findActiveCue([cues[0]], 2.5)).toBeNull();
  });
});

describe('span cue navigation', () => {
  const sp = {id: 's', start: 0, end: 1, surface: 'x', lemma: 'x', pos: 'noun', level: 'B1', kind: 'word'} as const;
  const withSpans = (i: number) => ({...cues[i], spans: [sp]});
  const mixed = [withSpans(0), cues[1], cues[2], withSpans(3)];

  it('skips cues without spans in both directions', () => {
    expect(nextSpanCue(mixed, 1, 1)).toBe(3);
    expect(nextSpanCue(mixed, 2, -1)).toBe(0);
    expect(nextSpanCue(mixed, 4, 1)).toBe(-1);
    expect(nextSpanCue(mixed, -1, -1)).toBe(-1);
  });

  it('starts learn mode on the active cue, or the nearest one with spans', () => {
    expect(learnStartIndex(mixed, 1.5)).toBe(0);
    expect(learnStartIndex(mixed, 5.5)).toBe(3); // active cue has none: next one forward
    expect(learnStartIndex(mixed, 99)).toBe(3); // past the end: last cue
    expect(learnStartIndex([cues[1]], 2.5)).toBe(-1);
  });
});
