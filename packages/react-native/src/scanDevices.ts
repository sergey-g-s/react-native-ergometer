import type { ErgDevice } from '@ergometer/core';
import {
  PM5_SERVICE_UUID,
  parsePm5MachineType,
  parsePm5SerialNumber,
} from '@ergometer/pm5';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State, type Device } from 'react-native-ble-plx';

// Hermes has atob built in, but React Native's TypeScript types don't declare it.
declare const atob: (data: string) => string;

// A device that hasn't advertised for this long has gone away (switched off or out of range).
const DEVICE_TIMEOUT_MS = 10_000;
const UPDATE_INTERVAL_MS = 1_000;

let manager: BleManager | undefined;

/** Thrown when a scan can't start or stops because of an error. */
export class ScanError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ScanError';
  }
}

/**
 * Scans for supported machines and calls `onDevices` with the full list whenever it changes.
 * Devices that stop advertising drop off the list. Resolves with a function that stops the scan.
 */
export async function scanDevices(
  onDevices: (devices: ErgDevice[]) => void,
  onError?: (error: ScanError) => void,
): Promise<() => void> {
  if (!(await requestPermissions())) {
    throw new ScanError('Bluetooth permission was denied');
  }

  manager ??= new BleManager();
  const bleManager = manager;
  await waitUntilPoweredOn(bleManager);

  const devices = new Map<string, { device: ErgDevice; lastSeen: number }>();
  let changed = false;
  const emit = () => {
    changed = false;
    onDevices([...devices.values()].map(entry => entry.device));
  };

  try {
    // Duplicates keep coming while a device advertises, so iOS also reports rssi changes and silence.
    await bleManager.startDeviceScan(
      [PM5_SERVICE_UUID],
      { allowDuplicates: true },
      (error, scanned) => {
        if (error) {
          onError?.(new ScanError(error.message, { cause: error }));
          return;
        }
        if (!scanned) {
          return;
        }
        const previous = devices.get(scanned.id)?.device;
        const device = toErgDevice(scanned);
        devices.set(scanned.id, { device, lastSeen: Date.now() });
        if (!previous) {
          emit();
        } else if (!isSameDevice(previous, device)) {
          changed = true;
        }
      },
    );
  } catch (error) {
    throw new ScanError('Could not start scanning', { cause: error });
  }

  const interval = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of devices) {
      if (now - entry.lastSeen > DEVICE_TIMEOUT_MS) {
        devices.delete(id);
        changed = true;
      }
    }
    if (changed) {
      emit();
    }
  }, UPDATE_INTERVAL_MS);

  return () => {
    clearInterval(interval);
    bleManager.stopDeviceScan();
  };
}

function isSameDevice(a: ErgDevice, b: ErgDevice): boolean {
  return (
    a.name === b.name &&
    a.rssi === b.rssi &&
    a.machineType === b.machineType &&
    a.serialNumber === b.serialNumber
  );
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
        reject(new ScanError(`Bluetooth is ${state}`));
      }
    }, true);
  });
}

function toErgDevice(device: Device): ErgDevice {
  const name = device.localName ?? device.name;
  return {
    id: device.id,
    name,
    rssi: device.rssi,
    machineType: parsePm5MachineType(name, readFtmsServiceData(device)),
    serialNumber: parsePm5SerialNumber(name),
  };
}

// ble-plx keys service data by the full UUID, e.g. `00001826-0000-1000-8000-00805f9b34fb`.
function readFtmsServiceData(device: Device): Uint8Array | null {
  const entry = Object.entries(device.serviceData ?? {}).find(
    ([uuid]) =>
      uuid.toLowerCase() === '1826' ||
      uuid.toLowerCase().startsWith('00001826'),
  );
  return entry
    ? Uint8Array.from(atob(entry[1]), char => char.charCodeAt(0))
    : null;
}
