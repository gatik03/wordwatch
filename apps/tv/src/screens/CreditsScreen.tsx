import React, {useEffect} from 'react';
import {BackHandler, StyleSheet, Text, View} from 'react-native';
import {useStore} from '../app/store';
import {FocusableButton} from '../ui/FocusableButton';
import {colors, safe, space, type} from '../ui/theme';

// Wording matches NOTICE.
const LINES = [
  '"Tears of Steel" (CC) Blender Foundation',
  'mango.blender.org, CC BY 3.0',
  'Soundtrack by Joram Letwory, CC BY-ND 3.0, unmodified',
  'Subtitles: download.blender.org',
  'WordWatch is MIT licensed.',
];

export const CreditsScreen = () => {
  const {dispatch} = useStore();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dispatch({type: 'GO_HOME'});
      return true;
    });
    return () => sub.remove();
  }, [dispatch]);
  return (
    <View style={styles.root}>
      <Text style={[type.title, styles.text, {marginBottom: space.s3}]}>Credits</Text>
      {LINES.map(l => (
        <Text key={l} style={[type.body, styles.text]}>
          {l}
        </Text>
      ))}
      <View style={styles.btn}>
        <FocusableButton label="Back" hasTVPreferredFocus onPress={() => dispatch({type: 'GO_HOME'})} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, paddingHorizontal: safe.x, paddingVertical: safe.y, justifyContent: 'center'},
  text: {color: colors.text},
  btn: {marginTop: space.s4, alignItems: 'flex-start'},
});
