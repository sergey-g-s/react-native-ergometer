import { useCallback, useEffect, useState } from 'react';
import {
  connectDevice,
  fetchLatestPm5Firmware,
  useErgConnection,
  useErgConnections,
  useErgScanner,
  type ErgDevice,
  type Pm5Connection,
  type Pm5Firmware,
} from 'react-native-ergometer';
import {
  Button,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type TextStyle,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type FirmwareState =
  | { status: 'loading' }
  | { status: 'loaded'; firmware: Pm5Firmware[] }
  | { status: 'error'; message: string };

function useLatestFirmware() {
  const [state, setState] = useState<FirmwareState>({ status: 'loading' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    fetchLatestPm5Firmware()
      .then(firmware => setState({ status: 'loaded', firmware }))
      .catch((error: unknown) =>
        setState({ status: 'error', message: String(error) }),
      );
  }, []);

  useEffect(load, [load]);

  return { state, reload: load };
}

function NearbyDevice({
  device,
  textStyle,
}: {
  device: ErgDevice;
  textStyle: TextStyle;
}) {
  const { status, error } = useErgConnection(device.id);
  const titles = {
    disconnected: 'Connect',
    connecting: 'Connecting…',
    connected: 'Connected',
  };

  return (
    <View style={styles.row}>
      <Text style={textStyle}>
        {device.machineType ?? 'unknown'} ·{' '}
        {device.serialNumber ?? device.name ?? device.id} · {device.rssi ?? '?'}{' '}
        dBm
      </Text>
      <Button
        title={titles[status]}
        disabled={status !== 'disconnected'}
        onPress={() => {
          connectDevice(device).catch(() => {});
        }}
      />
      {error && <Text style={styles.error}>{error.message}</Text>}
    </View>
  );
}

function ConnectedDevice({
  connection,
  textStyle,
}: {
  connection: Pm5Connection;
  textStyle: TextStyle;
}) {
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const fields: [string, string][] = [
    ['id', connection.id],
    ['serialNumber', connection.serialNumber ?? '—'],
    ['machineType', connection.machineType ?? '—'],
    ['firmwareVersion', connection.firmwareVersion ?? '—'],
    ['hardwareRevision', connection.hardwareRevision ?? '—'],
    ['isConnected', String(connection.isConnected)],
  ];

  return (
    <View style={styles.row}>
      <Text style={[styles.deviceName, textStyle]}>
        {connection.name ?? connection.id}
      </Text>
      {fields.map(([label, value]) => (
        <Text key={label} style={textStyle}>
          {label}: {value}
        </Text>
      ))}
      <Button
        title="Start 2000 m"
        onPress={() => {
          setWorkoutError(null);
          connection
            .startWorkout({ distance: 2000 })
            .catch((error: unknown) => setWorkoutError(String(error)));
        }}
      />
      {workoutError && <Text style={styles.error}>{workoutError}</Text>}
      <Button
        title="Disconnect"
        onPress={() => {
          connection.disconnect().catch(() => {});
        }}
      />
    </View>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const textStyle = isDarkMode ? styles.textDark : styles.textLight;
  const { state: firmwareState, reload: reloadFirmware } = useLatestFirmware();
  const { devices, error: scanError } = useErgScanner();
  const connections = useErgConnections();

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={[styles.container, isDarkMode && styles.containerDark]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, textStyle]}>react-native-ergometer</Text>
          <Text style={[styles.subtitle, textStyle]}>Nearby machines</Text>
          {scanError && <Text style={styles.error}>{scanError.message}</Text>}
          {!scanError && devices.length === 0 && (
            <Text style={textStyle}>Searching…</Text>
          )}
          {devices.map(device => (
            <NearbyDevice
              key={device.id}
              device={device}
              textStyle={textStyle}
            />
          ))}

          <Text style={[styles.subtitle, textStyle]}>Connected</Text>
          {connections.length === 0 && <Text style={textStyle}>None</Text>}
          {connections.map(connection => (
            <ConnectedDevice
              key={connection.id}
              connection={connection}
              textStyle={textStyle}
            />
          ))}

          <Text style={[styles.subtitle, textStyle]}>Latest PM5 firmware</Text>
          {firmwareState.status === 'loading' && (
            <Text style={textStyle}>Loading…</Text>
          )}
          {firmwareState.status === 'error' && (
            <Text style={styles.error}>{firmwareState.message}</Text>
          )}
          {firmwareState.status === 'loaded' &&
            firmwareState.firmware.map(item => (
              <Text key={item.monitor} style={textStyle}>
                {item.machineType} · hw {item.hardware} · {item.version} ·{' '}
                {item.releaseDate}
              </Text>
            ))}
          <Button title="Reload firmware" onPress={reloadFirmware} />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  row: {
    gap: 4,
  },
  deviceName: {
    fontWeight: '500',
  },
  textLight: {
    color: '#000000',
  },
  textDark: {
    color: '#ffffff',
  },
  error: {
    color: '#d32f2f',
  },
});

export default App;
