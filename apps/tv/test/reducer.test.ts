import {initialState, reducer} from '../src/app/reducer';

describe('reducer', () => {
  it('starts at home in watch mode', () => expect(initialState).toEqual({screen: 'home', mode: 'watch', saved: [], viewed: [], lang: 'hi'}));

  it('walks home -> player -> review -> home', () => {
    let s = reducer(initialState, {type: 'START_FILM'});
    expect(s.screen).toBe('player');
    s = reducer(s, {type: 'OPEN_REVIEW'});
    expect(s.screen).toBe('review');
    expect(reducer(s, {type: 'GO_HOME'})).toEqual(initialState);
  });

  it('opens credits and returns home', () => {
    const s = reducer(initialState, {type: 'OPEN_CREDITS'});
    expect(s.screen).toBe('credits');
    expect(reducer(s, {type: 'GO_HOME'}).screen).toBe('home');
  });

  it('toggles learn mode only on the player screen', () => {
    expect(reducer(initialState, {type: 'ENTER_LEARN'})).toBe(initialState);
    const p = reducer(initialState, {type: 'START_FILM'});
    const l = reducer(p, {type: 'ENTER_LEARN'});
    expect(l.mode).toBe('learn');
    expect(reducer(l, {type: 'EXIT_LEARN'}).mode).toBe('watch');
  });

  it('resets learn mode when leaving or restarting', () => {
    const l = reducer(reducer(initialState, {type: 'START_FILM'}), {type: 'ENTER_LEARN'});
    expect(reducer(l, {type: 'GO_HOME'}).mode).toBe('watch');
    expect(reducer(l, {type: 'START_FILM'}).mode).toBe('watch');
  });

  const word = {
    spanId: 'c001-s1', filmId: 'tears-of-steel', surface: 'jerk', lemma: 'jerk', meaning: 'm', tr: {hi: 'x'}, cueText: 't', savedAt: 1, box: 1 as const,
  };

  it('saves a word once', () => {
    const s = reducer(initialState, {type: 'SAVE_WORD', word});
    expect(s.saved).toEqual([word]);
    expect(reducer(s, {type: 'SAVE_WORD', word: {...word, savedAt: 2}})).toBe(s);
  });

  it('records viewed spans once, in order', () => {
    let s = reducer(initialState, {type: 'VIEW_WORD', spanId: 'a'});
    s = reducer(s, {type: 'VIEW_WORD', spanId: 'b'});
    expect(reducer(s, {type: 'VIEW_WORD', spanId: 'a'}).viewed).toEqual(['a', 'b']);
  });

  it('keeps saved and viewed across screens', () => {
    let s = reducer(reducer(initialState, {type: 'SAVE_WORD', word}), {type: 'VIEW_WORD', spanId: 'a'});
    s = reducer(reducer(reducer(s, {type: 'START_FILM'}), {type: 'OPEN_REVIEW'}), {type: 'GO_HOME'});
    expect(s.saved).toHaveLength(1);
    expect(s.viewed).toEqual(['a']);
  });

  it('bumps the Leitner box up to 3 on correct and resets to 1 on wrong', () => {
    let s = reducer(initialState, {type: 'SAVE_WORD', word});
    const box = () => s.saved[0].box;
    for (const expected of [2, 3, 3]) {
      s = reducer(s, {type: 'ANSWER', spanId: word.spanId, correct: true});
      expect(box()).toBe(expected);
    }
    s = reducer(s, {type: 'ANSWER', spanId: word.spanId, correct: false});
    expect(box()).toBe(1);
    expect(reducer(s, {type: 'ANSWER', spanId: 'unsaved', correct: true}).saved).toEqual(s.saved);
  });

  it('remembers the chosen language', () => {
    expect(reducer(initialState, {type: 'SET_LANG', lang: 'es'}).lang).toBe('es');
  });

  it('hydrates without losing words saved before the load finished', () => {
    const stored = {...word, spanId: 'old'};
    const s = reducer(reducer(initialState, {type: 'SAVE_WORD', word}), {type: 'HYDRATE', saved: [stored, word], viewed: ['a']});
    expect(s.saved.map(w => w.spanId)).toEqual(['old', word.spanId]);
    expect(s.viewed).toEqual(['a']);
  });
});
