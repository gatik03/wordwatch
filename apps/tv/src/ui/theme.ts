import {Dimensions} from 'react-native';

// Design.md is specified at 1920x1080 px; the 1080p Vega screen is 960x540 dp (scale 2). dp() maps a design px to dp.
const k = Dimensions.get('window').width / 1920;
export const dp = (px: number) => px * k;

export const colors = {
  bg: '#0B0E14',
  surface: '#151A24',
  surfaceRaised: '#1E2533',
  scrim: 'rgba(0,0,0,0.65)',
  text: '#F5F7FA',
  textMuted: '#A9B2C3',
  accent: '#FFC53D',
  onAccent: '#1A1405',
  success: '#4ADE80',
  danger: '#FF6B6B',
  ring: '#FFFFFF', // focus outline: contrasts with both the accent fill and the dark surfaces
};

// px at 1080p; line height 1.35
export const type = {
  title: {fontSize: dp(56), fontWeight: '700', lineHeight: dp(56 * 1.35)},
  word: {fontSize: dp(48), fontWeight: '700', lineHeight: dp(48 * 1.35)},
  subtitle: {fontSize: dp(36), fontWeight: '500', lineHeight: dp(36 * 1.35)},
  body: {fontSize: dp(30), fontWeight: '400', lineHeight: dp(30 * 1.35)},
  button: {fontSize: dp(28), fontWeight: '600', lineHeight: dp(28 * 1.35)},
  caption: {fontSize: dp(24), fontWeight: '400', lineHeight: dp(24 * 1.35)},
} as const;

export const space = {s1: dp(8), s2: dp(16), s3: dp(24), s4: dp(32), s6: dp(48)};
export const safe = {x: dp(96), y: dp(54)}; // 5 percent margins

// Focus spec (Design.md): outline + scale + fill swap together, never color alone. Spread into a style array when focused.
export const focusedStyle = {
  backgroundColor: colors.accent,
  borderColor: colors.ring,
  transform: [{scale: 1.05}],
} as const;
