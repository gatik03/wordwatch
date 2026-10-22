import {useCallback, useEffect, useRef, useState} from 'react';
import {VideoPlayer} from '@amazon-devices/react-native-w3cmedia';

// Owns the single VideoPlayer instance (Rules.md). Publishes currentTime from a 100 ms clock (ADR-14).
export function usePlayer(src: string, onEnded: () => void) {
  const video = useRef<VideoPlayer | null>(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const [time, setTime] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(video.current?.currentTime ?? 0), 100);
    return () => clearInterval(t);
  }, []);

  const onSurfaceViewCreated = useCallback(
    async (handle: string) => {
      if (video.current) {
        return; // the surface callback fires twice on this SDK; one player only
      }
      try {
        const v = new VideoPlayer();
        video.current = v;
        await v.initialize();
        v.setSurfaceHandle(handle);
        v.addEventListener('ended', () => endedRef.current());
        v.autoplay = false;
        v.src = src;
        v.load();
        v.play();
      } catch (e) {
        console.log(`WW player init failed: ${String(e)}`);
      }
    },
    [src],
  );

  const onSurfaceViewDestroyed = useCallback(async (handle: string) => {
    const v = video.current;
    video.current = null;
    v?.clearSurfaceHandle(handle);
    await v?.deinitialize();
  }, []);

  const play = useCallback(() => {
    video.current?.play();
  }, []);
  const pause = useCallback(() => {
    video.current?.pause();
  }, []);
  const togglePlay = useCallback(() => {
    const v = video.current;
    if (v) {
      v.paused ? v.play() : v.pause();
    }
  }, []);
  const seek = useCallback((delta: number) => {
    const v = video.current;
    if (v) {
      v.currentTime = Math.max(0, v.currentTime + delta);
    }
  }, []);

  const seekTo = useCallback((t: number) => {
    if (video.current) {
      video.current.currentTime = t;
    }
  }, []);

  return {time, play, pause, togglePlay, seek, seekTo, surface: {onSurfaceViewCreated, onSurfaceViewDestroyed}};
}
