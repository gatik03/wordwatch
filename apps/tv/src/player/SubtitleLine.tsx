import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {Cue} from '../app/types';
import {colors, dp, safe, type} from '../ui/theme';

// Own overlay (ADR-14): learnable spans are underlined in the accent color. Never mounts native captions.
export const SubtitleLine = ({cue}: {cue: Cue}) => {
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const s of cue.spans) {
    parts.push(cue.text.slice(at, s.start));
    parts.push(
      <Text key={s.id} style={styles.span}>
        {cue.text.slice(s.start, s.end)}
      </Text>,
    );
    at = s.end;
  }
  parts.push(cue.text.slice(at));
  return (
    <View style={styles.box}>
      <Text style={[type.subtitle, styles.text]}>{parts}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    bottom: safe.y + dp(96),
    alignSelf: 'center',
    maxWidth: dp(1500),
    paddingVertical: dp(12),
    paddingHorizontal: dp(24),
    borderRadius: dp(12),
    backgroundColor: colors.scrim,
  },
  text: {color: colors.text, textAlign: 'center'},
  span: {color: colors.accent, textDecorationLine: 'underline', textDecorationColor: colors.accent},
});
