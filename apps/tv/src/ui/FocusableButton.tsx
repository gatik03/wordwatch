import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors, dp, focusedStyle, type} from './theme';

interface Props {
  label: string;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  compact?: boolean; // no minimum width, for rows with many buttons
  disabled?: boolean; // dimmed and inert; stays focusable so D-pad movement does not change
}

export const FocusableButton = ({label, onPress, hasTVPreferredFocus, compact, disabled}: Props) => {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={disabled ? undefined : onPress}
      style={[styles.btn, compact && styles.compact, disabled && styles.disabled, focused && focusedStyle]}>
      <Text style={[type.button, {color: focused ? colors.onAccent : colors.text}]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    minHeight: dp(72),
    minWidth: dp(240),
    paddingHorizontal: dp(32),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: dp(12),
    borderWidth: dp(4),
    borderColor: 'transparent',
    backgroundColor: colors.surfaceRaised,
  },
  compact: {minWidth: 0, paddingHorizontal: dp(24)},
  disabled: {opacity: 0.55},
});
