import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors, dp, focusedStyle, type} from './theme';

interface Props {
  text: string;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

// A learnable span as a focus target: accent underline at rest, outline + scale + fill when focused.
export const FocusableSpan = ({text, onPress, hasTVPreferredFocus}: Props) => {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[styles.span, focused && focusedStyle]}>
      <Text style={[type.button, styles.text, {color: focused ? colors.onAccent : colors.accent}]}>{text}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  span: {
    minHeight: dp(72),
    paddingHorizontal: dp(24),
    justifyContent: 'center',
    borderRadius: dp(12),
    borderWidth: dp(4),
    borderColor: 'transparent',
    backgroundColor: colors.surfaceRaised,
  },
  text: {textDecorationLine: 'underline'},
});
