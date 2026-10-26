import {
  connectDevice,
  useErgConnection,
  useErgConnections,
  useErgScanner,
  type ConnectionStatus,
  type ErgDevice,
} from 'react-native-ergometer';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  AppButton,
  ErrorBanner,
  Screen,
  ScreenHeader,
  Section,
  type ButtonVariant,
} from '../components';
import type { RootStackParamList } from '../navigation';
import { useStyles } from '../styles';

const connectButtons: Record<
  ConnectionStatus,
  { title: string; variant: ButtonVariant }
> = {
  disconnected: { title: 'Connect', variant: 'outline' },
  connecting: { title: 'Connecting…', variant: 'soft' },
  connected: { title: 'Connected', variant: 'success' },
};

function NearbyDevice({
  device,
  isLast,
}: {
  device: ErgDevice;
  isLast: boolean;
}) {
  const { styles } = useStyles();
  const { status, error } = useErgConnection(device.id);
  const button = connectButtons[status];

  return (
    <View style={[!isLast && styles.rowDivider]}>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{device.machineType ?? 'unknown'}</Text>
          <Text style={styles.mono}>
            {device.serialNumber ?? device.name ?? device.id}
          </Text>
        </View>
        <Text style={styles.mono}>{device.rssi ?? '?'} dBm</Text>
        <AppButton
          compact
          title={button.title}
          variant={button.variant}
          disabled={status !== 'disconnected'}
          onPress={() => {
            connectDevice(device).catch(() => {});
          }}
        />
      </View>
      {error && (
        <View style={styles.cardBody}>
          <ErrorBanner message={error.message} />
        </View>
      )}
    </View>
  );
}

export function DevicesScreen() {
  const { styles } = useStyles();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { devices, error: scanError } = useErgScanner();
  const connections = useErgConnections();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Devices" />

        <Section title={`Connected · ${connections.length}`}>
          {connections.length === 0 && <Text style={styles.muted}>None</Text>}
          {connections.map(connection => (
            <Pressable
              key={connection.id}
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate('Machine', { id: connection.id })
              }
              style={[styles.card, styles.row]}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>
                  {connection.name ?? connection.id}
                </Text>
                <Text style={styles.mono}>
                  SN {connection.serialNumber ?? '—'} · fw{' '}
                  {connection.firmwareVersion ?? '—'}
                </Text>
              </View>
              <View style={styles.status}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Connected</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </Section>

        <Section title={`Nearby · ${devices.length}`}>
          {scanError && <ErrorBanner message={scanError.message} />}
          {!scanError && devices.length === 0 && (
            <Text style={styles.muted}>Searching…</Text>
          )}
          {devices.length > 0 && (
            <View style={styles.card}>
              {devices.map((device, index) => (
                <NearbyDevice
                  key={device.id}
                  device={device}
                  isLast={index === devices.length - 1}
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}
