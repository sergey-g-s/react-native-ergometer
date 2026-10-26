import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useStyles } from './styles';
import type { Theme } from './theme';

export type ButtonVariant =
  'primary' | 'outline' | 'soft' | 'success' | 'danger';

function buttonColors(theme: Theme, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: theme.accent, border: theme.accent, text: theme.onAccent };
    case 'outline':
      return { bg: theme.card, border: theme.accent, text: theme.accent };
    case 'soft':
      return {
        bg: theme.accentSoft,
        border: theme.accentSoft,
        text: theme.accent,
      };
    case 'success':
      return {
        bg: theme.successSoft,
        border: theme.successSoft,
        text: theme.success,
      };
    case 'danger':
      return { bg: theme.card, border: theme.dangerBorder, text: theme.error };
  }
}

export function AppButton({
  title,
  variant = 'primary',
  compact,
  disabled,
  onPress,
}: {
  title: string;
  variant?: ButtonVariant;
  compact?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { theme, styles } = useStyles();
  const colors = buttonColors(theme, variant);
  const style: ViewStyle[] = [
    styles.button,
    { backgroundColor: colors.bg, borderColor: colors.border },
  ];
  if (compact) {
    style.push(styles.buttonCompact);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.buttonLabel, { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Screen({
  edges = ['top'],
  children,
}: {
  edges?: Edge[];
  children: ReactNode;
}) {
  const { styles } = useStyles();

  return (
    <SafeAreaView edges={edges} style={styles.container}>
      {children}
    </SafeAreaView>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { styles } = useStyles();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const { styles } = useStyles();

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

export function ScreenHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  const { styles } = useStyles();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>react-native-ergometer</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}
