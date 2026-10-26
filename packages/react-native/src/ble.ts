import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';

// Hermes has atob and btoa built in, but React Native's TypeScript types don't declare them.
declare const atob: (data: string) => string;
declare const btoa: (data: string) => string;

let manager: BleManager | undefined;

/** Returns the shared BleManager once Bluetooth permission is granted and Bluetooth is on. */
export async function getReadyBleManager(): Promise<BleManager> {
  if (!(await requestPermissions())) {
    throw new Error('Bluetooth permission was denied');
  }
  manager ??= new BleManager();
  await waitUntilPoweredOn(manager);
  return manager;
}

/** Decodes a base64 value from react-native-ble-plx into bytes. */
export function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

/** Encodes bytes as the base64 value react-native-ble-plx writes. */
export function bytesToBase64(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Reads an ASCII string characteristic, dropping trailing NUL padding. */
export function bytesToText(bytes: Uint8Array | null): string | null {
  const text = bytes
    ? String.fromCharCode(...bytes)
        .replace(/\0+$/, '')
        .trim()
    : '';
  return text || null;
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED,
    );
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function waitUntilPoweredOn(bleManager: BleManager): Promise<void> {
  return new Promise((resolve, reject) => {
    const subscription = bleManager.onStateChange(state => {
      if (state === State.PoweredOn) {
        subscription.remove();
        resolve();
      } else if (
        state === State.PoweredOff ||
        state === State.Unauthorized ||
        state === State.Unsupported
      ) {
        subscription.remove();
        reject(new Error(`Bluetooth is ${state}`));
      }
    }, true);
  });
}
