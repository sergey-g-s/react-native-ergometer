import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useErgConnections } from 'react-native-ergometer';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AppButton, ErrorBanner, Screen, Section } from '../components';
import type { RootStackParamList } from '../navigation';
import { useStyles } from '../styles';

export function MachineScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Machine'>) {
  const { theme, styles } = useStyles();
  const connection = useErgConnections().find(
    item => item.id === route.params.id,
  );
  const [distance, setDistance] = useState('2000');
  const [workoutError, setWorkoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) {
      navigation.goBack();
    }
  }, [connection, navigation]);

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
  const meters = Number(distance);

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
            <Text style={styles.inputLabel}>Distance, m</Text>
            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel="Distance in meters"
                keyboardType="number-pad"
                value={distance}
                onChangeText={setDistance}
                placeholderTextColor={theme.muted}
                style={styles.input}
              />
              <AppButton
                title="Start"
                disabled={!Number.isInteger(meters) || meters <= 0}
                onPress={() => {
                  setWorkoutError(null);
                  connection
                    .startWorkout({ distance: meters })
                    .catch((error: unknown) => setWorkoutError(String(error)));
                }}
              />
            </View>
            {workoutError && <ErrorBanner message={workoutError} />}
          </View>
        </Section>

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
