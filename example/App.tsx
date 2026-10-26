import { useCallback, useEffect, useState } from 'react';
import {
  fetchLatestPm5Firmware,
  useErgScanner,
  type Pm5Firmware,
} from 'react-native-ergometer';
import {
  Button,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
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

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const textStyle = isDarkMode ? styles.textDark : styles.textLight;
  const { state: firmwareState, reload: reloadFirmware } = useLatestFirmware();
  const { devices, error: scanError } = useErgScanner();

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
            <Text key={device.id} style={textStyle}>
              {device.machineType ?? 'unknown'} ·{' '}
              {device.serialNumber ?? device.name ?? device.id} ·{' '}
              {device.rssi ?? '?'} dBm
            </Text>
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
