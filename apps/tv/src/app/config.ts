import {Image} from 'react-native';
import type {Cue, Film, LexEntry} from './types';

// Gitignored local.config.ts (copy local.config.example.ts) holds the URL and key. Metro treats a require inside try as
// optional, so the file may be absent: empty URL = offline mode.
let local: {API_BASE_URL?: string; API_KEY?: string} = {};
try {
  local = require('./local.config');
} catch {
  // absent: offline
}
export const API_BASE_URL = local.API_BASE_URL ?? '';
export const API_KEY = local.API_KEY ?? '';

// The media player rejects http:// and untrusted https://, so the film is bundled and played from a
// bare path (Metro resolves to file:///pkg/bundle/assets/...). Swap for the CloudFront https URL once it exists.
const videoUrl = Image.resolveAssetSource(require('../spike/media/tears_of_steel_720p.mp4')).uri.replace('file://', '');

export const FILM: Film = {
  id: 'tears-of-steel',
  title: 'Tears of Steel',
  year: 2012,
  license: 'CC BY 3.0',
  attribution: '(CC) Blender Foundation | mango.blender.org',
  videoUrl,
  posterAsset: 'assets/film/tears-of-steel/poster.jpg',
  cuesAsset: 'assets/film/tears-of-steel/cues.json',
  lexiconAsset: 'assets/film/tears-of-steel/lexicon.json',
  durationSec: 734.17,
};

export const CUES: Cue[] = require('../../assets/film/tears-of-steel/cues.json');
export const LEXICON: Record<string, LexEntry> = require('../../assets/film/tears-of-steel/lexicon.json');
