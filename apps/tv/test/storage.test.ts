const mockStore: {value: string | null; fail: boolean} = {value: null, fail: false};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async () => {
      if (mockStore.fail) {
        throw new Error('boom');
      }
      return mockStore.value;
    },
    setItem: async (_k: string, v: string) => {
      if (mockStore.fail) {
        throw new Error('boom');
      }
      mockStore.value = v;
    },
  },
}));

import {load, save} from '../src/app/storage';

const data = {saved: [], viewed: ['a']};

describe('storage', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('round-trips through async-storage', async () => {
    await save(data);
    expect(JSON.parse(mockStore.value!)).toEqual(data);
    expect(await load()).toEqual(data);
  });

  it('falls back to memory with a warning when storage throws', async () => {
    mockStore.fail = true;
    const next = {saved: [], viewed: ['b']};
    await save(next);
    expect(await load()).toEqual(next);
    expect(console.warn).toHaveBeenCalled();
    mockStore.fail = false;
  });

  it('ignores corrupt stored data', async () => {
    mockStore.value = '{"saved": 1}';
    await expect(load()).resolves.toEqual({saved: [], viewed: ['b']});
  });
});
