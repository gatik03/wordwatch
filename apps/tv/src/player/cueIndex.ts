import type {Cue} from '../app/types';

// Cue active at time t (seconds), or null in a gap. cues must be sorted by start and not overlap. start inclusive, end exclusive.
export function findActiveCue(cues: Cue[], t: number): Cue | null {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1; // last cue with start <= t
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 && t < cues[found].end ? cues[found] : null;
}

// Index of the first cue with spans, starting at `from` and stepping by dir (+1 or -1); -1 if none.
export function nextSpanCue(cues: Cue[], from: number, dir: 1 | -1): number {
  for (let i = from; i >= 0 && i < cues.length; i += dir) {
    if (cues[i].spans.length > 0) {
      return i;
    }
  }
  return -1;
}

// Cue to show when learn mode opens at time t: the active cue, or the nearest one with spans after, then before, t.
export function learnStartIndex(cues: Cue[], t: number): number {
  let i = cues.findIndex(c => t < c.end); // first cue not yet finished (cues are sorted)
  i = i < 0 ? cues.length - 1 : i;
  const j = nextSpanCue(cues, i, 1);
  return j >= 0 ? j : nextSpanCue(cues, i, -1);
}
