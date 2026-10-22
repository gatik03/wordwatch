import type {Cue, LexEntry, SavedWord} from '../app/types';

export type QuestionType = 'meaning' | 'cloze' | 'listen';

export interface Question {
  type: QuestionType;
  spanId: string;
  surface: string;
  meaning: string; // shown as feedback after answering
  prompt: string;
  context?: string; // cue text; for cloze the surface is blanked
  options: string[];
  answer: number; // index into options
}

interface Word {
  spanId: string;
  surface: string;
  meaning: string;
  cueText: string;
  pos?: string;
}

const TYPES: QuestionType[] = ['meaning', 'cloze', 'listen'];

// mulberry32: small seeded PRNG so a seed gives the same quiz every time (tests, repeatable demo).
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const blank = (text: string, surface: string) => {
  const i = text.toLowerCase().indexOf(surface.toLowerCase());
  return i < 0 ? text : `${text.slice(0, i)}_____${text.slice(i + surface.length)}`;
};

/**
 * n questions (default 5) from the saved words. With fewer than 3 saved, pads with viewed words, then lexicon words,
 * so the quiz always runs. Words repeat with a different question type when there are fewer than n. `canListen` says
 * whether a lexicon entry has playable audio; listen questions fall back to meaning when it does not.
 */
export function buildQuiz(
  saved: SavedWord[],
  viewed: string[],
  cues: Cue[],
  lexicon: Record<string, LexEntry>,
  seed: number,
  n = 5,
  canListen: (e: LexEntry) => boolean = () => false,
): Question[] {
  const rand = rng(seed);
  const spans = new Map(cues.flatMap(c => c.spans.map(s => [s.id, {span: s, cue: c}] as const)));
  const fromLexicon = (id: string): Word | null => {
    const e = lexicon[id];
    const x = spans.get(id);
    return e && x ? {spanId: id, surface: x.span.surface, meaning: e.meaning, cueText: x.cue.text, pos: x.span.pos} : null;
  };

  let words: Word[] = shuffle(saved, rand).map(w => ({
    spanId: w.spanId, surface: w.surface, meaning: w.meaning, cueText: w.cueText, pos: spans.get(w.spanId)?.span.pos,
  }));
  if (words.length < 3) {
    const have = new Set(words.map(w => w.spanId));
    const pool = [...viewed, ...shuffle(Object.keys(lexicon), rand)];
    for (const id of pool) {
      const w = !have.has(id) && fromLexicon(id);
      if (w) {
        have.add(id);
        words.push(w);
        if (words.length === 3) {
          break;
        }
      }
    }
  }
  words = words.slice(0, n);
  if (!words.length) {
    return [];
  }

  const everyone = Object.keys(lexicon).map(fromLexicon).filter((w): w is Word => !!w);
  const questions: Question[] = [];
  for (let i = 0; i < n; i++) {
    const w = words[i % words.length];
    // the type shifts each lap so a repeated word is asked a different way
    let type = TYPES[(i + Math.floor(i / words.length)) % TYPES.length];
    if (type === 'listen' && !(lexicon[w.spanId] && canListen(lexicon[w.spanId]))) {
      type = 'meaning';
    }
    const text = (x: Word) => (type === 'meaning' ? x.meaning : x.surface);
    const answerText = text(w);
    const others = shuffle(everyone.filter(x => x.spanId !== w.spanId && text(x) !== answerText), rand);
    const samePos = others.filter(x => x.pos === w.pos);
    const distractors: string[] = [];
    for (const x of [...samePos, ...others.filter(x => x.pos !== w.pos)]) {
      if (distractors.length < 3 && !distractors.includes(text(x))) {
        distractors.push(text(x));
      }
    }
    const options = shuffle([answerText, ...distractors], rand);
    questions.push({
      type,
      spanId: w.spanId,
      surface: w.surface,
      meaning: w.meaning,
      prompt:
        type === 'meaning' ? `What does "${w.surface}" mean here?` : type === 'cloze' ? 'Which word fits the blank?' : 'Which word do you hear?',
      context: type === 'listen' ? undefined : type === 'cloze' ? blank(w.cueText, w.surface) : w.cueText,
      options,
      answer: options.indexOf(answerText),
    });
  }
  return questions;
}
