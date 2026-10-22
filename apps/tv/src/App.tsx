import React from 'react';
import {StoreProvider, useStore} from './app/store';
import {CreditsScreen} from './screens/CreditsScreen';
import {HomeScreen} from './screens/HomeScreen';
import {PlayerScreen} from './screens/PlayerScreen';
import {ReviewScreen} from './screens/ReviewScreen';

const Screens = () => {
  switch (useStore().state.screen) {
    case 'home':
      return <HomeScreen />;
    case 'player':
      return <PlayerScreen />;
    case 'review':
      return <ReviewScreen />;
    case 'credits':
      return <CreditsScreen />;
  }
};

export const App = () => (
  <StoreProvider>
    <Screens />
  </StoreProvider>
);
