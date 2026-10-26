import { Platform, useColorScheme } from 'react-native';

export type Theme = {
  isDark: boolean;
  background: string;
  card: string;
  border: string;
  divider: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  error: string;
  errorSoft: string;
  dangerBorder: string;
};

const light: Theme = {
  isDark: false,
  background: '#F6F7F9',
  card: '#FFFFFF',
  border: '#E3E6EA',
  divider: '#EEF0F2',
  text: '#111418',
  muted: '#5B6470',
  accent: '#2F5BEA',
  onAccent: '#FFFFFF',
  accentSoft: '#E8EEFD',
  success: '#1F7A4D',
  successSoft: '#E6F3EC',
  error: '#A32A22',
  errorSoft: '#FDECEA',
  dangerBorder: '#F1C9C5',
};

const dark: Theme = {
  isDark: true,
  background: '#0E1013',
  card: '#181B20',
  border: '#2A2F36',
  divider: '#22262C',
  text: '#F2F4F6',
  muted: '#9AA3AE',
  accent: '#6C8CFF',
  onAccent: '#0E1013',
  accentSoft: '#1E2A4D',
  success: '#4CC38A',
  successSoft: '#14291F',
  error: '#FF8A80',
  errorSoft: '#3A1A18',
  dangerBorder: '#5A2A27',
};

export const monoFont = Platform.select({
  ios: 'Menlo',
  default: 'monospace',
});

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
