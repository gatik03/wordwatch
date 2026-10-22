import {API_BASE_URL, API_KEY} from '../app/config';
import type {Lang, LookupMode} from '../app/types';

export const TIMEOUT_MS = 6000;

export interface LookupRequest {
  surface: string;
  sentence: string;
  targetLang: Lang;
  mode: LookupMode;
  filmId: string;
  lemma?: string;
  prevLine?: string;
  nextLine?: string;
}

export interface LookupResponse {
  meaning: string;
  example: string;
  tr: Record<string, string>;
  usage?: string;
}

// One attempt, 6 s from request to parsed body. Any failure (unset URL, network, non-200, bad shape) rejects.
async function post(path: string, body: unknown): Promise<unknown> {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL not set');
  }
  const ctl = new AbortController();
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctl.abort();
      reject(new Error('timeout'));
    }, TIMEOUT_MS);
  });
  const call = (async () => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'x-api-key': API_KEY},
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json() as Promise<unknown>;
  })();
  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
    call.catch(() => {}); // a late failure after the timeout must not surface as unhandled
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export async function lookup(req: LookupRequest): Promise<LookupResponse> {
  const r = await post('/v1/lookup', req);
  if (!isObj(r) || typeof r.meaning !== 'string' || typeof r.example !== 'string' || !isObj(r.tr)) {
    throw new Error('bad lookup response');
  }
  const tr: Record<string, string> = {};
  for (const [k, v] of Object.entries(r.tr)) {
    if (typeof v === 'string') {
      tr[k] = v;
    }
  }
  return {meaning: r.meaning, example: r.example, tr, usage: typeof r.usage === 'string' ? r.usage : undefined};
}

// Presigned https URL of a pronunciation mp3.
export async function speak(text: string): Promise<string> {
  const r = await post('/v1/speak', {text: text.slice(0, 120)});
  if (!isObj(r) || typeof r.url !== 'string' || !r.url.startsWith('https://')) {
    throw new Error('bad speak response');
  }
  return r.url;
}
