import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {FILM, LEXICON} from '../app/config';
import {useStore} from '../app/store';
import type {Cue, Lang, LookupMode, Span} from '../app/types';
import {bundled, Card, live, NEEDS_NETWORK} from '../lookup/LookupService';
import {canHear, hear} from '../lookup/audio';
import {FocusableButton} from '../ui/FocusableButton';
import {colors, dp, safe, space, type} from '../ui/theme';

const LANG_NAME: Record<Lang, string> = {hi: 'Hindi', es: 'Spanish'};
const NEXT_LANG: Record<Lang, Lang> = {hi: 'es', es: 'hi'};

interface Props {
  cue: Cue;
  prev?: Cue;
  next?: Cue;
  span: Span;
  onClose: () => void;
}

const Skeleton = () => (
  <View accessibilityLabel="Loading">
    <View style={[styles.bone, {width: '90%'}]} />
    <View style={[styles.bone, {width: '60%'}]} />
  </View>
);

// Modal over the player. The base card comes from the bundle in the first render; the network only replaces or extends it.
export const WordCard = ({cue, prev, next, span, onClose}: Props) => {
  const {state, dispatch} = useStore();
  const [mode, setMode] = useState<LookupMode>('define');
  const lang = state.lang;
  const [card, setCard] = useState<Card | null>(() => bundled(span.id, lang));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hearing, setHearing] = useState(false);
  const [hearFailed, setHearFailed] = useState(false);
  const entry = LEXICON[span.id];
  const saved = state.saved.some(w => w.spanId === span.id);

  useEffect(() => {
    dispatch({type: 'VIEW_WORD', spanId: span.id});
  }, [dispatch, span.id]);

  // define + hi is the bundled card; every other combination goes through live() (with its own fallbacks).
  useEffect(() => {
    let stale = false;
    setError(null);
    if (mode === 'define' && lang === 'hi') {
      setCard(bundled(span.id, 'hi'));
      setLoading(false);
      return;
    }
    setLoading(true);
    live(cue, span, mode, lang, prev, next)
      .then(c => !stale && (setCard(c), setLoading(false)))
      .catch(() => !stale && (setCard(bundled(span.id, lang)), setError(NEEDS_NETWORK), setLoading(false)));
    return () => {
      stale = true;
    };
  }, [mode, lang, cue, span, prev, next]);

  const save = () =>
    dispatch({
      type: 'SAVE_WORD',
      word: {
        spanId: span.id,
        filmId: FILM.id,
        surface: span.surface,
        lemma: span.lemma,
        meaning: entry?.meaning ?? card?.meaning ?? '',
        tr: entry?.tr ?? {},
        cueText: cue.text,
        savedAt: Date.now(),
        box: 1,
      },
    });

  const onHear = () => {
    setHearing(true);
    setHearFailed(false);
    hear(entry, span.surface)
      .catch(() => setHearFailed(true))
      .finally(() => setHearing(false));
  };

  const audioOk = canHear(entry) && !hearFailed;
  const gloss = card?.gloss;
  return (
    <View style={styles.scrim}>
      <TVFocusGuideView style={styles.panel} trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
        <View style={styles.head}>
          <Text style={[type.word, styles.word]}>{span.surface}</Text>
          <Text style={[type.caption, styles.tag]}>{span.pos}</Text>
          <Text style={[type.caption, styles.tag]}>{span.level}</Text>
        </View>
        <Text style={[type.caption, styles.muted]}>lemma: {span.lemma}</Text>
        {loading ? (
          <Skeleton />
        ) : (
          card && (
            <View>
              <Text style={[type.body, styles.text]}>{card.meaning}</Text>
              {card.usage ? <Text style={[type.body, styles.muted]}>{card.usage}</Text> : null}
              <Text style={[type.body, styles.muted]}>"{card.example}"</Text>
              {gloss ? (
                <Text style={[type.body, styles.text]}>
                  {LANG_NAME[lang]}: {gloss}
                </Text>
              ) : null}
            </View>
          )
        )}
        {error ? <Text style={[type.body, styles.error]}>{error}</Text> : null}
        <View style={styles.row}>
          <FocusableButton hasTVPreferredFocus compact label={saved ? 'Saved' : 'Save'} disabled={saved} onPress={save} />
          <FocusableButton
            compact
            label={audioOk ? 'Hear' : 'Audio unavailable offline'}
            disabled={!audioOk || hearing}
            onPress={onHear}
          />
          <FocusableButton compact label="Explain more" onPress={() => setMode('explain_more')} />
        </View>
        <View style={styles.row}>
          <FocusableButton compact label={`Language: ${LANG_NAME[lang]}`} onPress={() => dispatch({type: 'SET_LANG', lang: NEXT_LANG[lang]})} />
          <FocusableButton compact label="Close" onPress={onClose} />
        </View>
      </TVFocusGuideView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: safe.x,
    paddingVertical: safe.y,
  },
  panel: {
    width: dp(1300),
    maxWidth: '100%',
    padding: space.s4,
    borderRadius: dp(16),
    backgroundColor: colors.surface,
    gap: space.s2,
  },
  head: {flexDirection: 'row', alignItems: 'center', gap: space.s2},
  word: {color: colors.text},
  tag: {
    color: colors.accent,
    borderWidth: dp(2),
    borderColor: colors.accent,
    borderRadius: dp(8),
    paddingHorizontal: space.s1,
  },
  text: {color: colors.text},
  muted: {color: colors.textMuted},
  error: {color: colors.danger},
  row: {flexDirection: 'row', gap: space.s2, marginTop: space.s1},
  bone: {height: dp(30), borderRadius: dp(8), backgroundColor: colors.surfaceRaised, marginVertical: dp(6)},
});
