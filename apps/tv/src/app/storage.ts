import AsyncStorage from '@react-native-async-storage/async-storage';
import type {SavedWord} from './types';

export interface Persisted {
  saved: SavedWord[];
  viewed: string[];
}

const KEY = '@wordwatch/v1';
let mem: Persisted | null = null; // fallback when storage throws: the app keeps working for the session

// Never rejects: any storage or parse failure warns and falls back to the in-memory copy.
export async function load(): Promise<Persisted | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return mem;
    }
    const p = JSON.parse(raw);
    if (!Array.isArray(p.saved) || !Array.isArray(p.viewed)) {
      throw new Error('bad shape');
    }
    return p;
  } catch (e) {
    console.warn('storage load failed, using memory', e);
    return mem;
  }
}

export async function save(p: Persisted): Promise<void> {
  mem = p;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {
    console.warn('storage save failed, kept in memory', e);
  }
}
