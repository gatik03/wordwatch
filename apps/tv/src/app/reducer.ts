import type {Lang, Mode, SavedWord, Screen} from './types';

export interface State {
  screen: Screen;
  mode: Mode; // player only; learn = film paused
  saved: SavedWord[]; // persisted with viewed (app/storage.ts)
  viewed: string[]; // spanIds whose card was opened, in order (quiz padding)
  lang: Lang; // last language chosen on the Word Card
}

export type Action =
  | {type: 'START_FILM'}
  | {type: 'OPEN_REVIEW'}
  | {type: 'OPEN_CREDITS'}
  | {type: 'GO_HOME'}
  | {type: 'ENTER_LEARN'}
  | {type: 'EXIT_LEARN'}
  | {type: 'SAVE_WORD'; word: SavedWord}
  | {type: 'VIEW_WORD'; spanId: string}
  | {type: 'SET_LANG'; lang: Lang}
  | {type: 'ANSWER'; spanId: string; correct: boolean} // Leitner: +1 box (max 3) if correct, back to 1 if wrong
  | {type: 'HYDRATE'; saved: SavedWord[]; viewed: string[]};

export const initialState: State = {screen: 'home', mode: 'watch', saved: [], viewed: [], lang: 'hi'};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_FILM':
      return {...state, screen: 'player', mode: 'watch'};
    case 'OPEN_REVIEW':
      return {...state, screen: 'review', mode: 'watch'};
    case 'OPEN_CREDITS':
      return {...state, screen: 'credits', mode: 'watch'};
    case 'GO_HOME':
      return {...state, screen: 'home', mode: 'watch'};
    case 'ENTER_LEARN':
      return state.screen === 'player' ? {...state, mode: 'learn'} : state;
    case 'EXIT_LEARN':
      return state.screen === 'player' ? {...state, mode: 'watch'} : state;
    case 'SAVE_WORD':
      return state.saved.some(w => w.spanId === action.word.spanId) ? state : {...state, saved: [...state.saved, action.word]};
    case 'VIEW_WORD':
      return state.viewed.includes(action.spanId) ? state : {...state, viewed: [...state.viewed, action.spanId]};
     case 'SET_LANG':
      return {...state, lang: action.lang};
    case 'ANSWER':
      return {
        ...state,
        saved: state.saved.map(w =>
          w.spanId === action.spanId ? {...w, box: action.correct ? (Math.min(3, w.box + 1) as SavedWord['box']) : 1} : w,
        ),
      };
    case 'HYDRATE': {
      // Loaded words first; anything saved or viewed before the load finished is kept.
      const have = new Set(action.saved.map(w => w.spanId));
      return {
        ...state,
        saved: [...action.saved, ...state.saved.filter(w => !have.has(w.spanId))],
        viewed: [...new Set([...action.viewed, ...state.viewed])],
      };
    }
  }
}
