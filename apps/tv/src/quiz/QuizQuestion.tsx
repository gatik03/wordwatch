import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {LEXICON} from '../app/config';
import {hear} from '../lookup/audio';
import {FocusableButton} from '../ui/FocusableButton';
import {colors, space, type} from '../ui/theme';
import type {Question} from './buildQuiz';

interface Props {
  q: Question;
  index: number;
  total: number;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}

// One question per screen. Options are replaced by feedback (correct or wrong, plus the meaning) and a Next button.
// The parent supplies the focus trap and remounts it per question (key), so preferred focus applies each time.
export const QuizQuestion = ({q, index, total, onAnswer, onNext}: Props) => {
  const [picked, setPicked] = useState<number | null>(null);
  const [hearing, setHearing] = useState(false);
  const [hearFailed, setHearFailed] = useState(false);
  const right = picked === q.answer;

  const pick = (i: number) => {
    setPicked(i);
    onAnswer(i === q.answer);
  };
  const play = () => {
    setHearing(true);
    setHearFailed(false);
    hear(LEXICON[q.spanId], q.surface)
      .catch(() => setHearFailed(true))
      .finally(() => setHearing(false));
  };

  return (
    <View style={styles.root}>
      <Text style={[type.caption, styles.muted]}>
        Question {index + 1} of {total}
      </Text>
      <Text style={[type.title, styles.text]}>{q.prompt}</Text>
      {q.context ? <Text style={[type.subtitle, styles.muted]}>"{q.context}"</Text> : null}
      {picked === null ? (
        <View style={styles.options}>
          {q.type === 'listen' && (
            <FocusableButton hasTVPreferredFocus compact label={hearFailed ? 'Audio unavailable' : 'Hear the word'} disabled={hearing || hearFailed} onPress={play} />
          )}
          <View style={styles.grid}>
            {q.options.map((o, i) => (
              <View key={o} style={styles.cell}>
                <FocusableButton compact hasTVPreferredFocus={q.type !== 'listen' && i === 0} label={o} onPress={() => pick(i)} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.options}>
          <Text style={[type.word, {color: right ? colors.success : colors.danger}]}>
            {right ? 'Correct' : 'Wrong'}
          </Text>
          <Text style={[type.body, styles.text]}>
            {q.surface}: {q.meaning}
          </Text>
          <FocusableButton hasTVPreferredFocus label={index + 1 === total ? 'See results' : 'Next'} onPress={onNext} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {gap: space.s2},
  text: {color: colors.text},
  muted: {color: colors.textMuted},
  options: {gap: space.s3, marginTop: space.s2, alignItems: 'flex-start'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: space.s2, width: '100%'},
  cell: {width: '48%'},
});
