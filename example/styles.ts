import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { monoFont, useTheme, type Theme } from './theme';

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
      gap: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.muted,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.muted,
    },
    card: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 4,
    },
    cardBody: {
      padding: 16,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    rowMain: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    mono: {
      fontFamily: monoFont,
      fontSize: 12,
      color: theme.muted,
    },
    chevron: {
      fontSize: 22,
      color: theme.muted,
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      backgroundColor: theme.success,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.success,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 4,
      backgroundColor: theme.successSoft,
    },
    field: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    fieldLabel: {
      fontSize: 14,
      color: theme.muted,
    },
    fieldValue: {
      flexShrink: 1,
      fontFamily: monoFont,
      fontSize: 13,
      color: theme.text,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 4,
      fontFamily: monoFont,
      fontSize: 18,
      color: theme.text,
    },
    back: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backText: {
      fontSize: 15,
      color: theme.muted,
    },
    machineName: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    firmwareVersion: {
      fontFamily: monoFont,
      fontSize: 14,
      color: theme.text,
    },
    muted: {
      fontSize: 14,
      color: theme.muted,
    },
    button: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonCompact: {
      minHeight: 36,
      minWidth: 96,
      paddingHorizontal: 14,
    },
    buttonLabel: {
      fontSize: 15,
      fontWeight: '600',
    },
    banner: {
      borderRadius: 4,
      padding: 12,
      backgroundColor: theme.errorSoft,
    },
    bannerText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.error,
    },
  });
}

export function useStyles() {
  const theme = useTheme();
  return useMemo(() => ({ theme, styles: createStyles(theme) }), [theme]);
}
