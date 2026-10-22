// Phase 1 spike: film playback (VideoPlayer), remote events, focus trap, AudioPlayer over paused video.
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {BackHandler, Dimensions, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView, useTVEventHandler} from '@amazon-devices/react-native-kepler';
import {AudioPlayer, KeplerVideoSurfaceView, VideoPlayer} from '@amazon-devices/react-native-w3cmedia';

// Vega's media player rejects http:// and untrusted https://, so the spike plays the film
// from the app package: Metro resolves the require() to file:///pkg/bundle/assets/..., the player wants a bare path.
const FILM = Image.resolveAssetSource(require('./media/tears_of_steel_720p.mp4')).uri.replace('file://', '');
const TONE = Image.resolveAssetSource(require('./media/tone.mp3')).uri.replace('file://', '');

export const Spike = () => {
  const video = useRef<VideoPlayer | null>(null);
  const audio = useRef<AudioPlayer | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [focused, setFocused] = useState('');
  const [time, setTime] = useState(0);
  const [trap, setTrap] = useState(true); // menu key toggles the trap, as a control for the focus test
  const log = useCallback((m: string) => {
    console.log(`SPIKE ${m}`);
    setLines(l => [...l.slice(-9), m]);
  }, []);

  useEffect(() => {
    const d = Dimensions.get('window');
    log(`window ${d.width}x${d.height} scale=${d.scale}`);
  }, [log]);

  useTVEventHandler(e => {
    log(`remote ${e.eventType} action=${e.eventKeyAction}`);
    if (e.eventType === 'menu' && e.eventKeyAction === 0) {
      setTrap(t => !t);
    }
    // KEY_PLAYPAUSE arrives as eventType 'play' on the VVD, not 'playpause'
    if ((e.eventType === 'playpause' || e.eventType === 'play') && e.eventKeyAction === 0) {
      const v = video.current;
      if (v) {
        v.paused ? v.play() : v.pause();
      }
    }
  });

  // Consuming the hardware back press keeps the app in the foreground (otherwise the OS returns to the launcher).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      log('hardwareBackPress consumed');
      return true;
    });
    return () => sub.remove();
  }, [log]);

  const onSurfaceViewCreated = async (handle: string) => {
    if (video.current) {
      return; // the surface callback fires twice on this SDK; one player only
    }
    try {
      const v = new VideoPlayer();
      video.current = v;
      await v.initialize();
      v.setSurfaceHandle(handle);
      for (const ev of ['loadedmetadata', 'canplay', 'playing', 'pause', 'ended', 'error', 'audiofocusgranted', 'audiofocuspaused', 'audiofocuslost']) {
        v.addEventListener(ev, () => log(`video ${ev}${ev === 'error' ? ` code=${v.error?.code}` : ''}`));
      }
      v.autoplay = false;
      v.src = FILM;
      v.load();
      v.play();
      log('video src set');
    } catch (e) {
      log(`video init failed: ${String(e)}`);
    }
  };
  const onSurfaceViewDestroyed = async (handle: string) => {
    video.current?.clearSurfaceHandle(handle);
    await video.current?.deinitialize();
    video.current = null;
  };

  useEffect(() => {
    const t = setInterval(() => setTime(video.current?.currentTime ?? 0), 500);
    return () => clearInterval(t);
  }, []);

  // Pause the film, then play the mp3 on a second player: answers "AudioPlayer while video paused".
  const playToneOverPausedVideo = async () => {
    try {
      video.current?.pause();
      const a = new AudioPlayer();
      audio.current = a;
      await a.initialize();
      for (const ev of ['playing', 'ended', 'error']) {
        a.addEventListener(ev, () => log(`audio ${ev}${ev === 'error' ? ` code=${a.error?.code}` : ''}`));
      }
      log(`tone uri ${TONE}`);
      a.src = TONE;
      a.load();
      await a.play();
      log(`audio play() ok, video.paused=${video.current?.paused}`);
    } catch (e) {
      log(`audio failed: ${String(e)}`);
    }
  };

  const item = (id: string, onPress?: () => void) => (
    <Pressable
      key={id}
      hasTVPreferredFocus={id === 'A'}
      onFocus={() => {
        setFocused(id);
        log(`focus ${id}`);
      }}
      onPress={() => {
        log(`press ${id}`);
        onPress?.();
      }}
      style={[styles.btn, focused === id && styles.btnFocused]}>
      <Text style={styles.btnText}>{id}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <KeplerVideoSurfaceView
        style={StyleSheet.absoluteFill}
        onSurfaceViewCreated={onSurfaceViewCreated}
        onSurfaceViewDestroyed={onSurfaceViewDestroyed}
      />
      <View style={styles.log}>
        <Text style={styles.logText}>t={time.toFixed(1)}s focused={focused} trap={String(trap)}</Text>
        {lines.map((l, i) => (
          <Text key={i} style={styles.logText}>{l}</Text>
        ))}
      </View>
      <Pressable
        onFocus={() => log('focus OUTSIDE (escaped the row)')}
        style={[styles.btn, styles.outside]}>
        <Text style={styles.btnText}>Outside</Text>
      </Pressable>
      <TVFocusGuideView
        key={String(trap)}
        style={styles.row}
        trapFocusUp={trap}
        trapFocusDown={trap}
        trapFocusLeft={trap}
        trapFocusRight={trap}>
        {item('A')}
        {item('B (tone)', playToneOverPausedVideo)}
        {item('C')}
      </TVFocusGuideView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000'},
  log: {position: 'absolute', top: 40, left: 40, padding: 12, backgroundColor: '#000a'},
  logText: {color: '#fff', fontSize: 22},
  row: {position: 'absolute', bottom: 60, left: 120, flexDirection: 'row', gap: 24},
  outside: {position: 'absolute', top: 40, left: 340, backgroundColor: '#555'},
  btn: {width: 220, height: 80, backgroundColor: '#0072bc', justifyContent: 'center', alignItems: 'center', borderRadius: 12},
  btnFocused: {backgroundColor: '#ff6600', borderWidth: 4, borderColor: '#fff'},
  btnText: {color: '#fff', fontSize: 28},
});
