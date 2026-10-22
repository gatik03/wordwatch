import {AudioPlayer} from '@amazon-devices/react-native-w3cmedia';
import {Image} from 'react-native';
import type {LexEntry} from '../app/types';
import {API_BASE_URL} from '../app/config';
import * as api from './api';

// Metro needs one static require() per mp3, so a generated index goes here once pregen writes audio (none in fixture mode).
const BUNDLED: Record<string, number> = {};

export const hasBundled = (entry: LexEntry | undefined) => !!(entry?.audio && BUNDLED[entry.audio]);
export const canHear = (entry: LexEntry | undefined) => hasBundled(entry) || !!API_BASE_URL;

// Plays the bundled mp3, else the presigned speak URL. Resolves when it ends; rejects if it cannot play.
export async function hear(entry: LexEntry | undefined, text: string): Promise<void> {
  const asset = entry?.audio ? BUNDLED[entry.audio] : undefined;
  const src = asset ? Image.resolveAssetSource(asset).uri.replace('file://', '') : await api.speak(text);
  const a = new AudioPlayer();
  try {
    await a.initialize();
    const done = new Promise<void>((resolve, reject) => {
      a.addEventListener('ended', () => resolve());
      a.addEventListener('error', () => reject(new Error('audio error')));
    });
    a.src = src;
    a.load();
    await a.play();
    await done;
  } finally {
    await a.deinitialize();
  }
}
