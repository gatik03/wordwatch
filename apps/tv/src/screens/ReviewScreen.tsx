import React, {useEffect, useState} from 'react';
import {BackHandler, StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {CUES, LEXICON} from '../app/config';
import {useStore} from '../app/store';
import {hasBundled} from '../lookup/audio';
import {buildQuiz, Question} from '../quiz/buildQuiz';
import {QuizQuestion} from '../quiz/QuizQuestion';
import {FocusableButton} from '../ui/FocusableButton';
import {colors, safe, space, type} from '../ui/theme';

const SHOWN = 5; // the list and the missed words are cut to fit one screen (nothing scrolls)

// Seed from the saved ids: the same words give the same quiz, new words give a new one.
const seedOf = (ids: string[]) => ids.join(',').split('').reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

// Saved words, then the quiz one question per screen, then the score with the missed words. Remote only, focus trapped.
export const ReviewScreen = () => {
  const {state, dispatch} = useStore();
  const [qs, setQs] = useState<Question[] | null>(null); // null = word list
  const [i, setI] = useState(0);
  const [missed, setMissed] = useState<Question[]>([]);
  const home = () => dispatch({type: 'GO_HOME'});

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dispatch({type: 'GO_HOME'});
      return true;
    });
    return () => sub.remove();
  }, [dispatch]);

  const start = () => {
    setQs(buildQuiz(state.saved, state.viewed, CUES, LEXICON, seedOf(state.saved.map(w => w.spanId)), 5, hasBundled));
    setI(0);
    setMissed([]);
  };
  const renderBody = () => {
    if (!qs) {
      const extra = state.saved.length - SHOWN;
      return (
        <>
          <Text style={[type.title, styles.text]}>Review</Text>
          {state.saved.length ? (
            <View>
              {state.saved.slice(0, SHOWN).map(w => (
                <Text key={w.spanId} numberOfLines={1} style={[type.body, styles.text]}>
                  {w.surface}  <Text style={styles.muted}>{w.meaning}</Text>
                </Text>
              ))}
              {extra > 0 && <Text style={[type.body, styles.muted]}>+{extra} more</Text>}
            </View>
          ) : (
            <Text style={[type.body, styles.muted]}>No saved words yet. The quiz will use words from the film.</Text>
          )}
          <View style={styles.row}>
            <FocusableButton hasTVPreferredFocus label="Start quiz" onPress={start} />
            <FocusableButton label="Home" onPress={home} />
          </View>
        </>
      );
    }
    if (i >= qs.length) {
      const score = qs.length - missed.length;
      return (
        <>
          <Text style={[type.title, styles.text]}>
            Score {score} / {qs.length}
          </Text>
          {missed.length ? (
            <View>
              <Text style={[type.body, styles.danger]}>Missed</Text>
              {[...new Map(missed.map(q => [q.spanId, q])).values()].slice(0, SHOWN).map(q => (
                <Text key={q.spanId} numberOfLines={1} style={[type.body, styles.text]}>
                  {q.surface}  <Text style={styles.muted}>{q.meaning}</Text>
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[type.body, styles.success]}>All correct</Text>
          )}
          <View style={styles.row}>
            <FocusableButton hasTVPreferredFocus label="Home" onPress={home} />
          </View>
        </>
      );
    }
    const q = qs[i];
    return (
      <QuizQuestion
        key={i}
        q={q}
        index={i}
        total={qs.length}
        onAnswer={correct => {
          dispatch({type: 'ANSWER', spanId: q.spanId, correct});
          if (!correct) {
            setMissed(m => [...m, q]);
          }
        }}
        onNext={() => setI(i + 1)}
      />
    );
  };

  return (
    <View style={styles.root}>
      <TVFocusGuideView style={styles.panel} trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
        {renderBody()}
      </TVFocusGuideView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, paddingHorizontal: safe.x, paddingVertical: safe.y, justifyContent: 'center'},
  panel: {gap: space.s3},
  row: {flexDirection: 'row', gap: space.s3},
  text: {color: colors.text},
  muted: {color: colors.textMuted},
  danger: {color: colors.danger},
  success: {color: colors.success},
});
