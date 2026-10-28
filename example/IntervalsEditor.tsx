import { Pressable, Text, TextInput, View } from 'react-native';
import type { Interval } from 'react-native-ergometer';
import { AppButton, SegmentedControl } from './components';
import { useStyles } from './styles';

type IntervalKind = 'distance' | 'duration' | 'calories';

export interface IntervalDraft {
  id: number;
  kind: IntervalKind;
  amount: string;
  // Seconds. Left empty, the rest lasts until Continue.
  rest: string;
}

const KINDS: { value: IntervalKind; label: string; input: string }[] = [
  { value: 'distance', label: 'Distance', input: 'Distance, m' },
  { value: 'duration', label: 'Time', input: 'Time, s' },
  { value: 'calories', label: 'Calories', input: 'Calories, cal' },
];

export function newInterval(id: number): IntervalDraft {
  return { id, kind: 'distance', amount: '500', rest: '60' };
}

/** The intervals the drafts describe, or null while any of them is incomplete. */
export function intervalsFromDrafts(
  drafts: IntervalDraft[],
): Interval[] | null {
  const intervals: Interval[] = [];
  for (const draft of drafts) {
    const amount = Number(draft.amount);
    const rest = draft.rest === '' ? undefined : Number(draft.rest);
    if (
      !Number.isInteger(amount) ||
      amount <= 0 ||
      (rest !== undefined && (!Number.isInteger(rest) || rest < 0))
    ) {
      return null;
    }
    intervals.push({ [draft.kind]: amount, rest } as Interval);
  }
  return intervals;
}

export function IntervalsEditor({
  drafts,
  onChange,
}: {
  drafts: IntervalDraft[];
  onChange: (drafts: IntervalDraft[]) => void;
}) {
  const { theme, styles } = useStyles();

  const update = (id: number, changes: Partial<IntervalDraft>) =>
    onChange(
      drafts.map(draft => (draft.id === id ? { ...draft, ...changes } : draft)),
    );

  return (
    <View style={styles.section}>
      {drafts.map((draft, index) => (
        <View key={draft.id} style={[styles.card, styles.cardBody]}>
          <View style={styles.intervalHeader}>
            <Text style={styles.inputLabel}>Interval {index + 1}</Text>
            {drafts.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove interval ${index + 1}`}
                onPress={() => onChange(drafts.filter(item => item !== draft))}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
          </View>
          <SegmentedControl
            options={KINDS}
            value={draft.kind}
            onChange={kind => update(draft.id, { kind })}
          />
          <View style={styles.inputRow}>
            <View style={styles.inputColumn}>
              <Text style={styles.inputLabel}>
                {KINDS.find(item => item.value === draft.kind)?.input}
              </Text>
              <TextInput
                accessibilityLabel={`Interval ${index + 1} amount`}
                keyboardType="number-pad"
                value={draft.amount}
                onChangeText={amount => update(draft.id, { amount })}
                style={styles.input}
              />
            </View>
            <View style={styles.inputColumn}>
              <Text style={styles.inputLabel}>Rest, s</Text>
              <TextInput
                accessibilityLabel={`Interval ${index + 1} rest`}
                keyboardType="number-pad"
                placeholder="until Continue"
                placeholderTextColor={theme.muted}
                value={draft.rest}
                onChangeText={rest => update(draft.id, { rest })}
                style={styles.input}
              />
            </View>
          </View>
        </View>
      ))}
      <AppButton
        title="Add interval"
        variant="outline"
        onPress={() =>
          onChange([
            ...drafts,
            newInterval(Math.max(0, ...drafts.map(draft => draft.id)) + 1),
          ])
        }
      />
    </View>
  );
}
