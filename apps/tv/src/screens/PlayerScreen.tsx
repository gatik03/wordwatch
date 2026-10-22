import React, {useEffect, useRef, useState} from 'react';
import {BackHandler, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTVEventHandler} from '@amazon-devices/react-native-kepler';
import {KeplerVideoSurfaceView} from '@amazon-devices/react-native-w3cmedia';
import {WordCard} from '../cards/WordCard';
import {CUES, FILM} from '../app/config';
import {useStore} from '../app/store';
import type {Span} from '../app/types';
import {findActiveCue, learnStartIndex, nextSpanCue} from '../player/cueIndex';
import {LearnBar} from '../player/LearnBar';
import {SubtitleLine} from '../player/SubtitleLine';
import {usePlayer} from '../player/usePlayer';
import {colors, safe, type} from '../ui/theme';

const SEEK_SEC = 10;

export const PlayerScreen = () => {
  const {state, dispatch} = useStore();
  const {time, play, pause, togglePlay, seek, seekTo, surface} = usePlayer(FILM.videoUrl, () => dispatch({type: 'OPEN_REVIEW'}));
  const learn = state.mode === 'learn';
  const [idx, setIdx] = useState(-1); // cue shown in learn mode
  const [card, setCard] = useState<Span | null>(null);
  const [lastSpanId, setLastSpanId] = useState<string>();
  const resumeAt = useRef(0);
  const replayEnd = useRef<number | null>(null);

  const enterLearn = () => {
    pause();
    resumeAt.current = time;
    setIdx(learnStartIndex(CUES, time));
    dispatch({type: 'ENTER_LEARN'});
  };
  const resume = () => {
    replayEnd.current = null;
    setCard(null);
    dispatch({type: 'EXIT_LEARN'});
    seekTo(resumeAt.current);
    play();
  };
  const step = (dir: 1 | -1) => {
    const j = nextSpanCue(CUES, idx + dir, dir);
    if (j >= 0) {
      replayEnd.current = null;
      pause();
      setIdx(j);
    }
  };
  const replay = () => {
    seekTo(CUES[idx].start);
    replayEnd.current = CUES[idx].end;
    play();
  };

  // Replay pauses again at the end of the cue.
  useEffect(() => {
    if (replayEnd.current !== null && time >= replayEnd.current) {
      replayEnd.current = null;
      pause();
    }
  }, [time, pause]);

  // Event names seen on the VVD: Enter -> enter/kpenter, Play/Pause -> play; handle the documented names too.
  useTVEventHandler(e => {
    const k = e.eventType;
    // Select enters learn mode on key-up: on key-down the new LearnBar would take focus and its span would get the key-up as a press.
    if (k === 'select' || k === 'enter' || k === 'kpenter') {
      if (e.eventKeyAction === 1 && !learn) {
        enterLearn();
      }
    } else if (e.eventKeyAction === 0 && !learn) {
      if (k === 'playpause' || k === 'play') {
        togglePlay();
      } else if (k === 'left') {
        seek(-SEEK_SEC);
      } else if (k === 'right') {
        seek(SEEK_SEC);
      }
    }
  });

  // Consume Back, otherwise the OS leaves the app. Card: close it. Learn: resume. Watch: home.
  const onBack = useRef(() => {});
  onBack.current = () => {
    if (card) {
      setCard(null);
    } else if (learn) {
      resume();
    } else {
      dispatch({type: 'GO_HOME'});
    }
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const cue = learn ? CUES[idx] : findActiveCue(CUES, time);
  return (
    <View style={styles.root}>
      <KeplerVideoSurfaceView style={StyleSheet.absoluteFill} {...surface} />
      {/* watch mode only: with one focusable element there is no default focus movement to fight; in learn mode the trap owns focus */}
      {!learn && <Pressable hasTVPreferredFocus style={StyleSheet.absoluteFill} accessibilityLabel="Player" />}
      {cue && <SubtitleLine cue={cue} />}
      {learn && cue && !card && (
        <LearnBar
          key={cue.id}
          cue={cue}
          focusSpanId={lastSpanId}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onReplay={replay}
          onResume={resume}
          onSpan={s => {
            setLastSpanId(s.id);
            setCard(s);
          }}
        />
      )}
      {learn && cue && card && (
        <WordCard cue={cue} prev={CUES[idx - 1]} next={CUES[idx + 1]} span={card} onClose={() => setCard(null)} />
      )}
      {!learn && <Text style={[type.caption, styles.hint]}>Select: look up words    Play/Pause    Left/Right: 10 s</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000'},
  hint: {position: 'absolute', bottom: safe.y, alignSelf: 'center', color: colors.textMuted},
});
