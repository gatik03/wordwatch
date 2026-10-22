import React from 'react';
import {StyleSheet} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import type {Cue, Span} from '../app/types';
import {FocusableButton} from '../ui/FocusableButton';
import {FocusableSpan} from '../ui/FocusableSpan';
import {dp, safe, space} from '../ui/theme';

interface Props {
  cue: Cue;
  focusSpanId?: string; // span to focus on mount (the one whose card just closed); default the first
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
  onResume: () => void;
  onSpan: (span: Span) => void;
}

// [Prev][spans...][Next][Replay][Resume] in a focus trap. The parent remounts it (key = cue id) so preferred focus applies.
export const LearnBar = ({cue, focusSpanId, onPrev, onNext, onReplay, onResume, onSpan}: Props) => {
  const first = cue.spans.find(s => s.id === focusSpanId) ?? cue.spans[0];
  return (
    <TVFocusGuideView style={styles.row} trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
      <FocusableButton compact label="< Prev line" onPress={onPrev} />
      {cue.spans.map(s => (
        <FocusableSpan key={s.id} text={s.surface} hasTVPreferredFocus={s === first} onPress={() => onSpan(s)} />
      ))}
      <FocusableButton compact label="Next line >" onPress={onNext} />
      <FocusableButton compact label="Replay" onPress={onReplay} />
      <FocusableButton compact hasTVPreferredFocus={!first} label="Resume" onPress={onResume} />
    </TVFocusGuideView>
  );
};

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    bottom: safe.y,
    left: dp(48),
    right: dp(48),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.s2,
  },
});
