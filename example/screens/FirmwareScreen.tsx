import { useCallback, useEffect, useState } from 'react';
import {
  fetchLatestPm5Firmware,
  type Pm5Firmware,
} from 'react-native-ergometer';
import { ScrollView, Text, View } from 'react-native';
import {
  AppButton,
  ErrorBanner,
  Screen,
  ScreenHeader,
  Section,
} from '../components';
import { useStyles } from '../styles';

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

export function FirmwareScreen() {
  const { styles } = useStyles();
  const { state, reload } = useLatestFirmware();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Firmware"
          action={
            <AppButton
              compact
              title="Reload"
              variant="outline"
              onPress={reload}
            />
          }
        />

        <Section title="Latest PM5 firmware">
          {state.status === 'loading' && (
            <Text style={styles.muted}>Loading…</Text>
          )}
          {state.status === 'error' && <ErrorBanner message={state.message} />}
          {state.status === 'loaded' && (
            <View style={styles.card}>
              {state.firmware.map((item, index) => (
                <View
                  key={item.monitor}
                  style={[
                    styles.row,
                    index < state.firmware.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{item.machineType}</Text>
                    <Text style={styles.mono}>
                      hw {item.hardware} · {item.releaseDate}
                    </Text>
                  </View>
                  <Text style={styles.firmwareVersion}>{item.version}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}
