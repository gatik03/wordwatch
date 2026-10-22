import React, {createContext, useContext, useEffect, useReducer, useRef} from 'react';
import {Action, initialState, reducer, State} from './reducer';
import * as storage from './storage';

const Ctx = createContext<{state: State; dispatch: React.Dispatch<Action>} | null>(null);

export const StoreProvider = ({children}: {children: React.ReactNode}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);
  useEffect(() => {
    storage.load().then(p => {
      if (p) {
        dispatch({type: 'HYDRATE', saved: p.saved, viewed: p.viewed});
      }
      hydrated.current = true;
    });
  }, []);
  // Skipped until the load finished, so an empty state never overwrites the stored words.
  useEffect(() => {
    if (hydrated.current) {
      storage.save({saved: state.saved, viewed: state.viewed});
    }
  }, [state.saved, state.viewed]);
  return <Ctx.Provider value={{state, dispatch}}>{children}</Ctx.Provider>;
};

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useStore outside StoreProvider');
  }
  return v;
};
