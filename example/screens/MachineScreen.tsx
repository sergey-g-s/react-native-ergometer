import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useErgConnections,
  type Workout,
  type WorkoutData,
  type WorkoutSummary,
} from 'react-native-ergometer';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  AppButton,
  ErrorBanner,
  MetricGrid,
  Screen,
  Section,
  SegmentedControl,
} from '../components';
import { liveMetrics, summaryMetrics } from '../metrics';
import type { RootStackParamList } from '../navigation';
import { useStyles } from '../styles';

type WorkoutKind = 'distance' | 'time' | 'calories';

const WORKOUT_KINDS: {
  value: WorkoutKind;
  label: string;
  input: string;
  initial: string;
  build: (amount: number) => Workout;
}[] = [
  {
    value: 'distance',
    label: 'Distance',
    input: 'Distance, m',
    initial: '2000',
    build: distance => ({ distance }),
  },
  {
    value: 'time',
    label: 'Time',
    input: 'Time, min',
    initial: '20',
    build: minutes => ({ duration: minutes * 60 }),
  },
  {
    value: 'calories',
    label: 'Calories',
    input: 'Calories, cal',
    initial: '100',
    build: calories => ({ calories }),
  },
];

export function MachineScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Machine'>) {
  const { theme, styles } = useStyles();
  const connection = useErgConnections().find(
    item => item.id === route.params.id,
  );
  const [kind, setKind] = useState<WorkoutKind>('distance');
  const [amount, setAmount] = useState('2000');
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [data, setData] = useState<WorkoutData | null>(null);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);

  useEffect(() => {
    if (!connection) {
      navigation.goBack();
    }
  }, [connection, navigation]);

  useEffect(() => {
    if (!connection) {
      return;
    }
    const stopData = connection.onWorkoutData(setData);
    const stopEnd = connection.onWorkoutEnd(setSummary);
    return () => {
      stopData();
      stopEnd();
    };
  }, [connection]);

  if (!connection) {
    return null;
  }

  const fields: [string, string][] = [
    ['id', connection.id],
    ['serialNumber', connection.serialNumber ?? '—'],
    ['machineType', connection.machineType ?? '—'],
    ['firmwareVersion', connection.firmwareVersion ?? '—'],
    ['hardwareRevision', connection.hardwareRevision ?? '—'],
    ['isConnected', String(connection.isConnected)],
  ];
  const workoutKind = WORKOUT_KINDS.find(item => item.value === kind)!;
  const quantity = Number(amount);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to devices"
          onPress={navigation.goBack}
          style={styles.back}
        >
          <Text style={styles.chevron}>‹</Text>
          <Text style={styles.backText}>Devices</Text>
        </Pressable>

        <View style={styles.header}>
          <View>
            <Text style={styles.machineName}>
              {connection.name ?? connection.id}
            </Text>
            <Text style={styles.mono}>SN {connection.serialNumber ?? '—'}</Text>
          </View>
          <View style={[styles.status, styles.badge]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
        </View>

        <Section title="Workouts">
          <View style={[styles.card, styles.cardBody]}>
            <SegmentedControl
              options={WORKOUT_KINDS}
              value={kind}
              onChange={next => {
                setKind(next);
                setAmount(
                  WORKOUT_KINDS.find(item => item.value === next)!.initial,
                );
                setWorkoutError(null);
              }}
            />
            <Text style={styles.inputLabel}>{workoutKind.input}</Text>
            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel={workoutKind.input}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
                placeholderTextColor={theme.muted}
                style={styles.input}
              />
              <AppButton
                title="Start"
                disabled={!Number.isInteger(quantity) || quantity <= 0}
                onPress={() => {
                  setWorkoutError(null);
                  setSummary(null);
                  connection
                    .startWorkout(workoutKind.build(quantity))
                    .catch((error: unknown) => setWorkoutError(String(error)));
                }}
              />
            </View>
            {workoutError && <ErrorBanner message={workoutError} />}
          </View>
        </Section>

        {data && (
          <Section title="Live data">
            <MetricGrid metrics={liveMetrics(data)} />
          </Section>
        )}

        {summary && (
          <Section title="Workout summary">
            <MetricGrid metrics={summaryMetrics(summary)} />
          </Section>
        )}

        <Section title="Device info">
          <View style={styles.card}>
            {fields.map(([label, value], index) => (
              <View
                key={label}
                style={[
                  styles.field,
                  index < fields.length - 1 && styles.rowDivider,
                ]}
              >
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
              </View>
            ))}
          </View>
        </Section>

        <AppButton
          title="Disconnect"
          variant="danger"
          onPress={() => {
            connection.disconnect().catch(() => {});
          }}
        />
      </ScrollView>
    </Screen>
  );
}
