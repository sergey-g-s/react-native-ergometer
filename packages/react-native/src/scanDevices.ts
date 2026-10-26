import type { ErgDevice } from '@ergometer/core';
import {
  PM5_SERVICE_UUID,
  parsePm5MachineType,
  parsePm5SerialNumber,
} from '@ergometer/pm5';
import type { BleManager, Device } from 'react-native-ble-plx';
import { base64ToBytes, getReadyBleManager } from './ble';

// A device that hasn't advertised for this long has gone away (switched off or out of range).
const DEVICE_TIMEOUT_MS = 10_000;
const UPDATE_INTERVAL_MS = 1_000;

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
  let bleManager: BleManager;
  try {
    bleManager = await getReadyBleManager();
  } catch (error) {
    throw new ScanError(
      error instanceof Error ? error.message : 'Bluetooth is not available',
      { cause: error },
    );
  }

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
  return entry ? base64ToBytes(entry[1]) : null;
}
