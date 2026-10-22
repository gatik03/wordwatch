import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {FILM} from '../app/config';
import {useStore} from '../app/store';
import {FocusableButton} from '../ui/FocusableButton';
import {colors, dp, safe, space, type} from '../ui/theme';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const HomeScreen = () => {
  const {dispatch} = useStore();
  return (
    <View style={styles.root}>
      <Image source={require('../../assets/film/tears-of-steel/poster.jpg')} style={styles.poster} />
      <Text style={[type.title, styles.title]}>WordWatch</Text>
      <Text style={[type.body, styles.muted]}>Word Wise for TV</Text>
      <Text style={[type.body, styles.film]}>
        {FILM.title}  {mmss(FILM.durationSec)}
      </Text>
      <View style={styles.row}>
        <FocusableButton label="Watch" hasTVPreferredFocus onPress={() => dispatch({type: 'START_FILM'})} />
        <FocusableButton label="Review words" onPress={() => dispatch({type: 'OPEN_REVIEW'})} />
        <FocusableButton label="Credits" onPress={() => dispatch({type: 'OPEN_CREDITS'})} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, paddingHorizontal: safe.x, paddingVertical: safe.y, justifyContent: 'center'},
  poster: {position: 'absolute', right: safe.x, top: safe.y, width: dp(400), height: dp(225), borderRadius: dp(8)},
  title: {color: colors.text},
  muted: {color: colors.textMuted},
  film: {color: colors.text, marginTop: dp(48), marginBottom: space.s3},
  row: {flexDirection: 'row', gap: space.s3},
});
