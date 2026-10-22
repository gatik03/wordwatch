import type {Cue, Span} from '../src/app/types';

declare const global: {fetch: unknown};
const mockCfg = {API_BASE_URL: 'https://api.test', API_KEY: 'k'};
jest.mock('../src/app/config', () => ({
  get API_BASE_URL() {
    return mockCfg.API_BASE_URL;
  },
  get API_KEY() {
    return mockCfg.API_KEY;
  },
  FILM: {id: 'tears-of-steel'},
  LEXICON: {
    'c001-s1': {spanId: 'c001-s1', meaning: 'bundled meaning', example: 'bundled example', tr: {hi: 'HI', es: 'ES'}, confidence: 1},
    'c002-s1': {spanId: 'c002-s1', meaning: 'm', example: 'e', tr: {hi: 'HI2'}, confidence: 1},
  },
}));

import {bundled, clearCache, live, NEEDS_NETWORK} from '../src/lookup/LookupService';
import {TIMEOUT_MS} from '../src/lookup/api';

const span = (id: string): Span => ({id, start: 0, end: 4, surface: 'jerk', lemma: 'jerk', pos: 'noun', level: 'B1', kind: 'word'});
const cue: Cue = {id: 'c001', start: 0, end: 2, text: 'A jerk.', spans: [span('c001-s1')]};
const ok = (body: unknown) => Promise.resolve({status: 200, json: () => Promise.resolve(body)});
const body = {meaning: 'long meaning', example: 'live example', tr: {es: 'LIVE ES'}, usage: 'u'};

const fetchMock = jest.fn();
beforeEach(() => {
  mockCfg.API_BASE_URL = 'https://api.test';
  fetchMock.mockReset();
  global.fetch = fetchMock;
  clearCache();
});
afterEach(() => jest.useRealTimers());

describe('LookupService', () => {
  it('returns the bundled entry instantly without the network', () => {
    expect(bundled('c001-s1', 'hi')).toEqual({meaning: 'bundled meaning', example: 'bundled example', gloss: 'HI'});
    expect(bundled('nope', 'hi')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the request with the API key and returns the live card', async () => {
    fetchMock.mockReturnValue(ok(body));
    const c = await live(cue, cue.spans[0], 'explain_more', 'es');
    expect(c).toEqual({meaning: 'long meaning', example: 'live example', gloss: 'LIVE ES', usage: 'u'});
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/v1/lookup');
    expect(init.headers['x-api-key']).toBe('k');
    expect(JSON.parse(init.body)).toMatchObject({surface: 'jerk', sentence: 'A jerk.', targetLang: 'es', mode: 'explain_more', filmId: 'tears-of-steel'});
  });

  it('caches by span, mode and language', async () => {
    fetchMock.mockReturnValue(ok(body));
    await live(cue, cue.spans[0], 'explain_more', 'es');
    await live(cue, cue.spans[0], 'explain_more', 'es');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await live(cue, cue.spans[0], 'explain_more', 'hi');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('with an unset URL: Explain more needs a network, Spanish falls back to the bundled gloss or fails', async () => {
    mockCfg.API_BASE_URL = '';
    await expect(live(cue, cue.spans[0], 'explain_more', 'hi')).rejects.toThrow(NEEDS_NETWORK);
    expect(await live(cue, cue.spans[0], 'define', 'es')).toEqual({meaning: 'bundled meaning', example: 'bundled example', gloss: 'ES'});
    await expect(live(cue, span('c002-s1'), 'define', 'es')).rejects.toThrow(NEEDS_NETWORK);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a non-200 and a malformed body as failure', async () => {
    fetchMock.mockReturnValueOnce(Promise.resolve({status: 403, json: () => Promise.resolve({})}));
    await expect(live(cue, cue.spans[0], 'explain_more', 'hi')).rejects.toThrow(NEEDS_NETWORK);
    fetchMock.mockReturnValueOnce(ok({meaning: 1}));
    await expect(live(cue, cue.spans[0], 'explain_more', 'hi')).rejects.toThrow(NEEDS_NETWORK);
  });

  it('gives up after 6 s and falls back', async () => {
    jest.useFakeTimers();
    fetchMock.mockReturnValue(new Promise(() => {})); // never answers
    const p = live(cue, cue.spans[0], 'define', 'es');
    await jest.advanceTimersByTimeAsync(TIMEOUT_MS);
    expect(await p).toMatchObject({gloss: 'ES'});
    fetchMock.mockReturnValue(new Promise(() => {}));
    const q = live(cue, cue.spans[0], 'explain_more', 'es');
    const failed = expect(q).rejects.toThrow(NEEDS_NETWORK);
    await jest.advanceTimersByTimeAsync(TIMEOUT_MS);
    await failed;
  });
});
